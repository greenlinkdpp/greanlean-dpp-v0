# Greanlean 电池 DPP 与 EU DPP Registry 适配需求规格

版本：Phase 2 / architecture-baseline  
状态：待确认  
日期：2026-07-22  
适用分支：`feature/battery-dpp`

## 1. 文档目的

本规格定义 Greanlean 从现有通用 DPP 演示平台演进为“通用 DPP 核心 + 电池行业扩展 + Registry 适配层”的目标能力。第二阶段仅形成设计，不修改业务代码、数据库或生产环境。

本规格以以下资料为基线：

- Regulation (EU) 2024/1781（ESPR），重点为第 9 至 13 条；
- Commission Implementing Regulation (EU) 2026/1778，重点为第 8 至 14 条；
- 欧盟委员会 DPP Registry 官方页面和 Economic Operators User Guide v1.0（2026-07-17）；
- 用户提供的 EU DPP Registry 实施条例草案，用于与正式文本追溯对比；
- BatteryPass-Ready Data Attribute Longlist v1.3（2026-03）；
- BatteryPass-Ready Data Model Documentation v1.0（2026-06-24）；
- BatteryPass-Ready EV、LMT、工业电池 JSON Schema 与 codelists；
- JRC145830 方法论资料；
- [当前系统盘点](docs/architecture/current-system-audit.md)。

其中 BatteryPass-Ready 模型仍处于持续演进状态；Registry 实施条例已经正式发布，Registry 和测试环境已经上线，但官方 User Guide v1.0 明确说明电池语义目录尚未定义、当前不能成功完成电池 DPP 注册。因此这些资料均不能单独作为“平台已经合规”的证明。未确认事项统一记录在 [known-uncertainties.md](docs/regulatory/eu-battery-dpp/known-uncertainties.md)。

## 2. 产品定位

Greanlean 应承担四个职责：

1. 管理企业、产品、型号、批次、单体及其唯一标识；
2. 按版本化行业 Schema 收集、校验和发布 DPP；
3. 按角色向消费者、专业参与者和主管机关提供不同数据视图；
4. 将已发布 DPP 映射为 Registry 可提交数据，并保存验证、提交、回执和错误记录。

Greanlean 不应把 EU Registry 当作完整 DPP 的集中托管库。完整 DPP 仍由经济运营者或 DPP 服务提供商托管；Registry 适配层只处理法规或接口明确要求的注册数据、标识符、商品编码、服务提供商引用、版本和注册证明。

## 3. 范围

### 3.1 本项目范围

- 保留现有官网、后台、公开 DPP、二维码、GS1 Digital Link、导出和演示产品；
- 建立组织级多租户和角色模型；
- 建立产品、型号、批次、单体四层业务模型；
- 建立独立 DPP、DPP 版本和唯一标识模型；
- 建立电池型号、单体、静态规格、动态指标和生命周期事件模型；
- 建立版本化 Schema、字段、适用性、校验、法规来源和访问策略；
- 支持 BatteryPass-Ready 提供的五套验证配置；
- 支持 `PUBLIC`、`LEGITIMATE_INTEREST`、`AUTHORITY_ONLY`、`INTERNAL` 四类平台访问等级；
- 建立文档、证据、数据来源、数据质量和审计链路；
- 建立 Registry 映射、预校验、人工上传辅助、测试回执和错误记录；
- 建立增量迁移、双读兼容、回滚和测试策略。

### 3.2 当前不在范围

- 未取得适用的 API 技术文档、集成凭据并完成测试验证前直接调用 Registry 正式 API；
- 在平台中存储 EU Login、电子签名或电子印章私钥；
- 把区块链记录等同于法规合规证明；
- 在第二阶段改动页面、数据库、Supabase 或 Vercel；
- 为纺织、家具、建材、消费电子建立最终法规字段；这些行业沿用通用核心和现有模板，待各产品组法规基线确认后扩展；
- 对 BatteryPass-Ready 未覆盖的便携式和 SLI 电池自行设定强制字段。

## 4. 核心业务规则

### 4.1 分类与 Schema

平台必须把以下概念分开：

- `legal_category`：法规定义的电池类别；
- `schema_profile`：用于录入和验证的 Schema 配置；
- `technical_variant`：如是否有 BMS、固定式或非固定式；
- `passport_granularity`：型号、批次或单体；
- `data_granularity`：某个字段实际属于型号、批次还是单体。

首批接入的 BatteryPass-Ready Schema 配置为：

