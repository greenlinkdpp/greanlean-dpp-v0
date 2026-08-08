export type DppLocale = "zh" | "en";
export type DppAudience =
  | "PUBLIC"
  | "LEGITIMATE_INTEREST"
  | "AUTHORITY_ONLY";

export type DppFieldModel = {
  label: string;
  value: string;
  note?: string;
  href?: string;
  access?: DppAudience;
};

export type DppItemModel = {
  id: string;
  title: string;
  subtitle?: string;
  status?: string;
  fields: DppFieldModel[];
  href?: string;
  access?: DppAudience;
};

export type DppSectionModel = {
  id: string;
  index: string;
  title: string;
  intro: string;
  status: "available" | "pending";
  fields?: DppFieldModel[];
  items?: DppItemModel[];
  batteryOperating?: DppBatteryOperatingModel;
  access?: DppAudience;
};

export type DppOperatingMetricModel = {
  id: string;
  metricType: string;
  label: string;
  value: number;
  unit: string;
  measuredAt: string;
  sourceDevice: string;
  dataSource: string;
  qualityStatus: string;
  verificationStatus: string;
};

export type DppOperatingHistoryPoint = {
  id: string;
  metricType: string;
  label: string;
  value: number;
  unit: string;
  measuredAt: string;
};

export type DppBatteryOperatingModel = {
  itemId: string;
  itemSerial: string;
  summary: {
    latestMeasuredAt: string;
    receivedAt: string;
    sourceDevice: string;
    dataSource: string;
    qualityStatus: string;
    verificationStatus: string;
    freshnessStatus: string;
    updateMode: string;
  };
  latest: DppOperatingMetricModel[];
  history: DppOperatingHistoryPoint[];
  events: DppItemModel[];
};

export type PublicDppViewModel = {
  locale: DppLocale;
  audience: DppAudience;
  isPreview: boolean;
  identity: {
    name: string;
    description: string;
    brand: string;
    sector: string;
    category: string;
    dppId: string;
    upi: string;
    gtin: string;
    sgtin: string;
    model: string;
    batch: string;
    serial: string;
    granularity: string;
    lifecycleStatus: string;
    updatedAt: string;
    image: string;
  };
  heroMetrics: DppFieldModel[];
  sections: DppSectionModel[];
  qr: {
    target: string;
    image: string;
  };
  pdfUrl: string;
};

type BuildOptions = {
  locale: DppLocale;
  audience?: DppAudience;
  isPreview?: boolean;
  dppUrl: string;
};

const AUDIENCE_RANK: Record<DppAudience, number> = {
  PUBLIC: 0,
  LEGITIMATE_INTEREST: 1,
  AUTHORITY_ONLY: 2,
};

const TEXT = {
  zh: {
    pending: "相关数据正在补充",
    pendingIntro: "该模块适用于此类产品，当前发布版本尚未提供可公开展示的数据。",
    identity: "产品身份与制造信息",
    identityIntro: "用于识别产品、型号、批次或单体，并说明责任主体和制造信息。",
    materials: "材料与组成",
    materialsIntro: "展示主要材料、质量占比、再生成分和产品组件。",
    environment: "环境与可持续性",
    environmentIntro: "展示已发布的碳、资源使用和循环性信息，并保留数据来源边界。",
    performance: "性能、耐久性与安全",
    performanceIntro: "展示适用于该产品类别的关键性能、寿命和安全信息。",
    traceability: "供应链与生产追溯",
    traceabilityIntro: "按时间记录材料、制造、运输和交付环节。",
    evidence: "合规声明与证据文件",
    evidenceIntro: "文件名称、状态和有效期来自已发布记录；平台不会自动生成认证结论。",
    circularity: "维修、循环利用和生命周期结束",
    circularityIntro: "提供使用、维护、拆解、再利用和回收信息。",
    lifecycle: "生命周期事件与更新",
    lifecycleIntro: "记录产品发布后的重要状态和生命周期变化。",
    manufacturer: "品牌 / 制造商",
    category: "产品类别",
    dppId: "DPP ID",
    upi: "唯一产品标识",
    gtin: "GTIN",
    sgtin: "SGTIN",
    model: "型号 / SKU",
    batch: "批次",
    serial: "单体序列号",
    granularity: "护照粒度",
    lifecycleStatus: "生命周期状态",
    updatedAt: "最后更新",
    manufacturingPlace: "制造地点",
    manufacturingDate: "制造日期",
    economicOperator: "经济运营者",
    materialType: "材料类别",
    share: "质量 / 成分占比",
    recycled: "再生成分",
    origin: "来源国家",
    chemical: "化学品与受限物质说明",
    certification: "材料证据",
    componentType: "组件类别",
    quantity: "数量",
    position: "位置",
    carbon: "产品碳足迹",
    water: "用水量",
    energy: "能源消耗",
    waste: "废弃物",
    methodology: "核算方法",
    verifier: "验证说明",
    repairability: "可维修性",
    recyclability: "可回收性",
    takeBack: "回收路径",
    eventType: "事件类型",
    date: "日期",
    facility: "设施",
    location: "地点",
    transport: "运输方式",
    status: "状态",
    notes: "说明",
    issuer: "签发方",
    number: "文件编号",
    issueDate: "签发日期",
    expiryDate: "有效期至",
    source: "数据来源",
    verification: "证据状态",
    care: "护理 / 使用说明",
    repair: "维修说明",
    endOfLife: "生命周期结束说明",
    disassembly: "拆解说明",
    dataSupported: "文件支持",
    thirdParty: "第三方验证",
    selfDeclared: "企业声明",
    awaitingEvidence: "待补充证据",
    notApplicable: "不适用",
  },
  en: {
    pending: "Data in preparation",
    pendingIntro: "This module applies to the product category, but the current publication does not yet contain public data.",
    identity: "Product identity and manufacturing",
    identityIntro: "Identifies the product, model, batch or item and records the responsible party and manufacturing information.",
    materials: "Materials and composition",
    materialsIntro: "Primary materials, mass shares, recycled content and product components.",
    environment: "Environment and sustainability",
    environmentIntro: "Published carbon, resource-use and circularity information with clear source boundaries.",
    performance: "Performance, durability and safety",
    performanceIntro: "Key performance, lifetime and safety information applicable to the product category.",
    traceability: "Supply chain and production traceability",
    traceabilityIntro: "A time-ordered record of material, manufacturing, transport and delivery stages.",
    evidence: "Compliance statements and evidence",
    evidenceIntro: "Document names, states and validity come from published records; the platform does not create certification conclusions.",
    circularity: "Repair, circularity and end of life",
    circularityIntro: "Use, maintenance, disassembly, reuse and recovery information.",
    lifecycle: "Lifecycle events and updates",
    lifecycleIntro: "Material status and lifecycle changes recorded after publication.",
    manufacturer: "Brand / manufacturer",
    category: "Product category",
    dppId: "DPP ID",
    upi: "Unique product identifier",
    gtin: "GTIN",
    sgtin: "SGTIN",
    model: "Model / SKU",
    batch: "Batch",
    serial: "Item serial number",
    granularity: "Passport granularity",
    lifecycleStatus: "Lifecycle status",
    updatedAt: "Last updated",
    manufacturingPlace: "Manufacturing place",
    manufacturingDate: "Manufacturing date",
    economicOperator: "Economic operator",
    materialType: "Material class",
    share: "Mass / composition share",
    recycled: "Recycled content",
    origin: "Source country",
    chemical: "Chemical and restricted-substance note",
    certification: "Material evidence",
    componentType: "Component class",
    quantity: "Quantity",
    position: "Position",
    carbon: "Product carbon footprint",
    water: "Water use",
    energy: "Energy use",
    waste: "Waste",
    methodology: "Methodology",
    verifier: "Verification note",
    repairability: "Repairability",
    recyclability: "Recyclability",
    takeBack: "Collection route",
    eventType: "Event type",
    date: "Date",
    facility: "Facility",
    location: "Location",
    transport: "Transport",
    status: "Status",
    notes: "Notes",
    issuer: "Issuer",
    number: "Document number",
    issueDate: "Issue date",
    expiryDate: "Valid until",
    source: "Data source",
    verification: "Evidence state",
    care: "Care / use instructions",
    repair: "Repair instructions",
    endOfLife: "End-of-life instructions",
    disassembly: "Disassembly instructions",
    dataSupported: "Document supported",
    thirdParty: "Third-party verified",
    selfDeclared: "Company statement",
    awaitingEvidence: "Evidence pending",
    notApplicable: "Not applicable",
  },
} as const;

