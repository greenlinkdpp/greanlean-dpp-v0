import seed from "../../docs/industrial-battery-demo.seed.json" with { type: "json" };

export const INDUSTRIAL_DEMO = {
  slug: "green-vault-ess-14-3-demo-000001",
  productSlug: "green-vault-ess-14-3",
  dppId: "DPP-GV-ESS-14K3-000001",
  sku: "GV-ESS-14K3-2026",
  gtin: "06900000014336",
  sgtin: "06900000014336.GV14K3DEMO000001",
  profileKey: "battery.industrial.stationary_above_2kwh.v1",
  schemaCode: "battery.industrial.stationary",
  image: "/images/green-vault-ess-14-3.png",
  upi: "https://www.greanlean.com/passports/green-vault-ess-14-3-demo-000001",
} as const;

export type DemoLocale = "zh" | "en";
export type DemoAudience = "consumer" | "professional" | "audit";
export type DemoVerification =
  | "SYNTHETIC_DEMO"
  | "SELF_DECLARED"
  | "DOCUMENT_SUPPORTED"
  | "THIRD_PARTY_VERIFIED"
  | "NOT_AVAILABLE"
  | "NOT_APPLICABLE";
export type DemoAccess = "PUBLIC" | "LEGITIMATE_INTEREST" | "AUTHORITY_ONLY" | "INTERNAL";
export type DemoGranularity = "MODEL" | "BATCH" | "ITEM" | "EVENT" | "METRIC";
export type DemoRequirement =
  | "MANDATORY_REGULATORY"
  | "CONDITIONAL_REGULATORY"
  | "STANDARD_RECOMMENDED"
  | "DEMO_EXTENSION"
  | "TBD";

export type DemoField = {
  code: string;
  labelZh: string;
  labelEn: string;
  value: string | number;
  unit?: string;
  granularity: DemoGranularity;
  access: DemoAccess;
  requirement: DemoRequirement;
  source: string;
  verification: DemoVerification;
  reference?: string;
};

function field(
  code: string,
  labelZh: string,
  labelEn: string,
  value: string | number,
  options: Partial<Omit<DemoField, "code" | "labelZh" | "labelEn" | "value">> = {},
): DemoField {
  return {
    code,
    labelZh,
    labelEn,
    value,
    granularity: options.granularity || "MODEL",
    access: options.access || "PUBLIC",
    requirement: options.requirement || "MANDATORY_REGULATORY",
    source: options.source || "Synthetic demo product specification",
    verification: options.verification || "SYNTHETIC_DEMO",
    unit: options.unit,
    reference: options.reference,
  };
}

const spec = seed.technicalSpecifications;
const materialLabelsZh = [
  "电芯与活性材料",
  "金属外壳与结构件",
  "BMS 与电子部件",
  "铜铝连接件与线束",
  "绝缘、密封与热管理材料",
];
const carbonStageLabelsZh = [
  "原材料与上游供应链",
  "电芯与电池制造",
  "分销运输",
  "生命周期结束处理",
];
const recycledLabelsZh = ["锂", "钴", "镍", "铅", "铝制外壳", "铜导体"];

