# P0 Traceability Status

状态：Phase C 实现完成，Phase D 本地自动化通过；数据库运行时验收待在结构等价 Supabase 执行 0025 install/verify。

| 需求 | 数据库/代码 | API/页面 | 测试 | 状态 |
| --- | --- | --- | --- | --- |
| M01 | 0025 operator profile/ownership；`p0Repository.ts` | organisation current/export；组织资料页 | P0 contract、lint/type/build | P0 完成 |
| M02 | project/assessment/task；`applicability.ts` | projects CRUD subset、applicability；项目页和公开初评 | `p0Applicability.test.ts` | P0 完成 |
| M03 | model/batch/item 组织组合 FK、trigger、serial unique | hierarchy、items-bulk；产品编辑层级 | T01 contract | P0 完成，Batch create P1 |
| M04 | `dpp_identifier`、public item resolver | 现有 QR、item public key `/p` | P0 contract + smoke | P0 完成 |
| M05 | 复用 0006/0007/0009；candidate inheritance | 现有编辑/发布 | schema/battery/canonical tests | 部分完成 |
| M06 | import job/error、BOM commit；preflight validator | imports preflight/commit | T02 unit + contract | P0 BOM 完成 |
| M07 | 复用 ESG/sustainability snapshot | 统一 DPP 页面 | canonical/public view tests | 试点范围完成 |
| M08 | performance + readiness/evidence | 产品编辑/发布工作流 | publication readiness tests | 试点范围完成 |
| M09 | 复用文件/字段 | 公开投影 | projection tests | P1 工作流 |
| M10 | 复用 circularity/lifecycle | 公开投影 | lifecycle contracts | P1 工作流 |
| M11 | 0014 operating integration | battery metric APIs/授权视图 | T07 integration/unit | 基础完成，生产接入待定 |
| M12 | 0019 evidence lifecycle + EVD-001 | file API/evidence manager | T03/T10 tests | P0 加固完成 |
| M13 | 0013/0020/0025 RLS + service boundary | 所有 P0 后台路由；hierarchy 双授权 | access/system/P0 contracts | P0 完成；live DB 负测待执行 |
| M14 | item review/publish/pointer/change reason | publication candidate/workflow | T04/canonical/readiness tests | P0 完成 |
| M15 | item snapshot resolver、sanitized legacy projection | `/p`、PDF/JSON export headers | T05 + local smoke | P0 完成 |
| M16 | project task | 项目详情 | applicability tasks unit | P0 基础 |
| M17 | import job/error/preflight/BOM commit | import APIs、组织/护照导出 | import tests + smoke | P0 部分完成 |
| M18 | 无新增 | 既有平台后台 | 无 | P2 |

## 关键验收追踪

- **跨租户**：P0 新资源均含 organisation；Project 子资源和 Model/Batch/Item 使用组合 FK；API 同时验证组织上下文与产品授权。
- **不可变发布**：BatteryItem 使用 review source fingerprint、validation blockers、版本唯一索引、current pointer 和 snapshot hash；旧版本仅改为 `SUPERSEDED`，内容触发器保持不可变。
- **同源输出**：item resolver 返回 PUBLIC canonical snapshot；页面、PDF、JSON 共用 repository；导出响应头暴露同一版本/哈希/时间。
- **合成数据**：`fixtures/p0` 每行含 `SYNTHETIC`；未复制客户证据或生产秘密。
- **正式外部能力**：Registry 仅 TEST/Mock，BMS/EMS 未连接生产设备，区块链未连接外部网络。
