# Greanlean 项目进度与审计记录

## 当前里程碑

Phase 4：电池 DPP 模块，应用代码和结构验证已完成，等待在隔离数据库执行迁移后启用。

## 已完成内容

- Phase 1：当前系统、数据结构、权限、风险和演示兼容性盘点；
- Phase 2：需求规格、实施计划、目标架构、数据库设计、电池字段迁移映射和法规不确定项；
- Phase 3：工程文档、环境边界、部署与回滚说明；
- 新建编号化 migration/rollback 目录和迁移检查；
- 新建通用 Schema、Schema version、字段定义、适用性规则、校验规则、法规来源、codelist 和访问策略基础；
- 建立发布后 Schema、字段、规则和 codelist 不可变保护；
- 建立 TypeScript Schema 生命周期、字段可见性、双语字段校验和条件适用性解析；
- 建立 feature flags、统一 API 错误格式、correlation id、日志脱敏和结构化日志；
- 给二维码 API 接入统一服务端边界，保持原响应类型和缓存行为；
- 建立 lint、typecheck、unit、integration、migration、smoke 和 build 脚本；
- 新建 GitHub Actions CI 配置。
- 纳入 BatteryPass-Ready v1.3 的 100 个数据属性（78 个静态、22 个动态）和 5 份校验 JSON；
- 建立 6 个法定电池类别与工业电池技术子类，不把 5 份参考 JSON 误作法定分类；
- 建立型号、批次、单体、动态运行和生命周期五层电池数据模型；
- 建立 11 步电池 DPP 录入工作台，并分开显示必填、条件必填、证据、核验、Registry 和待确认准备度；
- 建立消费者、正当利益、主管机关和内部四级服务器端字段投影；
- 建立动态指标和生命周期事件只追加、不覆盖的数据库约束与 API。

## 数据库迁移

Phase 3 和 Phase 4 新增但未应用：

```text
supabase/migrations/0001_project_migration_ledger.sql
supabase/migrations/0006_schema_registry.sql
supabase/migrations/0007_field_definitions_and_rules.sql
supabase/migrations/0009_battery_domain.sql
supabase/migrations/0010_battery_dynamic_metrics.sql
supabase/rollbacks/0001_project_migration_ledger.down.sql
supabase/rollbacks/0006_schema_registry.down.sql
supabase/rollbacks/0007_field_definitions_and_rules.down.sql
supabase/rollbacks/0009_battery_domain.down.sql
supabase/rollbacks/0010_battery_dynamic_metrics.down.sql
```

编号 `0002` 至 `0005` 和 `0008` 按 `PLAN.md` 预留。本阶段没有修改、回填或删除现有产品和演示数据。

本机没有 `psql`、Supabase CLI 或 Docker，因此只完成 SQL 成对性、事务边界、对象覆盖、不可变保护和“不得修改旧产品数据”的自动结构检查；尚未在 PostgreSQL 数据副本执行 up/down 演练。正式应用前必须按 `docs/engineering/database-migrations.md` 在可丢弃副本验证。

## 本阶段验证

| 检查 | 结果 |
|---|---|
| Repository lint | 通过 |
| TypeScript `tsc --noEmit` | 通过 |
| Unit tests | 13/13 通过 |
| Reference/contract tests | 5/5 通过 |
| Migration structural tests | 5/5 通过 |
| Battery SQL generator | 连续生成哈希一致 |
| Next.js production build | 通过，17 个页面完成生成，新增 2 个电池 API 路由 |
| Local production smoke | 5/5 通过 |

启用电池功能开关后，公开电池页面在尚未配置 service-role key/迁移时会隔离显示模块错误，主 DPP 页面仍可用。后台写入端到端测试尚未执行，因为本地浏览器没有登录会话且新迁移未应用；不能据此认定数据库写入已验证。

冒烟路径：

```text
/
/p/DPP-DEMO-001?lang=zh&view=consumer
/p/DPP-AUDIO-DEMO-001?lang=en&view=detail
/api/dpp-export?format=json&product=DPP-DEMO-001
/api/qr?url=<local DPP URL>
```

## 兼容性结论

- 未改变页面视觉样式；
- 未改变现有产品和 DPP 演示数据；
- 电池编辑和公开投影已经接入，但由 `NEXT_PUBLIC_FEATURE_BATTERY_DPP_V2` 控制且默认关闭；
- 公开 DPP、JSON 导出和二维码冒烟通过；
- 未修改 Supabase 数据库；
- 未部署 Vercel；
- 未提交或推送 Git。

## 回滚

应用层回滚优先关闭 `NEXT_PUBLIC_FEATURE_BATTERY_DPP_V2`。数据库如尚未承载业务数据，按 `0010 -> 0009 -> 0007 -> 0006 -> 0001` 执行 down；如果已经写入数据，只关闭功能并停止写入，保留表并采用前向修复。

## 下一步

在独立 Supabase 测试项目按顺序执行迁移并完成 up/down 演练；验证 RLS、登录权限和已有电池产品映射后，再在 Preview 环境开启电池功能开关。中央注册库适配器仍属于下一阶段，当前 Registry 指标仅表示本地数据准备度。