export const INDUSTRIAL_DEMO_FIELD_GROUPS: Array<{
  code: string;
  labelZh: string;
  labelEn: string;
  introZh: string;
  introEn: string;
  fields: DemoField[];
}> = [
  {
    code: "identity",
    labelZh: "护照身份与产品信息",
    labelEn: "Passport identity and product information",
    introZh: "把护照、型号、批次和单体标识分开管理，二维码指向稳定的 HTTPS 护照地址。",
    introEn: "Passport, model, batch and item identifiers are managed separately and the QR code resolves to a stable HTTPS passport URL.",
    fields: [
      field("passport.schema_version", "护照数据结构版本", "Passport schema version", seed.schemaVersion),
      field("passport.version", "护照版本", "Passport version", seed.passportVersion, { granularity: "ITEM" }),
      field("passport.upi", "唯一产品标识（UPI）", "Unique product identifier (UPI)", INDUSTRIAL_DEMO.upi, { granularity: "ITEM" }),
      field("product.model_identifier", "电池型号", "Battery model", seed.passportMetadata.modelIdentifier),
      field("product.batch_identifier", "生产批次", "Production batch", seed.passportMetadata.batchIdentifier, { granularity: "BATCH" }),
      field("product.item_identifier", "单体序列号", "Item serial number", seed.passportMetadata.itemIdentifier, { granularity: "ITEM" }),
      field("product.gtin", "GTIN（演示）", "GTIN (demo)", INDUSTRIAL_DEMO.gtin, { granularity: "MODEL", requirement: "STANDARD_RECOMMENDED" }),
      field("product.sgtin", "SGTIN（演示）", "SGTIN (demo)", INDUSTRIAL_DEMO.sgtin, { granularity: "ITEM", requirement: "STANDARD_RECOMMENDED" }),
      field("product.category", "电池类别", "Battery category", "可充电工业电池（固定式，额定能量大于 2 kWh）"),
      field("product.lifecycle_status", "当前生命周期状态", "Current lifecycle status", seed.productIdentity.productStatus, { granularity: "ITEM" }),
    ],
  },
  {
    code: "manufacturer",
    labelZh: "制造商与制造信息",
    labelEn: "Manufacturer and manufacturing",
    introZh: "制造商及制造地点均为虚构演示信息，不代表真实经济运营者。",
    introEn: "The manufacturer and production location are fictional demonstration information and do not represent a real economic operator.",
    fields: [
      field("manufacturer.name", "制造商（虚构）", "Manufacturer (fictional)", seed.manufacturer.name),
      field("manufacturer.economic_operator", "经济运营者（虚构）", "Economic operator (fictional)", seed.manufacturer.economicOperator),
      field("manufacturing.date", "制造日期", "Manufacturing date", seed.productIdentity.manufacturingDate, { granularity: "ITEM" }),
      field("manufacturing.place", "制造地点（虚构）", "Manufacturing place (fictional)", seed.productIdentity.manufacturingPlace),
      field("product.application", "典型应用", "Typical applications", "固定式储能、工商业储能、电池柜与机架集成", { requirement: "DEMO_EXTENSION" }),
    ],
  },
  {
    code: "technical",
    labelZh: "电池规格与系统集成",
    labelEn: "Battery specifications and system integration",
    introZh: "关键规格以产品参数呈现；所有数值均为合成演示数据。",
    introEn: "Key specifications are presented as product parameters; all values are synthetic demonstration data.",
    fields: [
      field("battery.chemistry", "化学体系", "Chemistry", "磷酸铁锂 / 石墨（LFP）"),
      field("battery.cell_form", "电芯形式", "Cell form", "方形 LFP 电芯"),
      field("battery.configuration", "电芯配置", "Cell configuration", spec.configuration),
      field("battery.rated_energy", "额定能量", "Rated energy", spec.ratedEnergyKWh, { unit: "kWh" }),
      field("battery.rated_capacity", "额定容量", "Rated capacity", spec.ratedCapacityAh, { unit: "Ah" }),
      field("battery.nominal_voltage", "标称电压", "Nominal voltage", spec.nominalVoltageV, { unit: "V" }),
      field("battery.operating_voltage", "工作电压范围", "Operating voltage range", `${spec.minimumVoltageV}–${spec.maximumVoltageV}`, { unit: "V" }),
      field("battery.mass", "电池质量", "Battery mass", spec.weightKg, { unit: "kg" }),
      field("battery.dimensions", "外形尺寸", "Dimensions", `${spec.dimensionsMm.length} × ${spec.dimensionsMm.width} × ${spec.dimensionsMm.height}`, { unit: "mm" }),
      field("battery.ip_rating", "防护等级", "Ingress protection", spec.ipRating),
      field("battery.cooling", "冷却方式", "Cooling", "自然风冷"),
      field("battery.communication", "通信接口", "Communication", spec.communication.join(" / ")),
      field("battery.bms", "电池管理系统", "Battery management system", "集成式 BMS"),
    ],
  },
  {
    code: "materials",
    labelZh: "材料、关键原材料与关注物质",
    labelEn: "Materials, critical raw materials and substances of concern",
    introZh: "公开版展示材料结构；阴极、阳极、电解液等详细组成属于合法利益主体数据。",
    introEn: "The public view shows the material structure. Detailed cathode, anode and electrolyte composition is restricted to legitimate-interest actors.",
    fields: [
      ...seed.materials.map((item, index) =>
        field(`materials.${index + 1}`, materialLabelsZh[index] || item.component, item.component, item.massSharePct, { unit: "%", access: "PUBLIC" })),
      field("materials.critical", "关键原材料", "Critical raw materials", "锂、天然石墨、铜、铝", { access: "PUBLIC" }),
      field("materials.detailed_electrodes", "电极与电解液详细组成", "Detailed electrode and electrolyte composition", "受限访问：仅限合法利益主体", { access: "LEGITIMATE_INTEREST" }),
      field("substances.declaration", "关注物质声明", "Substances of concern declaration", "演示记录，未提供实验室检测证明", { verification: "SELF_DECLARED" }),
    ],
  },
  {
    code: "carbon",
    labelZh: "碳足迹",
    labelEn: "Carbon footprint",
    introZh: "以下碳足迹只用于说明数据结构，不是法规碳足迹声明，也未形成性能等级。",
    introEn: "The carbon footprint below only illustrates the data structure. It is not a regulatory carbon-footprint declaration and has no performance class.",
    fields: [
      field("carbon.total", "电池总碳足迹（演示）", "Total battery carbon footprint (demo)", seed.carbonFootprint.totalKgCO2e, { unit: "kg CO2e" }),
      field("carbon.intensity", "单位额定能量碳足迹（演示）", "Carbon footprint per rated energy (demo)", seed.carbonFootprint.intensityKgCO2ePerKWh, { unit: "kg CO2e/kWh" }),
      ...seed.carbonFootprint.stages.map((stage, index) =>
        field(`carbon.stage.${index + 1}`, carbonStageLabelsZh[index] || stage.stage, stage.stage, stage.kgCO2e, { unit: "kg CO2e" })),
      field("carbon.performance_class", "碳足迹性能等级", "Carbon-footprint performance class", "待官方分类方法", { verification: "NOT_AVAILABLE", requirement: "TBD" }),
    ],
  },
  {
    code: "circularity",
    labelZh: "再生材料与循环利用",
    labelEn: "Recycled content and circularity",
    introZh: "再生含量均为合成演示值；不适用于 LFP 化学体系的材料会明确标记。",
    introEn: "All recycled-content values are synthetic. Materials not applicable to the declared LFP chemistry are explicitly marked.",
    fields: [
      ...seed.recycledContent.map((item, index) =>
        field(
          `recycled.${index + 1}`,
          recycledLabelsZh[index] || item.material,
          item.material,
          "percentage" in item ? Number(item.percentage) : String(item.status).replaceAll("_", " "),
          { unit: "percentage" in item ? "%" : undefined, verification: "percentage" in item ? "SYNTHETIC_DEMO" : "NOT_APPLICABLE" },
        )),
      field("circularity.recyclability", "可回收性", "Recyclability", "电芯、铜铝导体、电子部件和金属外壳需分类交付有资质回收方"),
      field("circularity.repairability", "可维修性", "Repairability", "BMS、辅助电子部件和外部连接件可由授权人员更换", { access: "LEGITIMATE_INTEREST" }),
      field("circularity.spares", "备件信息", "Spare parts", "演示备件目录待提供", { access: "LEGITIMATE_INTEREST", verification: "NOT_AVAILABLE" }),
    ],
  },
  {
    code: "performance",
    labelZh: "性能与耐久性",
    labelEn: "Performance and durability",
    introZh: "性能值对应给定的演示测试条件，不替代真实型式试验或质保文件。",
    introEn: "Performance values correspond to the stated demonstration conditions and do not replace type testing or warranty documents.",
    fields: [
      field("performance.continuous_power", "持续功率", "Continuous power", spec.continuousPowerKW, { unit: "kW" }),
      field("performance.peak_power", "峰值功率", "Peak power", `${spec.peakPower.valueKW} kW / ${spec.peakPower.durationSeconds} s`),
      field("performance.round_trip_efficiency", "初始往返能量效率", "Initial round-trip efficiency", spec.roundTripEfficiencyPct, { unit: "%" }),
      field("performance.initial_internal_resistance", "初始内阻", "Initial internal resistance", seed.performanceAndDurability.initialInternalResistanceMilliOhm, { unit: "mΩ" }),
      field("performance.cycle_life", "预期循环寿命", "Expected cycle life", spec.cycleLife.cycles, { unit: "次" }),
      field("performance.test_basis", "循环寿命参考条件", "Cycle-life reference conditions", `${spec.cycleLife.depthOfDischargePct}% DoD，${spec.cycleLife.temperatureC} °C`),
      field("performance.calendar_life", "预期日历寿命", "Expected calendar life", spec.calendarLifeYears, { unit: "年" }),
      field("performance.warranty", "演示质保条件", "Demo warranty condition", `${spec.warranty.years} 年或 ${spec.warranty.cycles} 次循环`, { requirement: "DEMO_EXTENSION" }),
      field("performance.charge_temperature", "充电温度范围", "Charge temperature range", `${spec.chargeTemperatureC.min}–${spec.chargeTemperatureC.max}`, { unit: "°C" }),
      field("performance.discharge_temperature", "放电温度范围", "Discharge temperature range", `${spec.dischargeTemperatureC.min}–${spec.dischargeTemperatureC.max}`, { unit: "°C" }),
      field("performance.self_discharge", "月自放电率", "Monthly self-discharge", `≤${spec.selfDischargePctPerMonth}`, { unit: "%" }),
    ],
  },
  {
    code: "due_diligence",
    labelZh: "供应链尽职调查",
    labelEn: "Supply-chain due diligence",
    introZh: "仅展示演示政策记录，不虚构第三方审核。",
    introEn: "Only a demonstration policy record is shown; no third-party audit is fabricated.",
    fields: [
      field("due_diligence.policy", "尽职调查政策状态", "Due-diligence policy status", "演示政策记录", { verification: "SELF_DECLARED" }),
      field("due_diligence.traceability", "供应链追溯范围", "Supply-chain traceability scope", "关键材料至电池模块装配的示例链路", { verification: "SYNTHETIC_DEMO" }),
      field("due_diligence.third_party", "第三方审核状态", "Third-party assurance", "未进行第三方验证", { verification: "NOT_AVAILABLE" }),
      field("due_diligence.report", "公开报告", "Public report", "演示文件占位", { verification: "NOT_AVAILABLE" }),
    ],
  },
];

