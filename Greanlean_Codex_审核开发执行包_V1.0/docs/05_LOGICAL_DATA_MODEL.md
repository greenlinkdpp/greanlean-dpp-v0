# 逻辑数据模型与数据字典基线

## 1. 使用说明

本文件定义产品层面的逻辑模型，不指定数据库、ORM或命名风格。Codex应在 `DATA_DICTIONARY_ACTUAL.md` 中映射到真实代码：

- `UUID`可映射到仓库现有主键类型；
- `JSON`只用于扩展、快照或原始回执，不代替关键关系和约束；
- 所有租户业务表必须包含或可可靠推导 `organisation_id`；
- 所有时间使用带时区UTC存储，显示层按用户时区；
- 发布记录和审计记录不可物理覆盖。

## 2. 通用字段

除关联表和不可变快照外，业务实体建议具备：

| 字段 | 逻辑类型 | 规则 |
|---|---|---|
| id | UUID/现有主键 | 主键，不可复用 |
| organisation_id | FK | 租户隔离键；平台级配置可为空 |
| created_at | timestamp | 必填 |
| created_by | FK User | 必填或系统账号 |
| updated_at | timestamp | 可变业务表必填 |
| updated_by | FK User | 可变业务表必填 |
| deleted_at | timestamp nullable | 软删除；发布/审计通常禁用 |
| row_version | integer/version | 乐观锁，防止覆盖 |

## 3. 组织、用户与项目

### 3.1 Organisation

| 字段 | 类型 | 必填 | 约束/说明 |
|---|---|---:|---|
| id | ID | 是 | 主键 |
| legal_name | string(300) | 是 | 法定名称 |
| display_name | string(200) | 是 | 显示名称 |
| country_code | string(2) | 是 | ISO国家码 |
| registered_address | structured/json | 是 | 地址结构化保存 |
| organisation_identifier_type | enum | 否 | EORI、LEI、VAT、国家注册号、其他 |
| organisation_identifier_value | string(200) | 否 | 类型+值唯一性按业务配置 |
| tenant_slug | string(100) | 是 | 全局唯一，不直接暴露敏感信息 |
| status | enum | 是 | ACTIVE/SUSPENDED/ARCHIVED |
| default_locale | string | 是 | 默认zh-CN/en |
| data_retention_policy | json/ref | 否 | 合同/租户策略 |

索引：`tenant_slug unique`，组织标识组合索引。

### 3.2 EconomicOperatorProfile

| 字段 | 类型 | 必填 | 规则 |
|---|---|---:|---|
| organisation_id | FK | 是 | 归属组织 |
| role_type | enum | 是 | MANUFACTURER/IMPORTER/DISTRIBUTOR/AUTHORISED_REPRESENTATIVE/OTHER |
| legal_name_snapshot | string | 是 | 用于提交时快照 |
| legal_address_snapshot | json | 是 | 提交时快照 |
| eu_contact_name | string | 否 | 合规联系人 |
| eu_contact_email | string | 否 | 格式校验 |
| verification_status | enum | 是 | NOT_STARTED/PREPARING/SUBMITTED/VERIFIED/FAILED/EXPIRED |
| verification_method | string | 否 | 不写死具体供应商 |
| verified_at | timestamp | 否 | VERIFIED时需要 |
| verification_expires_at | timestamp | 否 | 可空 |
| evidence_id | FK Evidence | 否 | 验证材料 |
| version | integer | 是 | 历史版本保留 |

### 3.3 OrganisationMembership

字段：organisation_id、user_id、role_code、department、status、valid_from、valid_to。组织+用户+角色组合唯一；禁用后历史审计仍保留。

### 3.4 Project

| 字段 | 类型 | 必填 | 规则 |
|---|---|---:|---|
| organisation_id | FK | 是 | 租户 |
| project_code | string(80) | 是 | 组织内唯一 |
| name | string(300) | 是 | 项目名称 |
| project_type | enum | 是 | ASSESSMENT/PILOT/FULL_ROLLOUT |
| scope_summary | text | 是 | 合同/实施范围 |
| target_market | json/list | 否 | 欧盟国家/渠道 |
| status | enum | 是 | DRAFT/ACTIVE/BLOCKED/ACCEPTANCE/COMPLETED/ARCHIVED |
| owner_user_id | FK | 是 | 项目经理 |
| target_date | date | 否 | 计划日期 |
| started_at/completed_at | timestamp | 否 | 状态约束 |
| applicability_result | enum | 否 | PRELIMINARY_APPLICABLE/NOT_APPLICABLE/PENDING/INSUFFICIENT |
| applicability_rule_version | string | 否 | 评估规则版本 |
| disclaimer_acknowledged_at | timestamp | 否 | 客户确认 |

