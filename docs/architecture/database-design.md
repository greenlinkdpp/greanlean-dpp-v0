# Greanlean 目标数据库设计

版本：Phase 2 / database-design  
状态：概念设计，待确认后转为迁移 SQL  
日期：2026-07-22

## 1. 设计约定

- 数据库继续使用 Supabase Postgres；
- 主键默认 `uuid`，时间默认 `timestamptz`；
- 多租户业务表必须包含 `organisation_id`；
- 表名使用单数还是复数在实施前统一，本设计使用单数对象名表达；
- 发布版本、动态指标和审计日志采用追加写入；
- 受法规影响的枚举优先使用版本化 codelist 表，不使用难以迁移的 Postgres enum；
- 结构化业务字段使用明确列；配置化长尾字段使用 `jsonb` 值并由 `field_definition` 校验；
- 不使用无外键约束的通用多态 EAV 承载所有核心数据。

## 2. 通用核心表

### 2.1 组织与权限

#### `organisation`

| 字段 | 类型 | 约束/说明 |
|---|---|---|
| `id` | uuid | PK |
| `legal_name` | text | 非空 |
| `trade_name` | text | 可空 |
| `legal_person_type` | text | LEGAL_PERSON/NATURAL_PERSON |
| `country_code` | text | ISO 3166-1 alpha-2 |
| `organisation_type` | text | manufacturer/importer/service_provider/authority 等，配置化 |
| `verification_status` | text | `UNVERIFIED/IN_REVIEW/VERIFIED/EXPIRED/REVOKED` |
| `verification_expires_at` | timestamptz | Registry 相关状态，正式规则待确认 |
| `status` | text | active/suspended/archived |
| `created_at`, `updated_at` | timestamptz | 非空 |

组织法定地址、合规联系人和法定代表人不塞入本表：

- `organisation_address` 保存街道、扩展地址、邮编、地区、国家和地址用途；
- `organisation_contact` 保存合规联系人邮箱、电话和访问策略；
- 组织的 NTR、LEI、VAT、eID、TIN 等标识进入 `unique_identifier`；
- 法定代表人和签章流程进入 Registry enrolment 记录，敏感信息采用最小化和受限访问。

#### `user_profile`

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | uuid | PK，FK `auth.users.id` |
| `display_name` | text | 用户显示名 |
| `locale` | text | 默认语言 |
| `status` | text | active/suspended |
| `created_at`, `updated_at` | timestamptz | 时间 |

#### `role`

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | uuid | PK |
| `code` | text | 唯一，如 `ORG_ADMIN`, `DPP_EDITOR`, `AUDITOR`, `AUTHORITY` |
| `scope` | text | platform/organisation |
| `permissions` | jsonb | 版本化权限代码数组 |

#### `organisation_member`

| 字段 | 类型 | 说明 |
|---|---|---|
| `organisation_id` | uuid | FK |
| `user_id` | uuid | FK |
| `role_id` | uuid | FK |
| `membership_status` | text | invited/active/suspended |
| `valid_from`, `valid_until` | timestamptz | 可选有效期 |
| `created_at`, `updated_at` | timestamptz | 时间 |

唯一键：`(organisation_id, user_id, role_id)`。

### 2.2 产品层级

#### `product`

保存市场产品族和通用展示信息，不保存电池专用规格。

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | uuid | PK |
| `organisation_id` | uuid | FK，租户边界 |
| `sector_code` | text | battery/textile/furniture/construction/consumer_electronics |
| `product_family_code` | text | 组织内唯一业务编码 |
| `name`, `name_zh` | text | 展示名称 |
| `description`, `description_zh` | text | 展示描述 |
| `brand` | text | 品牌 |
| `status` | text | draft/active/archived |
| `legacy_product_id` | uuid | 迁移期指向现有 `products.id` |
| `created_at`, `updated_at` | timestamptz | 时间 |

唯一键：`(organisation_id, product_family_code)`。

