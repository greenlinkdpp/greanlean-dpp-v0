# 09 V1 → V2 Gap Analysis

优先级：P0 数据安全/租户隔离/生产稳定；P1 核心架构；P2 功能完整；P3 未来增强。

| 能力 | 当前实现 | V2 目标 | 差距 | 处理建议 | 优先级 |
|---|---|---|---|---|---|
| Tenant | organisation + P0 org scope | 一等 tenant、强制归属、配置 | legacy 核心无 org FK | additive tenant ownership + backfill | P0 |
| Partner | service_provider org/partner_editor 逻辑 | 一等 partner | 语义隐含 | partner profile/relationship | P1 |
| Partner↔Tenant | product/sector grant | 时效授权关系 | 无 binding/tenant permission profile | 新 authorization 对象 | P0 |
| Organization | `dpp_organisation` + operator profile | tenant 内 company/facility/supplier/institution | org 与 tenant 层级未区分 | org hierarchy + typed relations | P1 |
| User | Supabase Auth + membership | lifecycle/invite/MFA/SSO | 缺管理 UI/API | identity service | P2 |
| Role | SQL enum | tenant/platform role profiles | 新角色需 migration | role table + immutable code | P1 |
| Permission | 代码能力判断 | capability catalog | 无 permission entity | resource/action permission | P1 |
| Scope | org/product/sector | tenant/org/project/product/facility/own | 不完整 | typed scope grants | P1 |
| Field Policy | access levels + policy table | runtime purpose/field policy | policy table未统一执行 | policy evaluator | P1 |
| Product Family | 无 | 可选 family | 缺失 | 新表 | P2 |
| Model | products + battery profile | 通用 model | 语义混合 | additive model + legacy mapping | P1 |
| SKU | `products.sku` text | Model 1:N SKU | 无实体/唯一边界 | 新表 | P1 |
| Batch | battery only | 通用 batch | 非电池缺失 | core batch + sector extension | P2 |
| Individual | battery only | 通用 item | 非电池缺失 | core item | P2 |
| Inheritance | battery scope override 雏形 | family→model→SKU→batch→item | UI/通用解析缺失 | resolution service | P1 |
| DPP identity | product dpp_id | passport identity separate | identity/version混合 | `dpp_passport` | P1 |
| Version | canonical publication + legacy versions | single immutable authority | fallback 双源 | canonical cutover | P0 |
| Workflow | review/validation/publication 分表 | configurable state machine | product status 漂移 | orchestration + invariants | P1 |
| Schema | Registry 已有 | 全行业+tenant extension | 应用接入集中电池 | schema service/API/UI | P1 |
| Field | definition + legacy templates | stable semantic field | 多源定义/fallback | consolidate catalogue | P1 |
| Rule | validation/applicability + code rules | rule-driven compliance | 执行分散 | versioned rule evaluator | P1 |
| Regulation | references + battery catalog | requirement traceability | 非电池弱 | regulation/requirement model | P2 |
| Mapping | 固定 import/专用 adapter | versioned mapping layer | 缺统一模型 | mapping profile/rule | P1 |
| Canonical Model | canonical publication | canonical ingestion + subject model | 只在发布端规范化 | canonical claim/value layer | P1 |
| Provenance | 多表来源字段 | value-level provenance | 碎片化/原值缺失 | source/provider/transformation chain | P1 |
| Lifecycle | 通用/电池 event | typed append-only events/snapshots | 两套模型 | adapter + core event | P2 |
| BMS | 可用 API/metrics | scalable telemetry boundary | 无 retention/rollup/TS ops | partition/aggregation when needed | P2 |
| Identity | user/org/device | typed actors/providers/consumers | supplier/authority 混合 | identity relationships | P2 |
| Credential | BMS API credential；proof | VC/claim credential service | 不是 VC | 只预留；业务需要再实现 | P3 |
| VC | 无 | issue/verify/revoke adapter | 全缺 | interface only now | P3 |
| JSON-LD | json/json pointer | context/vocabulary output | semantic URI/context 缺失 | semantic registry | P3 |
| UNTP | 无完整实现 | optional adapter | 基础不全 | 只预留接口 | P3 |
| Catena-X/EDC | 无 | optional dataspace connector | 全缺 | 只预留外部 reference/policy | P3 |
| Registry | TEST mapping/manual result | async connector | 无 production connector/job | adapter + outbox later | P2 |
| QR | arbitrary URL PNG | registered carrier | 无 carrier lifecycle | data carrier service | P2 |
| Resolver | alias/GS1/redirect 分散 | stable centralized resolver | 无控制面/tenant domains | resolver route + mapping store | P1 |
| Audit | access + operation logs | unified immutable audit | 行为覆盖不全 | audit envelope/outbox | P0 |
| API | 46 methods，部分 `/v1` | fully versioned contracts | 多数未版本化 | preserve V1, introduce V2 | P1 |
| Import | fixed templates/P0 preflight | staged mapping/commit | client-heavy/commit incomplete | import service/jobs | P2 |
| Files | private storage/version/hash | tenant + subject + retention | org 间接、无 retention | add ownership/classification | P1 |
| Feature Flag | env flags | tenant-scoped evaluated flags | 两个 public flag 未使用 | flag service | P1 |
| Deployment | Vercel/Supabase, preview guidance | dev/staging/preprod/prod isolation | IaC/actual proof missing | environment manifest/gates | P0 |
| Regional nodes | single DB | residency-aware nodes | 无 region boundary | design only now | P3 |

## 当前最优先 5 项

1. **P0：建立可证明的租户边界**——所有核心对象有 tenant ownership；API/RLS/导出/文件一致检查。
2. **P0：关闭未受控的发布双源风险**——canonical snapshot 成为唯一正式输出，legacy fallback 只保留可观测兼容模式。
3. **P0：建立生产 schema/RLS/backup 证据**——migration ledger、drift check、restore rehearsal、发布门禁。
4. **P1：拆分 Product Model / SKU / Batch / Item 与 DPP identity/version**。
5. **P1：统一 Schema/Field/Rule/Provenance，并把前端 fallback 迁出生产路径**。

## 重构程度与复用

- 重构程度：**中度重构**。数据库采用 additive core + adapter，不改写生产 V1。
- 代码复用：**中等复用**。保留技术栈、页面 shell、Auth/RLS 基础、publication、battery、file、audit、Registry adapter；重做核心 ownership、product hierarchy、policy orchestration 和 integration mapping。

