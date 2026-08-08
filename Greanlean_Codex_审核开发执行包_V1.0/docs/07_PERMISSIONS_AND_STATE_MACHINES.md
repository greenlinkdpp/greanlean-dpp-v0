# 权限矩阵与状态机基线

## 1. 后台角色

实际角色名称可映射现有系统，但能力必须可区分：

- `PLATFORM_ADMIN`：平台配置和受控运维，不默认读取客户敏感文件；
- `SUPPORT_OPERATOR`：基于工单和授权支持；
- `TENANT_ADMIN`：组织成员、项目和租户配置；
- `PROJECT_MANAGER`：项目、任务、范围和验收；
- `DATA_EDITOR`：录入和导入草稿数据；
- `REVIEWER`：证据和字段审核；
- `PUBLISHER`：批准后的发布与撤回；
- `TENANT_VIEWER`：内部只读；
- `EXTERNAL_PROFESSIONAL`：按组织和产品授权查看专业字段；
- `EXTERNAL_REGULATOR`：按授权查看监管字段和证据；
- `PUBLIC`：匿名公众投影。

## 2. 操作权限基线

| 操作 | Tenant Admin | Project Manager | Data Editor | Reviewer | Publisher | Viewer | Support |
|---|---:|---:|---:|---:|---:|---:|---:|
| 管理组织成员 | 是 | 否 | 否 | 否 | 否 | 否 | 受控 |
| 创建/关闭项目 | 是 | 是 | 否 | 否 | 否 | 否 | 否 |
| 创建型号/单体 | 是 | 是 | 是 | 否 | 否 | 否 | 受控 |
| 编辑草稿数据 | 是 | 是 | 是 | 否 | 否 | 否 | 受控 |
| 上传证据 | 是 | 是 | 是 | 是 | 否 | 否 | 受控 |
| 接受/拒绝证据 | 是 | 否 | 否 | 是 | 否 | 否 | 否 |
| 提交审核 | 是 | 是 | 是 | 否 | 否 | 否 | 否 |
| 退回/批准 | 否* | 否* | 否 | 是 | 否 | 否 | 否 |
| 发布/撤回 | 否* | 否 | 否 | 否 | 是 | 否 | 否 |
| 查看敏感文件 | 按策略 | 按策略 | 按策略 | 是 | 按策略 | 否 | 工单授权 |
| 导出 | 按投影 | 按投影 | 按投影 | 按投影 | 按投影 | 只读投影 | 受控 |
| Registry提交 | 按策略 | 否 | 否 | 否 | 授权角色 | 否 | 否 |

`*`：小企业可允许角色合并，但必须保留“谁提交、谁审核、谁发布”的记录；高风险项目可强制职责分离。

## 3. 数据访问投影

- PUBLIC：已发布版本的公众字段；
- PROFESSIONAL：公众+维修、拆卸、受限健康和授权供应链字段；
- REGULATOR：法规规定的机构字段、证据和审核记录；
- INTERNAL：草稿、缺口、内部备注和商业敏感数据；
- SUPPORT：仅经工单授权的最小范围和时限。

投影在服务端生成。PDF、JSON、CSV、文件下载和GraphQL字段解析必须使用同一策略。

## 4. 项目状态机

```text
DRAFT -> ACTIVE -> ACCEPTANCE -> COMPLETED -> ARCHIVED
             |-> BLOCKED -> ACTIVE
```

关闭/归档必须检查未完成交付物；归档不删除产品和发布版本。

## 5. 字段值状态

业务数据状态与工作流状态分开：

- 数据状态：MISSING、SELF_DECLARED、DOCUMENT_SUPPORTED、THIRD_PARTY_VERIFIED、NOT_APPLICABLE、PENDING_CONFIRMATION；
- 工作流状态：DRAFT、SUBMITTED、RETURNED、APPROVED、SUPERSEDED。

证据被拒绝/到期时，关联字段可从DOCUMENT_SUPPORTED降级并触发缺口，但历史发布版本不被篡改。

## 6. 护照草稿状态机

```text
DRAFT -> SUBMITTED -> IN_REVIEW -> APPROVED -> PUBLISHED
  ^          |            |           |
  |          v            v           v
  +------- RETURNED <------+       WITHDRAWN (version event)
```

规则：

- DRAFT可编辑；
- SUBMITTED后锁定普通编辑，退回后再开；
- APPROVED不等于PUBLISHED；
- PUBLISHED生成不可变PassportVersion；
- 已发布内容更正时创建新DRAFT，不能回到原草稿；
- WITHDRAWN不删除版本和UPI，公共页显示状态和替代版本（如有）。

## 7. 证据状态机

```text
UPLOADING -> UNREVIEWED -> ACCEPTED
                         -> REJECTED
ACCEPTED -> EXPIRED/SUPERSEDED
```

文件哈希和版本创建后不可被另一文件覆盖。

## 8. Registry状态机

见 `02_REGULATORY_GUARDRAILS.md`。普通数据库PATCH不得直接设置REGISTERED，必须经过适配器验证返回。

## 9. 审计要求

以下操作必须审计：登录风险事件、成员和角色、数据导入、字段批量修改、证据查看/下载、审核、发布、撤回、导出、UPI变更、Registry提交、数据删除/归档、支持人员访问。
