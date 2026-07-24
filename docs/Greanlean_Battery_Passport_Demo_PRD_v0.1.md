# Greanlean 电池护照优先展示与工业储能电池 Demo 扩展需求

> 文件类型：产品需求文档（PRD）＋Codex 开发执行规范  
> 目标版本：Greanlean v0.4.0 — Battery Passport Demo Expansion  
> 文档版本：v0.1  
> 日期：2026-07-24  
> 状态：待现有项目审计后执行  
> 适用分支：`feature/battery-passport-demo`

---

## 0. 文档使用说明

本文件用于指导 Codex 在现有 Greanlean 项目中完成以下需求：

1. 官网首页增强电池护照相关内容；
2. Demo 案例区调整为 4 个重点案例，其中包含 2 个电池案例；
3. 在产品中心新增一个“大于 2 kWh 的工业储能电池”演示产品；
4. 新增工业储能电池的完整 DPP 演示页；
5. 电池字段以欧盟电池法规为基线，并参考 BatteryPass-Ready 当前数据属性体系；
6. 保留现有 LMT 电池、纺织品和消费电子案例；
7. 不破坏现有网站、产品中心和已有 Demo。

Codex 必须先读取现有项目结构、现有案例数据和 LMT 电池字段，再制定修改方案。未经确认，不得直接进行大范围架构重构。

---

# 一、需求背景

欧盟电池护照是当前 Greanlean 最优先的市场切入方向。现有网站已经具备 DPP 基础展示能力和 LMT 电池案例，但首页、电池行业能力表达、案例组合及工业电池示例不足，无法完整展示 Greanlean 对以下场景的支持能力：

- LMT 轻型交通工具电池；
- 电动汽车电池；
- 大于 2 kWh 的工业电池；
- 固定式工业储能电池；
- 电池型号、批次和单体级 DPP 数据管理；
- 电池产品的结构化字段、二维码和生命周期数据展示。

本次开发以“市场演示能力增强”为主要目标，不等同于正式完成欧盟 DPP Registry 接口接入，也不得向用户表达为官方认证或法规合规保证。

---

# 二、法规和数据基线

## 2.1 强制法规基线

电池护照的法规要求应以以下文件为主要依据：

- Regulation (EU) 2023/1542 concerning batteries and waste batteries；
- Article 77：Battery passport；
- Article 78：Technical design and operation of the battery passport；
- Annex XIII：Information to be included in the battery passport；
- Annex VI：Label information；
- Article 7：Carbon footprint；
- Article 8：Recycled content；
- Article 10：Performance and durability；
- Article 14：State of health and expected lifetime；
- Article 18：EU declaration of conformity；
- Article 52 等供应链尽职调查要求；
- ESPR 中适用于 DPP 的通用机器可读、唯一标识、互操作、数据可用性和访问控制要求。

## 2.2 字段实施参考

字段名称、定义、数据类型、数据粒度、访问权限和建议校验规则，应参考：

- BatteryPass-Ready Data Attribute Longlist v1.3；
- DIN DKE SPEC 99100；
- Battery Pass Content Guidance；
- Battery Pass Technical Guidance；
- 当前适用的 CEN/CENELEC JTC 24 草案和后续正式标准。

## 2.3 重要限制

1. Battery Pass / BatteryPass-Ready 是实施和标准化参考，不是欧盟立法机关；
2. 不得把 Battery Pass 建议字段全部描述为法规强制字段；
3. 字段需区分：
   - 法规强制；
   - 条件适用；
   - 标准化建议；
   - Greanlean 演示扩展；
   - 尚待实施文件确认；
4. 当前示例数据均为虚构演示数据；
5. 不得把虚构的碳足迹、检测报告、回收材料比例和尽职调查信息描述为真实认证结论；
6. 所有演示产品页面均应显示 Demo 免责声明；
7. 本版本不实现 EU DPP Registry 正式自动注册；
8. Registry 映射和提交功能另行作为后续版本开发；
9. 数据结构应预留 UPI、型号标识符、批次标识符和单体标识符。

---

# 三、版本目标与范围

## 3.1 版本目标

本版本形成以下完整演示链路：

```text
官网了解电池护照能力
→ 进入 Demo 案例区
→ 查看 LMT 电池或工业储能电池
→ 进入产品中心
→ 查看工业储能电池产品信息
→ 打开该产品的电池 DPP 页面
→ 查看法规字段、材料、性能、碳足迹、循环利用和生命周期信息
→ 查看二维码和结构化数据入口
```

## 3.2 本版本包括