const SECTOR_LABELS: Record<string, { zh: string; en: string }> = {
  battery: { zh: "电池", en: "Battery" },
  textile: { zh: "纺织品", en: "Textile" },
  furniture: { zh: "家具", en: "Furniture" },
  construction: { zh: "建材", en: "Construction product" },
  consumer_electronics: { zh: "消费电子", en: "Consumer electronics" },
};

const FIELD_LABELS: Record<string, { zh: string; en: string }> = {
  battery_model_identifier: { zh: "电池型号", en: "Battery model" },
  battery_serial_number: { zh: "电池序列号", en: "Battery serial number" },
  economic_operator_information: { zh: "经济运营者", en: "Economic operator" },
  manufacturer_information: { zh: "制造商信息", en: "Manufacturer information" },
  manufacturing_place: { zh: "制造地点", en: "Manufacturing place" },
  manufacturing_date: { zh: "制造日期", en: "Manufacturing date" },
  warranty_period: { zh: "质保期", en: "Warranty period" },
  battery_category: { zh: "电池类别", en: "Battery category" },
  battery_mass: { zh: "电池质量", en: "Battery mass" },
  battery_status: { zh: "电池状态", en: "Battery status" },
  carbon_footprint_per_kwh: { zh: "单位功能碳足迹", en: "Carbon footprint per functional unit" },
  carbon_footprint_per_lifecycle_stage: { zh: "各生命周期阶段碳足迹", en: "Carbon footprint by lifecycle stage" },
  battery_chemistry: { zh: "电池化学体系", en: "Battery chemistry" },
  critical_raw_materials: { zh: "关键原材料", en: "Critical raw materials" },
  hazardous_substances: { zh: "有害物质", en: "Hazardous substances" },
  rated_capacity: { zh: "额定容量", en: "Rated capacity" },
  rated_energy: { zh: "额定能量", en: "Rated energy" },
  expected_lifetime: { zh: "预期寿命", en: "Expected lifetime" },
  recycled_content_share: { zh: "再生成分比例", en: "Recycled content share" },
  separate_collection_symbol: { zh: "分类收集标识", en: "Separate collection symbol" },
  dismantling_and_removal_information: { zh: "拆解与移除信息", en: "Dismantling and removal information" },
  fiber_composition: { zh: "纤维成分", en: "Fibre composition" },
  restricted_substance_statement: { zh: "受限物质声明", en: "Restricted-substance statement" },
  durability_test_basis: { zh: "耐久性测试依据", en: "Durability test basis" },
  care_repair_reuse_route: { zh: "护理、维修与再使用路径", en: "Care, repair and reuse route" },
  durability_test: { zh: "耐久性测试", en: "Durability test" },
  replaceable_parts: { zh: "可替换部件", en: "Replaceable parts" },
  declaration_of_performance: { zh: "性能声明", en: "Declaration of performance" },
  voc_or_reach_evidence: { zh: "VOC / REACH 证据", en: "VOC / REACH evidence" },
  battery_safety_document: { zh: "电池安全文件", en: "Battery safety document" },
  firmware_security_update_policy: { zh: "固件安全更新政策", en: "Firmware security update policy" },
};

