import type { DppAudience } from "./audienceProjection";

export type PassportLocale = "en" | "zh";
export type PreviewRole = "PUBLIC" | "REPAIRER" | "RECYCLER" | "MANUFACTURER" | "AUTHORITY";
export type RenderType =
  | "identity" | "specifications" | "carbon" | "composition" | "compliance"
  | "repair" | "disassembly" | "circularity" | "documents" | "timeline"
  | "bms" | "provenance" | "key-value";

export type ProjectedDpp = {
  passportId: string;
  passportIdentifier: string;
  version: number;
  schemaVersion: string;
  payloadHash: string | null;
  publishedAt: string;
  status: string;
  audience: DppAudience;
  fields: Array<{
    fieldCode: string;
    value: unknown;
    unit: string | null;
    verificationStatus?: string;
    provenance?: Record<string, unknown>;
  }>;
};

export type PresentationMetadata = {
  section: string;
  label: { en: string; zh: string };
  renderType: RenderType;
  order: number;
  mobilePriority: "high" | "standard" | "low";
  emptyBehavior: "hide" | "state";
};

export type PresentedField = ProjectedDpp["fields"][number] & {
  metadata: PresentationMetadata;
};

export type DppViewModel = {
  passport: Omit<ProjectedDpp, "fields">;
  brand: string;
  productName: string;
  modelCode: string;
  category: string;
  synthetic: boolean;
  fields: PresentedField[];
  sections: Array<{ id: string; fields: PresentedField[] }>;
  metrics: Array<{ key: string; value: unknown; unit?: string; label: string }>;
};

export const ROLE_TO_AUDIENCE: Record<PreviewRole, DppAudience> = {
  PUBLIC: "PUBLIC",
  REPAIRER: "LEGITIMATE_INTEREST",
  RECYCLER: "LEGITIMATE_INTEREST",
  MANUFACTURER: "INTERNAL",
  AUTHORITY: "AUTHORITY",
};

export const SECTION_ORDER = [
  "overview", "specifications", "sustainability", "performance", "compliance",
  "repair", "circularity", "documents", "lifecycle", "passport", "provenance", "technical",
] as const;

const metadata: Record<string, PresentationMetadata> = {
  "demo.warning": meta("overview", "Demo classification", "演示数据分类", "key-value", 0, "high"),
  "identity.product": meta("overview", "Product information", "产品信息", "identity", 10, "high"),
  "identity.item": meta("overview", "Item identity", "产品实例标识", "identity", 20, "high"),
  "enterprise.organisations": meta("overview", "Organisations", "企业主体", "identity", 30, "standard"),
  "technical.specification": meta("specifications", "Technical specifications", "技术规格", "specifications", 10, "high"),
  "performance.durability": meta("performance", "Performance & durability", "性能与耐久性", "specifications", 10, "standard"),
  "bms.snapshot": meta("performance", "Latest available BMS snapshot", "最新可用 BMS 快照", "bms", 5, "high"),
  "sustainability.carbon-footprint": meta("sustainability", "Carbon footprint", "碳足迹", "carbon", 10, "high"),
  "sustainability.recycled-content": meta("sustainability", "Recycled content", "再生材料含量", "composition", 20, "standard"),
  "sustainability.materials": meta("sustainability", "Materials & critical raw materials", "材料与关键原材料", "composition", 30, "standard"),
  "compliance.synthetic": meta("compliance", "Compliance & safety", "合规与安全", "compliance", 10, "high"),
  "repair.service": meta("repair", "Repair & service", "维修与服务", "repair", 10, "high"),
  "repair.disassembly": meta("repair", "Disassembly", "拆解", "disassembly", 20, "standard"),
  "end-of-life": meta("circularity", "End-of-life & circularity", "报废与循环利用", "circularity", 10, "high"),
  "warranty.demo": meta("repair", "Warranty", "质保", "key-value", 30, "standard"),
  "documents.public": meta("documents", "Public documents", "公开文档", "documents", 10, "standard"),
  "documents.repairer": meta("documents", "Service documents", "服务文档", "documents", 20, "standard"),
  "lifecycle.events": meta("lifecycle", "Lifecycle", "生命周期", "timeline", 10, "standard"),
  "provenance.synthetic": meta("provenance", "Data provenance", "数据来源", "provenance", 10, "standard"),
  "due-diligence.demo": meta("compliance", "Due diligence", "尽职调查", "key-value", 20, "low"),
  "access.policy-demo": meta("technical", "Access policy", "访问策略", "key-value", 20, "low"),
  "manufacturing.supply-chain": meta("technical", "Manufacturing & supply chain", "制造与供应链", "key-value", 30, "low"),
};