- 首页电池护照内容；
- 首页或案例页的电池护照入口；
- 4 个重点 Demo 案例；
- 新增工业储能电池产品；
- 新增工业储能电池 DPP；
- 电池字段分类展示；
- 示例二维码或二维码生成逻辑；
- 示例结构化 JSON 数据；
- 页面 Demo 免责声明；
- 基础响应式适配；
- 原有功能回归测试；
- 文档和版本记录。

## 3.3 本版本不包括

- 企业客户自助注册；
- 多租户后台；
- 电池 BMS 实时接口；
- 实际 SOH/SOC 数据实时接入；
- 自动 LCA 计算；
- 自动生成真实碳足迹声明；
- 真实供应链尽职调查；
- 真实检测证书签发；
- EU DPP Registry 正式 API 对接；
- EU Login 或 Registry 凭据管理；
- 正式合规审核结论；
- 全平台架构重写；
- 与本需求无关的视觉系统重构。

---

# 四、需求一：首页增加电池护照内容

## 4.1 目标

在不破坏现有首页结构和品牌视觉的前提下，让访问者在首页能够明确识别：

- Greanlean 已提供电池护照解决方案；
- 支持 LMT、EV 和大于 2 kWh 的工业电池；
- 支持法规字段梳理、数据采集、DPP 页面、二维码、托管更新及 Registry 准备；
- 可以直接进入电池 Demo 查看。

## 4.2 首页信息架构要求

Codex 应先检查现有首页结构，在以下方式中选择与现有设计最匹配的方案：

### 优先方案

在首页现有核心能力或行业解决方案区域新增“Battery Passport / 电池护照”重点板块。

### 备选方案

如果首页已存在行业卡片，则增加电池行业卡片，并在 Hero、能力说明或 Demo 区增加电池护照强化文案。

不得为了增加本板块重做整个首页。

## 4.3 建议首页文案

### 中文主标题

```text
面向欧盟电池法规的数字电池护照
```

### 中文副标题

```text
支持 LMT、电动汽车及大于 2 kWh 工业电池的数据梳理、结构化建模、二维码发布、版本托管与 Registry 准备。
```

### 英文主标题

```text
Digital Battery Passports for the EU Market
```

### 英文副标题

```text
Structured battery data, passport publishing, QR access, lifecycle updates and registry readiness for LMT, EV and industrial batteries above 2 kWh.
```

### 能力标签

```text
法规字段映射
结构化数据建模
电池 DPP 页面
二维码与唯一标识
生命周期数据
版本托管更新
Registry 准备
```

### CTA

主按钮：

```text
查看电池护照 Demo
View Battery Passport Demo
```

次按钮：

```text
了解实施流程
Explore the Workflow
```

## 4.4 首页板块内容建议

展示 4 项核心能力：

### 能力 1：法规与字段映射

```text
结合欧盟电池法规及 BatteryPass-Ready 数据属性体系，梳理不同电池类型、数据粒度、访问权限和证明材料要求。
```

### 能力 2：结构化数据采集

```text
围绕型号、批次和单体电池组织产品身份、材料组成、性能耐久性、碳足迹、循环利用和生命周期数据。
```

### 能力 3：数字护照发布

```text
生成适配移动端的数字电池护照页面，通过二维码和唯一产品标识实现持续访问。
```

### 能力 4：托管与持续更新

```text
支持护照版本、状态数据和证明材料持续维护，并为后续 EU DPP Registry 注册与数据交换预留接口。
```

## 4.5 首页免责声明

在电池护照板块或页面底部使用较小字号显示：

中文：

```text
页面内容为产品能力演示，不构成欧盟法规合规认证或法律意见。具体适用要求应结合电池类型、投放时间、实施文件及企业实际数据确认。
```

英文：

```text
The content is provided for product demonstration and does not constitute regulatory certification or legal advice. Applicable requirements must be confirmed against the battery category, placing-on-market date, implementing acts and verified company data.
```

## 4.6 首页验收标准

- 首页能够明确看到电池护照内容；
- 支持中英文时，两种语言均有对应内容；
- CTA 能进入 Demo 案例区或电池 Demo；
- 不出现“官方认证”“100% 合规”“保证通过”等表述；
- 不破坏现有首页导航；
- 桌面端和移动端显示正常；
- Lighthouse 或现有项目性能指标不得出现明显回退；
- 不引入无授权的第三方图片。

---

# 五、需求二：Demo 案例调整

## 5.1 案例数量

本需求按以下口径执行：

> Demo 重点案例总数保持为 4 个，而不是由 4 个增加到 6 个。