function hasValue(value: unknown): boolean {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function cleanText(value: unknown): string {
  if (!hasValue(value)) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function publicIdentifier(value: unknown): string {
  return cleanText(value)
    .replaceAll("DPP-AUDIO-DEMO-001", "DPP-CE-EARBUDS-001")
    .replaceAll("DPP-DEMO-001", "DPP-TEX-TSHIRT-001")
    .replaceAll("EARBUDS-DEMO-0001", "EARBUDS-000001")
    .replaceAll("DEMO-TEE-0001", "TEX-OC-000001")
    .replaceAll("demo-wireless-earbuds", "wireless-earbuds-001")
    .replaceAll("demo-organic-cotton-tshirt", "organic-cotton-tshirt-001");
}

function displayValue(value: unknown, locale: DppLocale): string {
  const text = cleanText(value);
  if (!text) return text;
  if (locale === "en") {
    const exactEn: Record<string, string> = {
      江苏三丰: "Jiangsu Sanfeng",
      苏州沁瀛织造有限公司: "Suzhou Qinying Weaving Co., Ltd.",
      "具体比例以材料表和上传证据为准。": "Specific percentages are governed by the material record and uploaded evidence.",
      "依据已录入证据和供应商声明进行临时披露；正式检测报告可后续替换。": "Interim disclosure based on recorded evidence and supplier declarations; an official test report may replace it later.",
      "优先作为面料库存再利用；废料按涤纶纺织品回收流处理。": "Prioritise reuse as fabric stock; process offcuts through the polyester-textile recycling stream.",
    };
    return exactEn[text] || text;
  }
  const exact: Record<string, string> = {
    China: "中国",
    Germany: "德国",
    Netherlands: "荷兰",
    Fabric: "面料",
    "OUTDOOR FABRIC": "户外面料",
    "Lithium-ion NMC": "NMC 锂离子",
    "Lithium iron phosphate (LFP)": "磷酸铁锂（LFP）",
    "GREANLEAN TEST DATA": "GREANLEAN",
    "Removable e-bike lithium-ion battery pack": "可拆卸电动自行车锂离子电池包",
    "E-bike down tube / rear rack mount": "电动自行车下管 / 后货架安装位",
    "Inside pack": "电池包内部",
    "Outer housing": "外部壳体",
    "Energy-storage cabinet": "储能柜内",
    "Inside module": "模组内部",
    "Left / Right earbuds": "左 / 右耳机",
    "Packaging set": "包装组件",
    "Product identification label": "产品识别标签",
    "Protective packaging bag": "防护包装袋",
    "Core tube for fabric rolling": "面料卷装纸管",
    "Outer shell fabric": "外层面料",
    Weaving: "织造",
    "≥800 cycles to 80% remaining capacity under declared charging and operating conditions.": "在声明的充电与运行条件下，循环不少于 800 次后剩余容量不低于 80%。",
    "LMT battery passport evidence checklist": "轻型交通工具电池护照证据清单",
    "Battery passport evidence checklist": "电池护照证据清单",
    "UN38.3 / IEC 62133 evidence pending": "UN38.3 / IEC 62133 证据待补充",
    "RoHS declaration pending": "RoHS 声明待补充",
    "Supplier material declaration pending": "供应商材料声明待补充",
    "Supplier declaration pending": "供应商声明待补充",
    "Electrical component evidence pending": "电气组件证据待补充",
    "RoHS / REACH supplier declaration": "RoHS / REACH 供应商声明",
    "Laboratory to provide": "待检测实验室提供",
    "Certification body to provide": "待认证机构提供",
    "Economic operator to provide": "待经济运营者提供",
    "Industrial battery safety evidence package - pending": "工业电池安全证据包 - 待补充",
    "Product carbon footprint supporting file - pending": "产品碳足迹支持文件 - 待补充",
    "EU Declaration of Conformity - pending": "欧盟符合性声明 - 待补充",
    "Battery safety data sheet - pending": "电池安全数据表 - 待补充",
    "Battery safety": "电池安全",
    "Product carbon footprint": "产品碳足迹",
    "Test report": "检测报告",
    "Test Report": "检测报告",
    Certificate: "证书",
    "Authorised battery collection, retailer take-back and e-bike service network.": "通过有资质的电池收集点、零售商回收渠道和电动自行车服务网络回收。",
    "Authorised industrial-battery collection, service and repurposing network.": "通过有资质的工业电池收集、维保和梯次利用网络回收。",
    "Trained high-voltage technicians must isolate, discharge and remove the module before dismantling.": "拆解前必须由经过培训的高压作业人员完成隔离、放电和模组拆除。",
    "Assess for second-life use before transfer to an authorised industrial-battery recycler.": "移交有资质的工业电池回收机构前，应先评估梯次利用可行性。",
    "Only qualified battery handlers may remove housing, BMS, cell module and connectors. Discharge and isolate pack before treatment.": "仅限具备资质的电池作业人员拆除外壳、BMS、电芯模组和连接器；处理前必须先放电并隔离电池包。",
    "Do not dispose with household waste. Handle as lithium-ion battery waste under applicable collection and transport rules.": "请勿作为生活垃圾丢弃，应按照适用的收集和运输要求作为锂离子电池废弃物处理。",
    "Eligible for brand textile take-back and resale screening.": "可进入品牌纺织品回收和再销售筛选流程。",
    "Reuse, donation, collection or brand take-back channel pending customer confirmation.": "再使用、捐赠、分类收集或品牌回收渠道待客户确认。",
    "Remove labels, trims, fasteners and packaging where local recycler requires material separation.": "如当地回收机构要求材料分离，应拆除标签、辅料、紧固件和包装。",
    "Remove neck label and trims if required by recycler.": "按回收机构要求移除领标和辅料。",
    "Designed for reuse first, then textile recycling.": "优先再使用，无法继续使用时进入纺织品回收体系。",
    "WEEE take-back through authorized electronics collection points.": "通过有资质的电子产品收集点进入 WEEE 回收体系。",
    "Remove silicone ear tips and separate charging case before recycling where possible.": "回收前尽可能移除硅胶耳塞，并将充电盒单独分类。",
    "Do not dispose with household waste; use WEEE collection.": "请勿作为生活垃圾丢弃，应进入 WEEE 分类收集体系。",
    Truck: "卡车运输",
    "Internal transfer": "内部转运",
    "Sea freight + rail": "海运与铁路联运",
    "Sea freight + truck": "海运与卡车联运",
    "Air freight + truck": "空运与卡车联运",
    "material sourcing": "材料采购",
    "cell sourcing": "电芯采购",
    "component sourcing": "组件采购",
    "pack assembly": "电池包装配",
    "eu distribution": "欧盟配送",
    manufacturing: "制造",
    transport: "运输",
    delivery: "交付",
  };
  if (exact[text]) return exact[text];
  return text
    .replace(/\bGermany\b/g, "德国")
    .replace(/\bChina\b/g, "中国")
    .replace(/\bHamburg\b/g, "汉堡")
    .replace(/\bShenzhen\b/g, "深圳")
    .replace(/\bNingbo\b/g, "宁波")
    .replace(/\bDongguan\b/g, "东莞")
    .replace(/\bSuzhou\b/g, "苏州");
}

function localized(row: any, locale: DppLocale, key: string, zhKey = `${key}_zh`) {
  if (!row) return "";
  return cleanText(locale === "zh" ? row[zhKey] || row[key] : row[key] || row[zhKey]);
}

function compactFields(fields: Array<DppFieldModel | null | undefined>): DppFieldModel[] {
  return fields.filter((field): field is DppFieldModel => Boolean(field && hasValue(field.value)));
}

function field(
  label: string,
  value: unknown,
  note?: unknown,
  href?: unknown,
  access?: DppAudience,
): DppFieldModel | null {
  if (!hasValue(value)) return null;
  return {
    label,
    value: cleanText(value),
    note: cleanText(note) || undefined,
    href: isPublicEvidenceUrl(href) ? cleanText(href) : undefined,
    ...(access ? { access } : {}),
  };
}

function formatDate(value: unknown, locale: DppLocale): string {
  if (!hasValue(value)) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return cleanText(value);
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function withUnit(value: unknown, unit: string): string {
  if (!hasValue(value)) return "";
  return `${cleanText(value)} ${unit}`.trim();
}

function isPublicEvidenceUrl(value: unknown): boolean {
  const url = cleanText(value);
  if (!url) return false;
  return ![
    "/api/chemical-document",
    "/api/demo-document",
    "/api/dpp-export",
  ].some((prefix) => url.startsWith(prefix));
}

function safeEvidenceText(value: unknown): string {
  const text = cleanText(value);
  if (!text) return "";
  return /demo|synthetic|演示|合成|示例/i.test(text) ? "" : text;
}

function statusLabel(row: any, locale: DppLocale): string {
  const t = TEXT[locale];
  const status = cleanText(row?.verification_status || row?.evidence_status).toLowerCase();
  const identity = `${row?.issuer || ""} ${row?.certificate_number || ""} ${row?.file_url || ""}`;
  const unsafe = /demo|synthetic|演示|合成|示例/i.test(identity);
  if (unsafe) return t.awaitingEvidence;
  if (["verified", "third_party_verified", "independently_verified"].includes(status)) return t.thirdParty;
  if (["document_supported", "supported"].includes(status) || isPublicEvidenceUrl(row?.file_url || row?.certificate_url)) {
    return t.dataSupported;
  }
  if (["not_applicable", "n/a"].includes(status)) return t.notApplicable;
  if (["self_declared", "declared", "active"].includes(status)) return t.selfDeclared;
  return t.awaitingEvidence;
}

function visibilityAudience(row: any): DppAudience {
  const visibility = cleanText(row?.visibility_level || row?.access_level || "public").toLowerCase();
  return visibility.includes("authority") || visibility.includes("audit")
    ? "AUTHORITY_ONLY"
    : visibility.includes("professional") || visibility.includes("legitimate")
      ? "LEGITIMATE_INTEREST"
      : "PUBLIC";
}

function visibilityAllows(row: any, audience: DppAudience): boolean {
  const required = visibilityAudience(row);
  return AUDIENCE_RANK[audience] >= AUDIENCE_RANK[required];
}

function normalizeSector(product: any): string {
  const explicit = cleanText(product?.sector_code).toLowerCase();
  if (SECTOR_LABELS[explicit]) return explicit;
  const source = `${product?.category || ""} ${product?.subcategory || ""}`.toLowerCase();
  if (/battery|电池/.test(source)) return "battery";
  if (/textile|apparel|garment|纺织|服装/.test(source)) return "textile";
  if (/furniture|chair|家具|座椅/.test(source)) return "furniture";
  if (/construction|floor|building|建材|地板/.test(source)) return "construction";
  if (/electronic|audio|earbud|电子|耳机/.test(source)) return "consumer_electronics";
  return explicit || "textile";
}

function categoryLabel(value: unknown, sector: string, locale: DppLocale): string {
  const text = cleanText(value);
  if (locale === "en") return text;
  if (/stationary.*industrial.*2\s*kwh|industrial.*stationary/i.test(text)) return "大于 2 kWh 的固定式工业电池";
  if (/lmt|light means of transport/i.test(text)) return "轻型交通工具电池";
  if (/removable.*e-?bike.*battery/i.test(text)) return "可拆卸电动自行车锂离子电池包";
  if (/wireless.*earbuds?/i.test(text)) return "无线耳机";
  if (/t-?shirt/i.test(text)) return "T 恤";
  if (/outdoor fabric/i.test(text)) return "户外面料";
  if (/consumer electronics/i.test(text)) return "消费电子";
  if (/industrial battery/i.test(text)) return "工业电池";
  return text || SECTOR_LABELS[sector]?.zh || "";
}

function granularityLabel(value: unknown, locale: DppLocale): string {
  const normalized = cleanText(value).toLowerCase();
  const labels: Record<string, { zh: string; en: string }> = {
    model: { zh: "型号级", en: "Model level" },
    batch: { zh: "批次级", en: "Batch level" },
    item: { zh: "单体级", en: "Item level" },
  };
  return labels[normalized]?.[locale] || cleanText(value);
}

function lifecycleLabel(value: unknown, locale: DppLocale): string {
  const normalized = cleanText(value).toLowerCase();
  const labels: Record<string, { zh: string; en: string }> = {
    published: { zh: "在用 / 已发布", en: "In use / published" },
    updated: { zh: "在用 / 已更新", en: "In use / updated" },
    active: { zh: "在用", en: "In use" },
    draft: { zh: "草稿", en: "Draft" },
    expired: { zh: "已到期", en: "Expired" },
    archived: { zh: "已归档", en: "Archived" },
  };
  return labels[normalized]?.[locale] || cleanText(value) || (locale === "zh" ? "在用" : "In use");
}

function getSectorValue(rows: any[], key: string): any {
  return rows.find((row) => cleanText(row?.field_key) === key);
}

function sectorValueText(row: any, locale: DppLocale): string {
  if (!row) return "";
  const value = row.field_value ?? row.value_text ?? row.value_number ?? row.value_json;
  if (typeof value === "object" && value !== null) {
    if (hasValue(value.value)) return withUnit(value.value, value.unit || row.unit || "");
    return JSON.stringify(value);
  }
  return withUnit(displayValue(value, locale), row.unit || "");
}

function humanFieldLabel(key: string, locale: DppLocale): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key][locale];
  const words = key.replaceAll("_", " ").trim();
  if (locale === "zh") return words;
  return words.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function presentationFields(data: any, locale: DppLocale, group: string): DppFieldModel[] {
  const rows = data?.presentation?.[group];
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row: any) => {
    const label = cleanText(locale === "zh" ? row.labelZh || row.label : row.labelEn || row.label);
    const value = cleanText(locale === "zh" ? row.valueZh || row.value : row.valueEn || row.value);
    return label && value ? [{ label, value, access: visibilityAudience(row) }] : [];
  });
}

