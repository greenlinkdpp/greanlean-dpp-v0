# 04 多租户与权限审计

## 1. 结论

当前是 **部分多租户、服务端补强、数据库对象不一致** 的状态。新 P0 表以 `organisation_id` 和组合 FK 形成真实租户边界；legacy 核心表仍以平台级 `products` 为中心，通过 `dpp_product_ownership`、membership/grant、API 检查和 RLS 补充隔离。

因此不能声称“所有数据已数据库级多租户隔离”。更准确的表述是：访问与新 P0 资源具备 DB/RLS/服务层隔离；legacy product 子表主要依赖产品授权和受控服务端写入。

## 2. 核心对象隔离

| 对象 | tenant/org 字段 | DB/RLS | 服务端检查 | 结论 |
|---|---|---|---|---|
| 用户 | membership 关联 org | 是 | identity RPC | 部分完成 |
| 企业/组织 | `dpp_organisation.id` | 是 | org context | 完成基础 |
| 产品 | `products` 无 org；ownership 另表 | legacy RLS + ownership RLS | product grant | 重大兼容债务 |
| SKU | 无独立对象 | 否 | 否 | 缺失 |
| Batch/Individual | 电池表有 nullable org（P0 新资源必填） | P0 RLS/约束 | hierarchy API | 电池部分完成 |
| DPP | publication P0 item 可带 org，product publication 仍跟 product | service-only writes | publication workflow | 部分完成 |
| 文件 | asset 本身无 org，跟 product | product access policy | file API | 间接隔离 |
| Credential | BMS credential 跟 device/item，不含 org | platform admin/service only | credential API | 机器隔离强，租户归属间接 |
| Lifecycle | 通用表跟 product；battery 跟 item/product | product access | API | 间接隔离 |
| API Key | hashed credential | server only | item binding | 电池接入可用 |
| 日志 | product/user/org 字段不统一 | append-only policies | API/RPC | 多套日志 |

## 3. 必答问题

1. **客户 A 是否可能访问客户 B？** 新 P0 API 同时校验组织 context、角色和 product grant，正常路径下会拒绝。legacy 直接读取表没有统一 org FK，若 RLS/Migration 未正确安装或新增 API 漏掉 product scope，存在跨租户风险。因此答案是“设计上已降低，但架构上仍存在可能”。
2. **隔离层级？** 新表是 DB RLS + FK + 服务端；legacy 是 RLS/平台管理员策略 + 服务端 product grant，前端菜单仅用于体验。
3. **平台管理员绕过？** 有。verified platform operator membership 的 `platform_admin` 返回 `INTERNAL`，RLS 和服务端允许跨产品；P0 跨组织要求显式 org context，但不是 impersonation。
4. **独立 Tenant？** `dpp_organisation` 可作为 tenant，且有 `tenant_slug`，但 tenant 不是独立实体类型/生命周期。
5. **Tenant 配置？** 仅 display/default locale/address 等有限字段；无统一 feature/schema/rule/domain config。
6. **Tenant 域名？** 未发现域名表或 host resolver。
7. **Tenant 语言？** `default_locale` 基础存在；页面主要仍由 query param 决定。
8. **Tenant Schema/Rule 扩展？** schema 表没有 tenant scope；未完成。

## 4. 当前角色与能力

SQL 固定角色：`viewer`, `buyer`, `service_provider`, `recycler`, `authority_reviewer`, `organisation_admin`, `platform_admin`。应用把 active + verified 的 `organisation_admin`/`service_provider` 归纳为 `partner_editor`。

| 操作 | Platform admin | Org admin | Service provider | Buyer/Viewer | Authority | Public |
|---|---:|---:|---:|---:|---:|---:|
| 后台登录 | 是 | 产品页 | 产品页 | 否 | 否 | 否 |
| 创建产品 | 是 | 否 | 否 | 否 | 否 | 否 |
| 编辑已授权产品 | 是 | grant 后是 | grant 后是 | 否 | 否 | 否 |
| 项目/组织资料 | 是 | 本组织 | 部分 | 只读/否 | 只读/否 | 否 |
| Review/Publish | 是 | 否 | 否 | 否 | 否 | 否 |
| Registry TEST | 是 | 否 | 否 | 否 | 否 | 否 |
| PUBLIC 字段 | 是 | 是 | 是 | 是 | 是 | 是 |
| Professional 字段 | 是 | grant | grant | grant | grant | 否 |
| Authority 字段 | 是 | policy/grant | 否 | 否 | grant | 否 |

