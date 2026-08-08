# Greanlean 统一 DPP 平台阶段 0 现状与影响分析

日期：2026-07-24
目标版本：v0.5.0
实施分支：`feature/battery-passport-demo`
依据文档：`docs/Greanlean_Unified_DPP_Platform_Redesign_PRD_v0.1.md`
阶段状态：阶段 0 交付，不修改业务代码、数据库或线上环境

## 1. 执行结论

当前项目具备继续重构所需的主要数据基础，但页面和数据读取路径已经出现明显分叉。

本阶段确认以下事实：

1. 官网当前仍以电池护照为主叙事，不符合“全行业 DPP 平台为主、电池护照为重点板块”的目标。
2. `/p/[slug]` 是通用 DPP 主入口，但工业储能电池会被切换到独立的 `BatteryDemoPassport`。
3. LMT 电池、纺织品和消费电子主要使用 `PublicDppClient`，工业储能电池使用另一套页面结构。
4. 四个重点产品均存在数据库记录或 Seed，但页面仍包含大量按产品 ID 注入的静态回退数据。
5. 工业储能电池同时存在 JSON、TypeScript 模型、SQL Seed、后台同步数据和页面回退数据。
6. 服务端已经具备电池字段权限投影能力，但该投影组件当前没有挂载到实际页面。
7. 通用页面的 `view=consumer|professional|audit` 主要控制前端显示，不是完整的身份权限控制。
8. 电池运行指标已有只追加数据表、最新值视图、校验逻辑和后台写入接口，但没有统一的外部设备接入接口，也没有挂载到统一 DPP 页面。
9. 现有公开页面和数据中仍有大量 `demo`、`synthetic`、`fictional` 和“演示”措辞。
10. 阶段 1 至阶段 5 可以在现有 Next.js、Supabase 和电池领域表基础上实施，不需要推倒重建。

## 2. 技术基线

### 2.1 应用栈

- Next.js 14 App Router；
- React 18；
- TypeScript；
- Tailwind CSS；
- Supabase PostgreSQL；
- Supabase Auth；
- Supabase Row Level Security；
- Vercel 部署；
- `qrcode` 生成二维码；
- Node 原生测试和迁移契约测试。

### 2.2 当前分支和工作区

- 当前分支：`feature/battery-passport-demo`；
- 当前提交：`8d5d46e feat: add industrial battery passport demo`；
- 新增但未提交的需求文件：
  - `docs/Greanlean_Unified_DPP_Platform_Redesign_PRD_v0.1.md`；
- 阶段 0 不提交、不推送、不部署。

### 2.3 基线检查

已使用工作区 Node 运行时完成：

```text
Repository hygiene checks passed.
TypeScript: passed.
```

终端默认 `PATH` 当前不包含 `npm`。这不是业务代码错误，但进入持续开发前应统一项目运行命令所使用的 Node 环境。

## 3. 当前公开路由

| 路由 | 当前行为 | 数据/组件 | 后续处理 |
|---|---|---|---|
| `/` | 电池优先官网 | `app/page.tsx` | 重构为全局 DPP 官网 |
| `/p/[slug]` | 通用 DPP 主入口 | `app/p/[slug]/page.tsx` | 保留为唯一权威公开入口 |
| `/passports/[slug]` | 仅识别工业电池别名并重定向 | `app/passports/[slug]/page.tsx` | 保留兼容重定向，不再承担产品判断 |
| `/demos/lmt-battery` | 重定向到 LMT DPP | `app/demos/lmt-battery/page.tsx` | 保留旧链接兼容，目标不再带权限视图 |
| `/demos/industrial-battery` | 重定向到工业电池 DPP | `app/demos/industrial-battery/page.tsx` | 保留旧链接兼容 |
| `/products/green-vault-ess-14-3` | 工业电池专属别名 | `app/products/green-vault-ess-14-3/page.tsx` | 301/308 到统一 DPP 地址 |
| `/01/[gtin]/...` | GS1 Digital Link 解析 | `app/01/[gtin]/[[...segments]]/route.ts` | 保留并统一解析到稳定 UPI |
| `/api/dpp-export` | PDF/JSON 导出 | `app/api/dpp-export/route.ts` | 改为读取发布快照，不再使用产品静态回退 |
| `/api/qr` | 生成二维码 | `app/api/qr/route.ts` | 保留 |
| `/api/battery-dpp/public/[identifier]` | 电池字段权限投影 | 电池 Repository | 接入统一页面和真实登录流程 |
| `/api/battery-dpp/[productId]` | 内部电池工作区和写入操作 | 电池 Repository | 保留后台用途，外部接入另设接口 |

