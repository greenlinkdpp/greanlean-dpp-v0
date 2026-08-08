# GreanLean P0 执行计划

状态更新时间：2026-08-07

## 执行原则

- 以 `Greanlean_Codex_审核开发执行包_V1.0/` 为签署基线。
- 先审核、再设计、再迁移和实现；不覆盖现有客户数据，不破坏现有公开 URL。
- 正式 EU Registry 语义、生产端点或未定稿法规不得推断；使用 Feature Flag、TEST/Mock 边界和 `待确认` 状态。
- 所有 P0 改动必须有数据库约束、服务器端授权、回滚脚本、测试和追踪记录。

## 阶段状态

| 阶段 | 状态 | 交付物 |
| --- | --- | --- |
| Phase A 仓库审核 | 已完成 | `docs/generated/REPOSITORY_AUDIT.md`、`CURRENT_ARCHITECTURE.md`、`GAP_MATRIX.md`、`DECISIONS_REQUIRED.md` |
| Phase B P0 设计 | 已完成 | 技术设计、实际数据字典、API、权限、迁移、追踪 |
| Phase C P0 开发 | 已完成 | 组织/项目/适用性、Model-Batch-Item、UPI、单体发布主体、BOM 导入与界面 |
| Phase D 验证审核 | 已完成 | 117/117 单元集成、28/28 迁移合同、8/8 smoke、lint/type/build；目标 Supabase install 成功且 verify 全 `true` |
| Phase E 发布收口 | 已完成 | 测试报告、发布报告、差距、API 和追踪均已更新 |

## Phase A 基线

- 直接 Node 入口：lint 通过；TypeScript 通过；99/99 单元与集成测试通过；26/26 迁移测试通过；Next.js 生产构建通过。
- `pnpm <script>` 受本机 Codex pnpm 包装器的 ignored-build policy 阻断；已隔离为工具环境问题，未执行 `pnpm approve-builds`，未修改依赖策略。
- 目标 Supabase 已由用户在 SQL Editor 完成 P0 install 和 verify，所有验证项均为 `true`；本机未持有数据库直连工具。
- 当前工作树在任务开始前已有大量未提交改动；本任务将基于现状增量开发，不回退既有工作。

## 继续条件判断

- 可用新增表、可空兼容列、约束触发器和版本化 API 完成，不需要不可逆迁移。
- 现有组织、成员、产品授权和服务器端访问函数足以推导租户边界。
- 现有四个展示产品、`/p/[slug]`、GS1 路径和标识别名可保持兼容。
- 正式 Registry 行为继续由 Feature Flag 和 TEST/Mock 边界隔离。

结论：未触发 `AGENTS.md` 停止条件，继续 Phase B 和 P0 开发。

## Phase C-E 结果

- 新增迁移 `0025_p0_battery_pilot_foundation.sql` 及 install/verify/rollback bundle；迁移为事务式，遇到现有层级错链会中止，回滚遇到 P0 业务数据会中止并要求 forward fix。
- 数据库约束覆盖 Project 子资源与 Model-Batch-Item 组织一致性、组织内序列号、HTTPS UPI、单体发布版本和 current pointer。
- 新增 `/api/v1` 组织、项目、适用性、层级、批量单体和导入接口；后台读取同时要求后台身份、组织上下文和必要的产品授权。
- 单体发布复用现有 canonical review/validation/approval 流程，公开页面、PDF 和 JSON 读取同一不可变快照。
- 代码审查修复了 item 发布状态枚举缺少 `PUBLISHED`、遗留未归属 hierarchy 读取授权不足、经济运营者档案写权限过宽三项高风险问题。
- 本机无 PostgreSQL/Supabase CLI 和 Playwright/npx；目标 Supabase 由用户执行安装与验证。Registry、BMS 和区块链仍为可对接边界，不标记为生产接通。详见 `docs/generated/TEST_REPORT.md` 和 `RELEASE_REPORT.md`。
