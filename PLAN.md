# Greanlean 电池 DPP 实施计划

版本：Phase 2 / implementation-plan  
状态：待确认  
日期：2026-07-22  
目标建议版本：`v0.4.0`

## 1. 执行原则

- 当前设计阶段结束后停止，未经确认不进入代码和数据库实施；
- 所有开发继续在 `feature/battery-dpp` 或其后续子分支进行；
- 数据库只使用编号化迁移和回滚脚本；
- 生产环境不用于迁移试验；
- 每个里程碑保持现有 DPP、二维码、演示产品和公开 URL 可用；
- 法规未知项维持 `TBD`，不以经验补为必填；
- 每个里程碑有验收、测试、备份和回滚记录。

## 2. 建议里程碑

### M0：架构确认

交付：

- `SPEC.md`；
- `PLAN.md`；
- `docs/architecture/target-architecture.md`；
- `docs/architecture/database-design.md`；
- `docs/regulatory/eu-battery-dpp/migration-mapping.md`；
- `docs/regulatory/eu-battery-dpp/known-uncertainties.md`。

退出条件：产品负责人确认对象边界、迁移策略、首批电池配置和 Registry 当前可用边界。

### M1：基础工程规范化

目标：先建立可安全迭代的工程底座，不改变公开体验。

任务：

1. 补充 README、CHANGELOG、环境矩阵和部署说明；
2. 创建 `supabase/migrations` 和 `supabase/rollbacks` 编号规范；
3. 增加 lint、typecheck、unit、integration、migration 和 e2e 脚本；
4. 建立 feature flag；
5. 建立服务端 API/Server Action 基础层和统一错误格式；
6. 建立结构化日志和 correlation id；
7. 建立开发/预览/测试/生产环境边界；
8. 给现有公开页建立冒烟和截图回归基线。

验收：构建和基础测试在 CI 中运行；没有业务数据迁移；现有页面行为不变。

回滚：删除新工程配置或关闭 feature flag，不触碰生产表。

### M2：组织与权限基础

目标：建立多租户和服务端授权，但分阶段收紧旧 RLS。

任务：

1. 迁移创建 `organisation`、`user_profile`、`role`、`organisation_member`；
2. 为现有用户和数据建立默认组织映射；
3. 实现服务端 `requireOrganisationPermission`；
4. 增加 RLS 辅助函数和权限矩阵测试；
5. 新模块先使用组织权限；
6. 旧表继续旧策略，待数据回填验证后再收紧。

验收：不同组织无法读取或修改对方新模块数据；管理员、编辑者、审计者权限符合矩阵。

高风险：默认组织归属错误会导致数据不可见。执行前必须导出用户和产品归属报告供人工确认。

回滚：关闭新权限路径，恢复兼容读取；不删除组织映射。

### M3：产品层级与 DPP 版本

目标：建立产品、型号、批次、单体和护照版本主模型。

任务：

1. 创建 `product`、`product_model`、`product_batch`、`product_item`；
2. 创建 `unique_identifier`、`data_carrier`；
3. 创建 `dpp_passport`、`dpp_version`；
4. 为每个现有 `products` 行生成默认产品和型号；
5. 回填 DPP ID、GTIN、批次、序列号和旧版本；
6. 实现发布事务、完整快照和 Hash；
7. 建立 Legacy DPP Facade 双读；
8. 建立新旧投影差异报告。

验收：旧公开 URL 和二维码继续工作；新护照可按三种粒度创建；发布版本不可覆盖。

回滚：feature flag 切回旧表读取；新表保留，停止写入。

### M4：Schema 与法规字段字典

目标：建立字段定义的单一来源。

任务：

1. 创建 Schema、版本、字段、规则、法规来源、codelist 和 field value 表；
2. 编写可重复运行的 BatteryPass 导入工具；
3. 导入五套 JSON Schema v1.0；
4. 导入 Longlist v1.3 的 100 个属性及其访问、行为和粒度；
5. 将 `x/(x)/o/空白` 转为平台字段状态；
6. 建立字段定义到 JSON pointer 和目标 storage path 的映射；
7. 生成表单配置和校验器；
8. 将现有 `dpp_field_templates` 置于兼容只读层。

验收：同一 Schema 版本可生成录入表单、校验 JSON 和公开投影；规则来源可追溯；`TBD` 不会阻止普通草稿但会影响 Registry 准备度。

回滚：停用新 Schema 版本，恢复旧模板；不覆盖旧字段定义。

### M5：电池领域模块

目标：实现型号静态数据、单体动态数据和生命周期事件。

任务：

1. 创建全部电池扩展表和索引；
2. 实现电池分类、技术变体和 Schema 选择；
3. 实现 7 个 BatteryPass 字段组的录入流程；
4. 实现文档证据上传、Hash、访问策略和关联；
5. 实现动态指标 append-only API 和最新值只读视图；
6. 实现生命周期事件；
7. 实现消费者、专业和主管机关服务端投影；
8. 实现分项准备度，不显示单一“合规百分比”；
9. 迁移现有电池演示产品并标记 demo/legacy 来源。

验收：五套配置均可创建示例；静态和动态数据粒度正确；受限字段不能通过 URL 参数泄露；自动生成演示文件不被当作正式证据。

回滚：关闭 battery module flag，旧演示页继续通过 facade 读取。

### M6：Registry 测试适配

