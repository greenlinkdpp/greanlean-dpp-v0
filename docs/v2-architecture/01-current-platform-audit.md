# 01 当前平台审计

审计日期：2026-09-23  
审计范围：当前 Git 工作区、Next.js 页面与 Route Handler、Supabase Schema/Migration/RLS、测试、部署说明。  
审计方式：只读静态审计；未执行 Migration、数据写入、部署或生产配置变更。

## 1. 证据边界

- 当前分支为 `main`，审计基线提交为 `796a0b6367f311d94347ef17415c6c417cbdaae6`。
- 审计开始前工作区已有未提交修改；本次不覆盖、不解释为审计产物。
- 仓库共有 21 个页面、35 个 Route Handler 文件、46 个 HTTP 方法、21 个编号 Migration 和 21 个配对 rollback。
- SQL 源码累计定义 94 次 `create table`（含 legacy bootstrap 与一个后续兼容性重复定义）；它不等于远端数据库已全部安装。
- `.env.local` 存在且配置了 Supabase，但只读网络检查超时。因此“已部署状态、生产数据量、备份/PITR、真实域名绑定、Migration ledger”均待平台侧证据确认。
- 结论分为三类：`已在代码实现`、`仅由 Migration/文档定义`、`未发现`。不能用后一类两项声称线上已经具备。

## 2. 总体结论

当前平台不是简单原型。它已经形成 Next.js + Supabase 的可用 DPP 应用，并新增了 Schema Registry、规范发布快照、审批、访问投影、电池 Model/Batch/Item、追加式 BMS 数据、证据文件、Registry TEST 适配等平台化基础。

但整体仍是明显的混合架构：

1. legacy `products` 聚合根和一组固定行业表仍是通用主路径；
2. 电池领域已经进入 Schema/Field/Value 和层级化模型；其他行业主要仍使用固定表 + `product_sector_field_values`；
3. 多租户通过 `dpp_organisation`、membership、grant、ownership 附加实现，核心 legacy 表没有一致的 `organisation_id`；
4. 新写操作多数走服务端授权，但多个后台读取仍由浏览器直接查询 Supabase；
5. Canonical publication 已存在，但公开读取仍保留 legacy live-table fallback；
6. 配置化能力与大量前端硬编码并存。

因此当前架构质量判断为：**中等，基础方向正确，但边界尚未收敛**。建议 **中度重构**，不建议推倒重建。代码复用程度为 **中等复用**：技术栈、统一页面、发布/证据/电池/访问基础可复用；通用数据归属、产品层级、策略和集成边界需要系统性调整。

## 3. 技术栈与运行能力

