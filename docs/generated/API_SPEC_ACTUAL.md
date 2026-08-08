# Actual P0 API Specification

状态：Phase C 实际实现。新接口位于 `/api/v1`；既有公开页、导出、文件、发布和 Registry TEST 接口保持兼容。所有后台接口要求 Supabase Bearer 会话，并返回 `Cache-Control: private, no-store`。

## 1. 组织与经济运营者

| 方法/路径 | 服务端权限 | 请求/响应 | 主要错误 |
| --- | --- | --- | --- |
| `GET /api/v1/organisations/current?organisationId=` | 活跃组织成员；平台管理员可显式选择组织 | 返回组织、当前档案和完整率 | `ORGANISATION_CONTEXT_REQUIRED`、`ORGANISATION_SCOPE_NOT_GRANTED` |
| `PUT /api/v1/organisations/current` | `organisation_admin` 或平台管理员 | 请求为经济运营者档案；创建不可变新版本 | `LEGAL_NAME_REQUIRED`、`ORGANISATION_ADMIN_ACCESS_REQUIRED` |
| `GET /api/v1/organisations/current/export?organisationId=` | 活跃组织成员 | 私有 JSON 下载；不缓存 | 同组织读取错误 |

档案保存不覆盖历史版本；仅允许切换旧版本的 `is_current`，其余字段由触发器保护。

## 2. 项目与适用性

| 方法/路径 | 服务端权限 | 请求/响应 | 并发/审计 |
| --- | --- | --- | --- |
| `GET /api/v1/projects?organisationId=` | 活跃组织成员 | 当前组织项目列表 | 查询同时约束 organisation |
| `POST /api/v1/projects?organisationId=` | P0 写角色 | `projectCode/name/scopeSummary` 必填 | `(organisation_id, project_code)` 唯一 |
| `GET /api/v1/projects/{projectId}?organisationId=` | 活跃组织成员 | 项目、最近评估、任务、产品摘要 | project + organisation 双条件 |
| `PATCH /api/v1/projects/{projectId}` | P0 写角色 | 可更新范围、日期和允许的状态 | 必须提交 `rowVersion`；冲突为 `409 PROJECT_ROW_VERSION_CONFLICT` |
| `POST /api/v1/projects/{projectId}/applicability` | P0 写角色 | 保存规则版本、输入快照、初评结果并生成缺口任务 | 评估 append-only；不输出法律认证结论 |

## 3. ProductModel、Batch 与 BatteryItem

| 方法/路径 | 服务端权限 | 说明 |
| --- | --- | --- |
| `GET /api/v1/product-models/{productId}/hierarchy?organisationId=` | P0 写角色且具备产品 `INTERNAL` 授权 | 返回 model、batch、item、UPI 和当前单体发布摘要 |
| `POST /api/v1/product-models/{productId}/hierarchy?organisationId=` | 同上 | 显式把已有电池型号分配到组织/可选项目，不推断历史所有者 |
| `POST /api/v1/product-models/{productId}/items-bulk` | 同上 | 最多 100 个单体；请求头或 body 提供 `idempotencyKey`；事务创建 item、HTTPS UPI 和 serial identifier |

独立 Batch 创建、resolved-data 和单独 UPI reserve 路由尚未实现；P0 使用已有型号/批次，批量单体函数自动生成或接受 UPI。数据库组合外键拒绝跨组织、跨型号和跨批次错链；组织内序列号和全局 UPI 唯一。

## 4. 导入

| 方法/路径 | 权限 | 说明 |
| --- | --- | --- |
| `POST /api/v1/imports/preflight` | P0 写角色 | `BATTERY_ITEMS/BOM/FIELD_VALUES`，1-1000 行；返回 input hash、行号、列名、字段、严重度和修复建议 |
| `POST /api/v1/imports/{jobId}/commit` | P0 写角色 + 产品编辑授权 | P0 当前只提交 `BOM`；重新预检并校验同一 input hash；事务写入 BOM/材料 |

同一 organisation + type + idempotency key 的相同输入返回原预检结果；不同输入返回 `409 IDEMPOTENCY_KEY_REUSED`。`BATTERY_ITEMS` 使用层级批量接口提交，`FIELD_VALUES` 在 P0 仅提供预检。

## 5. 审核、发布与输出

- `POST /api/internal/dpp-publications/{productId}/candidate` 接受可选 `batteryItemId`，单体候选沿用现有校验、审核、批准和发布状态机。
- 单体发布由 service-role RPC 创建不可变版本并更新 `dpp_item_publication_pointer`；第二版起必须填写变更原因。
- `/p/{DPP-ID-or-item-public-key}`、`/api/dpp-export` 和 PDF 使用同一 current publication snapshot。
- 导出响应包含 `X-DPP-Version`、`X-DPP-Snapshot-Hash`、`X-DPP-Published-At`。
- 公开投影替换内部 publication/product UUID，不返回 source table、source row、对象存储路径、草稿或授权字段。

## 6. 错误、幂等和边界

- 对外使用固定 `ApiError` code、用户可理解 message、request id 和必要的字段级 details；不回传 SQL、stack、service role 或数据库原始消息。
- 批量单体和导入要求幂等键；项目更新使用 row version；发布使用 source fingerprint、review lock、版本唯一索引和 current pointer。
- Registry 仍为 TEST/Mock/人工映射边界；没有官方 URI 时不得标记正式注册成功。
- 本文件不把尚未实现的 P1 路由当成 P0 能力。