目标状态：

```text
旧链接和 GS1 入口
→ 解析稳定产品标识
→ /p/[identifier]
→ 服务端识别身份和访问级别
→ 返回同一套 UnifiedDppPage 的字段投影
```

## 4. 官网现状

`app/page.tsx` 当前约 555 行，主要模块为：

1. 电池主题 Hero；
2. 电池能力；
3. 四个案例；
4. 平台对比；
5. 电池准备指南；
6. 服务流程；
7. 联系表单；
8. 页脚。

主要问题：

- Hero 的主标题和主要行动按钮首先指向工业电池；
- 电池能力出现在案例之前，平台被理解为电池专用平台；
- 缺少跨行业法规时间线；
- 缺少五行业方案入口；
- 电池护照没有作为全局平台下的独立专题组织；
- 四个案例虽同属一个数组，但 LMT、工业电池走 demo 路由，纺织和消费电子直接走 `/p`；
- 中文和英文文案仍存在“演示”“合成数据”“demo status”等表述；
- 官网直接通过浏览器 Supabase 客户端读取四个指定 `public_slug`；
- 页面代码同时包含内容、数据库查询、案例映射和视觉组件，阶段 1 应拆分。

## 5. DPP 页面现状

### 5.1 通用路径

```text
/p/[slug]
→ app/p/[slug]/page.tsx
→ products 查询
→ 15 组通用关联表查询
→ 可选电池字段 Legacy Projection
→ 按特定产品 ID 注入回退数据
→ PublicDppClient
```

涉及的主要通用数据：

- `products`；
- `product_materials`；
- `product_certificates`；
- `product_esg_metrics`；
- `product_bom`；
- `product_traceability`；
- `product_circularity`；
- `product_consumer_transparency`；
- `product_digital_identity`；
- `product_documents`；
- `product_data_governance`；
- `product_sector_field_values`；
- Registry、证据和区块链记录。

### 5.2 工业储能电池特殊路径

```text
/p/[industrial identifier]
→ isIndustrialDemoIdentifier
→ industrialDemoLegacyData
→ 标记 industrialBatteryDemo
→ BatteryDemoPassport
```

该路径绕开了 `PublicDppClient` 的统一结构，并直接读取：

- `docs/industrial-battery-demo.seed.json`；
- `lib/battery/industrialDemo.ts`；
- `components/battery/BatteryDemoPassport.tsx`；
- `supabase/seeds/industrial_battery_demo.sql`。

即使数据库存在产品，`app/p/[slug]/page.tsx` 仍会因工业电池标识而返回 TypeScript 静态模型。

### 5.3 通用组件规模

- `PublicDppClient.tsx`：约 3311 行；
- `app/p/[slug]/page.tsx`：约 1633 行；
- `BatteryDemoPassport.tsx`：约 416 行。

当前通用组件同时负责：

- 受众视图；
- 中英文文案；
- 行业判断；
- 页面布局；
- 数据兼容；
- 行业静态补全；
- 文件弹窗；
- 图标；
- 表格；
- 导出入口；
- 空状态；
- 证据和 Registry 展示。

继续在该组件内增加条件会扩大维护风险。阶段 2 应先拆分页面 Shell、领域 ViewModel 和模块组件。

## 6. 四个重点案例对比