function materialItems(data: any, locale: DppLocale, audience: DppAudience): DppItemModel[] {
  const t = TEXT[locale];
  const materials = Array.isArray(data?.materials) ? data.materials : [];
  const components = Array.isArray(data?.bom) ? data.bom : [];
  const materialRows = materials.map((row: any, index: number) => ({
    id: String(row.id || `material-${index}`),
    title: displayValue(localized(row, locale, "material_name", "material_name_zh"), locale) || `${t.materials} ${index + 1}`,
    subtitle: displayValue(localized(row, locale, "material_type", "material_type_zh"), locale),
    access: visibilityAudience(row),
    fields: compactFields([
      field(t.share, hasValue(row.percentage) ? `${row.percentage}%` : ""),
      field(t.recycled, hasValue(row.recycled_content) ? `${row.recycled_content}%` : ""),
      field(t.origin, displayValue(row.origin_country, locale)),
      audience !== "PUBLIC"
        ? field(t.chemical, localized(row, locale, "chemical_info", "chemical_info_zh"), undefined, undefined, "LEGITIMATE_INTEREST")
        : null,
      field(t.certification, displayValue(safeEvidenceText(row.certification), locale)),
    ]),
  }));
  const componentRows = components.map((row: any, index: number) => ({
    id: String(row.id || `component-${index}`),
    title: displayValue(localized(row, locale, "component_name", "component_name_zh"), locale) || `${t.componentType} ${index + 1}`,
    subtitle: displayValue(localized(row, locale, "component_type", "component_type_zh"), locale),
    access: visibilityAudience(row),
    fields: compactFields([
      field(t.quantity, row.quantity),
      field(t.position, displayValue(localized(row, locale, "position", "position_zh"), locale)),
      audience !== "PUBLIC"
        ? field(t.source, safeEvidenceText(row.supplier_name || row.supplier), undefined, undefined, "LEGITIMATE_INTEREST")
        : null,
    ]),
  }));
  return [...materialRows, ...componentRows];
}

function environmentFields(data: any, locale: DppLocale, audience: DppAudience): DppFieldModel[] {
  const t = TEXT[locale];
  const esgRows = Array.isArray(data?.esg) ? data.esg : [];
  const esg = esgRows.at(-1) || {};
  const circularity = (Array.isArray(data?.circularity) ? data.circularity : [])[0] || {};
  const presentation = presentationFields(data, locale, "environment");
  return compactFields([
    field(t.carbon, hasValue(esg.carbon_footprint) ? `${esg.carbon_footprint} kg CO2e` : ""),
    field(t.water, hasValue(esg.water_usage) ? `${esg.water_usage} L` : ""),
    field(t.energy, hasValue(esg.energy_consumption) ? `${esg.energy_consumption} kWh` : ""),
    field(t.waste, hasValue(esg.waste_generation) ? `${esg.waste_generation} kg` : ""),
    field(t.recycled, hasValue(esg.recycled_content) ? `${esg.recycled_content}%` : ""),
    field(t.repairability, hasValue(circularity.repairability_score) ? `${circularity.repairability_score} / 100` : ""),
    field(t.recyclability, hasValue(circularity.recyclability_score) ? `${circularity.recyclability_score} / 100` : ""),
    audience !== "PUBLIC"
      ? field(t.methodology, safeEvidenceText(esg.methodology), undefined, undefined, "LEGITIMATE_INTEREST")
      : null,
    audience !== "PUBLIC"
      ? field(t.verifier, safeEvidenceText(esg.verified_by), undefined, undefined, "LEGITIMATE_INTEREST")
      : null,
    ...presentation,
  ]);
}

function performanceFields(data: any, sector: string, locale: DppLocale): DppFieldModel[] {
  const battery = data?.batteryPresentation || {};
  const rows = Array.isArray(data?.sectorFieldValues) ? data.sectorFieldValues : [];
  const sectorKeys = sector === "battery"
    ? ["rated_capacity", "rated_energy", "expected_lifetime", "battery_mass"]
    : ["durability_test_basis", "durability_test", "firmware_security_update_policy"];
  const configured = sectorKeys.flatMap((key) => {
    const row = getSectorValue(rows, key);
    const value = sectorValueText(row, locale);
    return value ? [{ label: humanFieldLabel(key, locale), value }] : [];
  });
  const batteryFields = sector === "battery"
    ? compactFields([
        field(locale === "zh" ? "额定容量" : "Rated capacity", hasValue(battery.ratedCapacityAh) ? `${battery.ratedCapacityAh} Ah` : ""),
        field(locale === "zh" ? "标称电压" : "Nominal voltage", hasValue(battery.nominalVoltageV) ? `${battery.nominalVoltageV} V` : ""),
        field(locale === "zh" ? "允许最大功率" : "Maximum permitted power", hasValue(battery.maximumPowerW) ? `${battery.maximumPowerW} W` : ""),
        field(locale === "zh" ? "初始往返能量效率" : "Initial round-trip efficiency", hasValue(battery.initialEfficiencyPercent) ? `${battery.initialEfficiencyPercent}%` : ""),
        field(locale === "zh" ? "预期循环寿命" : "Expected cycle life", hasValue(battery.expectedCycles) ? `${battery.expectedCycles} ${locale === "zh" ? "次" : "cycles"}` : ""),
        field(locale === "zh" ? "预期日历寿命" : "Expected calendar life", hasValue(battery.expectedCalendarYears) ? `${battery.expectedCalendarYears} ${locale === "zh" ? "年" : "years"}` : ""),
        field(
          locale === "zh" ? "闲置温度范围" : "Idle temperature range",
          hasValue(battery.idleTemperatureMinC) && hasValue(battery.idleTemperatureMaxC)
            ? `${battery.idleTemperatureMinC}–${battery.idleTemperatureMaxC} °C`
            : "",
        ),
      ])
    : [];
  return [...presentationFields(data, locale, "performance"), ...batteryFields, ...configured]
    .filter((item, index, all) => all.findIndex((candidate) => candidate.label === item.label) === index);
}

