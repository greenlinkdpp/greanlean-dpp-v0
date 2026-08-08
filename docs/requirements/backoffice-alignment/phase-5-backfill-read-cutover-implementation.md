# M6：回填、双读与读取切换实施说明

## 1. 目标

M6 将四个正式产品从旧 `product_versions` 读取路径迁移到不可变的
`dpp_publication` 与 `dpp_product_publication_pointer`，同时保留可即时恢复的
旧读取模式。

本阶段不删除旧产品数据，也不会在安装数据库迁移时自动切换公开页面。

## 2. 数据库对象

- `dpp_publication_read_control`
  - 单例读取开关；
  - 安装后默认为 `LEGACY`；
  - 只有 service role 可以切换。
- `dpp_migration_batch`
  - 记录四产品回填、读取切换和逻辑回滚批次。
- `dpp_migration_issue`
  - 使用固定类型记录缺失来源、旧硬编码、权限变化、映射缺陷和翻译缺口。
- `dpp_publication_comparison`
  - 保存新旧身份事实、受限字段泄漏检查和映射缺陷数量。

Registry 的 `registry_submission` 新增 `publication_id`。历史记录继续引用
`product_version_id`，新规范提交只允许引用二者之一。

## 3. 应用工作流

产品后台的发布区按以下顺序执行：

1. 生成九模块候选；
2. 对比旧公开身份字段；
3. 提交完整候选；
4. 记录结构化校验结果；
5. 平台管理员批准或退回；
6. 重新核对源数据指纹；
7. 写入不可变发布并移动当前发布指针。

普通产品保存不创建发布版本。

## 4. 读取切换

公开、专业和监管读取先请求规范发布 RPC。数据库开关为 `LEGACY` 时返回空，
应用继续使用旧读取函数。开关为 `CANONICAL` 时，数据库从当前发布指针返回
对应受众投影。

公众投影会移除：

- 高于公众权限的字段和记录；
- 高于公众权限的证据；
- 字段与证据的源表定位；
- 内部生成者和源表清单。

切换函数在四个正式 DPP ID 都存在当前 `PUBLISHED` 指针前会主动拒绝。

## 5. 执行顺序

1. 运行 `supabase/bundles/backoffice_alignment_phase5_install.sql`；
2. 运行 `supabase/bundles/backoffice_alignment_phase5_verify.sql`；
3. 部署应用到 Preview；
4. 在四个产品后台逐一提交、批准并发布；
5. 保存四产品双读报告；
6. 人工检查中英文、PDF、JSON、Registry 和四级权限；
7. 调用 `greanlean_set_publication_read_mode('CANONICAL', user_id)`；
8. 再次执行公开 URL 回归。

## 6. 回滚

`backoffice_alignment_phase5_rollback.sql` 是逻辑回滚，只把读取模式恢复为
`LEGACY`。规范发布、审核、比较报告、Registry 记录和审计记录全部保留，
避免用回滚覆盖历史。
