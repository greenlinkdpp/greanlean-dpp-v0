# 统一 DPP 平台阶段 4：身份与权限实施记录

日期：2026-07-25  
目标版本：v0.6.0  
阶段状态：代码完成，等待 Supabase 迁移和线上验收

## 1. 目标

把原先仅用于演示的 `view=professional`、`view=audit` 改为真实授权流程：

```text
一个稳定产品二维码
→ 匿名访问只返回 PUBLIC
→ 登录后读取组织、角色和产品授权
→ 数据库计算最高访问等级
→ 服务端返回字段投影
→ 写入允许或拒绝审计
```

二维码和 URL 参数只表达产品身份或希望查看的受众，不产生权限。

## 2. 数据模型

迁移 `0013_identity_and_access.sql` 新增：

- `dpp_organisation`：组织法定身份、类型和核验状态；
- `dpp_user_membership`：用户与组织关系、角色、状态和有效期；
- `dpp_product_access_grant`：产品或行业范围授权、等级、目的和有效期；
- `dpp_access_request`：访问申请及审批结果；
- `dpp_access_audit`：只追加的允许/拒绝审计记录。

访问等级沿用：

- `PUBLIC`
- `LEGITIMATE_INTEREST`
- `AUTHORITY_ONLY`
- `INTERNAL`

## 3. 服务器授权

数据库函数负责：

- `greanlean_get_my_identity`：返回当前用户的后台身份；
- `greanlean_product_access_level`：计算产品最高有效权限；
- `greanlean_resolve_dpp_access`：校验请求等级并记录审计；
- `greanlean_public_dpp_snapshot`：只返回已发布快照中的公众字段；
- `greanlean_authorized_dpp_snapshot`：在同一次数据库调用中完成授权、审计和受众过滤；
- `greanlean_submit_access_request`：创建组织、待审成员关系和访问申请；
- `greanlean_decide_access_request`：核验组织、激活成员关系并生成产品授权。

受限 API：

- `GET /api/dpp-access/[identifier]`
- `GET /api/access-context`
- `GET|POST /api/access-requests`
- `PATCH /api/access-requests/[requestId]`

所有受限请求必须携带 Supabase Bearer Token。专业和监管字段不由浏览器直接决定。

## 4. 页面行为

- 匿名扫码：显示公众 DPP；
- 已登录且有授权：自动显示该账号可访问的最高字段范围；
- 显式访问专业/监管链接但未登录：要求登录并返回原页面；
- 已登录但没有授权：保留公众页面并提供访问申请；
- 后台预览：仍使用统一页面，但只有数据库中的平台管理员可读取草稿；
- 修改 `view` 或 `preview`：不能越过数据库授权。

## 5. 后台审批

后台新增“访问审批”：

1. 查看申请账号、组织、产品、角色和访问目的；
2. 核验组织身份；
3. 设置可选授权有效期；
4. 批准后自动激活组织成员关系并生成产品授权；
5. 拒绝时保存审批说明；
6. 授权计算实时检查状态、开始时间、结束时间和撤销状态。

## 6. RLS 收口

迁移启用五张权限表的 RLS，且不创建匿名访问策略。

旧后台产品表原有“所有 authenticated 用户均可管理”策略被替换为“仅平台管理员可管理”。公众已发布数据继续通过原有匿名只读策略访问；电池受限字段继续执行字段访问等级策略。

`product_versions.snapshot` 不再允许匿名整包读取。公众和已授权账号分别通过数据库过滤函数获得对应字段，避免把完整快照下发后仅靠前端隐藏。

访问审计和旧审计表均禁止更新、删除。

## 7. 迁移执行

1. 在 Supabase SQL Editor 一次性运行：
   `supabase/migrations/0013_identity_and_access.sql`
2. 运行只读验收：
   `supabase/bundles/identity_and_access_verify.sql`
3. 确认每一行 `passed = true`；
4. 用内部管理员账号登录，确认后台出现“访问审批”；
5. 用普通账号从 DPP 页面提交专业访问申请；
6. 管理员批准后，普通账号重新打开同一二维码并确认自动升级；
7. 修改 URL 请求监管视图，确认专业授权账号仍被拒绝；
8. 再部署 Vercel Preview 并完成四个产品回归。

现有 `app_metadata.dpp_access_level=INTERNAL` 用户会在迁移时自动加入
GREANLEAN 平台组织，后续权限判断以数据库成员关系为主。

## 8. 回滚

回滚文件：

`supabase/rollbacks/0013_identity_and_access.down.sql`

一旦产生真实访问申请、授权或审计记录，不应直接执行回滚；应停止审批和受限访问，并采用前向修复保留审计证据。

## 9. 验收标准

- 匿名用户只能得到 PUBLIC；
- 仅修改 URL 不能提权；
- 登录用户只能得到有效组织和产品授权范围；
- 专业账号不能读取监管字段；
- 后台和电池/Registry 内部 API 使用数据库管理员身份；
- 受限 API 对未登录返回 401、无授权返回 403；
- 允许和拒绝均写入只追加审计；
- 权限表没有匿名策略；
- 二维码不包含永久高权限凭证。