#### `product_model`

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | uuid | PK |
| `organisation_id` | uuid | FK |
| `product_id` | uuid | FK |
| `model_identifier` | text | 组织/签发方案内唯一 |
| `model_name` | text | 型号名称 |
| `commodity_code` | text | 商品编码，保存原值和版本来源 |
| `manufacturer_id` | uuid | FK `organisation` |
| `status` | text | draft/active/discontinued |
| `valid_from`, `valid_until` | date | 型号有效期 |
| `created_at`, `updated_at` | timestamptz | 时间 |

#### `product_batch`

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | uuid | PK |
| `organisation_id` | uuid | FK |
| `product_model_id` | uuid | FK |
| `batch_identifier` | text | 型号内唯一 |
| `manufacturing_site_identifier_id` | uuid | FK `unique_identifier`，可空 |
| `manufactured_from`, `manufactured_to` | date | 生产周期 |
| `status` | text | planned/produced/released/recalled/archived |
| `created_at`, `updated_at` | timestamptz | 时间 |

唯一键：`(product_model_id, batch_identifier)`。

#### `product_item`

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | uuid | PK |
| `organisation_id` | uuid | FK |
| `product_model_id` | uuid | FK，非空以便快速校验 |
| `product_batch_id` | uuid | FK，可空；有批次设计时必填 |
| `serial_identifier` | text | 型号内唯一 |
| `manufactured_at` | date | 单体制造日期 |
| `placed_in_service_at` | date | 可空 |
| `status` | text | active/inactive/waste 等业务状态 |
| `created_at`, `updated_at` | timestamptz | 时间 |

约束：如 `product_batch_id` 非空，其型号必须等于 `product_model_id`。

### 2.3 标识与载体

#### `unique_identifier`

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | uuid | PK |
| `organisation_id` | uuid | 数据所有者 |
| `subject_type` | text | product/model/batch/item/dpp/operator/facility |
| `subject_uuid` | uuid | 由服务层和触发器校验目标 |
| `scheme_code` | text | GTIN、internal、registry 等 |
| `raw_value` | text | 原始值 |
| `normalized_value` | text | 规范化值 |
| `resolvable_uri` | text | 可解析 URI |
| `issuing_agency` | text | 可空，最终规则 TBD |
| `is_primary`, `is_persistent` | boolean | 标志 |
| `status` | text | active/replaced/withdrawn |
| `valid_from`, `valid_until` | timestamptz | 有效期 |

唯一键：`(scheme_code, normalized_value)`；对内部方案可追加组织范围。

#### `data_carrier`

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | uuid | PK |
| `organisation_id` | uuid | FK |
| `unique_identifier_id` | uuid | FK |
| `carrier_type` | text | QR/DATA_MATRIX/NFC/RFID |
| `encoded_value` | text | 编码内容 |
| `resolver_uri` | text | 解析地址 |
| `placement` | text | PRODUCT/PACKAGING/DOCUMENTATION |
| `standard_reference` | text | 标准引用，TBD 可空 |
| `status` | text | active/revoked |
| `created_at` | timestamptz | 时间 |

### 2.4 DPP 与版本

#### `dpp_passport`

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | uuid | PK |
| `organisation_id` | uuid | FK |
| `passport_identifier_id` | uuid | FK `unique_identifier` |
| `granularity` | text | MODEL/BATCH/ITEM |
| `product_model_id` | uuid | 型号粒度或上级关系 |
| `product_batch_id` | uuid | 批次粒度或上级关系 |
| `product_item_id` | uuid | 单体粒度 |
| `schema_version_id` | uuid | 当前 Schema |
| `current_version_id` | uuid | FK，延迟约束 |
| `status` | text | DRAFT/ACTIVE/INACTIVE/MARKED_FOR_DELETION/ARCHIVED |
| `original_passport_id` | uuid | 新护照关联原护照 |
| `created_at`, `updated_at` | timestamptz | 时间 |

检查约束：

- MODEL：仅 `product_model_id` 非空；
- BATCH：型号和批次非空，单体为空；
- ITEM：型号和单体非空；存在批次设计时批次非空。