缺失独立角色：Platform Operator/Auditor、Partner Admin/Consultant、DPP Manager、Reviewer、Publisher、Integration User、Read Only capability profile。当前机器账号是电池 device credential，不是通用 Integration User。

## 5. Partner ↔ Tenant

没有 `partner_customer_binding` 或等价的一等对象。`service_provider` organisation + membership + product/sector grant 可以近似表达“合作伙伴账号访问某些产品”，但不能清晰表达：

- partner 为多个 tenant 服务的合同关系；
- 每个 tenant 不同 permission profile；
- tenant 授权发起人、有效期、撤销原因；
- tenant 范围而非 product/sector 范围；
- 同一用户在 partner 与客户组织的职责分离。

V2 应新增 `partner_tenant_authorization(partner_id, tenant_id, permission_profile_id, valid_from, valid_until, status, created_by, revoked_by, reason)`，并让具体 resource grant 从该授权派生或受其约束。

## 6. 权限维度审计

| 维度 | 当前能力 | 缺口 |
|---|---|---|
| 菜单 | TypeScript 根据 platform/partner 二分 | 无 DB capability、tenant 配置 |
| 操作 | API 中代码判断；platform-only 发布/Registry | 无 permission entity；Reviewer/Publisher 未拆分 |
| 数据范围 | platform、product、sector、organisation P0 | 无 assigned project/facility/own-data 通用 scope |
| 字段 | PUBLIC/LEGITIMATE_INTEREST/AUTHORITY_ONLY/INTERNAL | `access_policy` 表未成为统一运行时 policy engine |
| Credential | BMS create/rotate/ingest；Registry proof | 无通用 issue/verify/revoke VC permission |

## 7. RBAC + ABAC 兼容性

已有 ABAC 基础属性：identity、organisation、role、product、sector、access level、purpose、validity、field definition、policy condition JSON。当前运行时主要执行 role + product/sector grant + requested level；purpose 被记录但未被通用策略表达式强制评估，lifecycle stage、field-specific condition 和 resource attributes 也未统一参与决策。

结论：**数据模型可扩展，但当前不是完整 ABAC**。建议先做可解释、可测试的 capability + condition evaluator，不引入过重的通用策略语言。

## 8. Impersonation

- 未发现平台保存或知道客户密码的逻辑。
- 未发现正式 `impersonation_session`、reason、banner、只读默认或全量审计。
- 平台管理员可以直接获得 INTERNAL 和跨组织能力，这是 privileged access，不等于安全的“客户视角代入”。

V2 只在客服确有需求时新增短时、默认只读、强制理由、明显横幅、全量审计的 impersonation session。不得共享密码。

## 9. 审计日志覆盖

| 行为 | 当前记录 |
|---|---|
| DPP 访问/文件下载 | `dpp_access_audit`，含 user/org/level/decision/purpose/path/correlation/user-agent；IP 字段存在但请求未稳定填充 |
| legacy 数据写 | `dpp_audit_logs` 记录 actor/role/action/table/payload hash/product |
| review/publish/withdraw/migration/integrity | SQL/服务中有追加日志 |
| 登录 | 未发现业务 audit |
| 成员/权限变化 | access request 有状态；membership/grant 变化缺少统一 before/after audit |
| Partner 授权 | 一等授权不存在 |
| 导入 | job/errors + 部分 commit audit |
| API key | credential/ingestion 表可追踪，但缺统一安全审计视图 |
| 导出 | 普通 DPP/组织导出未形成统一 export audit |

结论：关键 DPP/访问链条已有审计基础，但尚未达到所有敏感操作的统一 `Who/Tenant/Role/Action/Object/Before/After/IP/Time` 标准。