最终案例组合：

1. LMT 电池；
2. 工业储能电池（>2 kWh）；
3. 纺织品；
4. 消费电子产品。

如果现有页面确实需要保留全部 4 个旧案例，则 Codex 必须先停止并报告冲突，不得自行决定改为 6 个。

## 5.2 排序

默认排序：

```text
LMT 电池
→ 工业储能电池
→ 纺织品
→ 消费电子
```

电池案例优先展示。

## 5.3 案例卡片字段

每个案例卡片至少包含：

- 产品图片或示意图；
- 产品名称；
- 行业类别；
- DPP 类型；
- 2～4 个能力标签；
- 简短描述；
- 查看护照按钮；
- 产品详情入口（如现有系统支持）。

## 5.4 两个电池案例

### 案例 A：现有 LMT 电池

要求：

- 保留现有 LMT 电池产品和护照；
- 检查其数据字段是否能兼容统一的电池护照展示分类；
- 不在本版本擅自重写现有 LMT 示例数据；
- 如现有字段命名不统一，建立兼容映射，不直接破坏原页面；
- 标记为 `LMT Battery Passport`。

建议标签：

```text
LMT Battery
Model & Item Data
Lifecycle Status
QR-enabled DPP
```

### 案例 B：新增工业储能电池

产品名称：

```text
GreenVault ESS-14.3 Industrial Battery Module
```

中文名称：

```text
GreenVault ESS-14.3 工业储能电池模块
```

产品类别：

```text
Rechargeable industrial battery above 2 kWh
大于 2 kWh 的可充电工业电池
```

应用场景：

```text
Stationary energy storage
Commercial and industrial energy storage
Battery cabinet and rack integration
```

建议标签：

```text
Industrial Battery >2 kWh
LFP Chemistry
Battery Passport
Circularity & Lifecycle
```

## 5.5 纺织和消费电子案例

- 各保留 1 个；
- 优先保留数据最完整、视觉效果最好、页面最稳定的现有案例；
- 不得删除其产品数据文件；
- 如果需要从首页案例区移除其他案例，只移除展示入口，不删除底层数据和页面；
- 现有旧链接应继续可访问，除非确认不再使用。

## 5.6 案例区验收标准

- 页面重点展示 4 个案例；
- 2 个为电池案例；
- 1 个为纺织品；
- 1 个为消费电子；
- 所有查看按钮可正确跳转；
- 旧案例数据不被误删；
- LMT 和工业储能电池使用统一但可扩展的电池分类；
- 移动端卡片不溢出；
- 所有图片有 `alt`；
- 不使用真实品牌或未经许可的产品图片。

---

# 六、需求三：产品中心新增工业储能电池

## 6.1 产品性质

新增产品为虚构的市场化 Demo，不对应真实生产企业或已认证产品。

必须显示：

```text
DEMO PRODUCT
SYNTHETIC DATA
NOT FOR REGULATORY SUBMISSION
```

不得把示例证书、碳足迹和尽职调查信息描述为真实验证结果。

## 6.2 产品基本信息

| 字段 | 演示值 |
|---|---|
| 产品名称 | GreenVault ESS-14.3 Industrial Battery Module |
| 中文名称 | GreenVault ESS-14.3 工业储能电池模块 |
| 产品类型 | Rechargeable industrial battery |
| 应用场景 | Stationary commercial and industrial energy storage |
| 额定能量 | 14.336 kWh |
| 额定容量 | 280 Ah |
| 标称电压 | 51.2 V DC |
| 工作电压范围 | 44.8–58.4 V DC |
| 电池化学体系 | Lithium iron phosphate / graphite |
| 电芯形式 | Prismatic LFP cell |
| 电芯配置 | 16S1P |
| 产品重量 | 115 kg |
| 外形尺寸 | 780 × 480 × 260 mm |
| 防护等级 | IP54 |
| 冷却方式 | Natural air cooling |
| 通信接口 | CAN 2.0 / RS485 |
| BMS | Integrated battery management system |
| 额定持续充放电功率 | 10 kW |
| 峰值功率 | 15 kW / 10 s |
| 循环效率 | 95%（演示值） |
| 设计循环寿命 | 6,000 cycles at 80% DoD, 25°C（演示值） |
| 设计日历寿命 | 15 years（演示值） |
| 质保 | 10 years or 6,000 cycles（演示值） |
| 充电温度 | 0–55°C |
| 放电温度 | -20–55°C |
| 储存温度 | -20–45°C |
| 月自放电率 | ≤3% |
| 产品状态 | Original |
| 制造日期 | 2026-06-15（演示日期） |
| 制造地点 | Hamburg, Germany（虚构演示） |
| 制造商 | GreenVault Demo Energy Systems GmbH（虚构演示） |
| 型号标识符 | GV-ESS-14K3-2026 |
| 批次标识符 | BATCH-202606-DEMO |
| 单体序列号 | GV14K3-DEMO-000001 |
| UPI | 使用 Greanlean 当前域名规则生成的 HTTPS 演示 URL |
| 数据来源 | SYNTHETIC_DEMO |