#### `dpp_version`

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | uuid | PK |
| `organisation_id` | uuid | FK |
| `dpp_passport_id` | uuid | FK |
| `version_number` | integer | 护照内递增 |
| `schema_version_id` | uuid | 该版本使用的 Schema |
| `status` | text | DRAFT/VALIDATED/PUBLISHED/SUPERSEDED/ARCHIVED |
| `snapshot` | jsonb | 规范化完整快照 |
| `snapshot_hash` | text | SHA-256 等算法值 |
| `hash_algorithm` | text | 默认 SHA-256 |
| `evidence_manifest_hash` | text | 证据清单 Hash |
| `previous_version_id` | uuid | 版本链 |
| `published_by` | uuid | FK user |
| `published_at` | timestamptz | 发布时间 |
| `created_at` | timestamptz | 创建时间 |

唯一键：`(dpp_passport_id, version_number)`。发布后阻止 update/delete。

## 3. Schema 与字段配置

### 3.1 `schema_definition`

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | uuid | PK |
| `code` | text | 如 `battery.ev` |
| `sector_code` | text | battery |
| `legal_category_code` | text | 法定类别 |
| `technical_variant_code` | text | without_bms 等，可空 |
| `source_name` | text | BatteryPass-Ready / Greanlean |
| `status` | text | draft/active/retired |

### 3.2 `schema_version`

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | uuid | PK |
| `schema_definition_id` | uuid | FK |
| `version` | text | 如 1.0 |
| `source_version` | text | 上游版本，如 BPR 1.0 |
| `json_schema` | jsonb | 原始/规范化 Schema |
| `checksum` | text | Schema Hash |
| `effective_from`, `effective_until` | date | 未确认时可空 |
| `status` | text | draft/published/retired |
| `created_at` | timestamptz | 时间 |

发布后不可修改。

### 3.3 `field_definition`

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | uuid | PK |
| `schema_version_id` | uuid | FK |
| `field_code` | text | 稳定内部编码 |
| `json_pointer` | text | 对应 JSON Schema 路径 |
| `storage_path` | text | 目标结构化表列或配置值路径 |
| `label_en`, `label_zh` | text | 显示名称 |
| `description_en`, `description_zh` | text | 说明 |
| `data_type` | text | string/integer/decimal/date/datetime/uri/object/array |
| `unit_code` | text | 可空 |
| `data_behavior` | text | STATIC/DYNAMIC |
| `data_granularity` | text | MODEL/BATCH/ITEM |
| `access_level_code` | text | 默认访问等级 |
| `requirement_status` | text | 已确认/条件/草案/自愿/TBD |
| `evidence_requirement` | jsonb | 文件类型、数量、验证规则 |
| `sort_order` | integer | 顺序 |

唯一键：`(schema_version_id, field_code)`。

### 3.4 规则和来源

#### `access_level`

保存平台稳定代码 `PUBLIC`、`LEGITIMATE_INTEREST`、`AUTHORITY_ONLY`、`INTERNAL` 及双语标签。法规原始访问描述不直接覆盖这些代码，而是通过 `access_policy` 保存更细的允许角色和条件。

#### `validation_rule`

保存 `rule_type`、`rule_config jsonb`、错误代码、双语错误文案、严重级别和规则版本。

#### `applicability_rule`

保存字段、类别、技术变体、粒度、条件表达式和结果（required/optional/not_applicable/TBD）。条件表达式只使用受控 DSL 或 JSON Logic，不执行任意脚本。

#### `regulatory_reference`

| 字段 | 说明 |
|---|---|
| `source_type` | regulation/delegated_act/implementing_act/standard_draft/reference_model |
| `source_code` | 如 EU-2024-1781 |
| `article_reference` | Article/Annex/section |
| `source_version` | 版本/日期 |
| `source_uri` | 可空 |
| `confirmation_status` | CONFIRMED/DRAFT/TBD/SUPERSEDED |
| `effective_from` | 未确认可空 |
| `notes` | 限定说明 |

通过 `field_regulatory_reference` 多对多关联字段和来源。

#### `codelist` 与 `codelist_value`

保存 Battery category、Battery status、DPP status、Battery chemistry、Unit 等代码表及来源版本。代码表值不能写死在前端。

### 3.5 `field_value`