function meta(
  section: string,
  en: string,
  zh: string,
  renderType: RenderType,
  order: number,
  mobilePriority: PresentationMetadata["mobilePriority"],
): PresentationMetadata {
  return { section, label: { en, zh }, renderType, order, mobilePriority, emptyBehavior: "hide" };
}

export function humanizeFieldKey(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace(/\bDpp\b/g, "DPP")
    .replace(/\bGtin\b/g, "GTIN")
    .replace(/\bSku\b/g, "SKU")
    .replace(/\bBms\b/g, "BMS")
    .replace(/\bSoc\b/g, "SOC")
    .replace(/\bSoh\b/g, "SOH")
    .replace(/\bCo2e\b/g, "CO₂e")
    .replace(/\bPct\b/g, "%");
}

export function presentationMetadataFor(fieldCode: string): PresentationMetadata {
  return metadata[fieldCode] || meta("technical", humanizeFieldKey(fieldCode), humanizeFieldKey(fieldCode), "key-value", 999, "low");
}

export function businessState(value: unknown, locale: PassportLocale): string | null {
  const state = typeof value === "string" ? value.toUpperCase() : "";
  const states: Record<string, [string, string]> = {
    UNKNOWN: ["Unknown", "未知"],
    NOT_PROVIDED: ["Not provided", "未提供"],
    NOT_APPLICABLE: ["Not applicable", "不适用"],
    REDACTED: ["Restricted", "受限"],
    NOT_AUTHORIZED: ["Restricted", "无权访问"],
    UNVERIFIED: ["Unverified", "未验证"],
    VERIFIED: ["Verified", "已验证"],
    PUBLISHED: ["Published", "已发布"],
    PUBLIC: ["Public", "公开"],
    SYNTHETIC_DEMO: ["Synthetic demo data", "合成演示数据"],
    WITHDRAWN: ["Withdrawn", "已撤回"],
    NO_CURRENT_VERSION: ["Unavailable", "暂无可用版本"],
    RESOLVER_NOT_FOUND: ["Unavailable", "无法解析"],
  };
  const translated = states[state];
  return translated ? translated[locale === "zh" ? 1 : 0] : null;
}

export function formatValue(value: unknown, locale: PassportLocale, unit?: string | null) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const localized = value as Record<string, unknown>;
    if (typeof localized[locale] === "string") return String(localized[locale]);
    if (typeof localized.en === "string" || typeof localized.zh === "string") return String(localized[locale] || localized.en || localized.zh);
    return "";
  }
  const state = businessState(value, locale);
  if (state) return state;
  if (value === null || value === undefined || value === "") return locale === "zh" ? "未提供" : "Not provided";
  if (typeof value === "boolean") return value ? (locale === "zh" ? "是" : "Yes") : (locale === "zh" ? "否" : "No");
  if (typeof value === "number") return `${Number.isInteger(value) && value >= 1900 && value <= 2100 ? String(value) : new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-GB", { maximumFractionDigits: 3 }).format(value)}${unit ? `${unit === "%" ? "" : " "}${unit}` : ""}`;
  if (locale === "zh" && typeof value === "string") {
    const translated: Record<string, string> = {
      "Lithium-ion": "锂离子", "E-bike battery pack": "电动自行车电池包", "Industrial energy storage": "工业储能",
      "Textile garment": "纺织品", "Organic cotton": "有机棉", "Consumer electronics": "消费电子", "Recycled ABS": "再生 ABS",
      "Wood-plastic flooring": "木塑地板", "Alloy steel": "合金钢", "Replaceable bits": "可更换批头", "Hand tool": "手动工具",
      "10°C to 25°C": "10°C 至 25°C", "-10°C to 45°C": "-10°C 至 45°C", "0°C to 45°C": "0°C 至 45°C", "Bluetooth": "蓝牙",
    };
    if (translated[value]) return translated[value];
  }
  return String(value);
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function pathValue(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => record(current)[key], source);
}