function traceabilityItems(data: any, locale: DppLocale): DppItemModel[] {
  const t = TEXT[locale];
  const rows = Array.isArray(data?.traceability) ? data.traceability : [];
  return rows.map((row: any, index: number) => ({
    id: String(row.id || `trace-${index}`),
    title: displayValue(localized(row, locale, "event_name", "event_name_zh") || cleanText(row.event_type), locale) || `${t.eventType} ${index + 1}`,
    subtitle: formatDate(row.event_date, locale),
    access: visibilityAudience(row),
    status: cleanText(row.verification_status).toLowerCase() === "verified"
      ? locale === "zh" ? "已记录" : "Recorded"
      : locale === "zh" ? "待补充" : "Pending",
    fields: compactFields([
      field(t.eventType, displayValue(row.event_type, locale)),
      field(t.facility, displayValue(safeEvidenceText(localized(row, locale, "facility_name", "facility_name_zh")), locale)),
      field(t.location, [row.city, row.country].filter(hasValue).map((value) => displayValue(value, locale)).join(", ")),
      field(t.transport, displayValue(row.transport_method, locale)),
      field(t.notes, displayValue(safeEvidenceText(localized(row, locale, "notes", "notes_zh")), locale)),
    ]),
  }));
}

function evidenceItems(data: any, locale: DppLocale, audience: DppAudience): DppItemModel[] {
  const t = TEXT[locale];
  const certificates = Array.isArray(data?.certificates) ? data.certificates : [];
  const documents = Array.isArray(data?.documents) ? data.documents : [];
  const certificateRows = certificates.map((row: any, index: number) => {
    const issuer = displayValue(safeEvidenceText(row.issuer), locale);
    const number = safeEvidenceText(row.certificate_number);
    const href = isPublicEvidenceUrl(row.certificate_url) ? row.certificate_url : undefined;
    return {
      id: String(row.id || `certificate-${index}`),
      title: displayValue(localized(row, locale, "certificate_name", "certificate_name_zh"), locale) || `${t.certification} ${index + 1}`,
      subtitle: displayValue(localized(row, locale, "certificate_type", "certificate_type_zh"), locale),
      status: statusLabel(row, locale),
      access: visibilityAudience(row),
      fields: compactFields([
        audience !== "PUBLIC"
          ? field(t.number, number, undefined, undefined, "LEGITIMATE_INTEREST")
          : null,
        field(t.issuer, issuer),
        field(t.issueDate, formatDate(row.issue_date, locale)),
        field(t.expiryDate, formatDate(row.expiry_date, locale)),
      ]),
      href,
    };
  });
  const documentRows = documents.map((row: any, index: number) => ({
    id: String(row.id || `document-${index}`),
    title: displayValue(safeEvidenceText(row.document_name), locale) || (locale === "zh" ? `产品文件 ${index + 1}` : `Product document ${index + 1}`),
    subtitle: displayValue(safeEvidenceText(row.document_type), locale),
    status: statusLabel(row, locale),
    access: visibilityAudience(row),
    fields: compactFields([
      audience !== "PUBLIC"
        ? field(t.source, safeEvidenceText(row.uploaded_by), undefined, undefined, "LEGITIMATE_INTEREST")
        : null,
      field(t.updatedAt, formatDate(row.updated_at || row.created_at, locale)),
    ]),
    href: isPublicEvidenceUrl(row.file_url) ? row.file_url : undefined,
  }));
  return [...certificateRows, ...documentRows].filter((item) => hasValue(item.title));
}

function circularityFields(data: any, locale: DppLocale): DppFieldModel[] {
  const t = TEXT[locale];
  const product = data?.product || {};
  const circularity = (Array.isArray(data?.circularity) ? data.circularity : [])[0] || {};
  const transparency = (Array.isArray(data?.consumerTransparency) ? data.consumerTransparency : [])[0] || {};
  return compactFields([
    field(t.care, displayValue(localized(product, locale, "care_instructions", "care_instructions_zh") || localized(transparency, locale, "care_instructions", "care_instructions_zh"), locale)),
    field(t.repair, displayValue(localized(product, locale, "repair_instructions", "repair_instructions_zh") || localized(transparency, locale, "repair_guide", "repair_guide_zh"), locale)),
    field(t.takeBack, displayValue(localized(circularity, locale, "take_back_program", "take_back_program_zh"), locale)),
    field(t.disassembly, displayValue(localized(circularity, locale, "disassembly_guide", "disassembly_guide_zh"), locale)),
    field(t.endOfLife, displayValue(localized(circularity, locale, "end_of_life_info", "end_of_life_info_zh") || localized(product, locale, "end_of_life_instructions", "end_of_life_instructions_zh"), locale)),
  ]);
}

function lifecycleItems(data: any, locale: DppLocale): DppItemModel[] {
  const t = TEXT[locale];
  const events = Array.isArray(data?.traceability) ? data.traceability : [];
  const lifecycleKeywords = /repair|service|use|fault|safety|reuse|retire|recycl|维修|维保|使用|故障|安全|再利用|退役|回收/i;
  return events
    .filter((row: any) => lifecycleKeywords.test(`${row.event_type || ""} ${row.event_name || ""} ${row.event_name_zh || ""}`))
    .map((row: any, index: number) => ({
      id: String(row.id || `lifecycle-${index}`),
      title: displayValue(localized(row, locale, "event_name", "event_name_zh") || cleanText(row.event_type), locale),
      subtitle: formatDate(row.event_date, locale),
      status: cleanText(row.verification_status),
      fields: compactFields([
        field(t.location, [row.city, row.country].filter(hasValue).map((value) => displayValue(value, locale)).join(", ")),
        field(t.notes, displayValue(localized(row, locale, "notes", "notes_zh"), locale)),
      ]),
    }));
}