目标：依据正式实施条例和现行 User Guide 完成注册准备闭环；在电池语义目录开放前不宣称注册成功能力。

任务：

1. 创建 mapping、submission、validation、error、proof 表；
2. 增加 Registry 组织 enrolment/verification 状态和证明文件记录；
3. 实现 DPP 版本到 Registry UI/文件提交结构的版本化映射；
4. 实现粒度、标识、商品编码、备份引用和签章存在性预校验；
5. 实现映射文件下载和人工上传工作台；
6. 实现 TEST 结果和错误导入；
7. 实现重试链和注册证明记录；
8. 电池语义目录、API 技术文档和集成凭据可用后，再新增自动提交 adapter，不修改领域层；
9. `PRODUCTION` 默认关闭。

验收：任一已发布电池 DPP 能生成可追溯映射、校验报告和测试环境人工提交记录；系统明确展示“电池语义注册暂不可成功”；测试/生产数据不可混用。

回滚：禁用 Registry adapter，不影响 DPP 发布和公开访问。

### M7：回归、迁移和发布准备

任务：

1. 在脱敏数据副本执行全量迁移和回滚演练；
2. 对账行数、标识唯一性、DPP 版本和公开投影；
3. 运行权限矩阵、文件访问、动态历史、Registry 和异常测试；
4. 对现有纺织、家具、建材、消费电子和电池演示页做视觉回归；
5. 验证 GS1 路由、二维码、JSON/PDF 导出；
6. 形成备份、恢复、部署、回滚、已知问题和发布说明；
7. 逐组织灰度启用新读取和写入；
8. 稳定后再将旧表转只读。

验收：无 P0/P1 缺陷；迁移与回滚演练通过；生产发布清单得到人工批准。

## 3. 建议迁移编号

```text
0001_project_migration_ledger
0002_organisation_and_membership
0003_product_hierarchy
0004_identifiers_and_data_carriers
0005_dpp_passport_and_versions
0006_schema_registry
0007_field_definitions_and_rules
0008_documents_sources_and_access
0009_battery_domain
0010_battery_dynamic_metrics
0011_registry_adapter
0012_legacy_backfill
0013_compatibility_views
0014_rls_tenant_enforcement
```

每个编号配套：

```text
supabase/migrations/<number>_<name>.sql
supabase/rollbacks/<number>_<name>.down.sql
tests/migrations/<number>_<name>.test.sql
```

## 4. 测试矩阵

| 类别 | 必测内容 |
|---|---|
| Unit | 标识规范化、字段状态转换、适用性、单位、Hash、Registry mapping |
| Integration | 发布事务、文件证据、动态指标幂等、生命周期事件、Registry 记录 |
| RLS | 同组织、跨组织、public、legitimate interest、authority、internal |
| Migration | 新建、回填、重复运行、失败回滚、旧数据保留 |
| Contract | 旧公开页面数据形状、导出 JSON、GS1 跳转 |
| E2E | 创建电池 -> 录入 -> 校验 -> 发布 -> 三类访问 -> Registry 映射 |
| Regression | 五行业演示、中文/英文、消费者/专业/审计后台预览 |
| Performance | 单体指标历史、批量导入、公开 DPP 查询 |
| Security | IDOR、签名 URL、越权字段、payload/日志脱敏、上传类型和大小 |

## 5. 数据迁移核对指标

- 现有产品总数 = 已映射产品数 + 明确拒绝数；
- 每个现有产品恰好有一个默认型号映射；
- legacy DPP ID 无重复；
- GTIN、批次、序列号冲突全部进入人工复核；
- 已发布旧产品可继续通过原 URL 访问；
- 旧版本数与新 legacy 版本数可对账；
- 所有自动生成 demo 文件都带 `LEGACY_ONLY`；
- 所有无法证明来源的字段带 `MISSING_SOURCE`；
- 不允许迁移脚本自动生成“验证通过”状态。

## 6. 发布与回滚门禁

发布前必须确认：

- 数据库快照和 Storage 备份完成；
- migration up/down 在 staging 演练通过；
- RLS 权限矩阵全绿；
- 旧公开页和二维码回归全绿；
- 新模块 feature flag 默认关闭；
- Registry `PRODUCTION` adapter 默认关闭；
- 生产环境变量不在仓库；
- 监控和错误告警可用；
- 回滚负责人和恢复时间目标已确认。

应用回滚优先级：

1. 关闭新写入；
2. 切换 facade 到旧读取；
3. 回滚 Vercel 应用版本；
4. 仅在迁移未承载新数据时运行 down；
5. 已产生新数据时保留新表并人工制定反向同步，不做破坏性删除。

## 7. 待人工确认后才能进入 M1

1. 是否接受“产品族 -> 型号 -> 批次 -> 单体 -> DPP”的层级；
2. 是否接受 BatteryPass 五套配置是 Schema 配置而非法定五大类；
3. 是否接受首批正式模块覆盖 EV、LMT 和 >2kWh 工业配置，portable/SLI 暂为未来配置；
4. 是否接受 Registry 先对接测试环境和文件流程，电池语义目录开放前不直接接生产 API；
5. 现有 Supabase 数据应归属到哪个默认组织；
6. 是否允许第三阶段建立新的迁移、测试和服务端 API 目录；
7. 是否要求将本阶段文档先提交并推送到功能分支。
