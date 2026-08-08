# 后台与展示一致化阶段 0

日期：2026-07-25  
依据：`docs/Greanlean_DPP_Backoffice_Alignment_PRD_v0.1.md`  
阶段状态：完成，等待确认后进入业务代码重构

## 交付物

1. `canonical-field-source-map.csv`
   - 九个最终展示模块的规范字段；
   - 当前来源与目标权威来源；
   - 受众、粒度、证据和迁移动作。
2. `phase-0-field-data-mapping.md`
   - 当前数据链路审计；
   - 重复字段处理；
   - 五行业和四案例覆盖。
3. `publication-contract.md`
   - 完整发布快照契约；
   - 公众、专业、监管和内部投影；
   - PDF、JSON、二维码和动态电池数据边界。
4. `database-impact-migration-plan.md`
   - 数据库新增与调整范围；
   - 分批迁移、回填、双读、切换和回滚方案。
5. `phase-0-coverage-check.md`
   - 九个展示模块覆盖；
   - 五行业与四个正式案例检查；
   - 进入阶段 1 前必须消除的断点。

## 阶段结论

### 1. 当前最大断点

当前 `product_versions.snapshot` 的统一版本主要保存 `publicDpp`。后台保存产品时生成的普通版本又只包含产品基础记录。

因此当前存在两个问题：

```text
关联数据更新后不一定进入最新发布快照
专业和监管投影无法从只含公开字段的快照恢复完整数据
```

后续必须先建立完整规范快照，再从该快照生成受众投影。

### 2. 目标权威链路

```text
领域数据表与行业字段
→ 草稿聚合器
→ 审核候选
→ 完整规范发布快照
→ 不可变版本与 Hash
→ 受众投影
→ 网页 / PDF / JSON / Registry 映射
```

电池运行数据继续按授权实时投影，不复制进公众发布快照。

### 3. 数据处理原则

- 保留现有领域表，先增加统一聚合与发布层；
- 不在第一批迁移中删除历史字段；
- 每个重复字段指定一个目标权威来源；
- 已发布版本不可修改；
- 保存草稿不影响公开页面；
- 审计、Registry 响应和区块链交易不允许普通表单手工创建；
- 迁移过程保持四个正式案例 URL 不变。

## 进入下一阶段的门禁

进入代码修改前应确认：

- 完整快照名称和结构；
- 是否接受新增 `dpp_publication` 与当前发布指针；
- 是否按建议停用普通用户对审计、Registry 和区块链表的直接写入；
- 是否接受产品工作区按九个展示模块重排；
- 是否先完成 P0，再实施文件中心、供应商协同和真实区块链。

## 阶段 1 进度

M1 发布基础层和 M2 审核校验层已在本地实现，执行范围、文件顺序和验证标准见：

`phase-1-publication-review-implementation.md`

M3 九模块规范聚合、源数据指纹、四级投影和发布最终化已在本地实现，执行范围与双读门禁见：

`phase-2-canonical-aggregation-implementation.md`

M3 已完成四产品线上只读双轨核验，结果见：

`four-product-dual-read-report.md`

M4 文件资产、不可变文件版本、字段证据关联、通用生命周期事件和授权下载边界已在本地实现，执行顺序见：

`phase-3-file-evidence-lifecycle-implementation.md`

M5 后台服务端写入、领域表权限收口、Registry 环境保护和真实区块链连接边界已在本地实现，执行顺序见：

`phase-4-system-security-boundary-implementation.md`

M6 规范回填、双读比较、当前发布读取开关和 Registry `publication_id` 绑定已在本地实现，执行顺序见：

`phase-5-backfill-read-cutover-implementation.md`
