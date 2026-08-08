# 数据库影响、迁移与回滚计划

日期：2026-07-25  
状态：阶段 0 技术方案，不包含可执行 SQL  
依据：`publication-contract.md` 与 `canonical-field-source-map.csv`

## 1. 目标

在保留现有产品和电池数据能力的前提下，增加统一产品工作区、审核、完整发布快照、权限投影和系统操作边界。

迁移采用“先新增、再回填、双读验证、最后切换”的方式：

```text
现有表继续服务
→ 新增发布与治理层
→ 回填四个正式案例
→ 新旧结果对比
→ Preview 环境切换
→ 人工验收
→ Production 切换
→ 观察期后再清理兼容代码
```

阶段 1 不删除现有业务表，不改变公开 DPP URL，不直接覆盖已发布数据。

## 2. 现有表处理原则

### 2.1 继续作为权威来源

以下现有领域表继续保留，按字段映射表明确各自职责：

- `products`
- `product_digital_identity`
- `product_materials`
- `product_bom`
- `product_esg_metrics`
- `product_sector_field_values`
- `product_suppliers`
- `supplier_products`
- `product_traceability`
- `product_certificates`
- `product_documents`
- `product_circularity`
- `product_consumer_transparency`
- `product_data_governance`
- BatteryPass 规范字段与电池型号、批次、单体表
- `battery_operating_metric`
- `battery_lifecycle_event`

### 2.2 保留但逐步兼容化

`product_versions` 暂时保留，用于：

- 兼容当前已发布页面读取；
- 保留历史版本；
- 在双读阶段进行结果对比。

新发布流程切换后，不再允许普通产品保存操作向该表写入“伪发布版本”。后续是否归档或转换为兼容视图，需要另行迁移。

### 2.3 转为系统管理

以下表保留，但写入入口从普通通用表单移除：

- `dpp_registry_submissions`
- `dpp_registration_proofs`
- `dpp_audit_logs`
- `dpp_blockchain_anchors`

写入只能来自服务器函数、队列任务或受信集成适配器。

## 3. 建议新增对象

正式名称可在编写 SQL 前再次确认；本计划用以下名称表达职责。

### 3.1 `dpp_publication`

职责：保存完整、不可变的发布快照。

建议字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `uuid` | 发布版本 ID |
| `product_id` | `uuid` | 产品 |
| `version_number` | `integer` | 产品内连续版本号 |
| `status` | `text/enum` | `PUBLISHED`、`SUPERSEDED`、`WITHDRAWN` |
| `schema_version` | `text` | 完整快照契约版本 |
| `profile_key` | `text` | 行业及子分类 |
| `profile_version` | `text` | 字段模板版本 |
| `snapshot` | `jsonb` | 完整规范快照 |
| `snapshot_hash` | `text` | 规范化 SHA-256 |
| `published_by` | `uuid` | 发布人 |
| `published_at` | `timestamptz` | 发布时间 |
| `supersedes_id` | `uuid` | 上一版本 |
| `withdrawn_at` | `timestamptz` | 撤回时间 |
| `withdrawal_reason` | `text` | 撤回原因 |

约束：

- `unique(product_id, version_number)`；
- `snapshot_hash` 非空；
- 发布后禁止更新 `snapshot`、`schema_version`、`profile_key` 和 `snapshot_hash`；
- 禁止普通客户端插入、更新和删除。

### 3.2 `dpp_product_publication_pointer`

职责：保存产品当前有效发布版本。

建议字段：

- `product_id`，主键；
- `publication_id`，唯一或受控引用；
- `updated_at`；
- `updated_by`。

约束：

- 指针只能引用相同产品；
- 目标版本必须为 `PUBLISHED`；
- 更新指针与发布版本写入必须在同一事务或可恢复工作流中完成。

### 3.3 `dpp_publication_review`

职责：保存审核候选、审核状态、提交人和审核结论。

建议字段：

- `id`
- `product_id`
- `candidate_snapshot`
- `candidate_hash`
- `base_publication_id`
- `status`
- `submitted_by`
- `submitted_at`
- `reviewed_by`
- `reviewed_at`
- `decision_reason`
- `expires_at`

