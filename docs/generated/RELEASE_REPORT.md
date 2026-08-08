# P0 Release Report

版本候选：P0 Battery Pilot Foundation  
状态：代码完成、自动化通过，目标 Supabase 已安装并完成验证。

## 实际完成

- 版本化经济运营者档案、产品组织归属、组织资料完整率和 JSON 导出。
- 项目工作台、乐观锁更新、版本化电池适用性初评和自动缺口任务。
- ProductModel-Batch-BatteryItem 组织层级、组合外键、组织内序列号、批量 100 单体和 HTTPS UPI。
- P0 BOM/材料/技术字段预检、字段级错误和事务提交。
- BatteryItem 作为发布主体，复用提交、校验、审核、批准和不可变发布；第二版要求变更原因。
- item public key/UPI 解析；页面、PDF、JSON 使用 current publication snapshot；公开输出去除内部标识。
- 关键证据到期阻断新发布，历史版本不回写。
- 后台组织/项目/电池层级页面和公开适用性入口；四个既有案例 URL 保持兼容。

## 主要文件

- 数据库：`supabase/migrations/0025_p0_battery_pilot_foundation.sql`
- 回滚：`supabase/rollbacks/0025_p0_battery_pilot_foundation.down.sql`
- SQL 包：`supabase/bundles/p0_battery_pilot_install.sql`、`p0_battery_pilot_verify.sql`、`p0_battery_pilot_rollback.sql`
- 服务：`lib/server/p0Repository.ts`、publication candidate/workflow、public DPP repository/projection。
- API：`app/api/v1/organisations`、`projects`、`product-models`、`imports`。
- UI：`components/p0/*`、组织/项目页面、产品编辑电池层级、公开适用性页面。
- 测试/数据：`tests/unit/p0*`、`tests/integration/p0BatteryPilotContract.test.mjs`、`fixtures/p0/*`、`scripts/smoke-test.mjs`。

## 未完成范围

- 独立 Batch 创建、通用 resolved-data、单独 UPI reserve、通用 import job GET。
- FIELD_VALUES/BATTERY_ITEMS 通用 commit；单体改用专用 bulk API。
- 完整法规字段覆盖、正式 Registry 语义和生产提交、生产 BMS/EMS、外部区块链。
- 项目/档案/适用性通用操作审计、通知提醒、恶意文件扫描、支持运营。
- 独立回滚演练和生产变更窗口记录；目标 Supabase 已完成 install/verify。

## 部署步骤

1. 备份目标数据库，并在结构等价测试库运行 `p0_battery_pilot_install.sql`。
2. 运行 `p0_battery_pilot_verify.sql`，确认每行 `passed=true`；特别确认 legacy HTTPS UPI、Batch/Item hierarchy mismatch 均为 0。
3. 用合成组织和 fixture 执行 T01、T04、T06 的数据库负测及 item 发布并发测试。
4. 验证四个既有公开 URL、PDF/JSON 元数据和后台组织/项目/产品层级。
5. 再运行应用构建并部署；生产 Registry、BMS 和 blockchain 外部连接保持禁用/TEST 边界。

## 数据库验收记录

- 2026-08-07：用户在目标 Supabase 运行 `p0_battery_pilot_install.sql` 成功。
- 2026-08-07：用户回传 `p0_battery_pilot_verify.sql` 所有检查项均为 `true`。
- 本记录证明 P0 数据库结构和约束已在目标环境通过安装验收；不代表外部 Registry、BMS 或区块链生产连接已开通。

## 回滚

1. 先回退应用或关闭 P0 写入口。
2. 若没有 P0 业务数据，运行 `p0_battery_pilot_rollback.sql`。
3. 若已有档案、项目、identifier、import job 或 item publication，回滚脚本会主动中止；先导出数据并采用 forward fix，不能删除已发布历史。
4. 回滚后验证旧 `/p/[slug]`、product publication pointer 和四个案例。

## 已知风险

- SQL 已在目标 Supabase 完成 install/verify，但尚未单独执行 rollback 演练。
- 历史 canonical snapshot 若缺 presentation 字段，兼容层仍可能读取 live product 展示字段；新版本不使用该路径。
- import preflight job 与 error rows 由两次服务写入，极端错误下可能留下无 error 明细的 PREVIEWED job；commit 仍会重新预检。
- 正式法规/Registry 事项仍以 `DECISIONS_REQUIRED.md` 为准，不构成法律认证结论。

## P1 建议

优先完成测试库迁移 E2E、通用操作审计、Batch/FieldValue 工作流、XLSX 导入、证据通知和生产 BMS 接入验收，再扩展 Registry 生产适配器。