用于当前结构化表未覆盖的配置字段，以及在发布前保存字段级来源和验证信息。

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | uuid | PK |
| `organisation_id` | uuid | FK |
| `field_definition_id` | uuid | FK |
| `product_model_id` | uuid | 可空 |
| `product_batch_id` | uuid | 可空 |
| `product_item_id` | uuid | 可空 |
| `value_json` | jsonb | 类型由定义和规则验证 |
| `unit_code` | text | 必须符合字段定义 |
| `data_source_id` | uuid | FK |
| `verification_status` | text | unverified/in_review/verified/rejected |
| `observed_at` | timestamptz | 数据时间 |
| `created_by`, `created_at`, `updated_at` | uuid/timestamptz | 审计 |

检查约束要求恰好一个粒度目标非空。动态指标不写入本表。

## 4. 电池扩展表

### 4.1 `battery_model_profile`

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | uuid | PK |
| `organisation_id` | uuid | FK |
| `product_model_id` | uuid | FK，唯一 |
| `legal_category_code` | text | 代码表值 |
| `schema_profile_code` | text | 五套配置之一或后续配置 |
| `technical_variant_code` | text | without_bms 等 |
| `has_bms` | boolean | 可空，未知时不强填 |
| `battery_chemistry_code` | text | codelist 值 |
| `mass_value`, `mass_unit` | numeric/text | 单位受控 |
| `warranty_end_date` | date | 依据资料定义 |
| `created_at`, `updated_at` | timestamptz | 时间 |

### 4.2 `battery_item`

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | uuid | PK |
| `organisation_id` | uuid | FK |
| `product_item_id` | uuid | FK，唯一 |
| `battery_status_code` | text | original/re-used/remanufactured/repurposed/waste |
| `status_changed_at` | timestamptz | 状态时间 |
| `commissioned_at` | date | 投入使用日期，可空 |
| `created_at`, `updated_at` | timestamptz | 时间 |

### 4.3 静态领域表

| 表 | 主要字段 | 默认粒度 |
|---|---|---|
| `battery_material_composition` | material_role, material_code/name, share, unit, hazardous, critical_raw_material | 型号 |
| `battery_performance_spec` | rated_capacity, voltage limits, original power, efficiency, lifetime, test references | 型号 |
| `battery_sustainability_data` | carbon footprint stages/class/study, recycled shares, due diligence | 型号或批次 |
| `battery_compliance_document` | document_id, document_role, verification_status | 型号/批次 |
| `battery_disassembly_information` | manual_document_id, safety_document_id, spare_parts_uri | 型号 |

每条记录均包含 `organisation_id`、`data_source_id`、`verification_status`、`valid_from` 和时间戳。批次级可持续性记录包含 `product_batch_id`；其型号必须与 profile 一致。

### 4.4 `battery_operating_metric`

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | uuid | PK |
| `organisation_id` | uuid | FK |
| `battery_item_id` | uuid | FK |
| `metric_type` | text | 版本化代码，如 SOC、REMAINING_CAPACITY |
| `metric_value` | numeric | 数值 |
| `unit_code` | text | codelist |
| `measured_at` | timestamptz | 源测量时间 |
| `received_at` | timestamptz | 平台接收时间 |
| `data_source_id` | uuid | FK |
| `source_device` | text | 设备标识，可空 |
| `verification_status` | text | 状态 |
| `quality_flags` | jsonb | 异常、缺失、时钟偏差等 |
| `payload_hash` | text | 幂等/完整性辅助 |

推荐索引：

- `(battery_item_id, metric_type, measured_at desc)`；
- `(organisation_id, measured_at desc)`；
- 唯一幂等键 `(battery_item_id, metric_type, measured_at, data_source_id, payload_hash)`。

不提供业务 update/delete 权限；纠错通过追加更正记录或受控数据治理流程实现。

### 4.5 `battery_lifecycle_event`

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | uuid | PK |
| `organisation_id` | uuid | FK |
| `battery_item_id` | uuid | FK |
| `event_type` | text | produced/placed_in_service/repair/reuse/remanufacture/repurpose/accident/collection/recycle/waste |
| `occurred_at` | timestamptz | 事件时间 |
| `actor_organisation_id` | uuid | 执行者，可空 |
| `facility_identifier_id` | uuid | 设施，可空 |
| `event_data` | jsonb | 受事件 Schema 校验 |
| `document_id` | uuid | 证据，可空 |
| `verification_status` | text | 状态 |
| `previous_event_id` | uuid | 可选事件链 |
| `created_at` | timestamptz | 记录时间 |