| 配置编码 | 用途 | 说明 |
|---|---|---|
| `battery.ev.v1` | EV 电池 | 来自 `EV.json` |
| `battery.lmt.v1` | LMT 电池 | 来自 `LMT.json` |
| `battery.industrial.non_stationary.v1` | 其他 2kWh 以上工业电池 | 来自 `Other_Industrial_Above_2kWh.json` |
| `battery.industrial.stationary.v1` | 固定式 2kWh 以上工业电池 | 来自 `Stationary_Industrial_Above_2kWh.json` |
| `battery.industrial.without_bms.v1` | 无 BMS 工业电池技术变体 | 来自 `Industrial_Without_BMS.json`，不是独立法定大类 |

### 4.2 数据粒度

- 一个 `product` 可包含多个 `product_model`；
- 一个型号可包含多个 `product_batch`；
- 一个批次可包含多个 `product_item`；
- `dpp_passport` 必须明确绑定型号、批次或单体中的一个；
- 单体级 DPP 必须在存在生产型号/批次时关联对应型号和批次；
- 批次级 DPP 必须在存在型号时关联对应型号；
- 电池运行指标只能写入单体电池，不能覆盖型号静态规格；
- DPP 版本不可就地覆盖，发布后只能创建新版本并保留前一版本。

### 4.3 字段状态

每个法规字段必须具有下列状态之一：

| 状态 | 含义 |
|---|---|
| `CONFIRMED_MANDATORY` | 资料明确为法规强制 |
| `CONDITIONAL` | 满足适用性条件时强制 |
| `DRAFT_MANDATORY` | 来自标准草案、ESPR 通用要求或未定稿二级立法 |
| `VOLUNTARY` | 参考资料明确为自愿 |
| `NOT_APPLICABLE` | 对当前配置不适用 |
| `TBD` | 当前资料不能确认 |

BatteryPass 长表中的 `x` 可映射为 `CONFIRMED_MANDATORY`，但仍需保存原始法规引用；`(x)` 只能映射为 `DRAFT_MANDATORY`；`o` 映射为 `VOLUNTARY`；空值映射为 `NOT_APPLICABLE`。任何自动映射都必须可追溯并可人工复核。

### 4.4 访问控制

- 访问控制必须由服务端和数据库 RLS 共同执行；
- URL 查询参数只能选择展示模式，不能授予数据权限；
- `PUBLIC` 无需登录；
- `LEGITIMATE_INTEREST` 要求经过认证的组织用户，并具有被授予的业务角色或访问目的；
- `AUTHORITY_ONLY` 仅允许被验证的主管机关、市场监管、海关或公告机构角色；
- `INTERNAL` 仅限数据所属组织内部；
- 原始法规访问描述必须保留，平台访问等级只是执行映射；
- 下载文档、读取字段和访问 API 使用同一访问判定服务。

### 4.5 数据完整性和证据

- 每个字段值应记录来源、采集时间、责任人、验证状态和适用 Schema 版本；
- 证明文件必须使用受控对象存储，记录 MIME、大小、Hash、版本和访问策略；
- 发布版本 Hash 应覆盖规范化后的完整快照和证据清单，而不只是 `products` 行；
- 审计日志必须追加写入，不允许普通业务用户修改或删除；
- 区块链锚定属于可选的完整性增强，不改变原始数据和法规状态。

### 4.6 动态数据

动态指标至少包含：

```text
battery_item_id
metric_type
metric_value
unit_code
measured_at
data_source_id
source_device
verification_status
recorded_at
```

SOH、SOC、剩余容量、循环次数、温度、极端温度时长、能量吞吐和异常事件不得覆盖历史值。相同来源、指标和时间戳的重复写入应幂等。

### 4.7 Registry

截至 2026-07-22，EU DPP Registry、生产入口和独立测试环境已经上线，正式实施条例为 Regulation (EU) 2026/1778。当前官方用户指南允许组织注册和在线/文件提交流程测试，但电池语义目录仍在开发，电池 DPP 暂不能成功注册。平台应区分“Registry 已上线”和“电池注册已可用”这两个状态。

Registry 适配必须支持：

- `TEST` 与 `PRODUCTION` 完全隔离；
- 按注册粒度生成映射；
- 关联 UPI、型号标识、批次标识和商品编码；
- 保存 DPP 服务提供商/备份引用（在适用时）；
- 保存映射版本、Schema 版本和 DPP 版本；
- 在提交前验证字段存在性、语义完整性、粒度和数据格式；
- 保存请求、响应、错误、重试和注册证明；
- 注册成功后保存 Registry 生成的持久注册标识；
- 新 DPP 版本继续关联原始注册标识；
- 在正式接口确认前仅提供映射文件、人工上传辅助和测试结果登记。

## 5. 功能需求

