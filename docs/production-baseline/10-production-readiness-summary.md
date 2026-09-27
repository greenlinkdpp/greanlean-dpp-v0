# 10 Production Readiness Summary

```text
Production Baseline Status: BLOCKED
Meaning: not ready to claim a complete, evidence-backed Production baseline.
This is not a V2 launch decision.
```

## 当前已确认事实

- `www.greanlean.com`、`dpp.greanlean.com` 和 Vercel 默认域名正在通过 Vercel 提供 HTTPS 服务。
- `greanlean.com` 重定向到 `www`；`dpp` 根路径重定向到 `/login`。
- 本地链接项目名为 `greanlean-dpp-v0`；仓库审计 commit 为 `796a0b…`，Next.js 为 14.2.15。
- 配置的 Supabase REST 面可匿名只读访问；多数关键表名存在，部分敏感表直接拒绝 anon SELECT。
- 公开投影可见 8 个产品、7 个 Schema Definition、7 个 Schema Version、112 个 Field Definition、19 个行业字段值和 2 个电池模型；这些不是生产总量。
- 公开 DPP 示例页面可以读取。
- 抽样的 Production 首页 JavaScript bundle 未发现本地 service-role key 值或变量名。
- 仓库 Registry 实现仅支持 TEST 语义，没有自动 Production Registry connector。

## 当前无法确认事项

- Production Vercel deployment 的 commit、branch、build ID、部署时间与环境变量。
- Supabase 项目是否就是正式 Production、其 region 和数据库只读连接身份。
- Production migration ledger、完整 Schema、约束、索引、函数、触发器和扩展。
- RLS/GRANT 的真实定义以及 Tenant A → Tenant B 的负向测试结果。
- 数据库备份、PITR、对象存储备份及任何恢复演练。
- Production Secret 范围、轮换、日志和完整 bundle/source-map 泄露状态。
- 生产数据总量、legacy ownership、层级异常和 publication 异常。
- 现存 QR 数量、目标、客户 API 使用者、feature flag 值和监控告警。

## Critical

1. Migration ledger 与 Production Schema 未能读取。
2. Production RLS/权限隔离未获得元数据或负向测试证明。
3. Backup/PITR 与恢复能力均未证明。
4. 公共 DPP 是否只来自不可变版本未证明；仓库仍保留 live fallback。
5. Legacy Product 的 Tenant ownership 覆盖率未知。
6. Storage policy、跨租户文件隔离和恢复能力未知。

## High

- 部署 commit 与仓库审计 commit 的 drift 未知。
- QR 接口按仓库实现可编码任意 URL，且 resolver 路径分散。
- Production secret rotation 和 BMS/Registry 运营状态未知。
- API 客户、限流、日志汇聚、指标和告警未知。
- 旧 URL、二维码与别名没有形成完整的 Production inventory。

## Production Schema 是否与仓库一致

**UNKNOWN / NOT VERIFIED.** 关键关系存在不等于迁移与约束一致。

## RLS 是否符合当前安全假设

**NOT VERIFIED.** 有部分匿名拒绝证据，没有策略导出或跨租户负向测试。

## Backup 是否存在

**NOT VERIFIED.**

## Restore 是否被证明

**NO — RESTORE NOT PROVEN.**

## Secrets 是否安全

**PARTIALLY OBSERVED, NOT VERIFIED.** 抽样 bundle 没有发现本地 service-role key，但 Production secret inventory、scope 和 rotation 不可见。

## Public DPP 是否单一不可变真源

**NOT PROVEN; P0 OPEN RISK.** 仓库采用 canonical-first，但仍会退回 legacy snapshot、`product_versions` 和 live tables。

## 旧 QR / URL / API 基线

- `/p/{identifier}` 是已验证的公开路径。
- alias、预迁移标识映射和 `/01/{gtin}` 存在于仓库。
- 旧二维码实际库存和目标未知。
- 仓库当前有 35 个 API route 文件、46 个方法；部署等价与客户使用情况未知。

## 开始 V2 并行开发前必须关闭的问题

这里区分两类开始条件：

### 可立即进行

- 继续架构确认；
- 在本地、独立开发数据库中编写 additive 设计和测试；
- 建立只读证据采集工具及 staging 负向测试；
- 不连接 Production 写路径的 Phase 0 准备。

### 必须先关闭才可接触 Production

1. 获得受控的 Vercel/Supabase 只读证据访问。
2. 导出并核对 migration ledger、schema catalog、RLS、grants、functions 和 triggers。
3. 提供 backup/PITR 状态并完成隔离恢复演练。
4. 证明部署 commit、环境变量 scope 和 secret rotation。
5. 建立 Production URL/QR/API/客户端 inventory。
6. 完成 legacy ownership 与 publication anomaly 的只读统计。
7. 在 staging 通过跨租户、Partner、文件和 public/private 字段负向测试。

## Final assessment

Production 公共服务是可访问的，且仓库中存在较多安全与不可变性控制；但当前访问权限只能得到外部和匿名层面的证据，不能满足“真实 Production 基线已被证明”的要求。

**Decision: BLOCKED pending read-only management/database evidence.**
