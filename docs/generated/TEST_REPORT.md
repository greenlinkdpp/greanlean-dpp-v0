# P0 Test Report

执行日期：2026-08-07  
范围：当前工作树，P0 电池试点实现及既有多行业 DPP 回归。

## 自动化结果

| 门禁 | 命令（直接 Node 入口） | 结果 |
| --- | --- | --- |
| Repository lint | `node scripts/lint.mjs` | 通过 |
| TypeScript | `node node_modules/typescript/bin/tsc --noEmit` | 通过 |
| 单元与集成 | `node --experimental-strip-types --test tests/unit/*.test.ts tests/integration/*.test.mjs` | 117/117 通过 |
| 迁移合同 | `node --test tests/migrations/*.test.mjs` | 28/28 通过 |
| 本地 smoke | `BASE_URL=http://127.0.0.1:3000 node scripts/smoke-test.mjs` | 8/8 通过 |
| Next.js production build | `node node_modules/next/dist/bin/next build` | 通过；35 个静态/动态路由完成构建 |
| Diff hygiene | `git diff --check` | 通过 |

本机 `pnpm` 包装器受 ignored-build policy 限制，因此使用仓库同一 `node_modules` 的直接 Node 入口；未修改锁文件或依赖策略。

## Smoke 覆盖

- 首页；LMT、工业储能、纺织、消费电子四个公开护照页面。
- LMT 与工业储能 JSON 导出。
- LMT 二维码 PNG 与 correlation ID 回传。
- LMT JSON 实测响应头：version、snapshot hash、published at 均存在。

## T01-T10

| ID | 结果 | 自动化证据 | 限制 |
| --- | --- | --- | --- |
| T01 | 通过合同测试 | 组织组合 FK、错链 trigger、serial unique、100 行上限 | 尚未在真实 PostgreSQL 执行负向插入 |
| T02 | 通过 | BOM 行字段错误、BAT-001、MAT-001、fixture header | P0 commit 只覆盖 BOM |
| T03 | 通过 | evidence/readiness/review blockers | live DB 流程待验收 |
| T04 | 通过 | item review/publish、不可变版本、current pointer；已修复 item `PUBLISHED` 状态约束 | live DB 并发发布待验收 |
| T05 | 通过 | item resolver + export headers + public smoke | 历史缺 presentation 快照有兼容回退 |
| T06 | 通过合同测试 | RLS、server-only grants、后台双授权、跨组织组合 FK | live DB 越权请求待验收 |
| T07 | 通过 | BMS credential/binding/idempotency/append-only tests | 未连接生产 BMS/EMS |
| T08 | 通过 | Registry TEST 边界和无 URI 禁止成功 | 未连接 EU Registry production |
| T09 | 通过边界测试 | connector 验证、真实 receipt append-only | 未连接外部链，不是 P0 门禁 |
| T10 | 通过 | 文件生命周期、授权下载、EVD-001 到期 blocker | 恶意文件扫描依赖外部服务 |

## 目标数据库验收

- 2026-08-07：用户在目标 Supabase 运行迁移 0025 install bundle 成功，并回传 verify bundle 所有检查项均为 `true`。
- 未单独执行 rollback bundle 演练；发布时优先采用 forward fix，仅在确认无 P0 业务数据时使用回滚脚本。

## 未运行

- 未运行 Playwright 浏览器自动化：本机无 `npx`/Playwright；已用真实 Next.js 开发服务器完成 HTTP smoke 和生产构建。
- 未运行依赖漏洞扫描：仓库没有已配置的安全/依赖检查脚本；没有为此联网升级或修改依赖。

结论：代码、静态迁移合同和目标 Supabase 安装验收均已通过，可进入应用发布回归。