### 3.5 ProjectTask

字段：project_id、task_type、title、description、assignee_user_id、responsible_department、status、priority、due_at、blocked_reason、related_entity_type/id、completed_at。支持缺口任务和验收任务。

## 4. 产品身份与层级

### 4.1 ProductModel

| 字段 | 类型 | 必填 | 规则 |
|---|---|---:|---|
| organisation_id | FK | 是 | 租户 |
| project_id | FK | 否 | 可跨项目复用时可空 |
| model_code | string(150) | 是 | 组织内唯一 |
| product_name | string(300) | 是 | 产品名称 |
| battery_category | enum | 是 | LMT/EV/INDUSTRIAL/OTHER/PENDING |
| intended_use | text | 是 | 用途 |
| nominal_voltage_v | decimal | 否 | >0 |
| rated_capacity_ah | decimal | 否 | >0 |
| rated_energy_kwh | decimal | 否 | >0；BAT-001 |
| max_continuous_power_kw | decimal | 否 | >=0 |
| chemistry_code | string/enum | 否 | 可配置词表 |
| model_status | enum | 是 | DRAFT/ACTIVE/RETIRED |
| inheritance_schema_version | string | 是 | 用于Item继承 |
| default_language | string | 是 | - |

唯一：organisation_id + model_code。

### 4.2 Batch（可选）

字段：organisation_id、product_model_id、batch_code、manufactured_from、manufactured_to、facility_id/description、variant_overrides、status。组织+型号+批次唯一；批次覆盖只能覆盖允许的字段。

### 4.3 BatteryItem

| 字段 | 类型 | 必填 | 规则 |
|---|---|---:|---|
| organisation_id | FK | 是 | 租户 |
| product_model_id | FK | 是 | 型号 |
| batch_id | FK | 否 | 必须属于同一型号和租户 |
| serial_number | string(250) | 是 | 组织内唯一；ID-002 |
| item_code | string(150) | 否 | 内部编码 |
| manufactured_at | date/timestamp | 否 | 日期逻辑 |
| placed_on_market_at | date | 否 | 不早于制造日期 |
| item_status | enum | 是 | DRAFT/ACTIVE/IN_SERVICE/REUSED/REMANUFACTURED/END_OF_LIFE/ARCHIVED |
| upi_id | FK Identifier | 是（发布前） | HTTPS UPI |
| current_draft_id | FK | 否 | 当前草稿 |
| current_published_version_id | FK | 否 | 只指向不可变版本 |
| source_system | string | 否 | 导入来源 |

### 4.4 Identifier

| 字段 | 类型 | 必填 | 规则 |
|---|---|---:|---|
| organisation_id | FK | 是 | 租户 |
| entity_type/entity_id | polymorphic/ref | 是 | Model/Batch/Item |
| identifier_type | enum | 是 | UPI_URL/GTIN/SGTIN/SERIAL/INTERNAL/OTHER |
| value | string(1000) | 是 | 按类型校验 |
| normalized_value | string | 是 | 唯一比较 |
| is_primary | boolean | 是 | 每类可配置唯一主标识 |
| valid_from/valid_to | timestamp | 否 | 历史追踪 |
| status | enum | 是 | ACTIVE/RETIRED |

UPI_URL必须全局唯一、HTTPS、可解析；退役后仍保留解析或重定向。

## 5. Schema、字段和值

### 5.1 SchemaDefinition

字段：schema_key、name、product_category、source_layer、version、effective_date、status、supersedes_schema_id、description。`schema_key+version`唯一。

### 5.2 FieldDefinition