审核候选发生基础数据冲突时必须重新生成，不能继续发布旧候选。

### 3.4 `dpp_publication_validation_result`

职责：保存审核或发布时执行的规则结果。

建议字段：

- `review_id` 或 `publication_id`
- `rule_code`
- `severity`
- `module_code`
- `field_code`
- `passed`
- `message_zh`
- `message_en`
- `details`
- `created_at`

阻断、警告和提示必须结构化，不保存为单个长文本。

### 3.5 `dpp_publication_projection_cache`（可选）

职责：缓存计算成本较高且不包含实时动态数据的受众投影。

缓存键至少包括：

- `publication_id`
- `audience_level`
- `language`
- `projection_schema_version`

缓存可以删除重建，不能成为权威数据源。

### 3.6 `dpp_lifecycle_event`

职责：承载五行业通用的发布后生命周期事件。

建议字段：

- 产品、批次或单体引用；
- 事件类型；
- 发生时间与记录时间；
- 地点；
- 责任主体；
- 结构化事件数据；
- 访问等级；
- 证据引用；
- 来源和验证状态；
- 前序事件 Hash（可选）。

电池现有 `battery_lifecycle_event` 暂时保留。通过统一读取层把它和通用生命周期事件投影到同一前台模块，不在首批迁移中强行合表。

### 3.7 文件版本与字段证据关联

如现有 `product_documents` 无法表达不可覆盖的文件版本，建议增加：

- `dpp_file_asset`
- `dpp_file_version`
- `dpp_field_evidence_link`

每个发布快照引用固定文件版本，不引用可被覆盖的对象路径。

## 4. 现有表建议补充的标准元数据

对需要进入发布快照的领域记录，逐步补充：

| 字段 | 作用 |
|---|---|
| `access_level` | 字段或记录最低访问等级 |
| `source_type` | 制造商声明、供应商、测试、设备、计算等 |
| `source_recorded_at` | 来源发生或记录时间 |
| `verification_status` | 未验证、待核验、已验证、拒绝 |
| `verified_by` | 核验人 |
| `verified_at` | 核验时间 |
| `applicability` | 适用、不适用、待确认 |
| `not_applicable_reason` | 不适用原因 |
| `language_code` | 文本语言 |
| `record_version` | 并发控制 |
| `updated_by` | 最近修改人 |

不要求一次给所有旧表补齐所有列。优先级按发布阻断字段、证据字段和受限字段确定。

## 5. 建议迁移批次

迁移编号以仓库实际下一个可用编号为准，下列 `M1-M6` 是逻辑顺序。

### M1：发布基础层

新增：

- `dpp_publication`
- `dpp_product_publication_pointer`
- 不可变触发器；
- 版本号和当前指针约束；
- 服务端发布所需基础函数；
- 平台管理员和发布角色的最小 RLS。

不改变现有前台读取。

验证：

- 普通认证用户无法直接插入发布版本；
- 已发布快照无法更新或删除；
- 一个产品不能出现重复版本号；
- 指针不能指向其他产品或无效状态。

回滚：

- 前台尚未使用新表，可删除 M1 新增对象；
- 不修改任何现有业务数据。

### M2：审核与校验层

新增：

- `dpp_publication_review`
- `dpp_publication_validation_result`
- 审核候选创建、批准、退回的服务端函数；
- 审核角色权限。

验证：

- 编辑者可提交但不能自行批准需要独立审核的候选；
- 审核期间的产品变更触发版本冲突；
- 阻断规则不能被前端参数绕过。

回滚：

- 禁用审核入口；
- 删除仅在测试环境产生的审核数据；
- M1 发布基础层可独立保留。

### M3：规范聚合与投影

新增：

- 草稿聚合器；
- 完整快照构建器；
- 公众、合法利益、监管和内部投影函数；
- 字段权限过滤；
- 结构化对象和单位格式化规则；
- 电池动态数据授权读取边界。

验证：

- 同一候选重复构建得到相同规范内容；
- 公众投影不泄露受限字段；
- URL 参数不改变服务端权限；
- JSON 不包含字符串化对象；
- 中文输出不会因标签配置错误混入英文描述。