## 6.3 页面图片要求

优先方案：

- 使用项目自有的、可商用的电池模块示意图；
- 或通过本地 SVG/CSS 绘制中性工业电池模块示意图；
- 或使用用户后续提供的授权图片。

禁止：

- 直接复制真实厂商产品图；
- 使用带真实品牌 Logo 的产品；
- 从不明网站热链图片；
- 让示意图产生“该产品已真实量产”的误导。

---

# 七、工业储能电池 DPP 字段要求

## 7.1 字段架构原则

Codex 不得仅把字段硬编码在页面中。应优先沿用现有数据结构，并至少支持以下元数据：

```text
field_code
label_zh
label_en
value
unit
data_type
granularity
access_level
requirement_type
regulatory_reference
data_source
verification_status
is_demo
```

字段状态：

```text
MANDATORY_REGULATORY
CONDITIONAL_REGULATORY
STANDARD_RECOMMENDED
DEMO_EXTENSION
TBD
```

访问等级：

```text
PUBLIC
LEGITIMATE_INTEREST
AUTHORITY_ONLY
INTERNAL
```

数据粒度：

```text
MODEL
BATCH
ITEM
EVENT
METRIC
```

数据验证状态：

```text
SYNTHETIC_DEMO
SELF_DECLARED
DOCUMENT_SUPPORTED
THIRD_PARTY_VERIFIED
NOT_AVAILABLE
NOT_APPLICABLE
```

## 7.2 字段展示分组

工业储能电池 DPP 页面至少分为以下模块。

### A. 护照身份和元数据

至少包含：

- DPP 标题；
- DPP 状态；
- 护照版本；
- Schema 版本；
- 创建日期；
- 更新时间；
- UPI；
- 二维码；
- 产品组；
- 数据粒度；
- 型号标识符；
- 批次标识符；
- 单体标识符；
- DPP 服务商；
- 护照托管地址；
- 语言；
- Demo 数据声明。

### B. 一般产品和制造信息

至少包含：

- 产品名称；
- 电池类别；
- 是否为可充电电池；
- 是否大于 2 kWh；
- 制造商名称；
- 制造商地址；
- 经济运营者；
- 制造地点；
- 制造日期；
- 产品重量；
- 电池化学体系；
- 额定能量；
- 额定容量；
- 标称电压；
- 最低和最高电压；
- 使用场景；
- 产品图片；
- 产品型号；
- 产品状态。

### C. 标签、符号和合规标识

至少支持展示：

- CE 标识状态；
- 二维码；
- 单独收集符号；
- 电池类别；
- 危险警示；
- 额定容量；
- 电池化学符号；
- 制造商信息；
- 适用标签说明。

所有标识均标记为 Demo，不得伪造正式认证图像或证书编号。

### D. 材料和组成

至少包含：

- 正极材料体系；
- 负极材料体系；
- 电解液类型；
- 电芯形式；
- 电芯数量；
- 电芯排列；
- 模组配置；
- 主要材料清单；
- 材料质量或质量占比；
- 关键原材料；
- 有害物质；
- 物质位置；
- 物质浓度范围；
- 数据来源；
- 访问权限。

建议演示组成：

| 组成部分 | 演示占比 |
|---|---:|
| 电芯及活性材料 | 78% |
| 金属外壳和结构件 | 10% |
| BMS 和电子部件 | 4% |
| 铜铝连接件及线束 | 3% |
| 绝缘、密封和热管理材料 | 5% |

以上仅作为演示数据，不应显示为第三方验证结果。

### E. 关键原材料和有害物质

至少包含：

- Lithium；
- Natural or synthetic graphite；
- Phosphorus-related cathode constituents；
- Copper；
- Aluminium；
- Electrolyte containing lithium salt and organic solvents；
- 是否含 cobalt；
- 是否含 nickel；
- 是否含 lead；
- 是否含 mercury；
- 是否含 cadmium；
- 适用阈值和状态；
- 物质所在部件；
- 安全处理说明。

示例逻辑：