| 案例 | 当前公开入口 | 当前页面 | 主要权威数据 | 静态回退 | 动态数据 |
|---|---|---|---|---|---|
| LMT 电池 | `/p/DPP-LMT-BAT-48V15AH` | `PublicDppClient` | 通用产品表 + 电池表 | 图片修正和 Legacy Projection | 数据表存在，公开页不展示值 |
| 工业储能电池 | 工业别名或 `/p` | `BatteryDemoPassport` | JSON/TS/SQL 多源 | 完整静态产品 | 固定静态历史表 |
| 纺织品 | `/p/DPP-DEMO-001` | `PublicDppClient` | 通用产品表 | `withDemoDppData` 完整补全 | 不适用 |
| 消费电子 | `/p/DPP-AUDIO-DEMO-001` | `PublicDppClient` | 通用产品表 | `withElectronicsDppData` 完整补全 | 未形成内置电池动态模块 |

### 6.1 当前视觉差异

工业储能电池与其他三个案例在以下方面不一致：

- Hero 高度和结构；
- 图片及二维码区域；
- 指标数量；
- 导航方式；
- 字段呈现方式；
- 完整度提示；
- 证据状态；
- 受限信息提示；
- 运行历史；
- 文档列表；
- 页脚。

### 6.2 当前内容差异

通用页面按消费者、专业和审计三种模式分支：

- 消费者：身份、材料、证书、消费者信息、生命周期结束；
- 专业：身份、材料、化学品、性能、追溯、ESG、证书、消费者信息、生命周期结束、行业预留、批次；
- 审计：身份、证据、Registry、治理和区块链。

工业电池页面按字段组直接渲染法规数据，并附加运行历史和文件。这正是用户指出的“把法规字段直接列出来”，与产品信息导向不一致。

## 7. 数据源冲突

### 7.1 当前双重或多重数据源

以下位置会生成或补齐完整产品数据：

- `app/p/[slug]/page.tsx` 中的多个 `with*DppData`；
- `lib/battery/industrialDemo.ts`；
- `docs/industrial-battery-demo.seed.json`；
- `components/DemoDataSyncButton.tsx`；
- `supabase/schema.sql` 中的基础 Seed；
- `supabase/upsert_demo_products.sql`；
- `supabase/seeds/industrial_battery_demo.sql`；
- `supabase/seeds/lmt_48v15ah_batterypass_test.sql`；
- `/api/dpp-export` 内部的产品回退。

风险：

- 后台修改后公开页可能仍显示代码中的旧值；
- 页面、PDF、JSON 和二维码目标可能不一致；
- 验证状态可能被回退逻辑改写；
- 删除数据库记录后页面仍可能正常显示，掩盖数据缺失；
- 同一个产品名称、标识和制造商可能存在多个版本。

### 7.2 目标数据原则

线上只允许：

```text
数据库已发布产品
→ 已发布版本快照
→ 服务器受众投影
→ 网页、PDF、JSON 和 Registry 映射
```

静态数据只允许用于：

- 本地开发 fixture；
- 自动化测试；
- 数据库初始化；
- Schema 示例；
- 可重复迁移测试。

## 8. 权限现状

### 8.1 已有能力

- Supabase Auth；
- 电池受限 API 的 Bearer Token 校验；
- `app_metadata.dpp_access_level`；
- `PUBLIC`、`LEGITIMATE_INTEREST`、`AUTHORITY_ONLY`、`INTERNAL`；
- 服务器字段投影；
- 电池内部写入必须为 `INTERNAL`；
- RLS 和公开字段访问策略；
- 访问不足时返回 401/403 的基础。

### 8.2 未完成能力

- `BatteryPublicProjection` 组件目前没有被任何页面使用；
- 通用 DPP 页面直接根据 URL 的 `view` 决定显示内容；
- 专业和审计页面没有统一登录门；
- 没有用户与组织关系表；
- 没有产品范围授权；
- 没有访问申请和审批；
- 没有受限数据访问日志闭环；
- 工业电池静态页面按 URL 显示不同字段；
- 查询参数仍可让用户进入专业或审计页面框架。