回滚：

- 前台继续使用旧读取链路；
- 保留已构建的新表测试数据用于诊断；
- 不删除旧 `product_versions`。

### M4：文件、证据和生命周期补强

按现状差距选择新增：

- 文件资产和不可变文件版本；
- 字段到证据的规范关联；
- 通用生命周期事件；
- 受限文件下载服务端签名；
- 对现有证书、文档和电池生命周期事件的兼容投影。

验证：

- 已发布版本引用的文件不可被覆盖；
- 替换文件后旧发布版本仍能解析原文件版本；
- 文件访问权限不低于字段访问权限；
- 生命周期记录为追加式。

回滚：

- 保留旧文件读取；
- 停用新文件写入和通用事件入口；
- 新增记录不反向破坏旧表。

### M5：系统操作与安全边界

调整：

- 停止通用表单直接写 Registry、审计和区块链表；
- 所有产品数据写操作迁入服务端；
- 收紧领域表 RLS；
- Registry、动态接入和区块链通过受信适配器写入；
- 审计和集成日志追加式保护；
- 敏感访问审计。

验证：

- 浏览器匿名密钥不能直接修改系统记录；
- 组织成员只能访问所属或明确授权产品；
- 没有明文集成密钥列；
- 区块链未配置时不产生交易 Hash；
- Registry TEST 不能写成生产成功。

回滚：

- 回滚应用入口时保留服务器函数；
- 如确需恢复旧编辑，只在短时受控环境恢复最小策略；
- 不删除已经产生的审计记录。

### M6：回填、双读与切换

执行：

- 回填四个正式案例的规范字段；
- 为每个案例生成一个新完整发布版本；
- 保留原 DPP ID 和 URL；
- 新旧前台结果并行比较；
- 切换当前读取到 `dpp_product_publication_pointer`；
- PDF、JSON 和 Registry 映射改为引用 `publication_id`；
- 停止普通保存写入 `product_versions`。

验证通过后，Production 只切换读取路径，不删除旧数据。

回滚：

- 使用特性开关恢复旧 `product_versions` 读取；
- 当前新发布指针保留，不删除；
- 禁止回滚脚本覆盖旧版本；
- 对回滚原因和影响版本写入审计。

## 6. 四个正式案例回填顺序

| 顺序 | DPP ID | 类型 | 重点 |
|---|---|---|---|
| 1 | `DPP-LMT-BAT-48V15AH` | LMT 电池 | BatteryPass 字段、单体、动态权限 |
| 2 | `DPP-GV-ESS-14K3-000001` | 工业储能电池 | 型号/批次/单体、运行指标 |
| 3 | `DPP-SFJK-31-1-REC` | 纺织品 | 材料、化学、证据和循环性 |
| 4 | `DPP-CE-EARBUDS-001` | 消费电子 | 产品与内置电池职责边界 |

家具和建材在同一数据模型与模板体系完成覆盖验证，但没有正式案例前不伪造生产数据。可使用隔离的测试夹具完成字段适用性和投影测试。

## 7. 回填规则

- 已有值优先从目标权威表读取；
- 同一字段多来源冲突时不自动覆盖，生成数据质量问题；
- 硬编码页面文案不能直接回填为产品事实；
- 空字符串转换为缺失，不转换为“不适用”；
- 复合 JSON 保持结构化；
- 中文和英文分别记录，不用机器翻译结果冒充已审核翻译；
- 历史证书和报告创建固定证据引用；
- 动态指标只建立数据源绑定，不复制 270 条历史记录到静态快照；
- 所有回填写入迁移批次、来源和时间。

## 8. 双读比较

双读阶段同时生成：

1. 旧公开 DPP 结果；
2. 新完整快照的公众投影；
3. 新完整快照的专业或监管投影；
4. 指定发布版本的 PDF 和 JSON。

比较维度：

- DPP ID、GTIN、SGTIN、SKU、批次和序列号；
- 产品名称、图片和行业分类；
- 九个模块是否遗漏；
- 单位、枚举和结构化对象；
- 中英文一致性；
- 文件和证据链接；
- 当前发布版本和 Hash；
- 电池动态数据的产品、批次、单体绑定；
- 公众投影是否出现受限字段；
- 旧页面存在但无权威来源的硬编码内容。