- LFP 化学体系中 cobalt、nickel 默认标记为不适用或未有意添加；
- 不得仅凭化学体系断言产品完全不含痕量物质；
- 所有物质结论标记为 `SYNTHETIC_DEMO`。

### F. 碳足迹

至少包含：

- 碳足迹总量；
- 功能单位；
- 每 kWh 碳足迹；
- 生命周期阶段；
- 原材料阶段；
- 制造阶段；
- 分销阶段；
- 使用阶段；
- 生命周期结束阶段；
- 计算方法；
- 版本；
- 数据质量；
- 计算日期；
- 第三方验证状态；
- 碳足迹性能等级；
- 支持文件。

演示值：

```text
Total lifecycle carbon footprint: 1,032 kg CO2e
Carbon footprint intensity: 72 kg CO2e/kWh
```

阶段拆分演示值：

| 生命周期阶段 | kg CO2e |
|---|---:|
| 原材料和上游供应链 | 720 |
| 电芯和电池制造 | 240 |
| 分销 | 36 |
| 生命周期结束处理 | 36 |
| 合计 | 1,032 |

要求：

- 页面明显标记为 illustrative / synthetic；
- 不显示为真实法规碳足迹声明；
- 未提供正式方法文件时，验证状态为 `SYNTHETIC_DEMO`；
- 不生成真实碳足迹性能等级结论，可显示 `Pending official classification method`。

### G. 再生材料和循环性

至少包含：

- 再生 cobalt 占比；
- 再生 lithium 占比；
- 再生 nickel 占比；
- 再生 lead 占比；
- 其他再生材料；
- 回收数据来源；
- 计算方法；
- 验证状态；
- 可回收性信息；
- 可拆卸性；
- 可维修性；
- 备件信息；
- 生命周期结束处理方式。

演示值：

| 材料 | 演示再生含量 |
|---|---:|
| Lithium | 6% |
| Cobalt | Not applicable for declared LFP chemistry |
| Nickel | Not applicable for declared LFP chemistry |
| Lead | Not intentionally used |
| Aluminium enclosure | 35% |
| Copper conductors | 20% |

以上均为演示值。

### H. 供应链尽职调查

至少包含：

- 尽职调查政策状态；
- 管理体系；
- 风险识别；
- 风险缓解；
- 第三方审核状态；
- 供应链追溯范围；
- 关键材料来源区域；
- 公开报告；
- 报告日期；
- 报告版本；
- 责任联系人；
- 文件链接。

演示页面不得虚构通过审核，应使用：

```text
Demo policy record
No third-party verification
Illustrative supply-chain information
```

### I. 性能和耐久性

至少包含：

- 额定容量；
- 容量保持率；
- 额定能量；
- 额定功率；
- 峰值功率；
- 功率衰减；
- 往返能量效率；
- 效率衰减；
- 初始内阻；
- 当前内阻；
- 内阻增长；
- 自放电率；
- 循环寿命；
- 参考测试条件；
- 充放电倍率；
- 放电深度；
- 工作温度范围；
- 预期寿命；
- 质保期限；
- 质保循环数；
- 安全测试状态。

演示值：

| 字段 | 演示值 |
|---|---|
| Rated capacity | 280 Ah |
| Rated energy | 14.336 kWh |
| Initial round-trip efficiency | 95% |
| Initial internal resistance | 18 mΩ |
| Expected cycle life | 6,000 cycles |
| Reference DoD | 80% |
| Reference temperature | 25°C |
| Continuous power | 10 kW |
| Peak power | 15 kW for 10 s |
| Self-discharge | ≤3% per month |
| Expected calendar life | 15 years |

### J. 合规声明和支持文件

至少预留：

- EU Declaration of Conformity；
- 技术文件；
- 测试报告；
- UN 38.3 Test Summary；
- IEC 62619 测试文件；
- 安全数据表；
- 运输信息；
- 碳足迹声明；
- 再生材料声明；
- 供应链尽职调查报告；
- 拆卸说明；
- 维修说明；
- 生命周期结束说明。

本 Demo 只允许使用占位文件：

```text
demo-eu-declaration-of-conformity.pdf
demo-un38-3-test-summary.pdf
demo-iec-62619-report.pdf
demo-safety-data-sheet.pdf
demo-carbon-footprint-declaration.pdf
```

如文件不存在：

- 页面显示 `Demo document placeholder`；
- 不创建伪造签章；
- 不创建真实实验室名称；
- 不创建真实证书编号；
- 点击时显示说明，而不是返回 404。

### K. 拆卸、维修和安全信息