| 类型 | 当前实现 | 代码/配置位置 | 风险/说明 |
|---|---|---|---|
| 前端 | Next.js 14.2 App Router、React 18、TypeScript、Tailwind 3 | `package.json`, `app/`, `components/` | 多个超大组件；客户端承载较多数据编排 |
| 后端 | Next.js Route Handlers | `app/api/**/route.ts` | API 只有一部分位于 `/api/v1`，版本策略不一致 |
| 数据库 | Supabase PostgreSQL | `supabase/schema.sql`, `supabase/migrations/` | 远端安装状态未核验；legacy 与增量模型并存 |
| ORM | 无；Supabase JS/PostgREST/RPC | `lib/supabase.ts`, `lib/server/supabase.ts` | 缺少生成类型，广泛使用 `any`，编译期关系约束弱 |
| API 形式 | REST 风格 Route Handler + Supabase RPC | `app/api`, SQL functions | 写入边界已改善，但读取路径仍分叉 |
| 认证 | Supabase Auth email/password | `app/login/page.tsx` | 非邮箱账号自动拼接 `@greanlean.com`，缺少 SSO/MFA/邀请 UI |
| Session | Supabase browser session；API 使用 Bearer JWT | `lib/client/authenticatedFetch.ts` | 无 Next middleware；页面守卫在客户端执行，API/RLS 才是安全边界 |
| 授权 | DB identity RPC、RLS、product/sector grant、四级访问 | migration `0013`, `lib/server/dppAccess.ts` | 角色/权限仍为枚举与逻辑代码，非完整 capability/policy engine |
| 文件存储 | Supabase Storage 私有 bucket + 60 秒 signed URL | `lib/server/dppFileRepository.ts`, migration `0019` | bucket 实际配置和对象生命周期未在远端核验 |
| 图片 | `/public/images`、产品 URL 字段 | `public/images`, `products.main_image` | 图片治理、版本和租户隔离不统一 |
| 二维码 | `qrcode` 运行时生成 PNG | `/api/qr` | 接受任意 URL；未形成稳定 Resolver 服务与载体注册表 |
| URL/Resolver | `/p/[identifier]`、alias、GS1 `/01/...`、显式旧路径 redirect | `publicDppRepository.ts`, `app/01`, redirect pages | Resolver 逻辑散布；部分兼容映射写死在代码 |
| 部署 | 文档指向 Vercel；本地存在 Vercel project metadata | `.vercel/project.json`, `docs/engineering/deployment.md` | 未发现 IaC、区域配置或部署流水线定义 |
| 云服务 | Supabase + Vercel（仓库证据） | README/工程文档 | 生产项目、区域、SLA 未核验 |
| Docker | 未发现 | — | 本地/CI 环境一致性依赖 Node 与托管平台 |
| CI/CD | GitHub Actions：install/lint/typecheck/test/migration tests/build | `.github/workflows/ci.yml` | 有 CI；未发现自动部署/发布审批工作流代码 |
| 域名 | README 指向 `www.greanlean.com`；`dpp.greanlean.com` 根路径重定向登录 | `README.md`, `next.config.mjs` | 域名绑定和证书不在仓库证据内 |
| 国际化 | 自建 `LanguageProvider` + `?lang=zh|en` | `components/LanguageProvider.tsx`, `lib/i18n.ts` | `next-intl` 已安装但未使用；文案散落各组件；`html lang` 固定 en |
| 日志 | JSON console log、correlation id、敏感键脱敏 | `lib/server/logger.ts`, `apiRoute.ts` | 未发现集中日志平台、告警、trace 或 retention 配置 |
| 缓存 | 公开页强制 dynamic/no-store；QR 24h browser cache | `app/p/[slug]`, `/api/qr` | 无 Redis/应用缓存；高读流量将直达数据库 |
| 消息队列 | 未发现 | — | Registry、迁移、外部连接器缺少异步任务基础 |
| 定时任务 | 未发现 | — | 无过期授权、证据到期、重试、归档调度器 |
| 第三方服务 | Supabase；Registry 仅 TEST/人工结果；BMS integration API | registry/battery routes | ERP/MES/PLM/UNTP/Catena-X/EDC 均未实现 |
| 环境变量 | `.env.example` 明确 public/server-only 分界 | `.env.example` | flag 范围不完整；两个 public flag 在应用中未被引用 |
| 密钥管理 | Vercel/本地 env 约定；BMS 密钥仅存 SHA-256 hash | `.env.example`, migration `0014` | 未发现 Vault/KMS、签名密钥轮换或 Registry credential reference service |
| 备份 | 未发现可审计配置 | — | 只能推测 Supabase 平台能力，不能确认 PITR/恢复演练 |
| 测试 | Node test：15 unit、15 integration、1 migration suite；CI build | `tests/` | 主要是静态合同/领域测试；未发现浏览器 E2E 和真实 DB 集成流水线 |

## 4. 页面清单

| Route | 页面名称 | 组件/实现 | API/数据来源 | 当前作用 |
|---|---|---|---|---|
| `/` | 官网 | `app/page.tsx` | 代码内容、公开产品/展示数据 | 营销、案例、线索入口 |
| `/battery-applicability` | 电池适用性初评 | `PublicApplicabilityAssessment` | 客户端规则 | 不落库的初步范围判断 |
| `/login` | 登录 | `app/login/page.tsx` | Supabase Auth | email/password 登录 |
| `/dashboard` | 后台首页 | `app/dashboard/page.tsx` | 静态工作流说明 | 管理入口 |
| `/dashboard/projects` | 项目 | `P0ProjectManager` | `/api/v1/projects` | 租户项目创建/列表 |
| `/dashboard/projects/[projectId]` | 项目详情 | `P0ProjectDetail` | `/api/v1/projects/*` | 适用性、任务、产品范围 |
| `/dashboard/organisation` | 组织资料 | `OrganisationProfileManager` | `/api/v1/organisations/current` | 版本化经济运营者资料 |
| `/dashboard/products` | 产品中心 | `ProductManager` | 浏览器读 `products`；服务端写 | 创建/查询产品草稿 |
| `/dashboard/products/[id]` | 产品编辑 | `ProductEditor` 及多个工作台 | legacy 表、battery API、publication/file/integrity API | DPP 全流程编辑与发布 |
| `/dashboard/import` | 批量导入 | `DppImportManager` | 客户端 XLSX/CSV + server write；P0 API 部分 | 模板、预检、批量写入 |
| `/dashboard/suppliers` | 供应商 | `SimpleInsertManager`, `SupplierProductManager` | legacy Supabase 读 + server write | 供应商与产品关联 |
| `/dashboard/leads` | 客户提交 | `LeadManager` | 浏览器直读/更新 `leads` | 线索管理 |
| `/dashboard/materials` | 材料快录 | `SimpleInsertManager` | legacy 表 | 快速录入材料 |
| `/dashboard/esg` | ESG 快录 | `SimpleInsertManager` | legacy 表 | 快速录入 ESG |
| `/dashboard/certificates` | 证书快录 | `SimpleInsertManager` | legacy 表 | 快速录入证书 |
| `/dashboard/access` | 访问审批 | `AccessRequestManager` | access request API | 平台管理员审批字段访问 |
| `/p/[slug]` | 统一公开 DPP | `AccessAwareDppPage` → `UnifiedDppPage` | canonical publication 优先，legacy fallback | 公开/专业/监管投影展示 |
| `/demos/lmt-battery` | LMT 旧入口 | redirect | `/p/DPP-LMT...` | 链接兼容 |
| `/demos/industrial-battery` | 工业电池旧入口 | redirect | `/p/DPP-GV...` | 链接兼容 |
| `/passports/[slug]` | 工业电池旧入口 | whitelist + redirect | `/p/DPP-GV...` | 链接兼容 |
| `/products/green-vault-ess-14-3` | 产品旧入口 | redirect | `/p/DPP-GV...` | 链接兼容 |

