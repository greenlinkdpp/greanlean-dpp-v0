# P0需求追踪基线

Codex应把本表复制并扩展到 `docs/generated/TRACEABILITY_STATUS.md`，填写真实文件、符号、API、数据库、测试和状态。

| 需求 | 主要实体 | 主要服务/API | 主要页面 | 测试 | P0 |
|---|---|---|---|---|---:|
| M01 | Organisation, EconomicOperatorProfile, Membership | organisations, members, registry-readiness | 组织与成员 | 租户隔离、完整率 | 是 |
| M02 | Project, ProjectTask | projects, applicability, gaps | 项目工作台/适用性 | 规则版本、免责声明、缺口 | 是 |
| M03 | ProductModel, Batch, BatteryItem | product-models, batches, items | 产品层级 | T01、约束、批量 | 是 |
| M04 | Identifier, UPI route | identifiers, upi reserve, public resolver | 标识/公共页 | ID-001/002、扫码 | 是 |
| M05 | SchemaDefinition, FieldDefinition, FieldValue | schemas, field-values, validate | 数据与缺口 | 条件、类型、继承 | 是 |
| M06 | Component, BOMLine, Material, Supplier | components, bom import | BOM/材料 | T02、MAT-001 | 是 |
| M07 | FieldValue, Evidence | sustainability fields | 可持续分区 | 状态与证据 | 部分 |
| M08 | FieldValue, Evidence | technical fields/validate | 性能安全 | BAT-001/002 | 是 |
| M09 | Measurement | measurement import/query | 运行健康 | T07 | P1结构 |
| M10 | Supplier, LifecycleEvent | supply chain | 供应链 | 权限和事件 | 否/P1 |
| M11 | LifecycleEvent | lifecycle | 生命周期 | 只追加 | P1基础可选 |
| M12 | Evidence, EvidenceLink | upload, link, review, download | 证据中心 | T03/T10/EVD-001 | 是 |
| M13 | Role/Policy/Projection | authorised/public projection | 权限配置 | T05/T06/越权 | P0基础 |
| M14 | PassportDraft, Approval, PassportVersion | submit/return/approve/publish | 审核发布 | T03/T04、状态机 | 是 |
| M15 | PassportVersion outputs | public page/PDF/JSON | 公共护照 | T05/PUB-001 | 是 |
| M16 | RegistrySubmission | precheck/submission | Registry | T08/T09 | P1骨架 |
| M17 | ImportJob, ImportError | imports/jobs | 资料导入 | 行字段错误/幂等 | P0 Excel基础 |
| M18 | Subscription/Usage（待后续） | commercial | 商业管理 | 续费/额度 | 否/P2 |
