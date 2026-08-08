# 阶段 1：发布与审核基础层实施说明

日期：2026-07-25  
实施范围：M1 发布基础层、M2 审核与校验层  
应用状态：本地代码已完成，尚未执行远程数据库迁移，尚未切换前台读取

## 1. 本阶段完成内容

### M1 发布基础层

- `dpp_publication`
  - 保存完整规范发布快照；
  - 保存 JCS 规范载荷与 SHA-256；
  - 同一产品版本号唯一；
  - 同一产品最多一个 `PUBLISHED` 版本；
  - 内容不可修改和删除；
  - 只允许从 `PUBLISHED` 转为 `SUPERSEDED` 或 `WITHDRAWN`。
- `dpp_product_publication_pointer`
  - 每个产品最多一个当前发布指针；
  - 只能指向同一产品的 `PUBLISHED` 版本。
- 服务端函数
  - `greanlean_store_dpp_publication`
  - `greanlean_withdraw_current_dpp_publication`
- 浏览器匿名和普通登录角色均不能直接写入。

### M2 审核与校验层

- `dpp_publication_review`
  - 保存不可变审核候选；
  - 保存候选 Hash、基础发布版本和源数据指纹；
  - 同一产品最多一个待审核或已批准候选。
- `dpp_publication_validation_run`
  - 保存每次完整校验摘要；
  - 记录通过、失败、阻断和警告数量。
- `dpp_publication_validation_result`
  - 保存结构化字段级规则结果；
  - 校验批次和结果均为追加式。
- 服务端函数
  - 创建审核候选；
  - 记录校验结果；
  - 平台管理员批准、退回或拒绝；
  - 从已批准候选创建正式发布版本。

## 2. 发布门禁

正式发布必须同时满足：

1. 审核候选状态为 `APPROVED`；
2. 存在最新完整校验批次；
3. 最新校验没有失败的 `BLOCKER`；
4. 当前领域数据指纹与提交审核时一致；
5. 当前已发布版本仍等于审核候选的基础版本；
6. 产品 DPP ID、行业模板和候选快照一致；
7. 调用来自服务器 `service_role`。

任何条件不满足都会终止事务，不更新当前发布指针。

## 3. Supabase 执行文件

### 安装

在目标 Supabase 项目的 SQL Editor 中打开并完整运行：

```text
supabase/bundles/backoffice_alignment_phase1_install.sql
```

不要把文件路径、Markdown 代码块标记或本说明复制到 SQL Editor。

安装包内部按顺序执行：

1. `0015_dpp_publication_foundation.sql`
2. `0016_dpp_publication_review.sql`
3. `0017_publication_review_function_permissions.sql`

两个迁移各自有独立事务，任何一个失败都会回滚自身变更。

### 验证

安装完成后单独运行：

```text
supabase/bundles/backoffice_alignment_phase1_verify.sql
```

预期返回一行，以下列全部为 `true`：

- `publication_tables_passed`
- `publication_rls_passed`
- `append_only_controls_passed`
- `no_anonymous_publication_policy_passed`
- `no_authenticated_direct_write_policy_passed`
- `publication_functions_passed`
- `service_only_publication_writes_passed`
- `authenticated_review_execute_passed`
- `anonymous_review_execute_denied_passed`
- `single_current_version_controls_passed`
- `legacy_product_versions_preserved_passed`

### 回滚

仅允许在没有任何发布或审核业务数据的 Preview/Test 数据库运行：

```text
supabase/bundles/backoffice_alignment_phase1_rollback.sql
```

一旦新表产生业务数据，回滚文件会主动拒绝执行。此时应关闭新功能并采用前向修复。

## 4. 本阶段不执行

- 不修改现有产品数据；
- 不回填四个正式案例；
- 不写入新发布版本；
- 不改变 `product_versions`；
- 不切换公开 DPP 页面读取；
- 不改变 PDF、JSON 或 Registry 数据来源；
- 不开放新的公众权限；
- 不部署 Production。

## 5. 下一实施批次

数据库验证全部通过后，下一批进入 M3：

1. 建立九模块草稿聚合器；
2. 建立规范字段对象；
3. 生成领域数据源指纹；
4. 实现公众、合法利益、监管和内部投影；
5. 先对四个正式案例执行双读比较；
6. 比较通过后再决定是否切换前台。