| 字段 | 类型 | 必填 | 规则 |
|---|---|---:|---|
| schema_id | FK | 是 | Schema版本 |
| field_key | string(200) | 是 | Schema内唯一，版本间尽量稳定 |
| group_key | string | 是 | 身份/材料/碳/性能等 |
| label_i18n | json/ref | 是 | 中英文 |
| data_type | enum | 是 | STRING/DECIMAL/INTEGER/BOOLEAN/DATE/DATETIME/ENUM/OBJECT/ARRAY/FILE_REF |
| unit_dimension | string | 否 | 质量/能量/电压等 |
| canonical_unit | string | 否 | kWh/V/Ah等 |
| enum_options | json/ref | 否 | 版本化 |
| required_level | enum | 是 | REQUIRED/CONDITIONAL/OPTIONAL |
| mandatory_condition | expression/json | 否 | 可解释的条件规则 |
| evidence_requirement | enum | 是 | NONE/DECLARATION/DOCUMENT/THIRD_PARTY |
| access_level | enum | 是 | PUBLIC/PROFESSIONAL/REGULATOR/INTERNAL |
| source_layer | enum | 是 | 见法规边界 |
| legal_basis | string | 否 | 引用，不自动构成法律意见 |
| effective_date | date | 否 | - |
| validation_rules | json | 否 | 范围、正则、交叉规则引用 |
| status | enum | 是 | DRAFT/ACTIVE/RETIRED |

### 5.3 FieldValue

| 字段 | 类型 | 必填 | 规则 |
|---|---|---:|---|
| organisation_id | FK | 是 | 租户 |
| target_type/target_id | ref | 是 | Model/Batch/Item/Version草稿 |
| field_definition_id | FK | 是 | 字段定义 |
| value_* | typed columns/json | 条件 | 必须与data_type一致 |
| canonical_value | json | 是 | 规范化值，用于快照和对比 |
| unit | string | 否 | 转换后保存原始及规范单位 |
| source_type | enum | 是 | MANUAL/IMPORT/API/INHERITED/CALCULATED |
| source_reference | string/json | 否 | 行号、系统ID、公式等 |
| data_status | enum | 是 | MISSING/SELF_DECLARED/DOCUMENT_SUPPORTED/THIRD_PARTY_VERIFIED/NOT_APPLICABLE/PENDING_CONFIRMATION |
| responsibility_user_id | FK | 否 | 责任人 |
| declared_by/declared_at | FK/timestamp | 否 | 企业声明必填 |
| valid_from/valid_to | timestamp | 否 | 有效期 |
| override_reason | text | 否 | 覆盖继承值时必填 |
| row_version | integer | 是 | 并发控制 |

同一target+field+有效区间不能有两个冲突激活值；继承值不复制覆盖时可动态投影，但发布必须快照。

## 6. BOM、供应商和材料

### 6.1 Component

字段：organisation_id、product_model_id、parent_component_id、component_code、name、component_type、quantity、mass_kg、manufacturer_supplier_id、version、status。

### 6.2 BOMLine

字段：parent_component_id、child_component_id或material_id、quantity、mass_kg、mass_percentage、data_boundary、source_type、evidence_status、valid_from/to。材料比例合计不超过100%；未知边界须显式。

### 6.3 Supplier

字段：organisation_id、supplier_code、legal_name、country_code、facility_name/address、verification_status、commercial_sensitivity_level、status。未核验不得展示为已验证。

### 6.4 Material

字段：material_code、name_i18n、material_category、chemical_name、cas_number、critical_raw_material_flag、substance_of_concern_flag、controlled_vocabulary_source/version。

## 7. 证据与审核

### 7.1 Evidence

| 字段 | 类型 | 必填 | 规则 |
|---|---|---:|---|
| organisation_id | FK | 是 | 租户 |
| evidence_type | enum/config | 是 | TEST_REPORT/CERTIFICATE/DECLARATION/LCA/PCF/BOM/BMS_EXPORT/OTHER |
| title | string | 是 | - |
| document_number | string | 否 | - |
| issuer_name | string | 否 | 第三方验证时必填 |
| issued_at/expires_at | date | 否 | 日期顺序 |
| file_object_id | FK | 是 | 对象存储记录 |
| sha256 | string | 是 | 上传后计算；同文件识别 |
| version | integer/string | 是 | 历史保留 |
| verification_status | enum | 是 | UNREVIEWED/ACCEPTED/REJECTED/EXPIRED/SUPERSEDED |
| sensitivity | enum | 是 | PUBLIC/PROFESSIONAL/REGULATOR/INTERNAL |
| applicable_scope | json/links | 是 | 型号、批次、单体、字段 |
| supersedes_evidence_id | FK | 否 | 更新链 |