结论：

> 当前具备权限技术地基，但不能声称“扫码后已经根据真实用户身份自动显示对应页面”。

## 9. 电池动态数据现状

### 9.1 已有能力

- 23 个运行指标类型；
- `battery_operating_metric` 只追加历史；
- `battery_operating_metric_latest` 最新值视图；
- 产品、单体、指标、测量时间和来源设备绑定；
- 唯一摄取键；
- 数值范围和单位校验；
- 生命周期事件只追加；
- LMT、EV、工业电池的更新策略；
- 后台内部 `appendMetric` 和 `appendLifecycleEvent`；
- BMS、网关、人工和维保来源类型。

### 9.2 缺口

- 没有面向设备的稳定 `/api/integrations/...` 接口；
- 当前写入接口要求 Supabase 内部用户，不适合 BMS 设备凭据；
- 没有设备表、设备密钥和电池绑定管理；
- 没有 OAuth Client Credentials 或 API Key 管理；
- 没有批量摄取；
- 没有质量状态、接收时间和重放窗口的完整模型；
- 最新值和历史趋势没有进入统一 DPP 页面；
- 通用页面只显示“受限运行数据”的说明，不返回数值；
- 工业电池显示的是静态 JSON 中的固定历史；
- 当前没有图表组件和时间范围查询。

## 10. 前台用语影响

需要清理的前台词语包括：

- Demo；
- 演示；
- 合成数据；
- Synthetic；
- Fictional；
- Test Dataset；
- Not for Submission；
- Demo BMS simulator；
- “已验证”但没有真实证据的状态；
- 虚构实验室、虚构证书和虚构认证。

重点影响文件：

- `app/page.tsx`；
- `app/p/[slug]/page.tsx`；
- `components/PublicDppClient.tsx`；
- `components/battery/BatteryDemoPassport.tsx`；
- `lib/battery/industrialDemo.ts`；
- `components/DemoDataSyncButton.tsx`；
- `app/api/dpp-export/route.ts`；
- `app/api/declaration/route.ts`；
- `app/api/chemical-document/route.ts`；
- 四个案例 Seed。

后台仍须保留：

- 数据来源；
- 验证状态；
- 证据状态；
- 初始化来源；
- 责任主体；
- 最后更新时间；
- 未验证和待补充状态。

## 11. 数据库影响

### 11.1 可复用表

通用领域：

- 产品及行业模板；
- 产品版本；
- 材料、BOM、ESG、证书；
- 追溯、循环性和消费者信息；
- 数字身份；
- 文件和数据治理；
- Registry、证据、审计和区块链锚定。

电池领域：

- Schema Profile；
- Model Profile；
- Batch；
- Item；
- Field Value；
- Material Composition；
- Sustainability；
- Performance；
- Compliance Document；
- Disassembly；
- Lifecycle Event；
- Operating Metric。

### 11.2 阶段 1 和阶段 2

官网和统一页面组件重构原则上不要求立即新增数据库表。

### 11.3 阶段 3 至阶段 5

预计需要新增或调整：

- 统一发布快照的读取接口；
- 用户组织关系；
- 产品范围授权；
- 访问申请和审计记录；
- 设备、设备凭据和电池绑定；
- 动态数据质量和接收元数据；
- 旧 demo 标识向正式展示标识的迁移映射。

正式迁移前必须先核对生产数据库实际 Schema，不能只依据仓库 SQL 推断线上状态。

## 12. 测试影响

当前覆盖重点在：

- 电池字段目录；
- 电池分类；
- 电池运行策略；
- Seed 合约；
- 迁移对象；
- 工业电池静态模型；
- 公开页面不泄露运行指标；
- 少量视觉基线路径；
- 少量冒烟路由。

后续需要新增：

