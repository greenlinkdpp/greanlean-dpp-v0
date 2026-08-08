# Repository Audit

审核日期：2026-08-03  
审核范围：`/Users/david/DPP/greanlean-dpp-v0` 当前工作树  
基线：`Greanlean_Codex_审核开发执行包_V1.0/`

## 1. 结论

仓库已经具备一个可运行的多行业 DPP 平台和较完整的电池护照基础：Schema Registry、BatteryPass 参考模型、权限投影、证据文件、不可变发布、公开页面/PDF/JSON、Registry TEST 边界、BMS/EMS 数据接入均已有实现。P0 不应重写这些能力，而应补齐组织归属、经济运营者档案、项目/适用性工作台、Model-Batch-Item 强关系、单体级 UPI/发布主体和基础批量导入。

未发现需要暂停的阻断条件。推荐使用增量迁移和兼容 API，不对现有产品、发布快照或公开 URL 做破坏性重构。

## 2. 技术栈与运行方式

| 项目 | 当前实现 | 证据 |
| --- | --- | --- |
| Web | Next.js 14 App Router、React 18、TypeScript strict | `package.json`、`tsconfig.json`、`app/` |
| 数据 | Supabase/PostgreSQL、RLS、Security Definer RPC | `supabase/schema.sql`、`supabase/migrations/` |
| 校验 | AJV 2020-12、BatteryPass 原始 Schema | `lib/battery/`、`tests/unit/batteryPass.test.ts` |
| 标识 | DPP ID、UPI、GTIN/SGTIN、QR、别名解析 | `lib/dppCompliance.ts`、`app/api/qr/route.ts`、迁移 0012 |
| 发布 | 候选、校验、审批、不可变快照、当前指针 | 迁移 0015-0018、`lib/server/dppPublicationWorkflow.ts` |
| 文件 | 私有对象路径、SHA-256、版本、字段链接、短时签名下载 | 迁移 0019、`lib/server/dppFileRepository.ts` |
| 部署 | Vercel；环境变量注入 Supabase/Registry/Feature Flags | `.vercel/`、`.env.example` |

## 3. 仓库与变更状态

- 当前分支：`feature/battery-passport-demo`。
- 任务开始前工作树已存在大量已修改和未跟踪文件，包含迁移 0012-0024、API、页面、测试和执行包。
- 本轮不回退、不覆盖这些改动；后续文件均在现状上增量添加。
- 迁移 0001、0006、0007、0009-0024 均有同编号 rollback，静态迁移测试通过。

## 4. 数据库审核

### 已有能力

- `dpp_organisation`、`dpp_user_membership`、`dpp_product_access_grant`、访问申请与 append-only 审计。
- `battery_model_profile`、`battery_batch`、`battery_item` 和 Model/Batch/Item 字段值。
- BatteryPass 100 项 Longlist、5 个导入 Schema 配置、静态与动态字段。
- 不可变 `dpp_publication`、发布审核、校验结果和单一当前版本指针。
- 文件、版本、字段证据链接、生命周期事件均有 append-only 控制。
- Registry/区块链连接器和回执只允许服务器边界写入，TEST 环境不冒充正式成功。

### 关键缺口

1. `products` 和电池型号未持有明确的组织归属；现有授权能限制访问，但无法表达“谁是数据控制者/经济运营者”。
2. `dpp_organisation` 仅有法定名称、登记号、国家、类型和验证状态，缺结构化地址、联系信息、运营者职责和完整率。
3. 缺少 Project、Task、适用性评估及规则版本，无法把销售机会转成可审计交付项目。
4. `battery_batch` 和 `battery_item` 同时保存 model/product 外键，但数据库未用组合外键阻止跨产品、跨型号错误关系。
5. 电池序列号仅在 model 内唯一，未落实 P0 要求的组织内唯一。
6. `battery_item.unique_product_identifier` 全局唯一但可为空，数据库没有 HTTPS 和可解析路径约束。
7. `dpp_publication` 当前按 product 唯一，不能明确记录 item 作为护照主体；既有发布需要保留为 legacy/model 级。
8. `battery_field_value` 的 scope check 不足以保证 product/model/batch/item 属于同一层级链。

## 5. 服务端与 API 审核

### 已有能力

- Bearer token 由 Supabase Auth 服务端校验；管理员 client 仅在服务器模块创建。
- 受限 DPP 读取通过数据库函数计算组织、角色、产品授权和访问等级。
- 公开和授权 DPP 都优先读取 canonical publication；动态 BMS 数据不进入公共投影。
- 编辑写入通过 `/api/internal/data-write` 服务器边界；系统回执、发布、Registry 和文件走专用 API。
- 文件下载先做产品与字段等级授权、写入审计，再生成 60 秒签名 URL。

### 风险与缺口

- `dppAccess` 在 canonical 快照转换时重新读取 live product 展示字段。虽然目前主要用于兼容旧视图，但发布后修改 live product 可能让页面/PDF/JSON出现版本漂移，应把公开展示完全绑定快照。
- 部分 `ApiError.details` 会包含数据库原始消息；需要统一日志内部记录、对外返回稳定错误码。
- 缺项目、适用性、组织资料导出、批量 item 创建的 P0 API。
- 基础 Excel 导入页面存在，但不是以 Project/Model/Batch/Item 为主线的 P0 预检与错误报告。

## 6. 前端审核

- 公开首页、统一 DPP 页面、登录、后台产品中心和电池编辑工作台均可构建。
- 后台已有五阶段产品工作流、合作伙伴产品级菜单、证据、发布、Registry 和集成入口。
- 当前首页仍是多行业营销结构；P0 要求的“户储/LMT 适用性入口、单型号试点项目、缺口清单”尚未形成闭环。
- 后台缺独立的项目工作台、组织档案与 item 批量创建视图。

## 7. 安全与配置审核

- `.env.example` 只列变量名；服务角色与 Registry 凭据用于服务器模块，未发现硬编码私钥或 API secret。
- 关键表已启用 RLS，后续迁移 0013/0020 收紧了早期宽泛策略。
- 生产数据库当前策略未在本轮直连验证；发布前必须执行新迁移 verify SQL。
- Registry 正式语义和生产端点继续由 Feature Flag 禁用，不能因 TEST/Mock 成功宣称正式注册成功。

## 8. 基线验证

| 检查 | 结果 |
| --- | --- |
| `node scripts/lint.mjs` | 通过 |
| `tsc --noEmit` | 通过 |
| 单元 + 集成测试 | 99/99 通过 |
| 迁移测试 | 26/26 通过 |
| `next build` | 通过，28 个页面生成成功 |
| `git diff --check` | 通过 |
| migration/rollback 编号对齐 | 通过 |
| `pnpm <script>` | 工具包装器因 ignored builds 退出；已用直接 Node 入口完成同等验证 |

## 9. 继续条件

采用新增迁移、兼容列、组合约束、服务器 API 和 Feature Flag 可安全实施；不需要破坏数据或 URL；权限边界可推导；法规未知项可保持 `待确认`。因此进入 Phase B/P0。