至少包含：

- 电芯数量和排列；
- 电池模块结构；
- 拆卸顺序；
- 需要的工具；
- 紧固方式；
- 高风险部件；
- 触电风险；
- 短路风险；
- 热失控风险；
- 剩余能量风险；
- 消防处置建议；
- 维修资格要求；
- 备件信息；
- 维修联系方式；
- 报废前安全处理；
- 回收交付方式。

演示拆卸顺序：

1. 将电池隔离并确认无充放电电流；
2. 通过 BMS 读取 SOC 和故障状态；
3. 将 SOC 降至安全运输或维修范围；
4. 断开外部直流端子和通信接口；
5. 拆除上盖及绝缘防护件；
6. 断开母排和采样线束；
7. 拆除 BMS 和辅助电子部件；
8. 按顺序移除电芯；
9. 对电芯、电子部件、铜铝材料和外壳分类处理。

必须显示：

```text
Only trained and authorised personnel may dismantle the battery.
```

### L. 单体状态和生命周期信息

至少包含：

- 当前生命周期状态；
- 初次投放市场日期；
- 首次投入使用日期；
- 当前所有者类型；
- 维修事件；
- 安全事件；
- 再利用事件；
- 改变用途事件；
- 再制造事件；
- 退役事件；
- 回收事件；
- 事件时间；
- 事件来源；
- 事件证明；
- 数据验证状态。

演示状态：

```text
Current lifecycle status: ORIGINAL
Placed on market: DEMO ONLY
Safety incidents: 0
Repair events: 0
Repurposing events: 0
```

### M. 动态性能和健康状态

至少包含：

- State of Charge；
- State of Health；
- Full charge capacity；
- Remaining capacity；
- Number of full equivalent cycles；
- Temperature；
- Current internal resistance；
- Power capability；
- Capacity fade；
- Energy throughput；
- Last measurement time；
- Source device；
- Verification status。

演示值：

| 字段 | 演示值 |
|---|---|
| SOC | 74% |
| SOH | 98.7% |
| Full charge capacity | 276.4 Ah |
| Full equivalent cycles | 42 |
| Current temperature | 26.4°C |
| Current internal resistance | 18.6 mΩ |
| Energy throughput | 1.08 MWh |
| Last update | 2026-07-20T10:30:00Z |
| Source | Demo BMS simulator |
| Verification | SYNTHETIC_DEMO |

动态数据应使用数组或历史记录结构，不应只保留一个无法追溯的当前值。

### N. 访问权限

页面至少区分：

#### 公众信息

- 产品身份；
- 制造商；
- 电池类别；
- 化学体系；
- 重量；
- 容量；
- 能量；
- 性能；
- 碳足迹；
- 再生材料；
- 基础循环利用信息；
- EU 符合性声明入口；
- 生命周期公共状态。

#### 合法利益主体

- 阴极、阳极和电解液的详细组成；
- 部件和备件信息；
- 拆卸顺序；
- 紧固方式；
- 专用工具；
- 电芯数量和排列；
- 详细安全措施；
- 维修和再利用信息。

#### 监管机构或公告机构

- 完整测试报告；
- 合规证明文件；
- 详细法规验证记录。

Demo 页面可以用锁定区域表示受限信息，但权限不能仅依靠 CSS 隐藏；如果现有项目无后端权限，本版本需明确标记为“界面演示”，不得宣称已实现安全访问控制。

---

# 八、建议结构化数据

## 8.1 新增数据文件

Codex 应根据项目当前方式选择 JSON、TypeScript 对象、数据库 Seed 或其他数据源。

建议文件名：

```text
industrial-battery-demo.json
```

建议根结构：

```json
{
  "passportMetadata": {},
  "productIdentity": {},
  "manufacturer": {},
  "batteryClassification": {},
  "technicalSpecifications": {},
  "materials": [],
  "substances": [],
  "carbonFootprint": {},
  "recycledContent": [],
  "dueDiligence": {},
  "performanceAndDurability": {},
  "conformityDocuments": [],
  "disassemblyAndSafety": {},
  "lifecycle": {},
  "operatingMetrics": [],
  "accessPolicies": [],
  "regulatoryReferences": [],
  "demoDisclaimer": {}
}
```

## 8.2 Schema 版本

示例：

```text
schemaVersion: eu-battery-demo-0.1
batteryAttributeReference: BatteryPass-Ready-Longlist-v1.3
passportVersion: 1.0.0-demo
```

## 8.3 兼容原则