未发现独立页面：客户管理、成员邀请、角色/权限配置、API client 管理、Schema 管理、Rule 管理、Credential 管理、Registry 生产管理、Resolver 管理、系统配置、审计检索。部分底层表存在，但产品 UI 不完整。

## 5. API 清单

输入/输出仅列业务契约摘要；完整字段以 Route Handler 和对应 repository 为准。

| API | Method | 功能 | Input | Output | 调用页面/主体 | 版本化 |
|---|---|---|---|---|---|---|
| `/01/{gtin}/{segments?}` | GET | GS1 标识解析并重定向 | GTIN/batch/serial path | 302 `/p/{id}` 或错误 | QR/外部用户 | 否 |
| `/api/access-context` | GET | 当前身份与后台能力 | Bearer JWT | identity/memberships | Dashboard shell | 否 |
| `/api/access-requests` | GET/POST | 列表/提交访问申请 | JWT；identifier/role/level/purpose | requests/created request | DPP/审批页 | 否 |
| `/api/access-requests/{id}` | PATCH | 审批访问 | decision/reason/validUntil | decision result | 审批页 | 否 |
| `/api/dpp-access/{identifier}` | GET | 权限判定/受众投影上下文 | audience/purpose + JWT | access decision | `AccessAwareDppPage` | 否 |
| `/api/battery-dpp/{productId}` | GET/PUT/POST | 电池工作区；保存；创建 item/追加指标/事件 | JWT + workspace/action | workspace | Battery workspace | 否 |
| `/api/battery-dpp/{productId}/batterypass-export` | GET | BatteryPass 验证/导出 | `mode=validate` | JSON/validation | DPP output | 否 |
| `/api/battery-dpp/public/{identifier}` | GET | 电池字段投影 | audience/showcase | grouped battery fields/readiness | 公开 DPP | 否 |
| `/api/battery-dpp/items/{itemId}/metrics/latest` | GET | 授权最新运行快照 | JWT | access/item/latest | DPP 页面 | 否 |
| `/api/battery-dpp/items/{itemId}/metrics/history` | GET | 授权运行历史 | range/metrics + JWT | summary/history/events | DPP 页面 | 否 |
| `/api/integrations/battery/credentials` | POST | 创建/轮换 BMS 凭据 | device/item/rotate id | 一次性 plaintext + metadata | 平台操作员 | 否 |
| `/api/integrations/battery/items/{itemId}/metrics` | POST | 设备指标摄取 | API key/timestamp/idempotency + rows | ingestion result | BMS/gateway | 否 |
| `/api/integrations/battery/items/{itemId}/events` | POST | 设备生命周期事件摄取 | API key/timestamp/idempotency + rows | ingestion result | BMS/gateway | 否 |
| `/api/internal/data-write` | POST | 白名单 legacy 表写入 | table/operation/values/filters | affected data | 多个后台组件 | 否 |
| `/api/internal/dpp-files` | GET/POST | 文件列表/上传版本/字段链接 | productId/form-data | files/upload result | Evidence manager | 否 |
| `/api/dpp-files/{versionId}` | GET | 授权文件下载 | purpose + optional JWT | 302 signed URL | DPP/后台 | 否 |
| `/api/internal/dpp-lifecycle` | POST | 追加通用生命周期事件 | product/event payload | event | 后台 | 否 |
| `/api/internal/dpp-publications/{productId}/candidate` | GET/POST | 候选、比较、提交审核、决策、发布 | audience/workspace/compare 或 action | canonical candidate/workflow result | 发布工作台 | 否 |
| `/api/internal/dpp-integrity/{productId}` | GET/POST | 完整性连接器/锚定请求 | action | connector/request/receipt | Integration manager | 否 |
| `/api/registry/{productId}` | GET/POST | Registry TEST 工作区、映射、人工结果 | action/retry/result | submissions/results | Registry workbench | 否 |
| `/api/registry/{productId}/export/{submissionId}` | GET | 下载 Registry TEST mapping | path ids | JSON file | Registry workbench | 否 |
| `/api/dpp-export` | GET | JSON/canonical/BatteryPass/PDF 导出 | product/format/showcase | file | 公开 DPP | 否 |
| `/api/qr` | GET | 二维码 PNG | arbitrary `url` | PNG | DPP 页面 | 否 |
| `/api/declaration` | GET | 演示声明 PDF | product/lang | demo PDF | legacy content | 否 |
| `/api/chemical-document` | GET | 演示化学文件 PDF | type/product | demo PDF | legacy content | 否 |
| `/api/demo-document` | GET | 白名单演示文件 | file/lang | demo file | showcase | 否 |
| `/api/v1/projects` | GET/POST | 项目列表/创建 | org context + payload | projects | 项目页 | 是 |
| `/api/v1/projects/{id}` | GET/PATCH | 项目详情/乐观锁更新 | org + rowVersion | workspace/project | 项目详情 | 是 |
| `/api/v1/projects/{id}/applicability` | POST | 保存适用性版本和任务 | applicability inputs | assessment/tasks | 项目详情 | 是 |
| `/api/v1/organisations/current` | GET/PUT | 组织工作区/新档案版本 | org + operator profile | organisation/profile | 组织页 | 是 |
| `/api/v1/organisations/current/export` | GET | 组织档案 JSON 导出 | org query | JSON file | 组织页 | 是 |
| `/api/v1/product-models/{productId}/hierarchy` | GET/POST | 层级读取/归属组织 | org + projectId | model/batches/items | 产品层级 | 是 |
| `/api/v1/product-models/{productId}/items-bulk` | POST | 幂等批量单体创建 | org/batch/items + idempotency | result | 产品层级 | 是 |
| `/api/v1/imports/preflight` | POST | P0 导入预检 | type/rows/idempotency | job/errors | 导入 | 是 |
| `/api/v1/imports/{jobId}/commit` | POST | P0 BOM 提交 | org/product/rows | commit result | 导入 | 是 |

