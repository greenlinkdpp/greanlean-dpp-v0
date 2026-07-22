# Greanlean 电池 DPP 与 Registry 迁移映射

版本：Phase 2 / migration-mapping  
状态：待法规和架构确认  
日期：2026-07-22

## 1. 映射范围

本文件描述三类映射：

1. Greanlean 当前表到目标领域表；
2. BatteryPass-Ready 字段组到目标数据模型；
3. 已发布 DPP 版本到 EU DPP Registry 注册记录。

它不是正式 Registry payload 规范，也不声明 Greanlean 已满足全部电池法规要求。

## 2. 资料基线和可信状态

| 资料 | 版本/日期 | 在本设计中的作用 | 状态 |
|---|---|---|---|
| ESPR Regulation (EU) 2024/1781 | 2024-06-13 | DPP、标识、载体、访问、备份和 Registry 核心要求 | 正式法规 |
| Commission Implementing Regulation (EU) 2026/1778 | 2026-07-16，OJ 2026-07-17 | Registry 组件、注册流程、验证、证明、版本和日志 | 正式实施条例 |
| DPP Registry User Guide for Economic Operators | v1.0 / 2026-07-17 | 当前 UI、组织验证、在线/文件提交和错误处理 | 官方操作指南；会随系统更新 |
| 用户提供的 implementing regulation DOC_1 | 文件含 `…/...` 和 `XXX` | 与正式文本做来源追溯对比 | 已被正式 Regulation (EU) 2026/1778 取代 |
| BatteryPass-Ready Data Attribute Longlist | v1.3 / 2026-03 | 100 个属性的类别适用性、访问、静态/动态和粒度 | 参考基线，明确可能变化 |
| BatteryPass-Ready Data Model Documentation | v1.0 / 2026-06-24 | 五套 JSON Schema 的结构和数据类型 | 测试模型，不是官方最终语义模型 |
| BatteryPass-Ready JSON Schemas | v1.0 | 本地 Schema 导入和测试校验 | 测试配置 |
| BatteryPass-Ready codelists | 2026 | 类别、状态、化学体系和单位代码 | 测试配置 |
| JRC145830 | 用户提供版本 | DPP 词汇、粒度、访问和用例设计方法 | 方法论，不直接产生强制字段 |

本地来源路径记录在版本库文档中仅用于内部审计；正式实施时应为每个来源建立受控文件记录、Hash 和可访问的来源 URI。

官方在线来源：