- 四个案例统一组件测试；
- 旧 URL 重定向；
- 数据库缺失时不得加载完整静态产品；
- 中英文纯净度检查；
- URL 参数不得提权；
- 公众、专业、监管投影；
- 动态最新值和历史接口；
- 初始化数据与设备上报来源区别；
- 手机和桌面截图回归；
- 四个案例相同版式约束。

## 13. 预计文件影响

### 13.1 阶段 1 官网

修改：

- `app/page.tsx`；
- `components/PublicHeader.tsx`；
- `components/LanguageSwitcher.tsx`；
- 全局样式和图片资源。

建议新增：

- `components/marketing/HomeHero.tsx`；
- `components/marketing/RegulatoryTimeline.tsx`；
- `components/marketing/IndustrySolutions.tsx`；
- `components/marketing/BatteryPassportSpotlight.tsx`；
- `components/marketing/PassportCaseGrid.tsx`；
- `lib/content/homeContent.ts`。

### 13.2 阶段 2 统一 DPP

修改：

- `app/p/[slug]/page.tsx`；
- `components/PublicDppClient.tsx`；
- 旧别名路由。

建议新增：

- `components/dpp/UnifiedDppPage.tsx`；
- `components/dpp/DppHero.tsx`；
- `components/dpp/DppSectionNav.tsx`；
- `components/dpp/DppSection.tsx`；
- `components/dpp/modules/*`；
- `lib/dpp/publicDppRepository.ts`；
- `lib/dpp/publicDppViewModel.ts`；
- `lib/dpp/sectorModules.ts`。

最终删除：

- `components/battery/BatteryDemoPassport.tsx`；
- 工业电池页面专属渲染分支。

### 13.3 阶段 3 数据统一

修改或替换：

- `withDemoDppData`；
- `withElectronicsDppData`；
- `industrialDemoLegacyData`；
- `/api/dpp-export` 静态回退；
- `DemoDataSyncButton` 中的完整产品常量。

### 13.4 阶段 4 和阶段 5

新增：

- 权限和组织迁移；
- 设备接入迁移；
- 集成 API；
- 最新值与历史 API；
- 访问审计；
- 动态电池模块。

## 14. 重构顺序

必须按以下顺序进行：

1. 固定页面结构和数据 ViewModel；
2. 重构官网，不触碰旧公开 DPP 行为；
3. 建立统一 DPP Shell；
4. 先迁移纺织品和消费电子；
5. 迁移 LMT 电池；
6. 将工业电池切入统一页面；
7. 数据库化四个案例，删除线上静态回退；
8. 接入真实身份权限投影；
9. 增加动态数据模块和外部接口；
10. Preview 验收后再清理旧组件和发布。

先迁移通用案例可以验证统一 Shell，最后切换工业电池可减少一次性回归范围。

## 15. 风险与控制

| 风险 | 控制 |
|---|---|
| 删除工业电池组件导致旧链接 404 | 先保留别名重定向和兼容测试 |
| 数据库内容不完整导致页面空白 | 在后台补数据，不在公开页偷偷回退 |
| 去掉“演示”后被理解为第三方认证 | 前台使用中性状态，后台保留来源和验证 |
| URL 参数越权 | 所有受限字段由服务器计算，不信任 `view` |
| 动态数据被理解为实时监控 | 展示测量时间、新鲜度和来源，不标“实时” |
| 四个行业被强行做成相同字段 | 统一框架，行业模块配置化 |
| 3311 行组件继续膨胀 | 先拆 ViewModel 和模块组件 |
| 生产数据库与仓库 SQL 不一致 | 每次迁移先运行只读核对 SQL |
| PDF/JSON 与页面不一致 | 三种输出读取同一发布快照 |

## 16. 阶段 1 进入条件

阶段 1 可以开始，但必须遵守：

- 只重构官网；
- 不删除工业电池页面；
- 不迁移数据库；
- 不更改生产环境；
- 四个案例链接保持可用；
- 中英文内容同步；
- 法规时间线区分确定日期与预计采纳；
- 完成桌面和移动端截图后再进入阶段 2。