结论：存在 `/api/v1`，但只有 P0 项目/组织/层级/导入采用版本前缀；主 DPP、访问、文件、Registry、BMS 和 legacy API 均未版本化。

## 6. 前端硬编码审计

| 文件 | 位置/内容 | 硬编码 | 风险 | 配置化建议 |
|---|---|---|---|---|
| `lib/dppSectorProfiles.ts` | `DPP_SECTOR_PROFILES` | 行业、类别、粒度、法规依据 | 与 DB profile/schema 多源 | 是，Schema catalogue 为权威 |
| `components/SectorFieldManager.tsx` | `BATTERY_CORE_FIELDS`, fallback templates | 字段、单位、法规、顺序、权限、提示 | 与 `field_definition`/JSON catalogue 重复 | 是，删除生产 fallback |
| `components/ProductEditor.tsx` | `SOURCE_DATA_FIELDS`、大量 fields 数组 | 行业表单、字段、单位、阶段 | 新字段仍需改前端 | 是，schema-form renderer |
| `lib/publicDppViewModel.ts` | 9 个 section、字段映射和行业文案 | 模块、顺序、标签、fallback | 展示与字段语义耦合 | 模块结构可保留，字段映射配置化 |
| `components/DashboardShell.tsx` | navGroups/partner allowed routes | 菜单与角色 | 无菜单 permission/capability | 是 |
| `lib/server/dppAccess.ts` | partner editor roles、能力计算 | 角色到操作映射 | 新角色需改代码；RBAC 粗粒度 | 是，role/capability/policy |
| SQL `0013` | role/access enum | 角色与四级访问 | migration 扩展成本高 | 角色表 + capability；访问等级可保留 |
| `ProductEditor.tsx`/SQL | status labels/checks | lifecycle/publication/registry 状态混用 | `products.status` 无 DB check | 分离状态机 |
| `BatteryDppWorkspace.tsx` | data source/event types/status select | BMS 来源、生命周期事件 | 无版本化 codelist | 是 |
| `publicDppRepository.ts` | `PRE_MIGRATION_IDENTIFIERS` | 旧 ID/slug aliases | 新兼容需部署代码 | 转入 identifier/alias 表 |
| showcase routes/export | 两个电池 ID allowlist | 展示绕过与完整字段 | 生产误用/多源 | tenant/data classification 配置 |
| 各组件本地 `t` 对象 | 中英文 | 文案散落 | 一致性、第三语言困难 | 集中 i18n catalogue |