function batterySection(data: any, locale: DppLocale, audience: DppAudience): DppSectionModel {
  const isPublic = audience === "PUBLIC";
  const isShowcase = data?.showcase?.mode === "PUBLIC_SHOWCASE";
  const updatedAt = formatDate(data?.product?.updated_at || data?.product?.created_at, locale);
  const operating = !isPublic && data?.batteryOperating
    ? batteryOperatingModel(data.batteryOperating, locale)
    : undefined;
  return {
    id: "battery-health",
    index: "05",
    title: locale === "zh" ? "运行状态与电池健康" : "Operating status and battery health",
    intro: isShowcase
      ? locale === "zh"
        ? "案例直接展示状态快照、历史趋势和生命周期事件；正式产品需登录并获得专业授权后查看。初始化数据不代表已接入实时 BMS 或 EMS。"
        : "The case displays status snapshots, trends and lifecycle events. Live products require sign-in and a professional grant. Initial data does not represent a live BMS or EMS connection."
      : isPublic
      ? locale === "zh"
        ? "该产品支持通过 BMS、EMS、设备网关或维保记录持续更新。公众页面不展示单体运行数值。"
        : "The product supports updates from BMS, EMS, device gateways or service records. Item operating values are not public."
      : locale === "zh"
        ? "专业数据需在身份和产品授权通过后由服务器返回；当前页面仅展示接口和访问边界。"
        : "Professional data is returned by the server only after identity and product authorisation; this view shows the interface boundary.",
    status: "available",
    batteryOperating: operating,
    fields: compactFields([
      field(locale === "zh" ? "更新方式" : "Update method", locale === "zh" ? "定期快照与生命周期事件" : "Periodic snapshots and lifecycle events"),
    field(
      locale === "zh" ? "支持来源" : "Supported sources",
      locale === "zh" ? "BMS / EMS / 设备网关 / 维保系统" : "BMS / EMS / Gateway / Service",
    ),
      field(locale === "zh" ? "最近护照更新" : "Latest passport update", updatedAt),
      field(
        locale === "zh" ? "运行数据访问" : "Operating-data access",
        isPublic
          ? locale === "zh" ? "需要登录并获得相应授权" : "Sign-in and explicit authorisation required"
          : operating
            ? locale === "zh" ? "已按当前账号授权范围返回" : "Returned within the current account's authorised scope"
            : locale === "zh" ? "尚无可显示的单体运行记录" : "No item operating record is available",
      ),
    ]),
  };
}

function batteryOperatingModel(data: any, locale: DppLocale): DppBatteryOperatingModel {
  const sourceLabels: Record<string, { zh: string; en: string }> = {
    INITIAL_DATASET: { zh: "初始化数据", en: "Initial dataset" },
    BMS: { zh: "电池管理系统", en: "Battery management system" },
    EMS: { zh: "能源管理系统", en: "Energy management system" },
    GATEWAY: { zh: "设备网关", en: "Equipment gateway" },
    SERVICE_SYSTEM: { zh: "维保系统", en: "Service system" },
    IMPORT_SYSTEM: { zh: "经核验导入", en: "Verified import" },
  };
  const qualityLabels: Record<string, { zh: string; en: string }> = {
    VALID: { zh: "有效", en: "Valid" },
    SUSPECT: { zh: "待复核", en: "Review required" },
    INVALID: { zh: "无效", en: "Invalid" },
    UNKNOWN: { zh: "未核验", en: "Unverified" },
  };
  const verificationLabels: Record<string, { zh: string; en: string }> = {
    DEVICE_REPORTED: { zh: "设备上报", en: "Device reported" },
    MANUALLY_VERIFIED: { zh: "人工核验", en: "Manually verified" },
    UNVERIFIED: { zh: "未核验", en: "Unverified" },
  };
  const freshnessLabels: Record<string, { zh: string; en: string }> = {
    CURRENT: { zh: "当前", en: "Current" },
    DUE: { zh: "即将过期", en: "Update due" },
    OVERDUE: { zh: "已过期", en: "Overdue" },
    MISSING: { zh: "缺少数据", en: "Missing" },
  };
  const updateModeLabels: Record<string, { zh: string; en: string }> = {
    DAILY_SNAPSHOT: { zh: "每日状态快照", en: "Daily snapshot" },
    EVENT_DRIVEN: { zh: "事件触发", en: "Event driven" },
    SERVICE_SNAPSHOT: { zh: "维保快照", en: "Service snapshot" },
    MANUAL_VERIFIED_IMPORT: { zh: "经核验导入", en: "Verified import" },
  };
  const eventLabels: Record<string, { zh: string; en: string }> = {
    COMMISSIONING: { zh: "投入使用", en: "Commissioning" },
    INSPECTION: { zh: "检查", en: "Inspection" },
    MAINTENANCE: { zh: "维护", en: "Maintenance" },
    REPAIR: { zh: "维修", en: "Repair" },
    FAULT: { zh: "故障", en: "Fault" },
    SAFETY_EVENT: { zh: "安全事件", en: "Safety event" },
    BMS_REPLACEMENT: { zh: "BMS 更换", en: "BMS replacement" },
    REUSE: { zh: "再使用", en: "Reuse" },
    REPURPOSE: { zh: "改变用途", en: "Repurpose" },
    RETIREMENT: { zh: "退役", en: "Retirement" },
    RECYCLING: { zh: "回收", en: "Recycling" },
  };
  const localLabel = (table: Record<string, { zh: string; en: string }>, value: unknown) => {
    const key = cleanText(value).toUpperCase();
    return table[key]?.[locale] || cleanText(value);
  };
  const latest = (Array.isArray(data?.latest) ? data.latest : []).map((row: any) => ({
    id: String(row.id),
    metricType: cleanText(row.metricType),
    label: cleanText(locale === "zh" ? row.labelZh : row.labelEn),
    value: Number(row.value),
    unit: cleanText(row.unit),
    measuredAt: cleanText(row.measuredAt),
    sourceDevice: cleanText(row.sourceDevice),
    dataSource: localLabel(sourceLabels, row.dataSource),
    qualityStatus: localLabel(qualityLabels, row.qualityStatus),
    verificationStatus: localLabel(verificationLabels, row.verificationStatus),
  }));
  const history = (Array.isArray(data?.history) ? data.history : []).map((row: any) => ({
    id: String(row.id),
    metricType: cleanText(row.metricType),
    label: cleanText(locale === "zh" ? row.labelZh : row.labelEn),
    value: Number(row.value),
    unit: cleanText(row.unit),
    measuredAt: cleanText(row.measuredAt),
  }));
  const events = (Array.isArray(data?.events) ? data.events : []).map((row: any, index: number) => ({
    id: String(row.id || `battery-event-${index}`),
    title: localLabel(eventLabels, row.eventType),
    subtitle: formatDate(row.eventTime, locale),
    status: localLabel(verificationLabels, row.verificationStatus),
    fields: compactFields([
      field(locale === "zh" ? "数据来源" : "Data source", localLabel(sourceLabels, row.dataSource)),
      field(locale === "zh" ? "数据质量" : "Data quality", localLabel(qualityLabels, row.qualityStatus)),
      field(
        locale === "zh" ? "记录说明" : "Record note",
        row.eventData?.noteZh || row.eventData?.note || row.eventData?.description,
      ),
    ]),
  }));
  return {
    itemId: cleanText(data?.item?.id),
    itemSerial: cleanText(data?.item?.serialIdentifier),
    summary: {
      latestMeasuredAt: cleanText(data?.summary?.latestMeasuredAt),
      receivedAt: cleanText(data?.summary?.receivedAt),
      sourceDevice: cleanText(data?.summary?.sourceDevice),
      dataSource: localLabel(sourceLabels, data?.summary?.dataSource),
      qualityStatus: localLabel(qualityLabels, data?.summary?.qualityStatus),
      verificationStatus: localLabel(verificationLabels, data?.summary?.verificationStatus),
      freshnessStatus: localLabel(freshnessLabels, data?.summary?.freshnessStatus),
      updateMode: localLabel(updateModeLabels, data?.summary?.updateMode),
    },
    latest,
    history,
    events,
  };
}

