# Actual Data Dictionary for P0

## 1. 现有映射

| 逻辑实体 | 实际表 | P0 处理 |
| --- | --- | --- |
| Organisation | `dpp_organisation` | 扩展显示名、slug、地址、语言和 row version |
| Membership | `dpp_user_membership` | 复用；角色映射到现有 7 类角色 |
| ProductModel | `products` + `battery_model_profile` | 复用并新增 organisation/project/状态 |
| Batch | `battery_batch` | 复用并加组织及组合一致性 |
| BatteryItem | `battery_item` | 复用并加组织、P0 状态、唯一性和 UPI 约束 |
| Schema | `schema_definition` + `schema_version` | 复用 |
| FieldDefinition | `field_definition` | 复用 |
| FieldValue | `battery_field_value` | 复用，增加链一致性约束/解析服务 |
| Evidence | `dpp_file_asset` + `dpp_file_version` + `dpp_file_link` | 复用 |
| PassportVersion | `dpp_publication` | 扩展 item subject；历史 product subject 保留 |
| Approval | `dpp_publication_review` + validation tables | 扩展 item subject |
| Measurement | `battery_operating_metric` | 复用，保持受限/append-only |
| LifecycleEvent | `dpp_lifecycle_event` + battery event | 复用 |
| RegistrySubmission | Registry adapter tables | 复用，生产 flag 关闭 |

## 2. P0 新表字段

### `dpp_economic_operator_profile`

`id`, `organisation_id`, `version`, `role_type`, `legal_name_snapshot`, `legal_address_snapshot`, `eu_contact_name`, `eu_contact_email`, `verification_status`, `verification_method`, `verified_at`, `verification_expires_at`, `evidence_file_version_id`, `is_current`, `created_by`, `created_at`。

约束：organisation + version 唯一；每组织一个 current；VERIFIED 需要 verified_at；地址 JSON object；版本只追加。

### `dpp_product_ownership`

`product_id`, `organisation_id`, `project_id`, `ownership_status`, `source_type`, `assigned_by`, `assigned_at`, `updated_at`。

约束：每产品一个 owner；ACTIVE 需要 organisation；legacy 可 `UNASSIGNED`。

### `dpp_project`

`id`, `organisation_id`, `project_code`, `name`, `project_type`, `scope_summary`, `target_market`, `status`, `owner_user_id`, `target_date`, `started_at`, `completed_at`, `applicability_result`, `applicability_rule_version`, `disclaimer_acknowledged_at`, `row_version`, audit timestamps/users。

约束：organisation + project_code 唯一；状态/日期一致；target market JSON array。

### `dpp_applicability_assessment`

`id`, `project_id`, `organisation_id`, `rule_version`, `input_snapshot`, `result`, `result_reason`, `pending_questions`, `disclaimer_text`, `disclaimer_acknowledged`, `assessed_by`, `assessed_at`, `supersedes_id`。

约束：snapshot object，pending questions array；记录只追加。

### `dpp_project_task`

`id`, `project_id`, `organisation_id`, `task_type`, `title`, `description`, `status`, `priority`, `assignee_user_id`, `responsible_department`, `due_at`, `blocked_reason`, `related_entity_type`, `related_entity_id`, `source_assessment_id`, `completed_at`, `row_version`, audit timestamps/users。

### `dpp_identifier`

`id`, `organisation_id`, `product_id`, `battery_model_profile_id`, `battery_batch_id`, `battery_item_id`, `identifier_type`, `value`, `normalized_value`, `public_key`, `is_primary`, `status`, `valid_from`, `valid_to`, `created_by`, `created_at`。

约束：恰好一个 target；normalized value 全局唯一；UPI_URL 必须 HTTPS 且 battery item target；public key 全局唯一且不等于内部 UUID。

### `dpp_import_job` / `dpp_import_error`

Job 保存 organisation/project、类型、模板版本、幂等键、状态、总/成功/警告/失败行数和输入 hash；Error 保存 sheet/row/column/field/error code/message/raw value/suggested fix。导入错误中的公式前缀按文本转义。

## 3. 新增/扩展字段的兼容规则

- 现有产品的 organisation/project 可为空，表示 `LEGACY_UNASSIGNED`，不会被 P0 列表跨组织暴露。
- 新 API 不允许创建 organisation 为空的资源。
- 现有 `products.unique_product_identifier` 继续兼容；P0 item UPI 以 `dpp_identifier` 为权威并同步 `battery_item.unique_product_identifier`。
- 现有 product publication 的 subject 为 `PRODUCT`；新 item publication 为 `BATTERY_ITEM`。

## 4. 电池法规目录 v2.0（迁移 0026）

### `battery_regulatory_catalog`

保存目录版本、来源名称/版本/日期、法规引用、源文件 SHA-256、双语免责声明和当前启用状态。目录版本不可覆盖为另一份来源内容。

### `battery_regulatory_data_point`

每个目录固定保存 71 个数据点：编号、代码、中英文名称、法规来源、章节、原始注记、数据层级、类型、单位、访问级别、静态/动态、规范字段代码、旧字段别名、A-E 映射质量、字段来源、证据要求及默认专家复核状态。

### `battery_regulatory_applicability`

每个数据点分别保存 `ev`、`lmt`、`industrial` 三条适用性记录，状态限定为 `mandatory`、`conditional`、`optional`、`future`、`duplicate`、`not_applicable`。共 213 条，不以一个电池类别推断另一个类别。

### `battery_field_value` 扩展

- `data_status`: `missing/pending/declared/verified/not_applicable`
- `expert_review_status`: `not_required/pending/confirmed/questioned`
- `expert_review_note`: 专家判断及争议说明
- `field_origin`: `eu_guidance_v2/batterypass_ready_v1_3/greanlean_extension/legacy`

动态数据仍写入现有 append-only 运行指标与生命周期表；不覆盖静态声明值。`battery.eu_guidance` 仅补 12 个 BatteryPass-Ready v1.3 中不存在的存储字段，避免建立第二套字段值系统。
