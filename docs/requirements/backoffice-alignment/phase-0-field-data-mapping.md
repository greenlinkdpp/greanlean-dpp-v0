# 阶段 0：字段与数据映射

日期：2026-07-25  
目标版本：v0.6.0  
状态：完成

## 1. 目标

本文件把当前后台数据、最终 DPP 展示、受众权限和目标权威来源逐项对应，解决以下问题：

- 后台模块与前台模块顺序不同；
- 同一信息在通用表、行业字段和电池字段中重复；
- 发布快照没有完整包含关联数据；
- 专业和监管投影缺少完整版本来源；
- 系统记录可以被普通 CRUD 表单维护；
- 部分前台值来自硬编码或推测，而不是已发布数据。

机器可读字段表：

```text
docs/requirements/backoffice-alignment/canonical-field-source-map.csv
```

## 2. 当前数据流

### 2.1 通用产品

```text
ProductEditor
├── products
├── product_digital_identity
├── product_materials
├── product_bom
├── product_esg_metrics
├── product_traceability
├── product_circularity
├── product_consumer_transparency
├── product_certificates
├── product_documents
├── product_sector_field_values
├── product_data_governance
├── dpp_registry_submissions
├── dpp_registration_proofs
├── dpp_evidence_links
├── dpp_audit_logs
└── dpp_blockchain_anchors
```

多数表由浏览器直接调用 Supabase CRUD。

### 2.2 电池产品

```text
ProductEditor
├── products
└── BatteryDppWorkspace
    ├── battery_model_profile
    ├── battery_batch
    ├── battery_item
    ├── battery_field_value
    ├── battery_operating_metric
    ├── battery_lifecycle_event
    └── Registry TEST 工作台
```

电池工作区有更完整的适用性、字段目录、准备度和动态数据能力，但与通用模块的发布、证据和版本链路尚未完全统一。

### 2.3 当前发布读取

```text
/p/[identifier]
→ resolveDppAccess
→ greanlean_authorized_dpp_snapshot
→ product_versions.snapshot.publicDpp
→ PublicDppViewModel
→ UnifiedDppPage
```

专业电池数据在授权后额外读取：

```text
battery_operating_metric
battery_lifecycle_event
→ batteryOperating
→ 运行状态与电池健康
```

## 3. 九个展示模块映射

## 3.1 产品身份与制造信息

### 当前来源

- `products`
- `product_digital_identity`
- `product_sector_field_values`
- `battery_model_profile`
- `battery_field_value`
- `battery_item`

### 最终显示

- DPP ID；
- UPI；
- GTIN；
- SGTIN；
- 型号；
- 批次；
- 序列号；
- 粒度；
- 品牌/制造商；
- 责任经济运营者；
- 制造地点；
- 制造日期；
- 生命周期状态；
- 更新时间。

### 重复与决定

| 信息 | 当前重复 | 目标权威来源 |
|---|---|---|
| UPI | `products.unique_product_identifier`、`product_digital_identity.product_uuid`、数字链接 | `product_digital_identity.product_uuid` |
| 型号 | `products.sku`、电池型号字段、`battery_model_profile` | 行业权威字段，发布时投影到通用型号 |
| 制造商 | `products.brand`、电池制造商字段 | 规范制造商对象；`brand` 仅用于品牌展示 |
| 制造地点 | 行业字段、电池档案 | 规范字段值，按粒度关联 |
| 制造日期 | 行业字段、电池单体 | 单体优先于批次，批次优先于型号 |
| 类别名称 | `category`、`subcategory`、代码和模板 | 代码与模板为权威，名称由模板本地化 |

### 必须新增的校验

- GTIN 校验位；
- 粒度与批次/序列号一致；
- UPI 唯一性；
- DPP ID 稳定性；
- 已发布标识不可原位替换；
- GS1 Digital Link 只从有效标识生成。

## 3.2 材料与组成

### 当前来源

- `product_materials`
- `product_bom`
- `product_suppliers`
- `product_certificates`
- 电池材料字段

### 最终显示