function sectorSection(data: any, sector: string, locale: DppLocale, audience: DppAudience): DppSectionModel {
  if (sector === "battery") return batterySection(data, locale, audience);
  const product = data?.product || {};
  const materials = Array.isArray(data?.materials) ? data.materials : [];
  const bom = Array.isArray(data?.bom) ? data.bom : [];
  const rows = Array.isArray(data?.sectorFieldValues) ? data.sectorFieldValues : [];
  const configs: Record<string, { titleZh: string; titleEn: string; introZh: string; introEn: string; keys: string[] }> = {
    textile: {
      titleZh: "纺织品专项信息",
      titleEn: "Textile-specific information",
      introZh: "集中展示纤维、护理、化学管理和纺织品循环利用信息。",
      introEn: "Fibre, care, chemical-management and textile-circularity information.",
      keys: ["fiber_composition", "restricted_substance_statement", "durability_test_basis", "care_repair_reuse_route"],
    },
    consumer_electronics: {
      titleZh: "消费电子专项信息",
      titleEn: "Consumer-electronics information",
      introZh: "集中展示零部件、内置电池、RoHS / REACH、维修和 WEEE 回收信息。",
      introEn: "Components, embedded batteries, RoHS / REACH, repair and WEEE recovery information.",
      keys: ["battery_safety_document", "firmware_security_update_policy"],
    },
    furniture: {
      titleZh: "家具专项信息",
      titleEn: "Furniture-specific information",
      introZh: "集中展示耐久性、可替换部件、维修和拆解信息。",
      introEn: "Durability, replaceable parts, repair and disassembly information.",
      keys: ["durability_test", "replaceable_parts"],
    },
    construction: {
      titleZh: "建材专项信息",
      titleEn: "Construction-product information",
      introZh: "集中展示性能声明、材料、施工维护和回收信息。",
      introEn: "Performance declarations, materials, installation, maintenance and recovery information.",
      keys: ["declaration_of_performance", "voc_or_reach_evidence"],
    },
  };
  const config = configs[sector] || configs.textile;
  const fields: DppFieldModel[] = config.keys.flatMap((key) => {
    const row = getSectorValue(rows, key);
    if (!row || !visibilityAllows(row, audience)) return [];
    const value = sectorValueText(row, locale);
    return value ? [{
      label: humanFieldLabel(key, locale),
      value,
      access: visibilityAudience(row),
    }] : [];
  });
  if (sector === "textile") {
    const mainFibre = materials
      .filter((row: any) => hasValue(row.percentage))
      .sort((a: any, b: any) => Number(b.percentage) - Number(a.percentage))[0];
    const mainFibreText = mainFibre
      ? `${mainFibre.percentage}% ${localized(mainFibre, locale, "material_name", "material_name_zh")}`
      : "";
    if (mainFibreText) fields.unshift({ label: locale === "zh" ? "主要纤维" : "Primary fibre", value: mainFibreText });
    const care = localized(product, locale, "care_instructions", "care_instructions_zh");
    if (care) fields.push({ label: locale === "zh" ? "护理方式" : "Care method", value: care });
  }
  if (sector === "consumer_electronics") {
    const battery = bom.find((row: any) => /battery|电池/i.test(`${row.component_name || ""} ${row.component_name_zh || ""} ${row.component_type || ""}`));
    if (battery) fields.unshift({
      label: locale === "zh" ? "内置电池" : "Embedded battery",
      value: localized(battery, locale, "component_name", "component_name_zh"),
    });
    fields.push({
      label: locale === "zh" ? "电子废弃物路径" : "E-waste route",
      value: locale === "zh" ? "进入当地 WEEE 分类收集和授权回收渠道" : "Use local WEEE separate-collection and authorised recovery channels",
    });
  }
  return {
    id: "sector-details",
    index: "05",
    title: locale === "zh" ? config.titleZh : config.titleEn,
    intro: locale === "zh" ? config.introZh : config.introEn,
    status: fields.length ? "available" : "pending",
    fields,
  };
}

function heroMetrics(
  data: any,
  sector: string,
  locale: DppLocale,
): DppFieldModel[] {
  const product = data?.product || {};
  const battery = data?.batteryPresentation || {};
  const materials = Array.isArray(data?.materials) ? data.materials : [];
  const esg = (Array.isArray(data?.esg) ? data.esg : []).at(-1) || {};
  const circularity = (Array.isArray(data?.circularity) ? data.circularity : [])[0] || {};
  const presentation = presentationFields(data, locale, "heroMetrics");
  if (presentation.length) return presentation.slice(0, 4);
  if (sector === "battery") {
    const ratedEnergy = hasValue(battery.ratedEnergyKWh)
      ? `${battery.ratedEnergyKWh} kWh`
      : hasValue(battery.ratedCapacityAh) && hasValue(battery.nominalVoltageV)
        ? `${(Number(battery.ratedCapacityAh) * Number(battery.nominalVoltageV) / 1000).toFixed(3)} kWh`
        : "";
    return compactFields([
      field(locale === "zh" ? "标称电压" : "Nominal voltage", withUnit(battery.nominalVoltageV, "V")),
      field(locale === "zh" ? (ratedEnergy ? "额定能量" : "额定容量") : (ratedEnergy ? "Rated energy" : "Rated capacity"), ratedEnergy || withUnit(battery.ratedCapacityAh, "Ah")),
      field(locale === "zh" ? "电池化学体系" : "Battery chemistry", displayValue(battery.chemistry, locale)),
      field(locale === "zh" ? "预期循环寿命" : "Expected cycle life", hasValue(battery.expectedCycles) ? `${battery.expectedCycles} ${locale === "zh" ? "次" : "cycles"}` : ""),
    ]);
  }
  if (sector === "textile") {
    const sorted = [...materials].sort((a: any, b: any) => Number(b.percentage || 0) - Number(a.percentage || 0));
    const primary = sorted[0];
    const recycled = materials.reduce((sum: number, row: any) => {
      return sum + Number(row.percentage || 0) * Number(row.recycled_content || 0) / 100;
    }, 0);
    return compactFields([
      field(locale === "zh" ? "主要纤维" : "Primary fibre", primary ? `${primary.percentage || ""}% ${localized(primary, locale, "material_name", "material_name_zh")}` : ""),
      field(locale === "zh" ? "再生成分" : "Recycled content", recycled > 0 ? `${Math.round(recycled)}%` : ""),
      field(locale === "zh" ? "产品碳足迹" : "Product carbon footprint", hasValue(esg.carbon_footprint) ? `${esg.carbon_footprint} kg CO2e` : ""),
      field(
        locale === "zh" ? "护理方式" : "Care method",
        hasValue(localized(product, locale, "care_instructions", "care_instructions_zh"))
          ? locale === "zh" ? "冷水机洗，优先自然晾干" : "Cold wash; line dry where possible"
          : "",
      ),
    ]);
  }
  if (sector === "consumer_electronics") {
    return compactFields([
      field(locale === "zh" ? "产品类型" : "Product type", categoryLabel(localized(product, locale, "subcategory"), sector, locale)),
      field(locale === "zh" ? "内置电池" : "Embedded battery", locale === "zh" ? "锂离子充电电池" : "Rechargeable lithium-ion battery"),
      field(
        locale === "zh" ? "维修路径" : "Repair route",
        hasValue(localized(product, locale, "repair_instructions", "repair_instructions_zh"))
          ? locale === "zh" ? "授权服务商维修" : "Authorised service provider"
          : "",
      ),
      field(locale === "zh" ? "回收路径" : "Recovery route", "WEEE"),
    ]);
  }
  return compactFields([
    field(locale === "zh" ? "产品类别" : "Product category", localized(product, locale, "subcategory")),
    field(locale === "zh" ? "材料数量" : "Material records", materials.length || ""),
    field(locale === "zh" ? "可维修性" : "Repairability", hasValue(circularity.repairability_score) ? `${circularity.repairability_score} / 100` : ""),
    field(locale === "zh" ? "产品碳足迹" : "Product carbon footprint", hasValue(esg.carbon_footprint) ? `${esg.carbon_footprint} kg CO2e` : ""),
  ]);
}

