# 阶段 4：系统操作与安全边界实施说明

日期：2026-07-25  
对应迁移：`0020_system_operation_security_boundary.sql`  
对应 PRD 阶段：M5

## 1. 本阶段目标

本阶段把后台编辑、发布、Registry、审计、动态接入和区块链记录拆分为不同责任边界：

```text
浏览器后台
→ 登录身份令牌
→ Next.js 受控服务端接口
→ service role
→ 领域表 + 追加式审计

审核通过的候选
→ 发布服务
→ 不可变发布快照

Registry / BMS / 区块链
→ 受信适配器
→ 系统记录与回执
```

普通产品保存只更新草稿字段，不创建发布版本，不修改发布状态、当前版本或 Registry 状态。

## 2. 应用改动

- 新增 `/api/internal/data-write`，要求登录且必须为平台管理员；
- 产品、材料、BOM、ESG、证书、追溯、循环性、行业字段、供应商关联和批量导入统一通过服务端写入；
- 每次成功写入追加 `dpp_audit_logs`；
- 通用写入白名单明确排除发布版本、Registry 回执、审计日志和区块链记录；
- 产品的 `status`、`current_version`、`eu_registration_status` 只允许对应系统流程修改；
- 产品编辑页移除 Registry、注册证明、审计和区块链的可编辑通用表单，改为只读数量摘要；
- 批量导入只创建或更新草稿数据，不再把导入产品自动标记为已发布。

## 3. 数据库边界

迁移执行后：

- `anon` 和 `authenticated` 不再拥有产品领域表和系统表的直接写权限；
- 平台管理员仍可通过 RLS 直接读取后台数据；
- 领域写入由服务端 `service_role` 完成；
- `product_versions`、Registry 记录、审计日志和区块链记录不允许普通后台直写；
- 审计、注册证明、区块链请求和区块链回执均受追加式触发器保护；
- Registry `TEST` 记录禁止写成 `ACCEPTED` 或生成持久生产注册号；
- Registry `PRODUCTION` 接受结果必须同时具备已验证组织、正式语义版本、响应载荷和持久注册号。

## 4. 区块链真实连接边界

新增：

- `dpp_blockchain_connector`
- `dpp_blockchain_anchor_request`
- `dpp_blockchain_anchor_receipt`
- `greanlean_request_blockchain_anchor`
- `greanlean_record_blockchain_receipt`

连接器表只保存外部密钥管理器的配置引用，不保存 API Key、私钥或访问令牌。

未配置并验证真实连接器时，只会生成 `BLOCKED_UNCONFIGURED` 请求，并明确返回空交易 Hash。交易 Hash 只能由真实连接器回执写入，平台不再本地合成。

## 5. 执行顺序

在 Supabase SQL Editor 中依次运行：

1. `supabase/bundles/backoffice_alignment_phase4_install.sql`
2. `supabase/bundles/backoffice_alignment_phase4_verify.sql`

验证 SQL 只返回一行。所有字段必须为 `true`。

应用运行环境必须配置仅服务端可见的：

```text
SUPABASE_SERVICE_ROLE_KEY
```

该变量不得使用 `NEXT_PUBLIC_` 前缀。

## 6. 回滚

回滚文件：

`supabase/bundles/backoffice_alignment_phase4_rollback.sql`

一旦存在区块链连接器、请求或回执数据，回滚会主动拒绝，避免删除集成配置和历史证据。审计、Registry 响应和既有锚定记录不会被迁移脚本删除。

## 7. 阶段门禁

进入 M6 前必须确认：

- M5 验证 SQL 全部为 `true`；
- Vercel Production 与 Preview 均有服务端 service role 变量；
- 后台保存草稿、批量导入、材料和证书编辑可正常使用；
- 普通浏览器 Supabase 客户端直接写领域表会被拒绝；
- Registry TEST 页面不会显示生产注册成功；
- 未配置区块链连接器时不出现交易 Hash；
- 四个正式产品的现有公开 URL 和展示内容保持不变。