- 材料名称；
- 材料类别；
- 质量占比；
- 再生成分；
- 来源；
- 化学信息；
- 材料证据；
- 产品组件。

### 重复与决定

| 信息 | 当前重复 | 目标处理 |
|---|---|---|
| 材料认证 | `product_materials.certification` 文本、证书表、文档表 | 文本迁移为证据引用 |
| 再生成分 | 每个材料、ESG 总值、电池法规字段 | 材料行为权威；总值派生；电池法规字段按 BatteryPass 规则投影 |
| 纤维组成 | 材料行、行业字段 `fiber_composition` | 从材料行派生，不双份填写 |
| 关键原材料 | 材料行和电池字段 | 电池字段为法规语义，材料行为组成明细，两者建立映射 |
| 供应商名称 | 材料外键和追溯文本 | 供应商关系为权威，文本仅兼容历史 |

### 目标规则

- 同一材料组成比例总和提供校验；
- 百分比范围为 0 至 100；
- 组成和再生成分必须记录口径；
- 详细供应商默认专业可见；
- 公开证据必须引用公开文件；
- BOM 和材料分开：BOM 表达组件，材料表达物质组成。

## 3.3 环境与可持续性

### 当前来源

- `product_esg_metrics`
- `product_materials`
- 电池碳足迹字段
- `product_documents`

### 最终显示

- 产品碳足迹；
- 核算单位；
- 方法学；
- 验证方；
- 水；
- 能源；
- 废弃物；
- 再生成分；
- LCA/EPD 证据。

### 重复与决定

| 信息 | 当前重复 | 目标权威来源 |
|---|---|---|
| 碳足迹 | ESG 数值、电池 `batteryPresentation`、BatteryPass 字段 | 行业权威字段；页面通用投影 |
| 再生成分 | ESG 数值、材料行 | 材料明细派生，ESG 总值停止独立手填 |
| LCA 文件 | `lca_report_url`、文档表 | 文件版本与证据映射 |
| 验证方 | ESG 文本、证书签发方 | ESG 验证关系并关联证据 |

### 必须补充

- 数值单位；
- 功能单位；
- 边界；
- 方法学版本；
- 核算日期；
- 有效期；
- 验证状态；
- 证据文件。

只保存一个没有单位和口径的 `carbon_footprint` 数值不足以形成可发布的规范字段。

## 3.4 性能、耐久性与安全

### 当前来源

- `product_sector_field_values`
- BatteryPass `battery_field_value`
- 电池型号档案

### 目标

非电池：

```text
模板字段定义
→ 规范字段值
→ 性能模块投影
```

电池：

```text
BatteryPass 字段目录
→ battery_field_value
→ 通用性能字段投影
```

禁止把电池额定容量、能量、电压、寿命在通用行业字段中再录一遍。

### 行业示例

- 电池：容量、能量、电压、功率、效率、寿命、温度、安全；
- 纺织：色牢度、尺寸稳定性、耐用性；
- 家具：结构耐久、稳定性、承载和安全；
- 建材：性能声明、适用标准和耐久；
- 消费电子：续航、电气安全、耐久和防护。

## 3.5 行业专属模块

### 电池

权威来源：

- BatteryPass 字段目录；
- 电池型号、批次和单体；
- 授权动态数据投影。

### 纺织

规范字段：

- `textile.fibre_composition`
- `textile.restricted_substances`
- `textile.durability_basis`
- `textile.care_repair_reuse`

其中纤维组成应从材料记录派生。

### 家具

规范字段：

- `furniture.durability_test`
- `furniture.replaceable_parts`
- VOC/甲醛/REACH 证据；
- 备件和拆解。

### 建材

规范字段：

- `construction.declaration_of_performance`
- `construction.voc_reach_evidence`
- EPD/LCA；
- 安装、维护和拆除。

### 消费电子

规范字段：

- `electronics.battery_safety_document`
- `electronics.firmware_update_policy`
- `electronics.weee_route`
- RoHS/REACH；
- 内置电池和维修。

当前页面中的默认 WEEE 文案不应继续作为业务数据，应由后台明确填写或模板提供“法规通用说明”，并与产品声明区分。