- 优先复用现有 LMT 电池的数据组件；
- 公共字段与电池扩展字段分开；
- 不复制两套近似的电池页面代码；
- 使用组件化分组展示；
- 允许不同电池类型通过配置加载不同字段；
- 当前版本可以使用静态数据，但不得阻止后续接入数据库；
- 不得为了该 Demo 强行引入复杂后端。

---

# 九、页面设计要求

## 9.1 DPP 页面顶部

至少展示：

- 产品图片；
- 产品名称；
- 电池类别；
- Demo 标识；
- 护照状态；
- UPI；
- 二维码；
- 护照版本；
- 最后更新时间；
- 数据完整度；
- 验证状态。

## 9.2 导航方式

优先采用：

- 页面内锚点；
- 侧边目录；
- 标签页；
- 折叠分组。

应与现有 LMT 页面保持一致或形成可复用组件。

## 9.3 数据状态标识

示例：

```text
Demo Data
Self-declared
Document Supported
Third-party Verified
Not Available
Not Applicable
Restricted Access
```

不得全部显示为绿色“合规”。

## 9.4 数据完整度

如果现有页面有完整度百分比，应拆分为：

- Required field completeness；
- Supporting-document completeness；
- Verification coverage；
- Registry readiness。

本 Demo 不得显示“100% compliant”。

## 9.5 可访问性

- 所有图片提供 `alt`；
- 二维码旁显示可点击 URL；
- 表格支持窄屏；
- 键盘可访问；
- 文本对比度符合现有站点标准；
- 不只依靠颜色表示状态。

---

# 十、路由和链接要求

Codex 读取现有路由后确定最终地址，建议：

```text
/demos/lmt-battery
/demos/industrial-battery
/products/green-vault-ess-14-3
/passports/green-vault-ess-14-3-demo-000001
```

要求：

- 不破坏现有 URL；
- 不随意重命名已有 LMT 页面；
- 新增页面使用稳定 slug；
- 二维码链接指向 HTTPS 护照 URL；
- 如果项目部署路径有前缀，应自动适配；
- 不硬编码 localhost；
- 所有内部链接通过项目路由工具生成。

---

# 十一、Codex 执行步骤

## 阶段 1：只读分析

Codex 首先完成：

1. 读取 `AGENTS.md`；
2. 检查技术栈；
3. 找到首页文件；
4. 找到 Demo 案例来源；
5. 找到产品中心数据来源；
6. 找到现有 LMT 电池页面；
7. 列出 LMT 电池全部字段；
8. 找到二维码生成逻辑；
9. 找到多语言机制；
10. 找到测试和构建方式；
11. 找到部署方式；
12. 评估本需求是否需要数据库变更。

输出：

```text
docs/requirements/battery-demo/current-impact-analysis.md
```

内容包括：

- 将修改的文件；
- 将新增的文件；
- 现有组件复用方案；
- 数据迁移需求；
- 风险；
- 测试方式；
- 回滚方式。

完成后停止，等待确认。

## 阶段 2：首页和案例区

经确认后：

1. 修改首页电池护照内容；
2. 调整 Demo 案例为指定 4 个；
3. 保留旧案例底层页面和数据；
4. 添加工业储能电池案例卡片；
5. 完成中英文文案；
6. 完成页面响应式验证。

## 阶段 3：产品和 DPP 数据

1. 新增工业储能电池产品数据；
2. 新增结构化 DPP Demo 数据；
3. 复用或扩展电池字段组件；
4. 增加二维码；
5. 增加 Demo 免责声明；
6. 增加受限数据展示；
7. 增加动态数据历史结构；
8. 增加占位文档处理。

## 阶段 4：测试和文档

1. 构建测试；
2. 页面路由测试；
3. 首页回归；
4. LMT Demo 回归；
5. 纺织品 Demo 回归；
6. 消费电子 Demo 回归；
7. 工业储能电池页面测试；
8. 移动端测试；
9. 链接检查；
10. JSON 或数据 Schema 检查；
11. 更新 README；
12. 更新 CHANGELOG；
13. 生成发布说明。

---

# 十二、Codex 修改规则

Codex 必须遵守：

1. 修改前先解释方案；
2. 不直接修改正式环境；
3. 不提交真实密钥；
4. 不删除现有案例数据；
5. 不伪造真实证书；
6. 不使用真实厂商商标；
7. 不把示例值描述为真实验证数据；
8. 不宣称平台已获欧盟认可；
9. 不把 BatteryPass 建议字段全部标为法规强制；
10. 不进行与本需求无关的架构重写；
11. 所有新增字段必须有稳定字段编码；
12. 重要数据必须有单位；
13. 数据必须标注粒度和来源；
14. 页面必须显示 Demo 免责声明；
15. 修改后必须运行测试；
16. 必须报告修改文件和测试结果。

