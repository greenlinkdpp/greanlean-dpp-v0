"use client";

import Link from "next/link";
import { useEffect } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { LeadForm } from "@/components/LeadForm";
import { PublicHeader } from "@/components/PublicHeader";
import { useLanguage } from "@/components/LanguageProvider";

type Locale = "zh" | "en";

const COPY = {
  zh: {
    pageTitle: "面向欧盟市场的数字产品护照平台 | GREANLEAN",
    heroEyebrow: "欧盟 DPP 合规数据与发布平台",
    heroTitle: "把产品数据变成可验证、可发布的数字产品护照",
    heroBody:
      "GreanLean 将法规要求转化为行业字段、证据清单和发布流程，帮助企业建立可扫码、可追溯、可持续更新的数字产品护照。",
    heroSupport:
      "覆盖 ESPR 与欧盟电池法规映射、GS1 标识、BatteryPass 数据校验、访问权限、Registry 对接准备及生命周期数据维护。",
    heroPrimary: "查看产品护照案例",
    heroAssessment: "电池适用性初评",
    heroSecondary: "了解平台流程",
    heroFacts: [
      ["法规映射", "把法规条款落实为字段、条件和证据要求"],
      ["行业 Schema", "电池、纺织、家具、建材和消费电子"],
      ["一源多端", "网页、二维码、PDF 与机器可读数据同源"],
      ["可审计更新", "版本、证据、运行数据与生命周期事件留痕"],
    ],
    timelineEyebrow: "DPP 法规落地时间表",
    timelineTitle: "2027 年起进入集中落地期，企业准备窗口已经很短",
    timelineBody:
      "电池护照将于 2027 年 2 月 18 日率先适用，纺织、家具等重点产品组也正按 ESPR 工作计划持续推进。DPP 建设涉及产品标识、BOM、供应链、环境数据、合规证据和系统接口，企业不应等到最终字段全部公布后才启动准备。",
    timelineNote:
      "现在应优先锁定受影响产品，建立唯一标识和数据责任人，盘点 BOM、供应商、碳数据与合规证据，再根据后续法规进度滚动补齐行业字段。",
    timeline: [
      {
        date: "2024-07",
        status: "已确定",
        title: "ESPR 生效",
        body: "建立跨产品数字产品护照总体框架。",
        href: "https://eur-lex.europa.eu/eli/reg/2024/1781/oj/eng",
      },
      {
        date: "2026-07",
        status: "已确定",
        title: "DPP Registry 实施安排",
        body: "明确注册库运行、标识登记和数据交换安排。",
        href: "https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=OJ:L_202601778",
      },
      {
        date: "2027-02-18",
        status: "已确定",
        title: "电池护照开始适用",
        body: "覆盖 LMT、电动汽车和额定能量大于 2 kWh 的工业电池。",
        href: "https://eur-lex.europa.eu/eli/reg/2023/1542/oj/eng",
      },
      {
        date: "2027",
        status: "预计采纳",
        title: "纺织品与服装措施",
        body: "工作计划预计采纳相关授权法案，最终适用日期仍待正式文件。",
        href: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52025DC0187",
      },
      {
        date: "2028",
        status: "预计采纳",
        title: "家具产品措施",
        body: "产品范围、字段和适用日期等待授权法案确认。",
        href: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52025DC0187",
      },
      {
        date: "2027 / 2029",
        status: "横向措施",
        title: "维修性、再生含量与可回收性",
        body: "与消费电子相关，但不代表全部电子产品在同一天强制使用 DPP。",
        href: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52025DC0187",
      },
    ],
    workflowEyebrow: "企业实施六步",
    workflowTitle: "不是填一张表，而是建立可持续运营的数据流程",
    workflowBody:
      "一个产品只维护一套权威数据，网页、二维码、PDF、机器可读数据和 Registry 映射都从同一发布版本生成。",
    workflow: [
      ["判断适用性", "确认行业、产品类别、法规范围和实施时间。"],
      ["选择数据粒度", "确定型号、批次或单体，并建立唯一产品标识。"],
      ["采集数据与证据", "整理企业、供应商、检测、材料、环境和运行数据。"],
      ["建立字段与权限", "把数据映射到行业模板、证据状态和访问等级。"],
      ["发布数字护照", "生成中英文页面、GS1 二维码和机器可读数据。"],
      ["持续维护更新", "追加证书、供应链、维修、运行状态和生命周期事件。"],
    ],
    industriesEyebrow: "行业方案",
    industriesTitle: "统一治理底座，匹配每个行业的专属要求",
    industriesBody:
      "页面框架、身份、证据、权限和版本逻辑保持一致，行业差异通过字段模板和专属模块表达。",
    industries: [
      {
        code: "01",
        name: "电池",
        status: "法规日期已明确",
        desc: "覆盖 LMT、EV 和大于 2 kWh 的工业电池，支持型号、批次、单体和运行数据。",
        modules: "材料组成、碳足迹、性能耐久、拆卸安全、运行健康",
        href: "#battery-passport",
      },
      {
        code: "02",
        name: "纺织品",
        status: "授权法案准备中",
        desc: "围绕纤维成分、材料来源、化学品、生产工序、护理和纺织品回收组织数据。",
        modules: "纤维、REACH/RSL、碳水指标、护理、微塑料、回收",
        href: "#passport-cases",
      },
      {
        code: "03",
        name: "家具",
        status: "授权法案准备中",
        desc: "预留木材来源、材料构成、耐久性、维修、拆解、再使用和再制造信息。",
        modules: "材料、耐久、备件、维修、拆解、再制造",
        href: "#contact",
      },
      {
        code: "04",
        name: "建材",
        status: "行业模板已预留",
        desc: "围绕性能声明、材料组成、施工、维护、拆除和建筑废弃物回收建立产品数据。",
        modules: "DoP、性能、材料、施工、维护、拆除、回收",
        href: "#contact",
      },
      {
        code: "05",
        name: "消费电子",
        status: "横向要求持续细化",
        desc: "组织部件、RoHS、REACH、能效、维修、软件更新、内置电池和 WEEE 信息。",
        modules: "部件、化学合规、能效、维修、内置电池、WEEE",
        href: "#passport-cases",
      },
    ],
    batteryEyebrow: "电池护照",
    batteryTitle: "从 BatteryPass 数据模型到 BMS 运行数据的完整准备",
    batteryBody:
      "GreanLean 按型号、批次和单体组织法规字段，输出可供 BatteryPass Schema 校验的 JSON，并为 BMS、EMS、维保和回收系统预留持续更新接口。",
    batteryScopeTitle: "法定适用范围",
    batteryScope: [
      "轻型交通工具（LMT）电池",
      "电动汽车（EV）电池",
      "额定能量大于 2 kWh 的工业电池",
    ],
    batteryDataTitle: "护照核心信息",
    batteryData: [
      "唯一身份与经济运营者",
      "材料、关注物质与再生成分",
      "碳足迹、性能与耐久性",
      "拆卸、维修、安全和生命周期事件",
    ],
    batteryDynamicTitle: "运行状态与健康数据",
    batteryDynamicBody:
      "平台预留 BMS、EMS、设备网关和维保系统接口，保存最新状态快照、历史趋势和关键事件。它不是秒级监控系统，数据会显示测量时间、来源和新鲜度。",
    batteryMetrics: ["SOC / SOH", "剩余容量", "循环次数", "温度与内阻", "能量吞吐量", "生命周期事件"],
    batteryDateLabel: "电池护照适用日期",
    batteryDate: "2027 年 2 月 18 日",
    batteryCta: "查看电池护照案例",
    casesEyebrow: "产品护照案例",
    casesTitle: "查看真实业务场景中的护照结构与数据深度",
    casesBody:
      "四个案例展示统一的产品身份、关键指标、证据与生命周期结构；电池案例额外提供 BatteryPass 校验 JSON 和运行数据模块。",
    viewPassport: "查看产品护照",
    cases: [
      {
        sector: "电池",
        category: "LMT 电池",
        granularity: "单体级",
        title: "48V 15Ah 可拆卸电动自行车锂离子电池包",
        desc: "覆盖型号、单体身份、NMC 化学体系、性能寿命、维修回收和后续 BMS 数据更新。",
        image: "/images/lmt-ebike-battery-48v15ah.png",
        identifier: "DPP-LMT-BAT-48V15AH",
        metrics: [["48 V", "标称电压"], ["15 Ah", "额定容量"], ["NMC", "化学体系"]],
        tags: ["型号/批次/单体", "性能耐久", "运行数据预留"],
      },
      {
        sector: "电池",
        category: "工业储能电池",
        granularity: "单体级",
        title: "GreenVault ESS-14.3 工业储能电池模块",
        desc: "覆盖固定式 LFP 工业电池的身份、碳足迹、循环性、维保安全和运行状态历史。",
        image: "/images/green-vault-ess-14-3.png",
        identifier: "DPP-GV-ESS-14K3-000001",
        metrics: [["14.336 kWh", "额定能量"], ["LFP", "化学体系"], ["> 2 kWh", "适用范围"]],
        tags: ["固定式储能", "碳与循环性", "BMS/EMS 接口"],
      },
      {
        sector: "纺织品",
        category: "面料",
        granularity: "批次级",
        title: "75D 涤纶斜纹超高弹面料",
        desc: "覆盖再生涤纶成分、材料组成、染整追溯、REACH/RSL、碳足迹、护理和纺织品回收。",
        image: "/images/75d-recycled-polyester-twill.jpg",
        identifier: "DPP-SFJK-31-1-REC",
        metrics: [["65%", "再生涤纶"], ["3.8 kg", "碳足迹"], ["批次级", "追溯粒度"]],
        tags: ["再生成分", "染整追溯", "护理与回收"],
      },
      {
        sector: "消费电子",
        category: "无线音频",
        granularity: "单体级",
        title: "无线蓝牙耳机",
        desc: "覆盖主要部件、RoHS、REACH、内置电池、性能、维修路径和 WEEE 电子废弃物回收。",
        image: "/images/demo-wireless-earbuds.png",
        identifier: "DPP-CE-EARBUDS-001",
        metrics: [["25%", "外壳再生塑料"], ["6.8 kg", "碳足迹"], ["WEEE", "回收路径"]],
        tags: ["部件与电池", "RoHS / REACH", "维修与 WEEE"],
      },
    ],
    capabilitiesEyebrow: "平台能力",
    capabilitiesTitle: "法规、数据、证据与系统接口在同一条链路中闭环",
    capabilities: [
      ["法规字段引擎", "根据行业、类别和适用条件加载字段、单位、必填规则与证据要求。"],
      ["供应商协同", "把材料、部件、供应商声明和批次记录关联到产品。"],
      ["GS1 标识", "支持 GTIN、SGTIN、DPP ID、稳定 UPI 和二维码解析。"],
      ["证据与版本", "文件、验证状态、有效期和发布快照保持可追溯。"],
      ["身份与权限", "公众直接访问，专业和监管数据由登录身份与服务器权限投影。"],
      ["Registry 对接准备", "维护唯一标识、语义映射、提交记录与返回证明，不虚构官方注册结果。"],
      ["API 集成", "为 ERP、PLM、LCA、BMS、EMS 和设备网关预留接口。"],
      ["生命周期更新", "维修、证书、供应链、运行指标和回收事件只追加留痕。"],
    ],
    trustEyebrow: "可信数据边界",
    trustTitle: "让每个数据结论都能回答来源、责任人与验证状态",
    trustBody:
      "每项数据保留来源、时间、责任主体和验证状态。平台帮助组织和发布信息，但不会自动生成法规认证结论。",
    trustStates: [
      ["企业声明", "由责任企业提交，尚未获得外部验证。"],
      ["文件支持", "已有声明、报告或记录支持该项数据。"],
      ["第三方验证", "由可识别的独立机构完成核查。"],
      ["待补充", "字段适用，但数据或证据尚未完成。"],
      ["不适用", "依据产品类别或适用条件无需提供。"],
    ],
    contactEyebrow: "开始准备",
    contactTitle: "从一个产品开始完成适用性与数据差距评估",
    contactBody:
      "告诉我们产品行业、类别、目标市场和现有资料情况。第一步不是填完所有字段，而是确认适用范围、数据粒度和优先证据。",
    contactPanelTitle: "首次评估建议准备",
    contactPanelBody:
      "现有资料不需要一次性整理完。先提供以下内容，即可开始适用性判断和数据缺口分析。",
    contactItems: ["产品清单、SKU 和图片", "BOM、材料和供应商资料", "证书、检测报告和声明", "目标市场、销售模式和产品批次"],
    footerTagline:
      "面向欧盟市场的数字产品护照数据平台，覆盖行业模板、产品数据、证据、权限、Registry 准备和生命周期更新。",
    footerPlatform: "DPP 平台",
    footerIndustries: "行业方案",
    footerBattery: "电池护照",
    footerCases: "产品护照案例",
    footerContact: "联系我们",
    footerLogin: "DPP 后台",
    footerCopyright: "© 2026 GreanLean. 保留所有权利。",
  },
  en: {
    pageTitle: "Digital Product Passports for the EU Market | GREANLEAN",
    heroEyebrow: "EU DPP compliance data and publishing platform",
    heroTitle: "Turn product data into verifiable, publishable Digital Product Passports",
    heroBody:
      "GreanLean translates regulatory requirements into sector fields, evidence checklists and publication workflows for scannable, traceable and maintainable product passports.",
    heroSupport:
      "ESPR and EU Battery Regulation mappings, GS1 identifiers, BatteryPass validation, access control, Registry readiness and lifecycle data in one platform.",
    heroPrimary: "Explore passport cases",
    heroAssessment: "Assess battery scope",
    heroSecondary: "See how it works",
    heroFacts: [
      ["Regulatory mapping", "Turn legal requirements into fields, rules and evidence"],
      ["Sector schemas", "Batteries, textiles, furniture, construction and electronics"],
      ["One source", "Web, QR, PDF and machine-readable outputs stay aligned"],
      ["Auditable updates", "Versions, evidence, operating data and events retain history"],
    ],
    timelineEyebrow: "DPP regulatory implementation timeline",
    timelineTitle: "The main implementation wave starts in 2027, leaving little preparation time",
    timelineBody:
      "Battery passports apply from 18 February 2027, while textiles, furniture and other priority product groups continue to advance under the ESPR working plan. Product identifiers, BOMs, supply-chain data, environmental information, evidence and system interfaces take time to establish, so preparation should not wait for every final field to be published.",
    timelineNote:
      "Start by identifying affected products, assigning data ownership, and reviewing identifiers, BOMs, supplier records, carbon data and compliance evidence. Sector fields can then be completed as the regulatory measures advance.",
    timeline: [
      {
        date: "2024-07",
        status: "Confirmed",
        title: "ESPR entered into force",
        body: "Established the cross-product framework for Digital Product Passports.",
        href: "https://eur-lex.europa.eu/eli/reg/2024/1781/oj/eng",
      },
      {
        date: "2026-07",
        status: "Confirmed",
        title: "DPP Registry arrangements",
        body: "Defined operational, identifier-registration and data-exchange arrangements.",
        href: "https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=OJ:L_202601778",
      },
      {
        date: "2027-02-18",
        status: "Confirmed",
        title: "Battery passports apply",
        body: "Covers LMT, EV and industrial batteries above 2 kWh.",
        href: "https://eur-lex.europa.eu/eli/reg/2023/1542/oj/eng",
      },
      {
        date: "2027",
        status: "Indicative adoption",
        title: "Textiles and apparel",
        body: "Working-plan target for delegated measures; final application date remains pending.",
        href: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52025DC0187",
      },
      {
        date: "2028",
        status: "Indicative adoption",
        title: "Furniture products",
        body: "Scope, fields and application dates await the delegated act.",
        href: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52025DC0187",
      },
      {
        date: "2027 / 2029",
        status: "Horizontal measures",
        title: "Repairability, recycled content and recyclability",
        body: "Relevant to electronics, but not a single DPP mandate date for every device.",
        href: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52025DC0187",
      },
    ],
    workflowEyebrow: "Six-step implementation",
    workflowTitle: "Not another form: a maintainable product-data workflow",
    workflowBody:
      "Each product has one authoritative dataset. Web, QR, PDF, machine-readable output and Registry mappings derive from the same published version.",
    workflow: [
      ["Assess applicability", "Confirm industry, category, legal scope and implementation timing."],
      ["Select granularity", "Choose model, batch or item and establish the unique identifier."],
      ["Collect data and evidence", "Gather company, supplier, test, material, environmental and operating data."],
      ["Map fields and access", "Apply industry templates, evidence states and access levels."],
      ["Publish the passport", "Generate bilingual pages, GS1 QR codes and machine-readable data."],
      ["Maintain lifecycle data", "Append certificates, supply-chain, repair, operating and end-of-life events."],
    ],
    industriesEyebrow: "Industry solutions",
    industriesTitle: "One governance foundation, sector-specific requirements",
    industriesBody:
      "Identity, evidence, access and versioning stay consistent while sector templates determine the fields and specialist modules.",
    industries: [
      {
        code: "01",
        name: "Batteries",
        status: "Application date confirmed",
        desc: "LMT, EV and industrial batteries above 2 kWh, with model, batch, item and operating data.",
        modules: "Composition, carbon, durability, safety, disassembly and battery health",
        href: "#battery-passport",
      },
      {
        code: "02",
        name: "Textiles",
        status: "Delegated act in preparation",
        desc: "Fibres, material origin, chemicals, production, care and textile recovery.",
        modules: "Fibres, REACH/RSL, carbon and water, care, microplastics and recycling",
        href: "#passport-cases",
      },
      {
        code: "03",
        name: "Furniture",
        status: "Delegated act in preparation",
        desc: "Wood origin, composition, durability, repair, disassembly, reuse and remanufacturing.",
        modules: "Materials, durability, spares, repair, disassembly and remanufacturing",
        href: "#contact",
      },
      {
        code: "04",
        name: "Construction materials",
        status: "Sector template reserved",
        desc: "Performance declarations, composition, installation, maintenance, removal and recovery.",
        modules: "DoP, performance, materials, installation, maintenance and recovery",
        href: "#contact",
      },
      {
        code: "05",
        name: "Consumer electronics",
        status: "Horizontal measures evolving",
        desc: "Components, RoHS, REACH, efficiency, repair, software updates, batteries and WEEE.",
        modules: "Components, chemicals, efficiency, repair, batteries and WEEE",
        href: "#passport-cases",
      },
    ],
    batteryEyebrow: "Battery Passport",
    batteryTitle: "From BatteryPass data models to BMS operating data",
    batteryBody:
      "GreanLean organises model, batch and item data, exports JSON that can be checked against BatteryPass schemas, and reserves interfaces for BMS, EMS, service and recovery systems.",
    batteryScopeTitle: "Legal scope",
    batteryScope: [
      "Light means of transport (LMT) batteries",
      "Electric vehicle (EV) batteries",
      "Industrial batteries above 2 kWh",
    ],
    batteryDataTitle: "Core passport information",
    batteryData: [
      "Unique identity and economic operators",
      "Materials, substances of concern and recycled content",
      "Carbon footprint, performance and durability",
      "Disassembly, service, safety and lifecycle events",
    ],
    batteryDynamicTitle: "Operating status and battery health",
    batteryDynamicBody:
      "Interfaces are reserved for BMS, EMS, gateways and service systems. The platform stores latest snapshots, history and material events. It is not a second-by-second monitoring system, and every value carries time, source and freshness.",
    batteryMetrics: ["SOC / SOH", "Remaining capacity", "Cycle count", "Temperature and resistance", "Energy throughput", "Lifecycle events"],
    batteryDateLabel: "Battery passport application date",
    batteryDate: "18 February 2027",
    batteryCta: "Explore battery passport cases",
    casesEyebrow: "Product passport cases",
    casesTitle: "See passport structure and data depth in real product scenarios",
    casesBody:
      "All cases share identity, key metrics, evidence and lifecycle structures. Battery cases also include BatteryPass validation JSON and operating-data modules.",
    viewPassport: "View product passport",
    cases: [
      {
        sector: "Battery",
        category: "LMT battery",
        granularity: "Item level",
        title: "48V 15Ah removable e-bike lithium-ion battery pack",
        desc: "Model and item identity, NMC chemistry, performance, service, recycling and future BMS updates.",
        image: "/images/lmt-ebike-battery-48v15ah.png",
        identifier: "DPP-LMT-BAT-48V15AH",
        metrics: [["48 V", "Nominal voltage"], ["15 Ah", "Rated capacity"], ["NMC", "Chemistry"]],
        tags: ["Model / batch / item", "Performance", "Operating data ready"],
      },
      {
        sector: "Battery",
        category: "Industrial energy storage",
        granularity: "Item level",
        title: "GreenVault ESS-14.3 industrial battery module",
        desc: "Identity, carbon, circularity, service safety and operating-state history for a stationary LFP battery.",
        image: "/images/green-vault-ess-14-3.png",
        identifier: "DPP-GV-ESS-14K3-000001",
        metrics: [["14.336 kWh", "Rated energy"], ["LFP", "Chemistry"], ["> 2 kWh", "Scope"]],
        tags: ["Stationary storage", "Carbon and circularity", "BMS / EMS interface"],
      },
      {
        sector: "Textiles",
        category: "Fabric",
        granularity: "Batch level",
        title: "75D recycled high-stretch twill fabric",
        desc: "Recycled polyester content, material composition, dyeing traceability, REACH/RSL, carbon footprint, care and textile recovery.",
        image: "/images/75d-recycled-polyester-twill.jpg",
        identifier: "DPP-SFJK-31-1-REC",
        metrics: [["65%", "Recycled polyester"], ["3.8 kg", "Carbon footprint"], ["Batch level", "Traceability"]],
        tags: ["Recycled content", "Dyeing traceability", "Care and recovery"],
      },
      {
        sector: "Consumer electronics",
        category: "Wireless audio",
        granularity: "Item level",
        title: "Wireless Bluetooth earbuds",
        desc: "Components, RoHS, REACH, embedded batteries, performance, repair and WEEE recovery.",
        image: "/images/demo-wireless-earbuds.png",
        identifier: "DPP-CE-EARBUDS-001",
        metrics: [["25%", "Recycled housing"], ["6.8 kg", "Carbon footprint"], ["WEEE", "Recovery path"]],
        tags: ["Components and batteries", "RoHS / REACH", "Repair and WEEE"],
      },
    ],
    capabilitiesEyebrow: "Platform capabilities",
    capabilitiesTitle: "Regulation, data, evidence and system integration in one governed flow",
    capabilities: [
      ["Regulatory field engine", "Load fields, units, required rules and evidence by sector, category and condition."],
      ["Supplier collaboration", "Connect materials, components, declarations and batch records to the product."],
      ["GS1 identifiers", "Support GTIN, SGTIN, DPP ID, stable UPI and QR resolution."],
      ["Evidence and versions", "Keep files, verification states, validity and publication snapshots traceable."],
      ["Identity and access", "Public access by default; professional and authority fields projected by the server."],
      ["Registry readiness", "Maintain identifiers, semantic mappings, submissions and returned evidence without implying official registration."],
      ["API integration", "Prepare connections for ERP, PLM, LCA, BMS, EMS and device gateways."],
      ["Lifecycle updates", "Append service, evidence, supply-chain, metric and recovery history."],
    ],
    trustEyebrow: "Data trust boundaries",
    trustTitle: "Every conclusion should reveal its source, owner and verification state",
    trustBody:
      "Every value retains its source, time, responsible party and verification state. The platform structures and publishes information; it does not automatically create a regulatory certification.",
    trustStates: [
      ["Company statement", "Submitted by the responsible company without external verification."],
      ["Document supported", "Supported by a declaration, report or operational record."],
      ["Third-party verified", "Checked by an identifiable independent organisation."],
      ["Pending", "Applicable, but data or evidence is still missing."],
      ["Not applicable", "Not required for this category or applicability condition."],
    ],
    contactEyebrow: "Get started",
    contactTitle: "Start with one product and a focused applicability and data-gap assessment",
    contactBody:
      "Tell us your sector, category, target market and available documentation. The first step is to confirm scope, granularity and priority evidence.",
    contactPanelTitle: "Useful documents for an initial assessment",
    contactPanelBody:
      "The full dataset is not required on day one. These materials are enough to begin an applicability and gap assessment.",
    contactItems: ["Product list, SKUs and images", "BOM, materials and supplier data", "Certificates, reports and declarations", "Target markets, sales model and batches"],
    footerTagline:
      "A Digital Product Passport data platform for EU-market products, covering industry templates, product data, evidence, access, Registry readiness and lifecycle updates.",
    footerPlatform: "DPP platform",
    footerIndustries: "Industries",
    footerBattery: "Battery Passport",
    footerCases: "Passport cases",
    footerContact: "Contact",
    footerLogin: "DPP login",
    footerCopyright: "© 2026 GreanLean. All rights reserved.",
  },
} as const;

