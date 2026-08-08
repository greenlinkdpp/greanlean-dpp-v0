# P0 Migration Plan

## 1. 文件

- 安装：`supabase/migrations/0025_p0_battery_pilot_foundation.sql`
- 回滚：`supabase/rollbacks/0025_p0_battery_pilot_foundation.down.sql`
- 安装 bundle：`supabase/bundles/p0_battery_pilot_install.sql`
- 验证：`supabase/bundles/p0_battery_pilot_verify.sql`

## 2. 安装顺序

1. 前置诊断：错链 Batch/Item、重复 UPI、现有非 HTTPS item UPI、迁移依赖。
2. 新增组织档案、所有权、项目、评估、任务、identifier、import 表。
3. 以 nullable 兼容列扩展电池层级和 publication。
4. 对已有可证明一致的 model/batch/item 建组合唯一键和 FK；发现错链立即中止，不自动改数据。
5. 增加新记录约束、RLS、服务器函数、append-only/审计触发器。
6. 保持现有 product publication pointer；新增 item pointer。
7. verify 检查表、RLS、约束、函数、策略、公开直访和历史行数。

## 3. 旧数据策略

- 不根据品牌、案例名称或授权关系猜测法律所有者。
- organisation 为空的历史产品标记为 legacy/unassigned，现有 URL 和发布快照继续可读。
- 已有唯一且 HTTPS item UPI 可导入 `dpp_identifier`，但需组织归属后才成为 P0 primary。
- 发布快照不重写；item 级新版本从新工作流产生。
- 合成 fixture 单独安装，不进入结构迁移。

## 4. 回滚

- Feature Flag 先关闭 P0 UI/写 API。
- 回滚只删除本迁移创建且未被后续迁移依赖的策略、函数、约束、列和表。
- 已创建 P0 业务数据先导出 JSON/CSV；回滚脚本若检测到新 publication/item pointer，默认中止并要求向前修复，避免丢失已发布版本。
- 应用回退后现有 product 级页面、发布和 alias 继续工作。

## 5. 生产前条件

- 在结构等价测试库运行 install → verify → rollback → install。
- 对比迁移前后 products/publication/file 数量和四个公共 URL。
- 所有 verify 返回 true；错链/重复/不安全 UPI 为 0。
- Registry 映射保持 TEST/Mock，区块链 connector 不配置生产凭据或 verified receipt。

## 6. 当前执行状态

- install/rollback bundle 已由生成器重新生成，并由 28/28 迁移合同测试校验与源文件一致。
- verify 覆盖 9 张 P0 基础表、9 张 RLS 表、层级触发器、9 个服务器函数和遗留数据冲突。
- 本轮未连接或修改目标 Supabase；真实 install → verify → rollback → install 演练仍是上线前硬门禁。