export const INDUSTRIAL_DEMO_DISASSEMBLY_ZH = [
  "隔离电池并确认无充放电电流。",
  "通过 BMS 读取 SOC 和故障状态。",
  "将 SOC 降至安全运输或维修范围。",
  "断开外部直流端子和通信接口。",
  "拆除上盖及绝缘防护件。",
  "断开母排和采样线束。",
  "拆除 BMS 和辅助电子部件。",
  "按顺序移除电芯。",
  "对电芯、电子部件、铜铝材料和外壳分类处理。",
];

export const INDUSTRIAL_DEMO_DISASSEMBLY_EN = [
  "Isolate the battery and confirm that no charge or discharge current is present.",
  "Read SOC and fault status through the BMS.",
  "Reduce SOC to the safe transport or service range.",
  "Disconnect external DC terminals and communication interfaces.",
  "Remove the upper cover and insulation barriers.",
  "Disconnect busbars and sensing harnesses.",
  "Remove the BMS and auxiliary electronics.",
  "Remove cells in the prescribed sequence.",
  "Separate cells, electronics, copper/aluminium parts and enclosure for treatment.",
];

export const INDUSTRIAL_DEMO_METRICS = seed.operatingMetrics.map((metric) => ({
  ...metric,
  accessLevel: "LEGITIMATE_INTEREST" as DemoAccess,
  granularity: "METRIC" as DemoGranularity,
  dataBehavior: "DYNAMIC" as const,
}));