export default function Home() {
  const { locale } = useLanguage();
  const t = COPY[locale];

  useEffect(() => {
    document.title = t.pageTitle;
  }, [t.pageTitle]);

  return (
    <>
      <PublicHeader />

      <main>
        <section className="relative overflow-hidden bg-slate-950 text-white">
          <img
            src="/images/dpp-hero.png"
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-slate-950/45" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.98)_0%,rgba(2,6,23,0.94)_36%,rgba(2,6,23,0.45)_70%,rgba(2,6,23,0.14)_100%)]" />

          <div className="relative mx-auto flex max-w-7xl flex-col justify-center px-6 py-14 sm:py-16 lg:min-h-[650px] lg:pb-32 lg:pt-16">
            <div className="max-w-3xl dpp-fade">
              <p className="text-sm font-black uppercase text-emerald-300">{t.heroEyebrow}</p>
              <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight md:text-5xl lg:text-6xl">
                {t.heroTitle}
              </h1>
              <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-slate-100">
                {t.heroBody}
              </p>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300">{t.heroSupport}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={`/battery-applicability?lang=${locale}`} className="btn-primary">
                  {t.heroAssessment}
                </Link>
                <a href="#passport-cases" className="btn-primary">
                  {t.heroPrimary}
                </a>
                <a href="#workflow" className="btn-secondary border-white/25 bg-white/10 text-white hover:bg-white hover:text-slate-950">
                  {t.heroSecondary}
                </a>
              </div>
            </div>
          </div>

          <div className="relative border-t border-white/15 bg-slate-950/75 backdrop-blur lg:absolute lg:inset-x-0 lg:bottom-0">
            <div className="mx-auto grid max-w-7xl grid-cols-2 px-6 lg:grid-cols-4">
              {t.heroFacts.map(([value, label]) => (
                <div key={value} className="min-h-24 border-white/15 py-4 pr-4 even:border-l even:pl-4 lg:border-l lg:px-5 lg:first:border-l-0 lg:first:pl-0">
                  <p className="text-lg font-black text-white">{value}</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-300">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="regulations" className="border-b border-slate-200 bg-white py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-6">
            <SectionHeading eyebrow={t.timelineEyebrow} title={t.timelineTitle} body={t.timelineBody} />
            <div className="mt-10 overflow-x-auto pb-3">
              <div className="grid min-w-[1120px] grid-cols-6 border-y border-slate-200">
                {t.timeline.map((item, index) => (
                  <a
                    key={`${item.date}-${item.title}`}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative min-h-64 border-r border-slate-200 px-5 py-6 last:border-r-0 hover:bg-slate-50"
                  >
                    <span className="absolute left-0 top-0 h-1 w-full bg-slate-200 transition group-hover:bg-emerald-500" />
                    <p className="text-xl font-black text-slate-950">{item.date}</p>
                    <p className="mt-3 text-xs font-black uppercase text-emerald-700">{item.status}</p>
                    <h3 className="mt-5 text-lg font-black text-slate-950">{item.title}</h3>
                    <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{item.body}</p>
                    <span className="mt-5 inline-block text-sm font-black text-slate-900 transition group-hover:text-emerald-700">
                      {String(index + 1).padStart(2, "0")} ↗
                    </span>
                  </a>
                ))}
              </div>
            </div>
            <p className="mt-5 border-l-4 border-amber-500 bg-amber-50 px-5 py-4 text-sm font-bold leading-6 text-amber-950">
              {t.timelineNote}
            </p>
          </div>
        </section>

        <section id="workflow" className="bg-slate-50 py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-6">
            <SectionHeading eyebrow={t.workflowEyebrow} title={t.workflowTitle} body={t.workflowBody} />
            <ol className="mt-10 grid border-y border-slate-300 md:grid-cols-2 xl:grid-cols-6">
              {t.workflow.map(([title, body], index) => (
                <li key={title} className="relative border-b border-slate-300 py-6 md:border-r md:px-5 md:odd:pl-0 md:even:border-r-0 xl:border-b-0 xl:border-r xl:px-5 xl:first:pl-0 xl:last:border-r-0">
                  <span className="text-sm font-black text-emerald-700">{String(index + 1).padStart(2, "0")}</span>
                  <h3 className="mt-4 text-lg font-black text-slate-950">{title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="industries" className="bg-white py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-6">
            <SectionHeading eyebrow={t.industriesEyebrow} title={t.industriesTitle} body={t.industriesBody} />
            <div className="mt-10 border-t border-slate-200">
              {t.industries.map((industry) => (
                <a
                  key={industry.code}
                  href={industry.href}
                  className="group grid gap-4 border-b border-slate-200 py-6 transition hover:bg-slate-50 md:grid-cols-[70px_1fr_1.3fr_1.2fr_28px] md:items-center md:px-4"
                >
                  <span className="text-sm font-black text-emerald-700">{industry.code}</span>
                  <div>
                    <h3 className="text-xl font-black text-slate-950">{industry.name}</h3>
                    <p className="mt-1 text-xs font-black uppercase text-slate-500">{industry.status}</p>
                  </div>
                  <p className="text-sm font-semibold leading-6 text-slate-600">{industry.desc}</p>
                  <p className="text-sm font-bold leading-6 text-slate-800">{industry.modules}</p>
                  <span className="text-xl font-black text-slate-400 transition group-hover:translate-x-1 group-hover:text-emerald-700">→</span>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section id="battery-passport" className="overflow-hidden bg-slate-950 py-16 text-white lg:py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
              <div>
                <p className="text-sm font-black uppercase text-emerald-300">{t.batteryEyebrow}</p>
                <h2 className="mt-4 max-w-3xl text-3xl font-black leading-tight md:text-4xl">{t.batteryTitle}</h2>
                <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">{t.batteryBody}</p>

                <div className="mt-9 grid gap-8 border-y border-white/15 py-8 sm:grid-cols-2">
                  <InfoList title={t.batteryScopeTitle} items={t.batteryScope} dark />
                  <InfoList title={t.batteryDataTitle} items={t.batteryData} dark />
                </div>

                <div className="mt-8">
                  <p className="text-sm font-bold text-slate-400">{t.batteryDateLabel}</p>
                  <p className="mt-2 text-3xl font-black text-white">{t.batteryDate}</p>
                  <a href="#passport-cases" className="btn-primary mt-6">
                    {t.batteryCta}
                  </a>
                </div>
              </div>

              <div className="border border-white/15 bg-white/5">
                <img
                  src="/images/green-vault-ess-14-3.png"
                  alt={locale === "zh" ? "工业储能电池模块" : "Industrial energy-storage battery module"}
                  className="aspect-[16/9] w-full bg-slate-100 object-contain p-6"
                />
                <div className="p-6 lg:p-8">
                  <p className="text-sm font-black uppercase text-emerald-300">{t.batteryDynamicTitle}</p>
                  <p className="mt-4 text-base font-semibold leading-7 text-slate-200">{t.batteryDynamicBody}</p>
                  <div className="mt-6 grid grid-cols-2 border-l border-t border-white/15 sm:grid-cols-3">
                    {t.batteryMetrics.map((metric) => (
                      <span key={metric} className="min-h-16 border-b border-r border-white/15 p-3 text-sm font-black text-white">
                        {metric}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="passport-cases" className="bg-slate-50 py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-6">
            <SectionHeading eyebrow={t.casesEyebrow} title={t.casesTitle} body={t.casesBody} />
            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {t.cases.map((item) => (
                <article key={item.identifier} className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-emerald-300 hover:shadow-md">
                  <div className="relative h-56 shrink-0 overflow-hidden border-b border-slate-200 bg-slate-100 xl:h-52">
                    <img src={item.image} alt={item.title} className="absolute inset-0 h-full w-full object-contain p-4" />
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex min-h-5 flex-wrap gap-2 text-xs font-black">
                      <span className="text-emerald-700">{item.sector}</span>
                      <span className="text-slate-300">/</span>
                      <span className="text-slate-600">{item.category}</span>
                      <span className="ml-auto text-slate-500">{item.granularity}</span>
                    </div>
                    <h3 className="mt-4 min-h-14 text-xl font-black leading-7 text-slate-950">{item.title}</h3>
                    <p className="mt-3 min-h-24 text-sm font-semibold leading-6 text-slate-600">{item.desc}</p>

                    <dl className="mt-5 grid h-24 shrink-0 grid-cols-3 border-y border-slate-200 py-4">
                      {item.metrics.map(([value, label]) => (
                        <div key={label} className="border-r px-2 first:pl-0 last:border-r-0 last:pr-0">
                          <dd className="break-words text-sm font-black text-slate-950">{value}</dd>
                          <dt className="mt-1 text-[11px] font-bold leading-4 text-slate-500">{label}</dt>
                        </div>
                      ))}
                    </dl>

                    <div className="mt-4 flex h-16 shrink-0 flex-wrap content-start gap-2 overflow-hidden">
                      {item.tags.map((tag) => (
                        <span key={tag} className="border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-600">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <Link href={`/p/${encodeURIComponent(item.identifier)}?lang=${locale}&showcase=1`} className="btn-primary mt-auto w-full">
                      {t.viewPassport}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="platform" className="bg-white py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-6">
            <SectionHeading eyebrow={t.capabilitiesEyebrow} title={t.capabilitiesTitle} />
            <div className="mt-10 grid border-l border-t border-slate-200 md:grid-cols-2 xl:grid-cols-4">
              {t.capabilities.map(([title, body], index) => (
                <div key={title} className="min-h-48 border-b border-r border-slate-200 p-6">
                  <span className="text-sm font-black text-emerald-700">{String(index + 1).padStart(2, "0")}</span>
                  <h3 className="mt-5 text-lg font-black text-slate-950">{title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-slate-50 py-16">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-sm font-black uppercase text-emerald-700">{t.trustEyebrow}</p>
              <h2 className="mt-4 text-3xl font-black leading-tight text-slate-950">{t.trustTitle}</h2>
              <p className="mt-5 text-base font-semibold leading-7 text-slate-600">{t.trustBody}</p>
            </div>
            <div className="border-t border-slate-300">
              {t.trustStates.map(([title, body]) => (
                <div key={title} className="grid gap-2 border-b border-slate-300 py-4 sm:grid-cols-[170px_1fr]">
                  <h3 className="font-black text-slate-950">{title}</h3>
                  <p className="text-sm font-semibold leading-6 text-slate-600">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="bg-white py-16 lg:py-20">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-sm font-black uppercase text-emerald-700">{t.contactEyebrow}</p>
              <h2 className="mt-4 text-3xl font-black leading-tight text-slate-950 md:text-4xl">{t.contactTitle}</h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">{t.contactBody}</p>

              <div className="mt-8 border-y border-slate-200 py-6">
                <h3 className="text-xl font-black text-slate-950">{t.contactPanelTitle}</h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{t.contactPanelBody}</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {t.contactItems.map((item, index) => (
                    <div key={item} className="flex gap-3 text-sm font-bold leading-6 text-slate-700">
                      <span className="text-emerald-700">{String(index + 1).padStart(2, "0")}</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <LeadForm />
          </div>
        </section>
      </main>

      <HomeFooter t={t} locale={locale} />
    </>
  );
}

function SectionHeading({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <div className="max-w-4xl">
      <p className="text-sm font-black uppercase text-emerald-700">{eyebrow}</p>
      <h2 className="mt-4 text-3xl font-black leading-tight text-slate-950 md:text-4xl">{title}</h2>
      {body ? <p className="mt-5 text-lg leading-8 text-slate-600">{body}</p> : null}
    </div>
  );
}

function InfoList({ title, items, dark = false }: { title: string; items: readonly string[]; dark?: boolean }) {
  return (
    <div>
      <h3 className={`text-lg font-black ${dark ? "text-white" : "text-slate-950"}`}>{title}</h3>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item} className={`flex gap-3 text-sm font-semibold leading-6 ${dark ? "text-slate-300" : "text-slate-600"}`}>
            <span className="mt-2 h-1.5 w-1.5 shrink-0 bg-emerald-500" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HomeFooter({ t, locale }: { t: (typeof COPY)[Locale]; locale: Locale }) {
  const links = [
    [t.footerPlatform, `/?lang=${locale}#platform`],
    [t.footerIndustries, `/?lang=${locale}#industries`],
    [t.footerBattery, `/?lang=${locale}#battery-passport`],
    [t.footerCases, `/?lang=${locale}#passport-cases`],
    [t.footerContact, `/?lang=${locale}#contact`],
    [t.footerLogin, `/login?lang=${locale}`],
  ];

  return (
    <footer className="border-t border-slate-200 bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-start">
          <div>
            <BrandLogo
              href={`/?lang=${locale}`}
              size="md"
              wordmarkClassName="brightness-0 invert"
            />
            <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-slate-400">{t.footerTagline}</p>
          </div>
          <nav className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm font-bold text-slate-300" aria-label="Footer navigation">
            {links.map(([label, href]) => (
              <Link key={label} href={href} className="transition hover:text-emerald-300">
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 text-sm font-semibold text-slate-500">
          <span>{t.footerCopyright}</span>
          <span>greanlean.com</span>
        </div>
      </div>
    </footer>
  );
}
