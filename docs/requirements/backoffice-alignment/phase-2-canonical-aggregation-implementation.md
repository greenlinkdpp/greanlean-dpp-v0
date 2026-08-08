# M3：九模块规范聚合与权限投影实施说明

日期：2026-07-25  
状态：本地实现完成，等待执行迁移 `0018`  
前台状态：仍读取原发布链路，尚未切换

## 1. 已实现能力

- 九个规范模块：
  - 产品与数字身份；
  - 材料与组成；
  - 环境与碳足迹；
  - 性能、耐久性与安全；
  - 行业专属数据；
  - 生产与供应链追溯；
  - 合规文件与证据；
  - 循环性与生命周期结束；
  - 生命周期事件与更新。
- 规范字段对象：
  - 稳定字段代码；
  - 原始机器值；
  - 中英文展示值；
  - 单位；
  - 权限等级；
  - 适用性；
  - 验证状态；
  - 数据来源；
  - 来源表和记录；
  - 证据引用。
- 规范 JSON 与 Hash：
  - 稳定对象键顺序；
  - SHA-256；
  - 领域数据源指纹；
  - 相同来源数据生成相同候选与指纹。
- 四级受众投影：
  - `PUBLIC`
  - `LEGITIMATE_INTEREST`
  - `AUTHORITY_ONLY`
  - `INTERNAL`
- 电池数据边界：
  - BatteryPass 静态字段进入候选；
  - 型号、批次和单体关系进入静态模块；
  - BMS/EMS 动态指标不进入静态发布快照；
  - 动态指标继续通过授权运行时接口读取。

## 2. 内部候选接口

接口：

```text
GET /api/internal/dpp-publications/{productId}/candidate
```

要求：

- Bearer 登录令牌；
- 数据库验证的平台管理员；
- 服务器配置 `SUPABASE_SERVICE_ROLE_KEY`。

查询参数：

- `audience=PUBLIC`
- `audience=LEGITIMATE_INTEREST`
- `audience=AUTHORITY_ONLY`
- `audience=INTERNAL`
- `compare=1`：同时生成旧公开数据与新公众投影的关键字段比较。

接口只读，不创建审核记录，不发布版本。

## 3. 发布最终化

审核候选保持 `DRAFT`，不能直接写入正式发布表。

正式发布时，服务器必须绑定：

- 真实发布 UUID；
- 产品内连续版本号；
- 实际发布时间；
- 发布用户；
- 上一发布版本 ID；
- 重新计算的规范载荷和 Hash。

迁移 `0018` 新增：

- `greanlean_store_final_dpp_publication`
- `greanlean_publish_final_approved_review`

同时停用：

- `greanlean_store_dpp_publication`
- `greanlean_publish_approved_review`

## 4. Supabase 执行

先完整运行：

```text
supabase/bundles/backoffice_alignment_phase2_install.sql
```

然后单独运行：

```text
supabase/bundles/backoffice_alignment_phase2_verify.sql
```

验证结果所有列必须为 `true`。

## 5. 四产品双读

目标产品：

- `DPP-LMT-BAT-48V15AH`
- `DPP-GV-ESS-14K3-000001`
- `DPP-SFJK-31-1-REC`
- `DPP-CE-EARBUDS-001`

服务器密钥只保存在本地安全环境或服务器运行时后，执行：

```text
npm run compare:dpp-publications
```

比较内容：

- DPP ID；
- 产品名称；
- 品牌；
- SKU；
- UPI；
- GTIN；
- 批次；
- 序列号；
- 九模块字段数量；
- 公众投影受限字段泄漏。

双读报告未通过时，不切换公开 DPP 读取。

## 6. 当前验证

- 单元与集成测试：61 项通过；
- 迁移契约测试：17 项通过；
- TypeScript：通过；
- 仓库检查：通过；
- Next.js Production Build：通过；
- 四个线上案例真实双读：等待服务器密钥与 `0018` 数据库验证。

