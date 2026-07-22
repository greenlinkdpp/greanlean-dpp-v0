# 电池 DPP 已知不确定项

版本：Phase 2  
状态：持续维护  
日期：2026-07-22

本文件记录当前资料无法确认或仍处于草案阶段的事项。未关闭的不确定项不得被实现为不可配置的法规强制逻辑，也不得用于宣称产品“已经合规”。

| 编号 | 不确定项 | 当前处理 | 关闭条件 |
|---|---|---|---|
| U-002 | Registry API 的集成认证、请求/响应 Schema 和完整错误码尚未纳入项目基线 | 先实现 UI/JSON/XML 文件流程和 adapter 边界 | 官方 API 技术文档、测试集成方式和凭据可用 |
| U-003 | Registry semantic repository 的电池语义模型和版本机制尚未发布 | `registry_schema_version` 可空，mapping 版本独立；阻止成功状态 | 官方 User Guide 更新并发布可机器读取的电池语义目录 |
| U-004 | BatteryPass-Ready v1.0 JSON Schema 尚未实现字段粒度、更新要求和静态/动态维度 | 这些维度从 Longlist v1.3 导入并保留来源 | 上游 Schema 正式纳入这些维度并完成差异迁移 |
| U-005 | Longlist 中 `(x)` 来自 ESPR/JTC-24 草案，不等同于已确认电池法规必填 | 映射为 `DRAFT_MANDATORY` | 对应标准/实施文件正式发布并确认适用性 |
| U-006 | BatteryPass 提供的五套 JSON 未覆盖 portable 和 SLI 电池 | 平台分类可扩展，但不建立强制字段 | 提供对应法规基线和 Schema |
| U-007 | `Industrial Without BMS` 是技术变体，Longlist 说明其将在后续版本正式纳入 | 独立 schema profile + industrial legal category | 上游长表和 Schema 对其类别规则正式对齐 |
| U-008 | 型号 + 日历年 + 制造场所粒度是否等价于 Registry batch 粒度 | 设计为 batch-like reporting scope，不自动等价 | 官方粒度指南或接口规范确认 |
| U-009 | UPI、operator identifier、facility identifier 和 data carrier 最终采用的协调标准/签发机构规则未确认 | 通用标识表支持多 scheme；现有 GS1 保留为一种方案 | 协调标准或产品组规则发布 |
| U-010 | `persons with a legitimate interest` 的申请、验证、授权、撤销和审计机制未明确 | 平台使用角色 + 目的 + 有效期策略，不默认开放 | 适用法规/实施规则和业务验证流程确认 |
| U-011 | 不同产品组和电池护照的 Registry/DPP 保存期限 | 保留策略配置化，不把草案 10 年写死 | 适用 Union law 或产品组规则确认 |
| U-012 | 每个字段的具体生效日期和过渡安排 | `effective_from` 允许为空；不按平台经验填日期 | 正式法规、委托法案或实施法案确认 |
| U-013 | DPP 服务提供商资格、备份副本格式、引用字段和可用性 SLA | 预留 hosting reference，不实现“合格服务商”声明 | 服务提供商规则和认证机制发布 |
| U-014 | 官方指南已明确 EU Login、EC-sealed PDF 和 QES/QSeal 流程，但 Greanlean 是否代办、仅跟踪还是直接集成尚未决定 | 只保存 enrolment 状态、外部引用和证明文件，不保存 EU Login 凭据或签章私钥 | 完成 TEST 组织验证演练并确定平台责任边界 |
| U-015 | BatteryPass 中 DPP identifier 与每次归档版本标识的最终关系 | 护照身份和版本身份分开建模，映射保持可配置 | JTC-24/官方语义定义确认 |
| U-016 | SOH 是否以独立法规字段出现 | 作为可选动态指标，不计入法规完整度 | 提供明确法规/标准字段引用 |
| U-017 | 动态指标的“保持最新”频率 | 每条记录保留时间；频率由字段配置 `TBD` | 官方指南、委托法案或业务适用规则确认 |
| U-018 | 事故、深度放电、过充等数据应作为累计指标、生命周期事件或两者 | 事故进入事件；累计值按配置保留，避免重复计算 | 上游语义和事件模型确认 |
| U-019 | BatteryPass codelist 文档中 `%/month` 在提取文本出现字符差异 | 以原始 JSON Schema 和人工复核值为准 | 上游发布机器可读权威 codelist |
| U-020 | 当前数据库演示数据和自动生成 PDF 是否可视为证据 | 一律不视为正式证据 | 客户上传原始文件并通过验证流程 |
| U-021 | 区块链网络、锚定频率、成本、治理和法律效力 | 保留可选 adapter；不纳入合规评分 | 用户批准技术方案并完成法律/安全评估 |
| U-022 | 其他四个行业的最终 DPP 字段和执行规则 | 仅保留通用核心与现有演示模板 | 各产品组正式法规基线确认 |
| U-023 | Registry 已上线，但当前官方 User Guide 明确电池 DPP 不能成功注册 | 仅允许准备、测试和记录失败/处理中状态，不显示成功 | 官方电池语义目录上线并通过端到端注册测试 |

## 已关闭事项

| 编号 | 事项 | 关闭依据 |
|---|---|---|
| R-001 | Registry 实施条例是否仍为草案 | Commission Implementing Regulation (EU) 2026/1778 已于 2026-07-16 通过并于 2026-07-17 发布 |
| R-002 | Registry 和独立测试环境是否存在 | 欧盟委员会于 2026-07-20 宣布 Registry 与 testing environment 上线 |

## 复核规则

关闭不确定项时必须：

1. 记录新来源文件、版本、发布日期和 Hash；
2. 指明影响的 Schema、字段、规则和迁移；
3. 提供旧版本到新版本的兼容策略；
4. 增加或更新自动化测试；
5. 更新本文件、法规引用和变更日志；
6. 不直接覆盖已发布 DPP 版本。