## 7. 当前 DPP 页面专项结论

统一页面由 `buildDppViewModel` 生成 9 个固定模块：

1. Identity；
2. Materials and composition；
3. Environment and sustainability；
4. Performance and durability；
5. Sector-specific information；
6. Supply chain and traceability；
7. Evidence and documents；
8. Repair, circularity and end of life；
9. Lifecycle events and updates。

电池法规视图还按目录章节动态投影字段，并在授权后展示运行快照、历史与生命周期事件。

页面生成方式结论：**混合模式**。

- 页面 shell、9 模块顺序、很多 labels/映射是固定代码；
- legacy 通用字段来自固定表；
- sector 字段来自 DB template/value，但有代码 fallback；
- 电池字段来自 Schema/Field/Value 与法规 catalogue，属于较成熟的动态模式；
- 发布数据优先来自 immutable canonical snapshot，但缺失时回退 live legacy tables；
- 权限由服务器/DB 决定，showcase 是明确的演示例外。

## 8. 现有能力处理分类

| 分类 | 模块 |
|---|---|
| A 直接保留 | Next.js/Supabase/Vercel 技术栈、统一 DPP 页面 shell、Supabase Auth、私有文件 + signed URL、Migration/rollback 纪律、CI、correlation id 日志、append-only BMS 指标 |
| B 保留并重构 | `products` 与关联业务表、Schema Registry、canonical publication、访问控制、产品层级、导入、Registry TEST、标识/GS1、审计、国际化 |
| C 新增 | 独立 SKU/Family、统一 tenant ownership、capability/policy engine、partner↔tenant binding、mapping/canonical ingestion、credential/issuer/verification、resolver service、integration job/queue、region/data-residency control |
| D 逐步废弃 | `product_versions` 作为正式发布源、公开 live-table fallback、代码内 alias/showcase allowlist、demo PDF 端点用于真实产品、前端字段 fallback、浏览器直连 legacy 管理读取、产品 status 混合多种状态 |

## 9. 当前问题 Top 10

1. **P0** 核心 legacy 数据没有统一的 `organisation_id`；隔离依赖 grant、ownership 附加关系和服务层，容易出现漏校验。
2. **P0** 远端 Migration/RLS/备份状态未形成可审计发布证据；代码具备不等于生产已安装。
3. **P1** Product Model 与 SKU 仍由同一 `products` 行和 `sku` 字段表达，无法稳定支持 1:N。
4. **P1** 通用行业仍是固定表/代码字段，Schema-driven 主要集中在电池。
5. **P1** canonical publication 与 legacy live-table fallback 并存，可能破坏页面/PDF/JSON 同版本保证。
6. **P1** 角色、菜单、操作与字段策略分散在 SQL/TypeScript 枚举，尚无统一 Policy Engine。
7. **P1** partner 并非一等业务实体，缺少 Partner↔Tenant 授权对象、权限模板、有效期和撤销审计闭环。
8. **P1** Data provenance 仍碎片化，缺少跨行业统一 source/provider/issuer/original-value/change-chain 模型。
9. **P2** API 版本不统一，多个内部端点是 action RPC 风格；外部契约、幂等和弃用策略不完整。
10. **P2** 无队列/调度/集中可观测性；Registry 重试、证据过期、连接器和跨区域同步无法可靠运营。

## 10. 审计待确认项

- 生产/预发布 Supabase Migration ledger、表结构和 RLS 实际状态；
- Vercel 环境、域名、区域、日志、密钥和备份策略；
- 当前真实客户数、数据量、访问角色和已有 QR 数量；
- 是否有仓库外的 ERP/MES/PLM 连接器、队列、监控和 KMS；
- Supabase PITR、恢复点目标与最近一次恢复演练。
