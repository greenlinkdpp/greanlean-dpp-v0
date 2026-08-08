# Greanlean Codex审核与开发执行包 V1.0

## 1. 用途

本执行包用于把现有 Greanlean DPP 代码库交给 Codex 后，直接完成以下工作：

1. 审核现有代码、数据库、接口、权限、部署和测试现状；
2. 对照电池护照产品需求形成差距矩阵；
3. 基于现有技术栈补齐详细技术设计；
4. 在风险可控、需求无歧义的前提下实施 P0 功能；
5. 输出测试、迁移、回滚、代码审查和交付报告。

本包不假设当前代码库使用任何特定前端、后端、数据库、ORM、云平台或认证方案。Codex必须先读取真实仓库，再将逻辑规格映射到实际技术实现。

## 2. 放置方式

将本压缩包解压到 Greanlean 项目仓库根目录，使根目录至少包含：

```text
AGENTS.md
README_CODEX.md
CODEX_MASTER_TASK.md
PLANS.md
docs/
prompts/
tasks/
templates/
fixtures/
reference/
```

若仓库已有 `AGENTS.md`，不要直接覆盖。合并时保留原仓库的构建、测试、代码风格、目录边界和安全要求，并追加本包的产品与合规约束。

## 3. 最简单的启动方式

在 Codex 中打开项目根目录后，仅发送：

```text
请读取根目录 AGENTS.md 和 CODEX_MASTER_TASK.md，按 CODEX_MASTER_TASK.md 从 Phase A 开始执行。先审核，满足继续条件后直接完成 P0 开发；遇到 AGENTS.md 中的停止条件时再暂停提问。
```

更保守的方式是使用 `prompts/01_AUDIT_ONLY.md`，先审核后再决定是否开发。

## 4. Codex必须生成的文件

审核及开发过程中，Codex应在 `docs/generated/` 生成并持续更新：

```text
REPOSITORY_AUDIT.md
CURRENT_ARCHITECTURE.md
GAP_MATRIX.md
DECISIONS_REQUIRED.md
TECHNICAL_DESIGN.md
DATA_DICTIONARY_ACTUAL.md
API_SPEC_ACTUAL.md
PERMISSION_MATRIX_ACTUAL.md
MIGRATION_PLAN.md
TEST_REPORT.md
TRACEABILITY_STATUS.md
RELEASE_REPORT.md
```

这些文件必须基于真实代码和运行结果，不得只复制本执行包的模板。

## 5. 直接开发的边界

Codex可在完成审核后直接实施“明确、非破坏性、可测试”的P0任务。以下事项不得自行猜测：

- 正式Registry生产接口、字段语义目录、凭据和成功回执格式；
- 客户现有生产数据的删除、合并或不可逆重构；
- 未在代码中体现的认证、租户或收费规则；
- 需要法律判断的电池适用性最终结论；
- 客户品牌、真实证据、真实BMS运行数据。

## 6. 验收原则

完成不等于“页面能打开”。P0必须同时满足：

- 数据库约束有效；
- API鉴权有效；
- 页面、PDF、JSON同源；
- UPI可解析且唯一；
- 发布版本不可变；
- 缺证据或关键冲突能够阻断发布；
- 多租户隔离通过测试；
- 迁移、回滚和自动化测试有实际运行记录；
- `docs/generated/TRACEABILITY_STATUS.md`可追踪到需求、代码和测试。

## 7. 文件优先级

发生冲突时，按以下优先级处理：

1. 真实生产数据安全与客户连续性；
2. `AGENTS.md`中的安全及停止条件；
3. `reference/Greanlean_电池护照平台需求调整与开发实施文档_V1.0.docx`；
4. `docs/01_PRODUCT_REQUIREMENTS.md`及其他产品规格；
5. 现有代码风格与技术约定；
6. Codex自行形成的实现建议。

任何偏离需求基线的实现，都要写入 `docs/generated/DECISIONS_REQUIRED.md` 或 `RELEASE_REPORT.md`，说明原因、影响和后续处理。
