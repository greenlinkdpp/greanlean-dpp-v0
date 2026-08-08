# Codex主任务：审核现有Greanlean代码库并直接实施P0

## 总目标

以现有代码库为基础，把Greanlean从“DPP展示与后台原型”调整为可用于户用储能和LMT电池单型号试点的P0产品。不得脱离真实仓库重新臆造一套系统；不得以大规模重写代替增量改造，除非审核证明现有实现无法安全延续。

请更新根目录 `PLANS.md`，记录每一阶段的状态、发现、决策和验证结果。

---

## Phase A：仓库审核（本阶段禁止修改应用代码）

### A1. 发现仓库事实

检查并记录：

- Git分支、工作区状态、最近变更；
- 前端、后端、数据库、ORM、认证、缓存、队列、对象存储、PDF/二维码方案；
- 目录结构、模块边界、配置文件、环境变量；
- 包管理器、依赖版本和锁文件；
- 本地启动、构建、测试、Lint、类型检查、数据库迁移命令；
- CI/CD、部署平台、域名与公开路由；
- 当前数据库实体和迁移历史；
- 当前公共护照页面、PDF、JSON、二维码、证据、权限、版本和Registry相关实现；
- 测试覆盖、已知失败和安全风险。

不得读取或输出生产密钥。不得将真实客户数据复制进测试夹具。

### A2. 运行安全检查

在不修改代码和依赖的前提下，运行仓库已定义的：

- 安装/依赖完整性检查；
- 格式或Lint检查；
- 类型检查；
- 单元/集成测试；
- 构建；
- 数据库迁移状态检查。

如果命令会修改锁文件、生产数据库或外部资源，先跳过并记录原因。

### A3. 形成审核产物

生成：

1. `docs/generated/REPOSITORY_AUDIT.md`
2. `docs/generated/CURRENT_ARCHITECTURE.md`
3. `docs/generated/GAP_MATRIX.md`
4. `docs/generated/DECISIONS_REQUIRED.md`

`GAP_MATRIX.md`必须逐项覆盖M01-M18，并标记：

- 已实现；
- 部分实现；
- 未实现；
- 实现错误；
- 需要迁移；
- 暂不实施。

每项必须列出证据文件、数据库表、API、页面、测试和风险，不能只写主观判断。

### A4. 是否继续

出现 `AGENTS.md` 中的停止条件时，停止并提交审核结果。否则进入Phase B，不需要等待额外批准。

---

## Phase B：基于真实仓库补齐技术设计

生成并评审以下实际设计文档：

1. `docs/generated/TECHNICAL_DESIGN.md`
2. `docs/generated/DATA_DICTIONARY_ACTUAL.md`
3. `docs/generated/API_SPEC_ACTUAL.md`
4. `docs/generated/PERMISSION_MATRIX_ACTUAL.md`
5. `docs/generated/MIGRATION_PLAN.md`
6. `docs/generated/TRACEABILITY_STATUS.md`

要求：

- 复用现有技术栈和目录；
- 明确哪些实体复用、扩展、新增或废弃；
- 每个字段写明类型、必填、默认值、唯一性、外键、索引、枚举、来源和迁移方式；
- 每个API写明方法、路径、鉴权、请求、响应、错误码、幂等、分页和审计；
- 明确多租户隔离策略；
- 明确发布版本不可变策略；
- 明确UPI解析和旧链接兼容策略；
- Registry生产功能使用Feature Flag；
- 迁移计划包括备份、演练、回滚、数据核验和停机影响；
- 需求编号、代码模块、API、页面和测试建立追踪关系。

设计完成后进行一次自审。若设计暴露停止条件，则暂停；否则进入Phase C。

---

## Phase C：P0实施

### C0. 实施原则

- 小步提交或小范围补丁；
- 每个任务先测试后合并；
- 不无关重构；
- 不升级大型依赖，除非为修复明确安全或兼容问题；
- 保持公开URL兼容；
- 新功能默认在开发/测试环境启用，风险功能使用Feature Flag；
- 所有新增错误信息可定位到业务对象和字段；
- 所有关键操作写入审计日志。

### C1. P0实施顺序

按 `tasks/P0_BACKLOG.md` 执行，至少覆盖：

1. 租户/企业与经济运营者档案；
2. 项目工作台和适用性初评；
3. ProductModel-Batch-BatteryItem层级；
4. 唯一序列号、HTTPS UPI和二维码；
5. Schema/FieldDefinition/FieldValue；
6. BOM、材料、关键技术数据的导入与校验；
7. 证据中心和数据-证据关联；
8. 提交、退回、批准、发布和不可变版本；
9. 公众页面、PDF、JSON同源输出；
10. 发布门禁、跨字段校验和错误定位；
11. 多租户、权限、文件下载和导出的服务器端控制；
12. 户储与LMT合成数据端到端回归。

### C2. Registry边界

P0/P1中允许开发：

- 组织资料准备清单；
- 标识和UPI预检；
- 提交文件生成；
- 测试环境配置；
- 提交任务、correlation ID、错误、响应和URI的存储模型；
- Feature Flag和Mock适配器。

禁止自行开发并宣称：

- 未有官方定义的电池语义字段映射已最终合规；
- 未收到官方URI时已注册成功；
- 模拟返回等同正式Registry回执。

### C3. 开发过程验证

每完成一个Epic：

- 运行相关单元测试；
- 运行相关集成/API测试；
- 更新 `TRACEABILITY_STATUS.md`；
- 记录迁移影响；
- 检查多租户和权限；
- 检查页面/PDF/JSON一致性；
- 检查审计日志。

---

## Phase D：完整验证与代码审查

### D1. 自动化验证

运行仓库可用的全部：

- Format/Lint；
- 类型检查；
- 单元测试；
- 集成测试；
- E2E；
- 数据迁移测试；
- 构建；
- 安全/依赖检查（仓库已配置时）。

使用 `fixtures/` 中的合成数据，完成T01-T10。不得使用真实客户数据。

### D2. 自主代码审查

按照 `tasks/CODE_REVIEW_CHECKLIST.md` 审核本次Diff，重点发现：

- 数据丢失；
- 租户越权；
- 未鉴权的文件或导出；
- UPI冲突；
- 版本可变；
- 状态机绕过；
- Registry假成功；
- 页面/PDF/JSON不一致；
- 幂等与并发问题；
- 测试没有覆盖的关键分支。

修复严重和高风险问题后再进入Phase E。

---

## Phase E：交付

生成：

1. `docs/generated/TEST_REPORT.md`
2. `docs/generated/RELEASE_REPORT.md`
3. 更新后的 `GAP_MATRIX.md`
4. 更新后的 `TRACEABILITY_STATUS.md`
5. 尚未解决的 `DECISIONS_REQUIRED.md`

`RELEASE_REPORT.md`必须写明：

- 实际完成范围；
- 未完成范围及原因；
- 修改文件和迁移；
- 测试命令与结果；
- 手工验收步骤；
- Feature Flags；
- 部署和回滚步骤；
- 已知风险；
- 下一阶段P1建议。

不要声称未运行的测试已经通过，不要声称未连接的外部服务已经可用。