## 3.6 供应链与生产追溯

### 当前来源

- `product_traceability`
- `product_suppliers`
- `supplier_products`

### 保留字段

- 事件类型；
- 事件名称；
- 事件时间；
- 国家；
- 城市；
- 设施；
- 供应商；
- 运输方式；
- 验证状态；
- 备注。

### 调整

- `supplier_name` 文本迁移为供应商关系；
- 事件类型改为版本化枚举；
- 事件粒度明确到型号、批次或单体；
- 供应商和设施详细信息按专业权限返回；
- 公开页面只显示允许公开的供应链阶段。

## 3.7 合规声明与证据文件

### 当前来源

- `product_certificates`
- `product_documents`
- `dpp_evidence_links`
- `product_data_governance`
- Registry 记录

### 目标关系

```text
文件
→ 文件版本
→ 证书/声明/报告元数据
→ 支持字段
→ 声明值和页码
→ 核验状态
→ 受众范围
```

### 必须停止

- 手工填写内部证据记录 UUID；
- 文件不存在时显示下载按钮；
- 自动生成看似正式的报告；
- 上传文件后自动标记第三方核验；
- 将过期证书继续作为有效证据。

## 3.8 维修、循环利用和生命周期结束

### 当前来源

- `products.care_instructions`
- `products.repair_instructions`
- `products.end_of_life_instructions`
- `product_circularity`
- `product_consumer_transparency`

### 重复与决定

| 信息 | 当前重复 | 目标权威来源 |
|---|---|---|
| 护理 | `products`、消费者透明度 | 规范循环字段值 |
| 维修 | `products`、循环表、行业字段 | `product_circularity` 或规范字段值 |
| 生命周期结束 | `products`、循环表 | `product_circularity` |
| 回收说明 | 循环表和通用默认文案 | 循环表 |
| 品牌故事 | 消费者透明度 | 保留，但不作为法规字段 |

迁移期间继续读取现有字段，目标写入停止双份保存。

## 3.9 生命周期事件与更新

### 当前问题

非电池生命周期事件通过追溯事件名称关键词筛选得出。该方式会：

- 漏掉未命中关键词的事件；
- 把普通供应链事件误分类；
- 无法定义事件状态变化；
- 不支持严格只追加；
- 无法统一电池和非电池事件。

### 目标

新增通用 `dpp_lifecycle_event`：

- 产品、批次或单体；
- 事件类型；
- 事件时间；
- 状态变化；
- 数据来源；
- 事件数据；
- 质量状态；
- 验证状态；
- 证据；
- 受众；
- 记录人；
- 只追加。

电池继续使用 `battery_lifecycle_event`，通过统一 ViewModel 投影，不强制迁表。

## 4. 系统记录映射

## 4.1 产品版本

当前：

- `product_versions`
- 版本可被 `upsert` 覆盖；
- 普通保存可能只保存产品基础记录；
- 统一版本主要含 `publicDpp`。

目标：

- `dpp_publication` 保存不可变完整快照；
- `dpp_current_publication` 指向当前版本；
- 相同产品和版本不可覆盖；
- 草稿不进入发布表；
- 回滚创建新版本。

## 4.2 Registry

当前同时存在：

- `dpp_registry_submissions`
- `registry_submission`
- `registry_validation_result`
- `registry_error_log`

目标：

- 规范 Registry Adapter 表为权威；
- 旧 `dpp_registry_submissions` 进入兼容只读；
- 请求 JSON 由发布版本和映射生成；
- 响应 JSON 只由连接器或受控人工测试结果写入；
- TEST 和 PRODUCTION 完全隔离。

## 4.3 审计

当前：

- `dpp_audit_logs`
- `dpp_access_audit`
- 部分界面允许普通新增。

目标：

- 服务端自动生成；
- 只追加；
- 不开放通用创建表单；
- 统一查询视图可以组合业务审计和访问审计。

## 4.4 区块链

当前：

- `dpp_blockchain_anchors`
- 通用表单可填写交易字段；
- 前端可能生成形式上的交易 Hash。