- [Regulation (EU) 2026/1778](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32026R1778)
- [European Commission DPP Registry](https://single-market-economy.ec.europa.eu/single-market/digital-product-passport/dpp-registry_en)
- [DPP Registry User Guide for Economic Operators v1.0](https://single-market-economy.ec.europa.eu/document/download/079a45e2-469f-4eec-b1e5-32e8e05d1357_en?filename=dpp_registry_user_guide_for_economic_operators.pdf)
- [Registry launch announcement, 2026-07-20](https://single-market-economy.ec.europa.eu/news/digital-product-passport-registry-now-live-2026-07-20_en)

## 3. BatteryPass 配置映射

### 3.1 五套 JSON 与平台分类

| 来源文件 | `schema_definition.code` | legal category | technical variant | 备注 |
|---|---|---|---|---|
| `EV.json` | `battery.ev` | electric vehicle battery | standard | EV 专有能量字段存在 |
| `LMT.json` | `battery.lmt` | LMT battery | standard | LMT 配置 |
| `Other_Industrial_Above_2kWh.json` | `battery.industrial.non_stationary` | industrial/non-stationary battery | above_2kwh | 非固定式工业配置 |
| `Stationary_Industrial_Above_2kWh.json` | `battery.industrial.stationary` | industrial/stationary battery | above_2kwh | 固定式工业配置 |
| `Industrial_Without_BMS.json` | `battery.industrial.without_bms` | industrial（具体子类需用户选择） | without_bms | 技术变体，不作为第五个法定大类 |

五份 JSON 共用大部分定义路径。当前分析得到：

- EV：约 452 个叶级 Schema 路径；
- LMT：约 482 个；
- 无 BMS 工业：约 387 个；
- 其他工业 >2kWh：约 434 个；
- 固定式工业 >2kWh：约 482 个；
- 五份共有约 386 个路径，合计约 499 个不同路径。

这些路径包括属性定义、类型、单位和访问扩展，不等于 499 个业务字段。业务字段以长表的 100 个属性为主键来源，JSON pointer 作为技术映射。

### 3.2 长表状态转换

| 长表值 | 平台状态 | 自动处理 |
|---|---|---|
| `x` | `CONFIRMED_MANDATORY` | 加载法规引用；仍需来源复核 |
| `(x)` | `DRAFT_MANDATORY` | 不计入“已确认法规必填完整度” |
| `o` | `VOLUNTARY` | 可录入，不阻止发布 |
| 空白 | `NOT_APPLICABLE` | 默认不显示，可在管理员调试视图查看 |
| 无法解析 | `TBD` | 阻止自动宣称 Registry ready |

长表统计（v1.3）：

| 维度 | 数量 |
|---|---|
| 总属性 | 100 |
| 静态 | 78 |
| 动态 | 22 |
| Public | 64 |
| legitimate interest | 27 |
| legitimate interest + Commission | 5 |
| notified bodies / market surveillance / Commission | 4 |
| 型号 | 47 |
| 单体 | 29 |
| 型号 + 日历年 + 制造场所（批次语义） | 20 |
| 型号 + 制造场所 | 4 |

### 3.3 访问映射

| BatteryPass 原始访问描述 | 平台默认等级 | 额外策略 |
|---|---|---|
| Public | `PUBLIC` | 无需登录 |
| persons with a legitimate interest | `LEGITIMATE_INTEREST` | 认证角色 + 合法利益目的 + 授权有效期 |
| persons with a legitimate interest and the Commission | `LEGITIMATE_INTEREST` | Commission 角色显式加入 grant；不自动扩大到所有专业用户 |
| Notified bodies, market surveillance authorities and the Commission | `AUTHORITY_ONLY` | 仅验证后的主管机关/公告机构角色 |
| Greanlean 内部运营字段 | `INTERNAL` | 不是法规访问级别，只用于平台治理 |

原始访问字符串保存在 `regulatory_reference` 或字段来源元数据中，避免平台四级映射丢失语义。

### 3.4 粒度映射

| 长表粒度 | 目标对象 |
|---|---|
| Battery model | `product_model` / `battery_model_profile` |
| Battery model per manufacturing site | `product_model` + facility-scoped record |
| Battery model per calendar year and per manufacturing site | `product_batch` 或 batch-like reporting scope |
| Individual battery | `product_item` / `battery_item` |

“batch-like reporting scope”不能仅凭字段名强制创建物理生产批次；实施时需要确认该报告粒度与 Registry 批次标识的关系，当前标记 `TBD`。

## 4. BatteryPass 字段组到目标表

### 4.1 标识与产品数据

| BatteryPass 属性 | 目标 | 说明 |
|---|---|---|
| DPP Schema version | `dpp_version.schema_version_id` | 通过 FK 引用，不复制自由文本 |
| DPP Status | `dpp_passport.status` / `dpp_version.status` | 护照资源状态与版本状态分离 |
| DPP Granularity | `dpp_passport.granularity` | BatteryPass 当前固定 Item；正式要求仍由适用规则决定 |
| Date-time of latest update | `dpp_version.published_at` 或投影时间 | 不接受人工填写 |
| Unique battery passport / DPP identifier | `unique_identifier` + `dpp_passport` | DPP 版本标识与护照身份关系需按最终标准确认 |
| Unique battery / product identifier | `unique_identifier` + `product_item` | 持久 URI |
| Battery model identifier | `product_model.model_identifier` | 批次/单体 DPP 也保留上级型号 |
| Battery serial number | `product_item.serial_identifier` | 单体 |
| Unique economic operator/manufacturer/facility identifiers | `unique_identifier` | subject 分别指 organisation/facility |
| Economic operator/manufacturer information | `organisation` + passport responsibility relation | 个人数据最小化 |
| Manufacturing place/date | `product_batch` / `product_item` | 按来源粒度 |
| Date put into service | `battery_item.commissioned_at` + lifecycle event | 单体 |
| Warranty period | `battery_model_profile` 或文档化规则 | 日期语义需按来源复核 |
| Battery category | `battery_model_profile.legal_category_code` | codelist |
| Battery mass | `battery_model_profile` | 值 + 单位 |
| Battery status | `battery_item.battery_status_code` + lifecycle event | 状态变化不可丢历史 |

### 4.2 符号、标签和符合性文件

| 属性组 | 目标 |
|---|---|
| Separate collection / Cd/Pb / carbon footprint labels | `document` + `battery_compliance_document`，文档角色为 label |
| Extinguishing agent | `field_value` 或未来安全规格结构化列 |
| Meaning of labels and symbols | `document` 或字段值 |
| EU declaration of conformity | `document` + `battery_compliance_document` |
| Test report results | `document` + `battery_compliance_document`，默认 `AUTHORITY_ONLY` |

### 4.3 碳足迹与可持续性

碳足迹总值、生命周期阶段贡献、等级、研究链接和再生含量进入 `battery_sustainability_data`。该表必须支持型号、日历年、制造场所和批次范围，保存方法、验证者、来源文件和 Schema 版本。

### 4.4 尽职调查

尽调报告信息进入 `document` 与 `battery_sustainability_data` 的报告关联；第三方保证和供应链指数可在结构确认前使用 `field_value`。不得把报告 URL 当作已验证证据，必须另存验证状态和 Hash。

### 4.5 材料和组成

| 属性 | 目标 |
|---|---|
| Battery chemistry | `battery_model_profile.battery_chemistry_code` |
| Critical raw materials | `battery_material_composition`，标记 `is_critical` |
| Hazardous substances | `battery_material_composition` 或专用 substance 关联 |
| Cathode/anode/electrolyte materials | `battery_material_composition.material_role` |
| Substance impact information | `field_value` + 证据文档，后续结构化 |

### 4.6 循环与拆卸

拆卸手册、安全措施、部件号和备件来源进入 `battery_disassembly_information` 与 `document`；最终用户废物预防、分类收集和寿命结束信息进入公共说明字段或文档，但由 Schema 字段定义控制展示和语言版本。

### 4.7 性能和耐久性

静态性能进入 `battery_performance_spec`：

- 额定容量、容量衰减；
- 认证可用能量（EV 适用时）；
- 电压范围和标称电压；
- 原始功率、功率衰减和最大允许功率；
- 初始/寿命中期效率和效率衰减；
- 初始内阻及增长；
- 预期年限、预期循环、测试参考和 C-rate；
- 闲置温度上下限。

动态性能进入 `battery_operating_metric`：

| 动态属性 | `metric_type` 建议值 |
|---|---|
| Remaining capacity | `REMAINING_CAPACITY` |
| Remaining usable battery energy | `REMAINING_USABLE_ENERGY` |
| State of certified energy | `SOCE` |
| State of Charge | `SOC` |
| Remaining power capability | `REMAINING_POWER_CAPABILITY` |
| Remaining round trip efficiency | `REMAINING_ROUND_TRIP_EFFICIENCY` |
| Current/evolution of self-discharge | `SELF_DISCHARGE_RATE` / `SELF_DISCHARGE_EVOLUTION` |
| Full charge/discharge cycles | `FULL_CYCLE_COUNT` |
| Energy/capacity throughput | `ENERGY_THROUGHPUT` / `CAPACITY_THROUGHPUT` |
| Temperature information | `TEMPERATURE` |
| Extreme temperature durations | 分别使用受控 metric code |
| Deep discharge / overcharge events | 累计指标或事件，两者关系需定义 |
| Accident information | `battery_lifecycle_event` 为主，指标表只保存可量化状态 |

BatteryPass v1.3 没有单独列出 SOH 属性编码；平台不得自行把 SOH 标为法规必填。可作为自愿动态指标，直到来源确认。

## 5. 当前 Greanlean 表到目标表

| 当前来源 | 当前问题 | 目标 | 迁移规则 |
|---|---|---|---|
| `products` | 产品、型号和护照字段混合 | `product`, `product_model`, `dpp_passport` | 每行建立产品族 + 默认型号；按 `granularity_level` 建护照，无法确认则 `TBD` |
| `products.dpp_id` | 与产品行绑定 | `unique_identifier` | 作为 legacy DPP identifier 保留，不自动宣称符合最终 UPI 标准 |
| `products.commodity_code` | 自由文本 | `product_model.commodity_code` | 原样迁移并标记未验证 |
| `products.current_version` | 无完整快照语义 | `dpp_version.version_number` | 与 `product_versions` 对账 |
| `dpp_category_profiles` | 分类与 Schema 混合 | `schema_definition` | sector/category/variant 拆分 |
| `dpp_field_templates` | 来源、粒度、状态不足 | `field_definition` | 补法规来源、粒度、行为、访问和 requirement status；未知为 TBD |
| `dpp_validation_rules` | 结构预留 | `validation_rule`, `applicability_rule` | 按 rule type 拆分 |
| `product_sector_field_values` | 扁平值、粒度不足 | 电池结构化表或 `field_value` | 先按 field key 映射；不能唯一映射的进入人工复核队列 |
| `product_digital_identity` | GTIN/批次/序列同表 | `unique_identifier`, `data_carrier` | 分主体迁移；Digital Link 建 carrier |
| `product_versions` | 快照只覆盖部分产品行 | `dpp_version` | 保留原 snapshot/hash 为 legacy；新发布后使用完整快照 |
| `product_materials` | 通用材料结构 | `battery_material_composition` | 仅电池产品迁移；其他行业继续保留 |
| `product_esg_metrics` | 单行汇总 | `battery_sustainability_data` | 只迁移有来源的值；方法和验证者随记录迁移 |
| `product_certificates` | 文件 URL 不受控 | `document`, `battery_compliance_document` | URL 先作为 external reference；后续受控上传 |
| `product_documents` | 文件和业务语义混合 | `document`, `document_link` | 按 document type 关联字段/版本 |
| `product_traceability` | 事件不区分单体 | `battery_lifecycle_event` | 只有可定位单体的事件自动迁移，否则留在产品级旧表 |
| `product_circularity` | 汇总文本 | `battery_disassembly_information` + `field_value` | 文档链接优先，文本保留来源 |
| `product_data_governance` | 产品级汇总 | `data_source` + 字段验证状态 | 不伪造字段级来源，缺失部分标记待补 |
| `dpp_evidence_links` | 证据关系已有雏形 | `document_link` | 保留字段 key 和 Hash |
| `dpp_audit_logs` | 权限和不可变性不足 | `audit_log` | 原样迁移并标记 legacy actor |
| `dpp_blockchain_anchors` | 仅记录，无链路保证 | 后续 `integrity_anchor` | 保留历史，不用于法规判定 |

## 6. Registry 映射

### 6.1 ESPR 已确认的边界

依据 ESPR 第 13 条，Registry 至少安全保存唯一标识符；对拟进入自由流通海关程序的产品保存商品编码；对电池保存 Regulation (EU) 2023/1542 第 77(3) 条所指唯一标识符。其他 Registry 数据应由适用委托法案或实施安排明确。

因此 Greanlean 需要准备完整 DPP，但不应默认把 100 个 BatteryPass 属性全部提交到 Registry。

### 6.2 正式实施条例与当前操作映射

Regulation (EU) 2026/1778 已正式发布，Registry 与测试环境已上线。当前操作细节来自 User Guide v1.0；指南会随系统迭代，因此 UI 限制使用 `operational_rule_version` 管理，不写死为永久法规规则。

| Registry 概念 | Greanlean 来源 | 状态/说明 |
|---|---|---|
| product group | `schema_definition.sector/category` | 当前 UI 首个产品组为 Batteries；正式代码/语义目录版本仍需读取 |
| granularity | `dpp_passport.granularity` | 法规支持模型/批次/单体；当前电池 UI 仅开放 Item |
| UPI / unique identifiers | `unique_identifier` | 当前指南要求 UPI 为符合 JTC 24 的 URL，最大 50 字符；最终标准版本需保存 |
| model identifier | `product_model.model_identifier` | 当前电池 Item 表单为 optional；法规层级关系仍由适用 Union law 校验 |
| batch identifier | `product_batch.batch_identifier` | 当前电池 Item 表单为 optional；存在生产设计时的关联规则需保留 |
| commodity code | `product_model.commodity_code` | 需代码范围校验，代码表版本 TBD |
| DPP service provider reference / backup link | 未来 `dpp_hosting_reference` | 当前系统尚无服务提供商和备份引用模型 |
| registrant information | `organisation` + verified status | Registry 使用 EU Login；组织验证涉及 QES/QSeal |
| DPP integrity | `dpp_version.snapshot_hash` | 实施条例要求注册完整性/验证；算法和接口字段按官方版本映射 |
| qualified signature/seal | 外部签章适配 | 不在 DB 存私钥 |
| registration identifier | Registry 响应 | 写入 `persistent_registration_id` |
| registration timestamp | Registry 响应 | 不使用本地时间冒充 Commission timestamp |
| proof hash | `dpp_version.snapshot_hash` | 与 Registry proof 返回值对账 |

当前文件提交流程还明确：

- 支持 JSON 或 XML；
- 单个文件最多 100 个 DPP 注册请求；
- 当前指南列出的文件上限为 1 GB；
- 文件名仅允许字母、数字、点、下划线和连字符；
- UPI 使用 HTTPS URL；
- 同一批提交中一个 DPP 出错会使整批失败；
- 返回 correlation id，并可导出错误 CSV。

这些属于 User Guide v1.0 的操作规则，应配置化并绑定指南版本。

组织 enrolment 映射：

| Registry 当前要求 | Greanlean 目标 |
|---|---|
| Legal Person / Natural Person | `organisation.legal_person_type` |
| 法定名称与注册地址 | `organisation` + `organisation_address` |
| NTR/LEI/VAT/eID 或 TIN/PNO/IDC/PAS 等 | `unique_identifier`，标识类型保持原代码 |
| 合规联系人 | `organisation_contact`，默认受限访问 |
| EU Login | 外部身份关联状态，不保存 EU Login 凭据 |
| 法定代表人 | `registry_organisation_enrolment` 的受限数据 |
| EC-sealed declaration + QES/QSeal | `document` + enrolment 证据关联 |
| application/correlation/status | `registry_organisation_enrolment` |

### 6.3 注册粒度校验

| 护照粒度 | 本地提交前规则 |
|---|---|
| MODEL | 架构支持；当前电池 UI 尚未开放，等待产品组语义规则 |
| BATCH | 架构支持；当前电池 UI 尚未开放，等待产品组语义规则 |
| ITEM | 当前电池 UI 唯一开放粒度；UPI 必填，model/batch identifier 在当前表单中可选 |

“unique product”或不存在型号/批次设计的例外必须由明确业务标记和证据支持，不能仅因字段为空自动认定。

当前官方 User Guide v1.0 明确说明电池 semantic catalogue 尚未定义，因此截至本设计日期无法成功完成电池 DPP 注册。Greanlean 可以准备和测试请求，但不得把“提交到界面”显示为“注册成功”。

### 6.4 本地预校验

提交前至少检查：

- DPP 版本已发布且快照 Hash 存在；
- Schema 和 Registry mapping 均为 published 版本；
- 当前类别的 `CONFIRMED_MANDATORY` 字段完整；
- `DRAFT_MANDATORY` 和 `TBD` 数量单独报告；
- 注册粒度与标识关系正确；
- UPI、商品编码、URI、日期和代码表格式正确；
- 证据和访问策略不把受限数据写入公开 payload；
- Registry 环境与凭据引用一致；
- payload 保存 Hash，日志中不泄露凭据。

本地预校验只确认存在性、格式和内部一致性，不确认数据事实准确或法律合规。

## 7. 数据回填分类

每个迁移值标记：

| 状态 | 含义 |
|---|---|
| `AUTO_MAPPED` | 来源和目标一一对应，类型校验通过 |
| `TRANSFORMED` | 经过规范化、单位或代码转换 |
| `LEGACY_ONLY` | 保留展示但无可靠法规映射 |
| `REVIEW_REQUIRED` | 多个目标或粒度不明确 |
| `MISSING_SOURCE` | 页面曾显示，但数据库无权威来源 |
| `REJECTED` | 类型、单位或标识冲突，未迁移 |

系统自动生成的演示化学文件、声明和页面 fallback 一律标记 `LEGACY_ONLY` 或 `MISSING_SOURCE`，不得迁入正式证据状态。

## 8. 迁移验收

- 每个旧产品可追溯到新 `product` 和默认 `product_model`；
- 旧 DPP URL、public slug 和 GS1 路由仍可解析；
- 新旧公开数据投影差异有机器可读报告；
- 所有迁移值都有迁移状态和来源行 ID；
- BatteryPass 字段定义保留上游版本、原始名称、JSON pointer 和法规引用；
- 22 个动态属性不进入覆盖式通用字段表；
- 受限字段不会出现在未认证公开响应；
- Registry payload 不包含未映射的完整 DPP 数据；
- 草案字段、`(x)` 和未知生效日期不会计入“法规已满足”；
- 回滚后旧页面和旧表仍可读。