export const INDUSTRIAL_DEMO_DOCUMENTS = seed.conformityDocuments.map((document) => ({
  ...document,
  href: `/api/demo-document?file=${encodeURIComponent(document.file)}`,
  accessLevel: document.type === "EU_DECLARATION_OF_CONFORMITY" ? "PUBLIC" as DemoAccess : "AUTHORITY_ONLY" as DemoAccess,
  verificationStatus: "NOT_AVAILABLE" as DemoVerification,
}));

export function isIndustrialDemoIdentifier(identifier: string | null | undefined) {
  return [
    INDUSTRIAL_DEMO.slug,
    INDUSTRIAL_DEMO.productSlug,
    INDUSTRIAL_DEMO.dppId,
    seed.passportMetadata.itemIdentifier,
  ].includes(String(identifier || ""));
}

export function industrialDemoLegacyData(productOverride: Record<string, unknown> = {}) {
  return {
    industrialBatteryDemo: true,
    product: {
      id: "industrial-battery-demo",
      name: seed.productIdentity.nameEn,
      name_zh: seed.productIdentity.nameZh,
      sku: INDUSTRIAL_DEMO.sku,
      brand: "GreenVault Demo",
      category: "Industrial battery",
      subcategory: "Stationary industrial battery above 2 kWh",
      sector_code: "battery",
      category_code: "industrial_battery",
      subcategory_code: "stationary_above_2kwh",
      dpp_profile_key: INDUSTRIAL_DEMO.profileKey,
      dpp_id: INDUSTRIAL_DEMO.dppId,
      public_slug: INDUSTRIAL_DEMO.slug,
      status: "published",
      current_version: "v1.0.0-demo",
      main_image: INDUSTRIAL_DEMO.image,
      description: "Synthetic industrial battery passport demonstration for a stationary 14.336 kWh LFP energy-storage module.",
      description_zh: "固定式 14.336 kWh 磷酸铁锂储能模块的合成工业电池护照演示。",
      updated_at: "2026-07-20T10:30:00Z",
      ...productOverride,
    },
    batteryPresentation: {
      modelIdentifier: seed.passportMetadata.modelIdentifier,
      chemistry: "LFP",
      massKg: spec.weightKg,
      ratedCapacityAh: spec.ratedCapacityAh,
      nominalVoltageV: spec.nominalVoltageV,
      maximumPowerW: spec.continuousPowerKW * 1000,
      initialEfficiencyPercent: spec.roundTripEfficiencyPct,
      expectedCalendarYears: spec.calendarLifeYears,
      expectedCycles: spec.cycleLife.cycles,
      idleTemperatureMinC: spec.storageTemperatureC.min,
      idleTemperatureMaxC: spec.storageTemperatureC.max,
      carbonFootprintKgCo2ePerKwh: seed.carbonFootprint.intensityKgCO2ePerKWh,
    },
  };
}