## 5. 文档、来源与审计

### 5.1 `document`

保存 `storage_bucket`、`storage_key`、`original_filename`、`mime_type`、`size_bytes`、`hash_algorithm`、`content_hash`、`language`、`document_type`、`version`、`access_policy_id`、`status`、上传者和时间。公开 URL 不作为唯一存储位置。

### 5.2 `document_link`

把文件关联到字段值、DPP 版本、电池合规记录或生命周期事件，保存关联目的、有效期和验证状态。

### 5.3 `data_source`

保存来源类型、组织、实验室/设备、来源标识、采集方法、可信级别和验证状态。系统派生数据必须同时记录推导规则版本。

### 5.4 `access_policy`

保存默认访问等级、允许角色、允许组织类型、合法利益目的、授权有效期和是否允许下载。字段定义可给默认策略，具体文件或值可使用更严格策略。

### 5.5 `audit_log`

保存 `organisation_id`、`actor_user_id`、`actor_role`、`action`、`resource_type`、`resource_id`、`before_hash`、`after_hash`、`correlation_id`、`ip_hash`、结果和时间。普通角色无 update/delete 权限。

## 6. Registry 表

### 6.1 `registry_mapping`

| 字段 | 说明 |
|---|---|
| `product_group_code` | 产品组 |
| `mapping_version` | Greanlean 映射版本 |
| `source_schema_version_id` | 本地 Schema 版本 |
| `registry_schema_version` | 官方版本，未知为 TBD/null |
| `field_mappings` | 版本化 JSON 映射规则 |
| `status` | draft/validated/published/retired |
| `checksum` | 映射 Hash |

### 6.2 `registry_organisation_enrolment`

保存组织在 `TEST` 或 `PRODUCTION` 的 enrolment application id、EU Login 关联状态、组织标识类型、申请状态、验证状态、验证到期时间、法定代表人最小必要信息、签署/盖章声明文档引用、Registry correlation id、提交与完成时间。TEST 和 PRODUCTION 必须分别建记录，不复制验证结果。

### 6.3 `registry_submission`

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | uuid | PK |
| `organisation_id` | uuid | FK |
| `dpp_version_id` | uuid | FK |
| `environment` | text | TEST/PRODUCTION |
| `product_group` | text | 产品组 |
| `granularity` | text | MODEL/BATCH/ITEM |
| `upi_identifier_id` | uuid | FK |
| `model_identifier` | text | 适用时必填 |
| `batch_identifier` | text | 适用时必填 |
| `commodity_code` | text | 适用时必填 |
| `registry_uri` | text | Registry 返回或操作记录中的 URI；语义以正式接口/指南版本为准 |
| `mapping_version` | text | 非空 |
| `submission_method` | text | MANUAL_FILE/UI/API |
| `request_payload` | jsonb | 脱敏或加密策略待实施 |
| `request_hash` | text | 完整性 |
| `response_payload` | jsonb | 脱敏 |
| `persistent_registration_id` | text | 成功后保存 |
| `submission_status` | text | PREPARING/VALIDATING/READY/SUBMITTED/ACCEPTED/REJECTED/FAILED |
| `submitted_at`, `completed_at` | timestamptz | 时间 |
| `retry_of_submission_id` | uuid | 重试链 |

### 6.4 `registry_validation_result`

保存校验阶段、规则/字段代码、严重级别、JSON pointer、错误代码、消息、来源（LOCAL/REGISTRY）和时间。

### 6.5 `registry_error_log`

保存分类、可重试标志、HTTP 状态、错误代码、脱敏消息、correlation id、attempt 和时间。凭据与完整签章材料不得写入错误日志。

### 6.6 `registry_registration_proof`

保存注册标识、商品编码、注册者、注册时间、DPP 版本 Hash、文件、签章/时间戳元数据、生成时间和可下载截止时间。保留策略来自 Regulation (EU) 2026/1778 及后续 Registry 技术规则，仍应配置化而非写成不可变数据库约束。

## 7. RLS 设计