差异分类：

- `EXPECTED_MODEL_CHANGE`
- `SOURCE_DATA_MISSING`
- `LEGACY_HARDCODED_VALUE`
- `ACCESS_POLICY_CHANGE`
- `MAPPING_DEFECT`
- `TRANSLATION_GAP`

只有 `MAPPING_DEFECT` 清零，阻断数据问题处理完成，才允许切换。

## 9. RLS 与服务端写入

### 9.1 浏览器允许的操作

- 读取当前用户有权访问的工作区投影；
- 提交经过服务端验证的编辑命令；
- 上传到受控文件入口；
- 请求审核、预览和发布；
- 读取已授权的发布或动态投影。

### 9.2 浏览器不应直接执行

- 任意表的通用 `insert/update/delete`；
- 创建发布版本；
- 修改当前发布指针；
- 写审核结论；
- 写审计日志；
- 写 Registry 成功结果；
- 写区块链交易 Hash；
- 写 BMS/EMS 运行指标；
- 提升用户权限。

### 9.3 数据库函数要求

- 使用明确参数，不接收任意表名或任意 SQL；
- 校验产品组织归属、角色和记录版本；
- 在事务内写业务记录和审计；
- `security definer` 函数固定 `search_path`；
- 返回稳定错误码；
- 不在响应中返回服务端密钥。

## 10. 部署顺序

每个迁移批次采用相同流程：

```text
本地 schema 与单元测试
→ Preview Supabase 项目执行
→ SQL 验证查询全部通过
→ Preview Vercel 部署
→ 四案例人工验收
→ 备份与回滚点确认
→ Production 数据库迁移
→ Production 应用部署
→ 监控与抽样核验
```

Production 数据库与应用切换应分开进行。先部署向后兼容数据库，再部署读取新结构的应用。

## 11. 迁移验证查询类别

每个 SQL 文件附带独立验证查询，至少覆盖：

- 表、索引、约束和触发器数量；
- RLS 已启用；
- 匿名直接访问策略为零；
- 普通认证角色不能写系统表；
- 不可变触发器数量与目标一致；
- 发布函数和投影函数存在；
- 四个正式案例均有且仅有一个当前发布指针；
- 指针产品与发布产品一致；
- 快照 Hash 非空且重新计算一致；
- 公众投影受限字段数量为零；
- 电池动态数据匿名可见数量为零；
- 重复唯一产品标识数量为零；
- 孤立证据、文件和生命周期引用数量为零。

验证查询采用独立 `select`，避免在 Supabase SQL Editor 中因复制文件名、说明文字或不完整 `union` 造成语法错误。

## 12. 回滚总原则

- 回滚应用读取优先于回滚数据；
- 不使用 `drop cascade` 处理生产故障；
- 不删除已发布快照、审计、Registry 响应或锚定记录；
- 不把新数据强行还原到已被旧模型覆盖的结构；
- 所有切换使用明确特性开关或当前指针；
- 回滚后保留故障版本用于审计；
- 每次 Production 迁移前记录可恢复备份点。

## 13. 暂不执行的破坏性变更

阶段 1 不执行：

- 删除 `product_versions`；
- 合并所有行业字段到一个超大 JSON；
- 删除现有电池标准化表；
- 把所有生命周期事件强制迁入单表；
- 删除旧字段或旧文件；
- 重写 DPP ID；
- 更换四个正式案例 URL；
- 自动声明 EU Registry 已正式注册；
- 生成伪区块链交易；
- 把电池动态数据公开化。

## 14. 阶段 1 开发门禁

开始编写迁移 SQL 和业务代码前，应确认：

1. 接受新增独立 `dpp_publication`，而不是继续扩大 `product_versions`；
2. 接受完整快照存储在受限表，公众只读取投影；
3. 接受普通用户不能直接写审计、Registry、区块链和动态数据表；
4. 接受先完成四个正式案例双读验证，再切换 Production；
5. 接受家具和建材先完成模板与测试覆盖，待真实产品数据到位后再发布案例。

