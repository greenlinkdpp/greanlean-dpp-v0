# 12 Open Business Decisions

Architecture Baseline v2.0 accepts the instructed defaults for B-01, B-02, B-03, B-04, B-05, B-08, B-10, B-16, B-18, B-19, B-21, B-22, B-23, B-24 and B-25. Other questions remain deferred and cannot be inferred from code.

| ID | 问题 | 当前证据 | 推荐默认值 | 风险 | 需要谁确认 |
|---|---|---|---|---|---|
| B-01 | 一个客户 Workspace 与法律主体是否永远 1:1？ | 当前 `dpp_organisation` 混合了两种语义 | 否；Tenant 可含多个 Organisation | 若强制 1:1，会阻碍集团/多国主体 | 产品、销售、法务 |
| B-02 | 不同 Tenant 是否可共享同一个 Supplier Organisation？ | 当前没有全局组织目录 | 不共享可变行；各 Tenant 保存自己的引用 | 共享会形成跨租户侧信道 | 产品、安全、数据治理 |
| B-03 | Partner 是否允许客户主动邀请？ | 当前 Partner 不是一等对象 | 允许发起，需 Tenant 授权人批准并可撤销 | 社工/误授权 | 产品、安全、客户成功 |
| B-04 | Partner 授权是否需要双人审批？ | 当前无正式流程 | Publisher/Admin 等高风险能力需要双人审批 | 单人误授权 | 安全、合规、运营 |
| B-05 | 一个 Batch 是否可能跨多个 SKU？ | 电池 Batch 只绑定 Model/Product；业务未确认 | 架构允许 0:N link | 简化为 0:1 会导致未来迁移 | 制造业务、客户 |
| B-06 | 同一个 Individual 是否可能重新归属 SKU？ | 当前 item 可选 Batch，无 SKU 实体 | 允许通过审计事件更正；不改历史版本 | 追溯断裂 | 产品、制造、合规 |
| B-07 | serial 唯一域是什么？ | 当前按 organisation 的电池 serial 约束 | Tenant + issuer + scheme；UPI 全局唯一 | 冲突或错误合并 | 客户、标准负责人 |
| B-08 | Product Family 是否用于权限或只用于继承？ | 当前不存在 | 只用于分类/继承，不作为首期安全边界 | scope 过度复杂 | 产品、安全 |
| B-09 | DPP 粒度由谁决定：Model/SKU/Batch/Item？ | 现有行业/电池规则并存 | Schema applicability + Tenant 业务决定，发布前审核 | 错误粒度导致法规不符合 | 合规、产品、客户 |
| B-10 | 一个 subject 是否允许多个 active Passport？ | 当前 `dpp_id` 近似单一 | 默认一个；法规/市场 profile 明确时例外 | 标识歧义 | 合规、标准负责人 |
| B-11 | Withdrawn DPP 对公众显示 tombstone 还是 404？ | 当前未形成统一规则 | 显示最小 tombstone、原因类别和日期 | 404 破坏追溯；过多信息泄露 | 法务、合规、产品 |
| B-12 | 已发布版本的保留期？ | 当前不可变历史基础，无统一保留政策 | 至少满足适用法规与合同，禁止普通删除 | 存储成本/法定义务 | 法务、合规、运营 |
| B-13 | `CLEAR` 是否允许覆盖法规必填值？ | 当前 null 语义不统一 | 可记录，但验证阻止发布 | 绕过必填规则 | Schema owner、合规 |
| B-14 | 原始 source record 保存多久？ | 当前 provenance 分散 | 按分类保存引用/哈希，敏感原文最小化 | 无法审计或过度保留 | 隐私、数据治理、安全 |
| B-15 | 哪些来源可自动标记 VERIFIED？ | BMS/人工/证据状态并存 | 默认 UNVERIFIED，可信连接器+规则才升级 | 虚假可信声明 | 合规、数据治理 |
| B-16 | Registry 接受是否是本地发布前提？ | 当前 TEST adapter 与发布解耦 | 默认不是；用独立 Registry State | 外部故障阻塞或状态误导 | 合规、产品 |
| B-17 | Registry 是否要求特定主体结构？ | 无 Production connector/contract | 通过 adapter 映射，不改变核心层级 | 过早耦合外部格式 | 标准负责人、Registry owner |
| B-18 | 旧 QR/URL 兼容期多长？ | 实际 QR inventory 未验证 | 永久解析关键标识；弃用只针对非永久 API | 实体产品二维码失效 | 产品、运营、客户 |
| B-19 | 是否开放 Tenant custom domain？ | 当前无域名控制面 | Phase 1 不开放；未来需所有权验证 | 域名劫持/缓存混淆 | 产品、安全、运营 |
| B-20 | Field access purpose 由谁审批？ | access level 存在，purpose 模型有限 | 权限模板定义允许 purpose，Authority 需专项批准 | 目的漂移 | 合规、安全 |
| B-21 | Platform support 是否需要 impersonation？ | 当前无正式机制 | 默认不实现；确有需要时只读、短时、双审计 | 高权限滥用 | 运营、安全、法务 |
| B-22 | EU/China 数据驻留与跨境边界？ | 无完整区域部署证据 | 默认数据留在 Tenant 配置区域，跨境先审批 | 违法传输 | 法务、隐私、安全 |
| B-23 | API V1 客户和弃用期限？ | 当前客户 inventory 不可用 | 在 inventory/通知完成前不设 sunset | 客户中断 | 产品、客户成功 |
| B-24 | Production RPO/RTO？ | 备份/恢复未证明 | 由业务影响分析设定并通过演练证明 | 无法判断恢复是否合格 | 运营、业务 owner |
| B-25 | 谁能接受 Critical residual risk？ | 当前未定义 | 安全、产品、运营和业务 owner 联合签署 | 实现团队自行放行 | 管理层、风险 owner |

## Phase 1 baseline defaults

Phase 1 使用上述已接受默认值：Tenant 与法律主体非 1:1；Partner 申请需 Tenant 确认；高风险能力显式授权并审计但暂不做通用双人审批；不实现 impersonation；只保存 residency policy、不做自动跨境；RPO/RTO 延后至恢复证据；Critical residual risk 必须由明确 risk owner 接受。

## Decisions required before product/passport phases

B-05 至 B-19 必须在产品层级、Passport、Schema/Claim 或 Resolver 对应实现阶段前确认。没有答案时，代码必须保留推荐的宽松可表达模型，不能把推荐默认值固化为不可逆业务事实。