目标：

- 只允许锚定不可变发布 Hash；
- 交易字段只由真实连接器回写；
- 没有连接器时状态为“未配置”；
- 禁止合成交易 Hash；
- 锚定失败不修改 DPP 发布内容。

## 5. 字段元数据差距

现有通用领域表普遍缺少：

- `unit_code`
- `data_source`
- `source_reference`
- `evidence_status`
- `verification_status`
- `audience_level`
- `observed_at`
- `valid_from`
- `valid_until`
- `updated_by`
- `updated_at`

短期方案：

- 为关键领域表增加最少元数据列；
- 通过证据链接和治理表补足关系；
- 发布聚合器统一转换。

长期方案：

- 规范字段值层统一保存元数据；
- 领域表保留结构化业务关系；
- 字段定义和领域记录建立映射。

## 6. 受众映射

统一访问等级：

```text
PUBLIC
LEGITIMATE_INTEREST
AUTHORITY_ONLY
INTERNAL
```

现有小写或模糊值在迁移时转换：

| 当前值 | 目标值 |
|---|---|
| `public` | `PUBLIC` |
| `professional` | `LEGITIMATE_INTEREST` |
| `restricted` | `LEGITIMATE_INTEREST` |
| `authority` | `AUTHORITY_ONLY` |
| `audit` | `AUTHORITY_ONLY` |
| `internal` | `INTERNAL` |

无法识别的旧值默认 `INTERNAL`，避免意外公开。

## 7. 五行业覆盖

| 行业 | 通用九模块 | 行业字段 | 动态数据 | 当前案例 |
|---|---:|---:|---:|---|
| 电池 | 是 | BatteryPass-Ready | 是 | LMT、工业储能 |
| 纺织 | 是 | 纤维、化学、耐久、护理 | 否 | 三丰面料 |
| 家具 | 是 | 耐久、部件、VOC、拆解 | 否 | 模板测试 |
| 建材 | 是 | DoP、EPD、VOC、施工回收 | 否 | 模板测试 |
| 消费电子 | 是 | RoHS、WEEE、电池、固件 | 可扩展 | 无线耳机 |

## 8. 四个重点案例验收基线

### LMT 电池

- DPP ID：`DPP-LMT-BAT-48V15AH`
- 电池配置：LMT；
- 粒度：单体；
- 检查静态字段、公开投影、授权动态数据和生命周期事件。

### 工业储能电池

- DPP ID：`DPP-GV-ESS-14K3-000001`
- 电池配置：固定式 2 kWh 以上工业电池；
- 粒度：单体；
- 检查工业电池性能、动态数据和 Registry TEST。

### 纺织品

- DPP ID：`DPP-SFJK-31-1-REC`
- 检查材料组成、化学声明、耐用、护理、证据和中英文。

### 消费电子

- DPP ID：`DPP-CE-EARBUDS-001`
- 检查 BOM、内置电池、RoHS/REACH、维修、WEEE 和固件字段。

家具和建材至少使用模板 Fixture 验证字段生成、发布聚合和权限投影。

## 9. 前台硬编码清理清单

后续代码阶段需要清理以下业务值推断：

- 电子产品默认 WEEE 路径；
- 电子产品默认内置锂电池描述；
- 纺织产品默认冷水机洗说明；
- 基于关键词生成生命周期事件；
- 基于产品名称或 DPP ID 选择业务内容；
- 静态 `batteryPresentation` 作为长期权威数据；
- 缺值时生成看似真实的行业说明。

允许保留：

- 通用 UI 提示；
- 模块空状态；
- 法规通用说明；
- 字段标签；
- 标准缩写解释。

## 10. 阶段 0 验收

- 九个展示模块均有明确数据来源；
- 每个重复字段有目标权威来源；
- 电池法规字段不要求双份录入；
- 五行业均有行业扩展字段；
- 四个案例有回归基线；
- 受众值有统一枚举；
- 发布、Registry、审计和区块链边界明确；
- 未删除或修改任何生产数据；
- 后续迁移可以先增加、再回填、再切换。