export function industrialDemoStructuredPayload() {
  return {
    ...seed,
    passportMetadata: {
      ...seed.passportMetadata,
      title: "GreenVault ESS-14.3 Digital Battery Passport",
      dppId: INDUSTRIAL_DEMO.dppId,
      upi: INDUSTRIAL_DEMO.upi,
      gtin: INDUSTRIAL_DEMO.gtin,
      sgtin: INDUSTRIAL_DEMO.sgtin,
      image: INDUSTRIAL_DEMO.image,
      lastUpdated: "2026-07-20T10:30:00Z",
    },
    fieldGroups: INDUSTRIAL_DEMO_FIELD_GROUPS,
    conformityDocuments: INDUSTRIAL_DEMO_DOCUMENTS,
    disassemblyAndSafety: {
      authorisedPersonnelOnly: true,
      instructionZh: INDUSTRIAL_DEMO_DISASSEMBLY_ZH,
      instructionEn: INDUSTRIAL_DEMO_DISASSEMBLY_EN,
      risks: ["Electric shock", "Short circuit", "Thermal runaway", "Residual energy"],
      verificationStatus: "SYNTHETIC_DEMO",
      accessLevel: "LEGITIMATE_INTEREST",
    },
    operatingMetrics: INDUSTRIAL_DEMO_METRICS,
    regulatoryReferences: [
      {
        reference: "Regulation (EU) 2023/1542, Article 77 and Annex XIII",
        status: "REGULATORY_BASELINE",
      },
      {
        reference: "BatteryPass-Ready Data Attribute Longlist v1.3",
        status: "IMPLEMENTATION_REFERENCE_NOT_LAW",
      },
    ],
    completeness: {
      requiredFieldCompletenessPct: 78,
      supportingDocumentCompletenessPct: 0,
      verificationCoveragePct: 0,
      registryReadinessPct: 25,
      complianceClaim: false,
    },
  };
}