export function normalizeDppProjection(projection: ProjectedDpp, locale: PassportLocale): DppViewModel {
  const { fields: projectedFields, ...passport } = projection;
  const fields = projectedFields.map((field) => ({ ...field, metadata: presentationMetadataFor(field.fieldCode) }));
  const byCode = new Map(fields.map((field) => [field.fieldCode, field.value]));
  const identity = record(byCode.get("identity.product"));
  const technical = record(byCode.get("technical.specification"));
  const bms = record(byCode.get("bms.snapshot"));
  const performance = record(byCode.get("performance.durability"));
  const metricConfig = [
    ["voltage", technical, "nominal_voltage_v", locale === "zh" ? "额定电压" : "Nominal voltage", "V"],
    ["capacity", technical, "rated_capacity_ah", locale === "zh" ? "额定容量" : "Rated capacity", "Ah"],
    ["energy-capacity", technical, "rated_capacity_wh", locale === "zh" ? "额定能量" : "Rated energy", "Wh"],
    ["energy-kwh", technical, "energy_kwh", locale === "zh" ? "储能容量" : "Energy capacity", "kWh"],
    ["energy", technical, "rated_energy_wh", locale === "zh" ? "额定能量" : "Rated energy", "Wh"],
    ["power", technical, "rated_power_kw", locale === "zh" ? "额定功率" : "Rated power", "kW"],
    ["cycle-life", technical, "cycle_life", locale === "zh" ? "循环寿命" : "Cycle life", ""],
    ["chemistry", technical, "chemistry", locale === "zh" ? "化学体系" : "Chemistry", ""],
    ["soc", bms, "soc_pct", "SOC", "%"],
    ["soh", bms, "soh_pct", "SOH", "%"],
    ["cycles", bms, "cycle_count", locale === "zh" ? "循环次数" : "Cycle count", ""],
    ["soc-durability", performance, "state_of_charge_pct", "SOC", "%"],
    ["soh-durability", performance, "state_of_health_pct", "SOH", "%"],
    ["cycles-durability", performance, "cycle_count", locale === "zh" ? "循环次数" : "Cycle count", ""],
    ["warranty", technical, "warranty_months", locale === "zh" ? "质保" : "Warranty", locale === "zh" ? "个月" : "months"],
  ] as const;
  const metrics = metricConfig.flatMap(([key, source, path, label, unit]) => {
    const value = pathValue(source, path);
    return value === undefined || value === null ? [] : [{ key, value, unit, label }];
  }).filter((metric, index, all) => all.findIndex((candidate) => candidate.label === metric.label) === index);
  const sections = SECTION_ORDER.map((id) => ({
    id,
    fields: fields.filter((field) => field.metadata.section === id).sort((a, b) => a.metadata.order - b.metadata.order),
  })).filter((section) => section.fields.length > 0);
  return {
    passport,
    brand: String(identity.brand || technical.brand || "GreanLean"),
    productName: formatValue(identity.productName || technical.product_name || "Digital Product Passport", locale),
    modelCode: String(identity.modelCode || technical.model_code || ""),
    category: String(technical.product_category || ""),
    synthetic: JSON.stringify(byCode.get("demo.warning") || {}).includes("SYNTHETIC_DEMO"),
    fields,
    sections,
    metrics,
  };
}

export function safeExternalUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