---

# 十三、验收标准

## 13.1 首页

- 首页新增电池护照内容；
- 电池护照入口清晰；
- 支持 LMT、EV、工业电池 >2 kWh 的表述；
- 不含误导性合规承诺；
- 中英文内容完整；
- 移动端正常。

## 13.2 Demo 案例

- 重点案例总数为 4；
- 2 个电池案例；
- 1 个纺织案例；
- 1 个消费电子案例；
- 案例链接全部有效；
- 原有底层数据未删除。

## 13.3 产品中心

- 新增 GreenVault ESS-14.3；
- 产品分类正确；
- 额定能量明显大于 2 kWh；
- 产品详情完整；
- 有 DPP 入口；
- 有 Demo 标识。

## 13.4 电池 DPP

- 能打开护照页面；
- 有二维码和 UPI；
- 有型号、批次和单体标识；
- 至少包含本文第七章要求的数据分组；
- 字段有单位、来源、验证状态和访问等级；
- 动态指标支持历史记录；
- 文件占位不产生 404；
- 不显示为真实认证；
- 不显示“100% compliant”。

## 13.5 技术

- 构建成功；
- 无明显控制台错误；
- 原有页面回归通过；
- 无敏感信息入库；
- 无未经授权的第三方资源；
- 新增数据符合项目现有类型检查；
- CHANGELOG 已更新；
- 提供回滚说明。

---

# 十四、发布记录建议

版本：

```text
v0.4.0
```

CHANGELOG 建议：

```text
## v0.4.0 - Battery Passport Demo Expansion

### Added
- Battery Passport content on the homepage
- Industrial battery demo product above 2 kWh
- Industrial battery digital passport
- Battery-focused demo case cards
- Battery data categories, lifecycle metrics and access-status presentation
- Demo disclaimers and synthetic-data labels

### Changed
- Reordered featured demo cases to prioritise battery passports
- Standardised battery demo navigation and field grouping

### Preserved
- Existing LMT battery demo
- Textile demo
- Consumer electronics demo
- Existing legacy demo routes

### Known limitations
- Demonstration data only
- No official conformity assessment
- No live BMS connection
- No automated EU DPP Registry registration
- Registry semantic catalogue and technical rules remain subject to further development
```

---

# 十五、立即交给 Codex 的首轮指令

```text
请读取项目根目录的 AGENTS.md 和本需求文件。

当前只执行“阶段1：只读分析”，不得修改任何业务代码、数据文件、依赖、数据库或部署配置。

请完成以下工作：

1. 找到首页、电池护照入口、Demo案例区、产品中心、现有LMT电池案例及其DPP页面；
2. 识别4个现有Demo案例分别是什么；
3. 判断本需求所说“保留4个重点案例”是否会与现有结构冲突；
4. 列出现有LMT电池的字段分组、数据来源和组件结构；
5. 判断新增工业储能电池是否可复用现有LMT组件；
6. 列出预计修改和新增的文件；
7. 判断是否需要数据库变更；
8. 提出最小改动方案；
9. 提出测试方案和回滚方案；
10. 生成 docs/requirements/battery-demo/current-impact-analysis.md。

完成分析后停止，不得继续开发，等待确认。
```

---

# 十六、待人工确认事项

Codex 在开发前必须确认：

- [ ] 现有 4 个案例的具体内容；
- [ ] 最终 Demo 是保持 4 个还是扩展为 6 个；
- [ ] 网站是否同时支持中文和英文；
- [ ] 现有 LMT 电池字段是否已采用 Battery Pass 数据分类；
- [ ] 产品中心是静态 JSON、前端对象还是数据库；
- [ ] 二维码是否由前端实时生成；
- [ ] 是否已有文件预览组件；
- [ ] 是否已有访问权限组件；
- [ ] 是否使用真实域名生成 UPI；
- [ ] 是否需要生成新的工业电池示意图；
- [ ] 本版本是否只做 Demo，还是同时建设后台录入能力。

---

## 附：最终原则

本版本要解决的是：

> 让 Greanlean 能够清晰、完整、可信地展示“LMT 电池＋工业储能电池”的电池护照能力。

本版本不应被扩大成：

> 一次性完成完整 SaaS 后台、实时 BMS、LCA 系统和 EU Registry 正式接入。

先完成稳定、可演示、可复用的电池护照 Demo，再进入后台产品化开发。