| 编号 | 优先级 | 需求 |
|---|---|---|
| FR-001 | P0 | 组织、用户、成员关系、角色和组织级数据隔离 |
| FR-002 | P0 | 产品、型号、批次、单体分层管理 |
| FR-003 | P0 | DPP 与业务对象解耦，支持型号/批次/单体三种粒度 |
| FR-004 | P0 | 不可覆盖的 DPP 版本和完整快照 |
| FR-005 | P0 | 版本化 Schema、字段定义、法规来源、适用性和校验规则 |
| FR-006 | P0 | BatteryPass 五套配置导入并保持来源版本 |
| FR-007 | P0 | 电池型号静态数据与单体动态数据分离 |
| FR-008 | P0 | 服务端角色访问控制和 RLS |
| FR-009 | P0 | Registry 映射、预校验、提交历史和错误记录 |
| FR-010 | P0 | 现有公开 DPP、二维码、GS1 路由和导出兼容 |
| FR-011 | P1 | 受控文件上传、Hash、证据关联和签名 URL |
| FR-012 | P1 | 生命周期事件、维修、再利用、再制造和报废历史 |
| FR-013 | P1 | 完整度、证据完整度、验证进度和 Registry 准备度分项计算 |
| FR-014 | P1 | JSON Schema 校验及字段级错误定位 |
| FR-015 | P1 | DPP 数据包导出和备份引用管理 |
| FR-016 | P2 | 外部 BMS/IoT 动态数据接入 |
| FR-017 | P2 | 完整性锚定与第三方时间戳适配 |

## 6. 非功能需求

| 编号 | 要求 |
|---|---|
| NFR-001 | 所有多租户表必须包含 `organisation_id`，并通过 RLS 校验成员关系 |
| NFR-002 | 管理端写操作通过服务端 API/Server Action，客户端不得直接获得越权写能力 |
| NFR-003 | 关键写入使用事务；发布、版本、Hash 和审计记录保持原子性 |
| NFR-004 | 动态指标按单体、指标和时间建立复合索引，支持历史查询 |
| NFR-005 | Schema、规则、映射和 DPP 实例分别版本化 |
| NFR-006 | 迁移采用编号化 up/down 脚本，先在数据副本验证 |
| NFR-007 | 公开接口不得泄露非公开字段、内部 ID、原始文件路径或个人数据 |
| NFR-008 | 关键日志结构化，包含 correlation id、actor、organisation、action 和结果 |
| NFR-009 | 所有时间使用 `timestamptz`，动态数据额外保存源设备时间和接收时间 |
| NFR-010 | 构建、类型检查、单元、集成、迁移、权限和公开页回归测试必须自动化 |

## 7. 关键用户流程

### 7.1 创建电池 DPP

1. 选择组织和产品行业；
2. 选择法定类别、技术变体和 Schema 配置；
3. 创建产品与型号；
4. 按需要创建批次和单体；
5. 选择 DPP 粒度；
6. 按 Schema 分组录入数据和证据；
7. 运行适用性、类型、单位、访问和证据校验；
8. 生成草稿快照并预览不同角色视图；
9. 发布不可变版本；
10. 生成 Registry 映射并运行本地预校验；
11. 人工上传或通过未来适配器提交；
12. 保存回执、持久注册标识和注册证明。

### 7.2 更新动态数据

1. 认证数据源和单体电池；
2. 校验指标代码、单位和时间；
3. 追加指标记录；
4. 更新派生的“最新值”只读视图；
5. 触发完整性和异常规则；
6. 需要公开新 DPP 版本时创建版本，不修改历史版本。

## 8. 验收标准

第二阶段设计通过需满足：

- 控制指令列出的通用、电池、字段配置和 Registry 对象均有明确归属；
- 目标架构明确前端、服务端、数据库、对象存储和外部适配边界；
- 数据库设计能表达型号、批次、单体、动态数据和生命周期历史；
- 当前每个主要表都有保留、迁移、兼容或废弃策略；
- BatteryPass 五套配置与 100 个长表属性有可追溯迁移策略；
- Registry 映射区分已确认字段、草案字段和 `TBD`；
- 没有把 `(x)`、草案接口或参考模型宣称为最终法规要求；
- 回滚路径不依赖删除旧表或覆盖生产数据；
- 第二阶段不包含业务代码、数据库执行或生产部署。

## 9. 设计决定

| 决定 | 结论 |
|---|---|
| 数据模型 | 关系型核心表 + 电池领域表 + 版本化配置字段，不采用“全部字段塞入单表” |
| 迁移方式 | 加法迁移、回填、双读、切换、延迟废弃 |
| 公开视图 | 一个权威 DPP 数据集，按服务端访问策略投影，不建立互相矛盾的三份数据 |
| BatteryPass | 作为测试和映射基线，保留版本与原始引用，不宣称为最终 EU 语义模型 |
| Registry | 适配器模式；先对接测试环境的文件/人工流程，电池语义目录和 API 集成条件满足后再启用自动提交 |
| 区块链 | 可选完整性锚定，不作为原始数据存储或合规判定器 |