export function buildPublicDppViewModel(data: any, options: BuildOptions): PublicDppViewModel {
  const locale = options.locale;
  const audience = options.audience || "PUBLIC";
  const t = TEXT[locale];
  const product = data?.product || {};
  const sector = normalizeSector(product);
  const sectorRows = (Array.isArray(data?.sectorFieldValues) ? data.sectorFieldValues : [])
    .filter((row: any) => visibilityAllows(row, audience))
    .filter((row: any) => !["state_of_health", "state_of_charge"].includes(cleanText(row?.field_key).toLowerCase()));
  const identityRows = Array.isArray(data?.digitalIdentity) ? data.digitalIdentity : [];
  const identity = identityRows[0] || {};
  const serial = publicIdentifier(identity.serial_id || data?.batteryPresentation?.serialNumber);
  const sgtin = identity.gtin && serial ? `${identity.gtin}.${serial}` : "";
  const dppId = publicIdentifier(product.dpp_id || product.public_slug);
  const image = cleanText(product.main_image);
  const rawDescription = localized(product, locale, "description", "description_zh");
  const description = /demo|synthetic|演示|合成|示例|样品/i.test(rawDescription)
    ? ""
    : rawDescription;
  const fallbackDescription = locale === "zh"
    ? `${SECTOR_LABELS[sector]?.zh || "产品"}数字产品护照，展示身份、材料、环境、性能、证据和生命周期信息。`
    : `Digital Product Passport for a ${SECTOR_LABELS[sector]?.en.toLowerCase() || "product"}, covering identity, materials, environment, performance, evidence and lifecycle information.`;
  const upi = publicIdentifier(product.unique_product_identifier || identity.digital_link || identity.digital_link_url || options.dppUrl);
  const manufacturingPlace = getSectorValue(sectorRows, "manufacturing_place");
  const manufacturingDate = getSectorValue(sectorRows, "manufacturing_date");
  const economicOperator = getSectorValue(sectorRows, "economic_operator_information");
  const identityFields = compactFields([
    field(t.dppId, dppId),
    field(t.upi, upi),
    field(t.gtin, identity.gtin),
    field(t.sgtin, sgtin),
    field(t.model, product.sku || data?.batteryPresentation?.modelIdentifier),
    field(t.batch, identity.batch_id),
    field(t.serial, serial),
    field(t.granularity, granularityLabel(product.granularity_level || (identity.serial_id ? "item" : identity.batch_id ? "batch" : "model"), locale)),
    field(t.manufacturer, displayValue(safeEvidenceText(product.brand), locale)),
    field(t.economicOperator, sectorValueText(economicOperator, locale), undefined, undefined, visibilityAudience(economicOperator)),
    field(t.manufacturingPlace, sectorValueText(manufacturingPlace, locale), undefined, undefined, visibilityAudience(manufacturingPlace)),
    field(t.manufacturingDate, sectorValueText(manufacturingDate, locale), undefined, undefined, visibilityAudience(manufacturingDate)),
    field(t.lifecycleStatus, lifecycleLabel(product.status, locale)),
    field(t.updatedAt, formatDate(product.updated_at || product.created_at, locale)),
  ]);
  const materials = materialItems(data, locale, audience);
  const environment = environmentFields(data, locale, audience);
  const performance = performanceFields(data, sector, locale);
  const traceability = traceabilityItems(data, locale);
  const evidence = evidenceItems(data, locale, audience);
  const circularity = circularityFields(data, locale);
  const lifecycle = lifecycleItems(data, locale);
  const authorityFields = audience === "AUTHORITY_ONLY"
    ? compactFields([
        ...(Array.isArray(data?.governance) ? data.governance : []).flatMap((row: any) => [
          field(t.source, safeEvidenceText(row.data_source), undefined, undefined, "AUTHORITY_ONLY"),
          field(t.verification, safeEvidenceText(row.audit_status), undefined, undefined, "AUTHORITY_ONLY"),
        ]),
        ...(Array.isArray(data?.registrySubmissions) ? data.registrySubmissions : []).flatMap((row: any) => [
          field(locale === "zh" ? "Registry 提交状态" : "Registry submission state", row.submission_status, undefined, undefined, "AUTHORITY_ONLY"),
          field(locale === "zh" ? "欧盟注册标识" : "EU registration identifier", row.eu_registration_identifier, undefined, undefined, "AUTHORITY_ONLY"),
        ]),
      ])
    : [];
  if (authorityFields.length) {
    evidence.unshift({
      id: "authority-records",
      title: locale === "zh" ? "监管与数据治理记录" : "Authority and data-governance records",
      status: t.selfDeclared,
      fields: authorityFields,
      access: "AUTHORITY_ONLY",
    });
  }
  const sections: DppSectionModel[] = [
    {
      id: "identity",
      index: "01",
      title: t.identity,
      intro: t.identityIntro,
      status: identityFields.length ? "available" : "pending",
      fields: identityFields,
    },
    {
      id: "materials",
      index: "02",
      title: t.materials,
      intro: t.materialsIntro,
      status: materials.length ? "available" : "pending",
      items: materials,
    },
    {
      id: "environment",
      index: "03",
      title: t.environment,
      intro: t.environmentIntro,
      status: environment.length ? "available" : "pending",
      fields: environment,
    },
    {
      id: "performance",
      index: "04",
      title: t.performance,
      intro: t.performanceIntro,
      status: performance.length ? "available" : "pending",
      fields: performance,
    },
    sectorSection({ ...data, sectorFieldValues: sectorRows }, sector, locale, audience),
    {
      id: "traceability",
      index: "06",
      title: t.traceability,
      intro: t.traceabilityIntro,
      status: traceability.length ? "available" : "pending",
      items: traceability,
    },
    {
      id: "evidence",
      index: "07",
      title: t.evidence,
      intro: t.evidenceIntro,
      status: evidence.length ? "available" : "pending",
      items: evidence,
    },
    {
      id: "circularity",
      index: "08",
      title: t.circularity,
      intro: t.circularityIntro,
      status: circularity.length ? "available" : "pending",
      fields: circularity,
    },
    {
      id: "lifecycle",
      index: "09",
      title: t.lifecycle,
      intro: t.lifecycleIntro,
      status: lifecycle.length ? "available" : "pending",
      items: lifecycle,
    },
  ];
  const productReference = encodeURIComponent(dppId || product.public_slug || product.id || "");
  return {
    locale,
    audience,
    isPreview: Boolean(options.isPreview),
    identity: {
      name: localized(product, locale, "name", "name_zh") || (locale === "zh" ? "数字产品护照" : "Digital Product Passport"),
      description: description || fallbackDescription,
      brand: safeEvidenceText(product.brand),
      sector: SECTOR_LABELS[sector]?.[locale] || cleanText(product.sector_code),
      category: categoryLabel(
        localized(product, locale, "subcategory") || localized(product, locale, "category"),
        sector,
        locale,
      ),
      dppId,
      upi,
      gtin: cleanText(identity.gtin),
      sgtin,
      model: cleanText(product.sku || data?.batteryPresentation?.modelIdentifier),
      batch: cleanText(identity.batch_id),
      serial,
      granularity: granularityLabel(product.granularity_level || (identity.serial_id ? "item" : identity.batch_id ? "batch" : "model"), locale),
      lifecycleStatus: lifecycleLabel(product.status, locale),
      updatedAt: formatDate(product.updated_at || product.created_at, locale),
      image,
    },
    heroMetrics: heroMetrics(data, sector, locale),
    sections,
    qr: {
      target: options.dppUrl,
      image: `/api/qr?data=${encodeURIComponent(options.dppUrl)}`,
    },
    pdfUrl: `/api/dpp-export?format=pdf&lang=${locale}&product=${productReference}`,
  };
}