### 7.2 EvidenceLink

字段：evidence_id、target_type/target_id、field_definition_id（可空）、relationship_type、valid_from/to、review_status、reviewed_by/at。关键字段要求证据时必须通过有效Link关联。

### 7.3 Approval

字段：target_type/target_id、workflow_type、step_code、decision、actor_user_id、comment、decided_at、previous_state、new_state、signature/hash（可选）。历史只追加。

## 8. 运行、生命周期和导入

### 8.1 Measurement

字段：organisation_id、battery_item_id、metric_code、measured_at、value_decimal/value_json、unit、source_device_id、source_system、quality_code、ingested_at、idempotency_key、raw_reference。唯一建议：item+metric+measured_at+source+idempotency。数据只追加，修正以新记录和correction_of关联。

### 8.2 LifecycleEvent

字段：organisation_id、battery_item_id、event_type、occurred_at、location、actor_org/person、description、source_type、evidence_id、previous_status、new_status、related_new_item_id、correction_of_event_id。只追加。

### 8.3 ImportJob / ImportError

ImportJob：类型、文件、状态、总行、成功、失败、提交人、开始/结束、模板版本、幂等键。

ImportError：job_id、row_number、column_name、field_key、error_code、message、raw_value、severity、suggested_fix。

## 9. 护照草稿、版本和输出

### 9.1 PassportDraft

字段：organisation_id、battery_item_id、schema_id、status、base_version_id、created_by、submitted_at、reviewed_at、change_reason、computed_completeness、blocking_issue_count。状态见状态机文件。

### 9.2 PassportVersion

| 字段 | 类型 | 必填 | 规则 |
|---|---|---:|---|
| organisation_id | FK | 是 | 租户 |
| battery_item_id | FK | 是 | 单体 |
| version_number | integer | 是 | item内递增唯一 |
| schema_key/version | string | 是 | 发布采用的Schema |
| snapshot_json | JSON/immutable | 是 | 包含规范字段、权限和来源摘要 |
| public_projection_json | JSON/immutable | 是 | 公众投影 |
| professional_projection_json | JSON/immutable | 否 | 受限投影，可按需生成 |
| snapshot_hash | string | 是 | 完整性校验 |
| published_at/by | timestamp/FK | 是 | - |
| change_reason | text | 是（非首版） | - |
| supersedes_version_id | FK | 否 | 版本链 |
| pdf_file_id | FK | 否 | 与快照一致 |
| json_file_id | FK | 否 | 与快照一致 |
| status | enum | 是 | PUBLISHED/WITHDRAWN/ARCHIVED |

不可UPDATE业务内容；允许仅追加撤回状态事件或外部引用，但不得改变快照哈希。

## 10. Registry和审计

### 10.1 RegistrySubmission

字段：organisation_id、battery_item_id或model/batch引用、environment、submission_type、status、request_file_id、request_hash、correlation_id、submitted_at、response_file_id、response_code、official_uri、error_code、error_detail、feature_flag_version、retry_of_id。REGISTERED约束见法规边界。

### 10.2 AuditLog

字段：organisation_id、actor_type/id、action_code、target_type/id、occurred_at、request_id、ip摘要、before_hash、after_hash、metadata_redacted、result。对发布、权限、导出、文件下载、Registry、删除/归档记录。审计日志只追加并限制访问。

## 11. 推荐关键约束

1. organisation_id + serial_number 唯一；
2. UPI normalized_value全局唯一；
3. BatteryItem.batch必须属于同一ProductModel；
4. 发布版本item+version_number唯一；
5. Registry REGISTERED时official_uri非空；
6. 第三方验证状态时Evidence和Issuer非空；
7. Published version快照内容禁止更新；
8. 所有资源访问查询同时约束organisation_id；
9. 软删除实体不参与活动唯一索引，具体实现按数据库能力；
10. 文件下载通过受控服务或短时签名URL，不公开永久对象地址。