建议提供数据库函数：

```text
is_organisation_member(organisation_id)
has_organisation_permission(organisation_id, permission_code)
can_read_access_policy(access_policy_id)
is_published_public_dpp(dpp_version_id)
```

策略原则：

- 组织数据：成员可见，写权限按角色；
- 公开 DPP：只通过发布投影或受限 RPC 读取；
- authority 数据：仅已验证角色和授权范围；
- Registry 生产记录：仅 Registry 管理角色；
- 动态数据源：使用受限服务端身份并校验 organisation/item；
- 审计日志：组织审计角色可读，普通用户不可写改；应用服务可追加；
- Schema 和法规字典：published 可读，管理操作仅平台管理员。

## 8. 索引和约束

关键索引：

- 所有租户表 `(organisation_id, id)`；
- `product_model(product_id, status)`；
- `product_batch(product_model_id, batch_identifier)` unique；
- `product_item(product_model_id, serial_identifier)` unique；
- `dpp_passport(passport_identifier_id)` unique；
- `dpp_version(dpp_passport_id, version_number)` unique；
- `unique_identifier(scheme_code, normalized_value)` unique；
- `field_value(field_definition_id, product_model_id/product_batch_id/product_item_id)`；
- 动态指标历史索引；
- Registry `(environment, submission_status, created_at)`；
- 审计 `(organisation_id, resource_type, resource_id, created_at)`。

所有 `*_status`、类别、单位和规则代码必须通过 check 或 codelist FK/校验服务约束。跨层级一致性使用 deferrable constraint trigger 校验。

## 9. 现有表处置

| 现有表 | 处置 | 目标 |
|---|---|---|
| `products` | 保留并只增兼容字段 | 回填到 `product` + 默认 `product_model` |
| `dpp_category_profiles` | 保留只读兼容 | `schema_definition` + `schema_version` |
| `dpp_field_templates` | 保留只读兼容 | `field_definition` |
| `dpp_validation_rules` | 迁移 | `validation_rule` + `applicability_rule` |
| `product_sector_field_values` | 回填、双读 | `field_value` 或电池结构化表 |
| `product_versions` | 回填、只读兼容 | `dpp_passport` + `dpp_version` |
| `product_digital_identity` | 回填 | `unique_identifier` + `data_carrier` |
| `product_documents` | 回填 | `document` + `document_link` |
| `product_materials` | 保留通用行业 | 电池数据迁至 `battery_material_composition` |
| `product_bom` | 保留通用行业 | 后续组件模型；本阶段不删除 |
| `product_esg_metrics` | 保留通用行业 | 电池映射到 `battery_sustainability_data` |
| `product_certificates` | 回填 | `document` + `battery_compliance_document` |
| `product_traceability` | 保留兼容 | 电池单体事件迁至 `battery_lifecycle_event` |
| `product_circularity` | 保留通用行业 | 电池拆卸/循环字段映射到专表 |
| `product_data_governance` | 回填 | `data_source`、验证状态和审计 |
| `dpp_registry_submissions` | 数据迁移 | 新 `registry_submission` |
| `dpp_registration_proofs` | 数据迁移 | `registry_registration_proof` |
| `dpp_evidence_links` | 回填 | `document_link` |
| `dpp_audit_logs` | 保留并加强不可变策略 | `audit_log` |
| `dpp_blockchain_anchors` | 保留可选模块 | 后续 `integrity_anchor`，不参与合规判定 |

## 10. 迁移与回滚

实施顺序：

1. 新建组织、角色和成员表，但不立即收紧旧 RLS；
2. 新建产品层级、DPP、Schema 和电池表；
3. 导入字段字典和 codelist；
4. 为现有产品建立默认组织和默认型号；
5. 回填标识、版本、文件和行业字段；
6. 建立兼容 facade 和差异报告；
7. 按组织启用新写路径；
8. 完成权限测试后收紧 RLS；
9. 旧表转只读；
10. 经至少一个稳定周期后再决定是否物理删除。

回滚优先关闭 feature flag 并恢复旧读取路径。迁移 down 脚本只删除尚未承载生产数据的新结构；已回填或已产生新业务数据时，不自动删除，而是保留并停止新写入。
