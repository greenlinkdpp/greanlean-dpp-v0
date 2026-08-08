# Gap Matrix

最终状态基于代码、静态迁移合同、自动化测试和本地只读 smoke；迁移 0025 尚未在结构等价或生产 Supabase 执行。

| 模块 | 状态 | 实际证据（表/API/页面/测试） | 剩余风险或 P1 |
| --- | --- | --- | --- |
| M01 组织/经济运营者 | P0 已实现 | `dpp_organisation` 扩展、`dpp_economic_operator_profile`、`dpp_product_ownership`；`/api/v1/organisations/current`、`/dashboard/organisation`；P0 integration contract | 通用档案操作审计和正式 EORI/VAT/GLN 优先级待定 |
| M02 项目/适用性 | P0 已实现 | `dpp_project`、assessment/task；projects/applicability API；`/dashboard/projects`、`/battery-applicability`；`p0Applicability.test.ts` | 公开初评不自动保存；法律规则仍需正式批准 |
| M03 Model-Batch-Item | P0 已实现 | battery 表组织列、组合 FK/触发器、组织内 serial 唯一；hierarchy/items-bulk API；`P0BatteryHierarchy`；T01 静态合同 | P0 未提供独立新建 Batch API；需在测试库执行真实约束负测 |
| M04 标识/UPI/QR | P0 已实现 | `dpp_identifier`、HTTPS/全局唯一约束、public key resolver、现有 `/api/qr` 和旧 `/p` 路由；smoke | Resolver 监控和正式 GS1 域名/qualifier 待定 |
| M05 Schema/字段值 | 部分实现 | 复用 schema 0006/0007、battery field 0009、candidate resolver；现有 schema/migration tests | 独立 resolved-data API 和完整字段继承 UI 留到 P1 |
| M06 BOM/材料/技术 | P0 已实现 | import job/error、preflight/commit API、`importPreflight.ts`；BAT-001、MAT-001 测试 | P0 commit 仅 BOM；XLSX 文件解析、BAT-002 全覆盖和 FIELD_VALUES commit 待 P1 |
| M07 可持续性 | 部分实现 | 复用 ESG、battery sustainability 与 canonical snapshot；既有 publication tests | 只覆盖试点字段，不代表完整法规字段覆盖 |
| M08 性能/安全 | 部分实现 | battery profile/field values、发布 readiness、证据门禁 | 实验室声明值/测试值的完整工作流仍需 P1 |
| M09 拆卸/维修 | 暂不实施工作流 | 既有文件和 public projection 继续展示；canonical tests | P1 完成结构化拆卸步骤、工具和权限工作流 |
| M10 循环/回收 | 暂不实施工作流 | 既有 circularity/lifecycle append-only 结构与投影 | P1 回收责任方和事件流程 |
| M11 运行数据 | 已有 P0 基础 | 迁移 0014、受限 integration API、270 指标演示记录；integration/policy tests | 生产 BMS/EMS、频率和 SLA 尚未接入；静态发布快照不含实时历史 |
| M12 证据中心 | P0 加固完成 | 迁移 0019、文件 API、字段证据链接、到期 blocker EVD-001；file lifecycle + readiness tests | 到期通知和恶意文件扫描仍需外部服务/P1 |
| M13 权限与字段访问 | P0 加固完成 | 0013/0020、P0 RLS、组合组织约束、后台 hierarchy 双授权、公开投影；access/integration tests | 未在 live DB 执行跨租户动态测试；支持访问能力需后续独立设计 |
| M14 审核/发布/版本 | P0 已实现 | publication/review 增 item subject；item pointer、变更原因、不可变函数；T04 contracts + canonical tests | 需在测试库执行并发双发布验证 |
| M15 页面/PDF/JSON | P0 已实现 | `publicDppRepository` item resolver、snapshot-only 新投影、`dpp-export` 三个元数据头；T05 + local smoke | 历史不完整快照保留 live presentation 兼容回退 |
| M16 通知/待办 | 部分实现 | `dpp_project_task` 自动生成适用性缺口；项目详情页 | 邮件/站内通知、提醒和任务分派留 P1 |
| M17 导入/导出 | P0 部分实现 | preflight/commit、行字段错误、组织导出、公开 JSON/PDF；unit/integration tests | 通用 job GET、XLSX 上传、批次/字段值 commit 留 P1 |
| M18 支持运营 | 暂不实施 | 保持既有平台管理边界 | 支持工单、受控代操作和 SLA 留 P2 |

## T01-T10 结果

| 门禁 | 结果 | 证据与限制 |
| --- | --- | --- |
| T01 层级与序列号 | 通过静态/单元合同 | 组合 FK、触发器、唯一索引；待测试库真实执行 |
| T02 BOM/技术校验 | 通过 | BAT-001、MAT-001、snake-case fixture、事务 commit 合同 |
| T03 证据/发布门禁 | 通过既有自动化 | readiness + review validation；待 live DB E2E |
| T04 不可变版本 | 通过静态/单元合同 | item review/publish、current pointer、change reason；发现并修复 `PUBLISHED` 枚举缺口 |
| T05 三种输出同源 | 通过 | page/PDF/JSON repository 合同；本地导出响应头已核对 |
| T06 权限/越权 | 通过静态合同 | RLS、service-only、组织组合 FK、hierarchy 双授权；待 live DB 负测 |
| T07 BMS | 通过既有测试 | 受限、幂等、append-only；不代表生产设备接通 |
| T08 Registry | 通过安全边界测试 | TEST/Mock；未宣称生产 Registry |
| T09 区块链 | 通过可选边界测试 | 不作为 P0 发布条件；未连接外部链 |
| T10 文件与到期 | 通过 | 文件生命周期权限与 EVD-001 到期 blocker |
