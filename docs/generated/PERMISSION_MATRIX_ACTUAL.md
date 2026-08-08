# Actual Permission Matrix

## 1. 现有角色映射

| 目标角色 | 当前 `role_code` | P0 能力 |
| --- | --- | --- |
| Platform Admin | `platform_admin` | 平台治理、组织上下文、发布、Registry TEST、迁移运维 |
| Tenant Admin | `organisation_admin` | 本组织档案、项目、产品与成员 |
| Data Editor / Project Manager | `service_provider` | 获授权产品的数据、证据和项目；不能修改法定档案、发布或治理 |
| External Buyer | `buyer` | 产品授权范围专业读取 |
| Regulator | `authority_reviewer` | 授权产品监管投影和证据 |
| Viewer | `viewer` | 本组织/产品只读 |
| Public | anonymous | 已发布 PUBLIC 投影 |

当前角色集合不足以独立表达 Reviewer/Publisher/Support；P0 沿用平台管理员执行审核发布，后续通过 capability 表拆分，不在本迁移擅自扩角色枚举。

## 2. 资源矩阵

| 资源/操作 | Platform Admin | Org Admin | Service Provider | Buyer/Viewer | Authority | Public |
| --- | --- | --- | --- | --- | --- | --- |
| 组织档案读取 | 显式上下文 | 本组织 | 本组织基础 | 否 | 否 | 否 |
| 组织档案写入 | 是 | 本组织 | 否 | 否 | 否 | 否 |
| 项目创建/更新 | 是 | 本组织 | 本组织项目 | 只读授权 | 只读授权 | 否 |
| Model/Batch/Item | 是 | 本组织 | 产品授权内编辑 | 只读授权 | 只读授权 | 已发布投影 |
| 证据上传 | 是 | 本组织 | 产品授权内 | 否 | 否 | 否 |
| 证据审核/发布 | 是 | 否（P0） | 否 | 否 | 否 | 否 |
| 专业字段 | 是 | 本组织 | 产品授权 | 产品授权 | 产品授权 | 否 |
| 监管字段 | 是 | 按策略 | 否 | 否 | 产品授权 | 否 |
| 导出 | 投影内 | 投影内 | 投影内 | 投影内 | 投影内 | 公开 JSON/PDF |
| Registry 生产 | Flag + 策略 | 否 | 否 | 否 | 否 | 否 |

## 3. 强制边界

- 所有后台列表、搜索、对象读取、导出、文件和批量 API 同时检查 organisation 和 resource grant。
- public 不直接 select 源表；只调用 current publication 的 public projection。
- service role 只能在服务器模块创建，不接受客户端传入 organisation/role 作为授权事实。
- Platform Admin 的跨组织操作必须记录目标 organisation 和 request id。
- 文件下载在签名 URL 前审计；签名时间不超过 60 秒。
