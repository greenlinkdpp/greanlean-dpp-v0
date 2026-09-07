import catalog from "../../config/battery/eu-battery-passport-datapoints-v2.0.json" with { type: "json" };
import type { AccessLevel, RequirementStatus } from "../schemaRegistry.ts";
import type { BatteryClassificationResult, BatteryFieldValue, BatteryLegalCategory } from "./catalog.ts";

export type BatteryRegulatoryStatus =
  | "mandatory"
  | "conditional"
  | "optional"
  | "future"
  | "duplicate"
  | "not_applicable";
export type BatteryDataLevel = "model" | "batch" | "individual" | "lifecycle";
export type BatteryRegulatoryAccess = "public" | "professional" | "regulator";
export type BatteryMappingQuality = "A" | "B" | "C" | "D" | "E";
export type BatteryExpertReviewStatus = "not_required" | "pending" | "confirmed" | "questioned";

export type BatteryRegulatoryField = {
  id: string;
  number: number;
  nameEn: string;
  nameZh: string;
  legalSource: string;
  chapter: string;
  status: Record<"ev" | "lmt" | "industrial", BatteryRegulatoryStatus>;
  sourceNote: string;
  dataLevel: BatteryDataLevel;
  dataType: "string" | "integer" | "decimal" | "boolean" | "date" | "datetime" | "uri" | "object" | "array";
  unit: string | null;
  access: BatteryRegulatoryAccess;
  dynamic: boolean;
  canonicalFieldCode: string;
  legacyFieldCodes: string[];
  mappingQuality: BatteryMappingQuality;
  fieldOrigin: "eu_guidance_v2" | "greanlean_extension";
  evidenceRequired: boolean;
  expertReviewStatus: BatteryExpertReviewStatus;
  expertReviewNote: string | null;
};

export type BatteryRegulatoryChapter = {
  code: string;
  number: number;
  labelEn: string;
  labelZh: string;
};

export const EU_BATTERY_PASSPORT_FIELDS = catalog.fields as BatteryRegulatoryField[];
export const EU_BATTERY_PASSPORT_CHAPTERS = catalog.chapters as BatteryRegulatoryChapter[];
export const EU_BATTERY_PASSPORT_METADATA = {
  catalogVersion: catalog.catalogVersion,
  sourceName: catalog.sourceName,
  sourceVersion: catalog.sourceVersion,
  sourceDate: catalog.sourceDate,
  regulation: catalog.regulation,
  disclaimerEn: catalog.disclaimerEn,
  disclaimerZh: catalog.disclaimerZh,
};

const SOURCE_NOTE_ZH: Record<string, string> = {
  "Mandatory for EV, LMT and industrial batteries.": "电动汽车电池、轻型交通工具电池和工业电池均为必填。",
  "Optional; fill when the data is available.": "可选字段；具备可靠数据时填写。",
  "Mandatory; the applicable identifying element depends on passport granularity.": "必填；具体标识要素取决于护照采用型号级、批次级还是单体级粒度。",
  "Geographical location of the battery manufacturing plant.": "填写电池制造工厂的地理位置。",
  "Mandatory static capacity declaration.": "必填的静态额定容量声明。",
  "Mandatory where concentration exceeds 0.1% weight by weight.": "相关物质质量浓度超过 0.1% 时必须填写。",
  "Do not fill/display; repeats chemistry, hazardous substances and critical raw materials already required.": "不填写且不展示；该项与已要求的化学体系、有害物质和关键原材料信息重复。",
  "Not to be filled/displayed as of February 2027; format is still to be specified in an implementing act.": "截至 2027 年 2 月暂不填写或展示；数据格式仍待实施法案明确。",
  "Not to be filled/displayed as of February 2027; Article 48(1) applies from August 2027.": "截至 2027 年 2 月暂不填写或展示；第 48(1) 条自 2027 年 8 月起适用。",
  "Not to be filled/displayed as of February 2027; apply with Article 8 and the relevant delegated act.": "截至 2027 年 2 月暂不填写或展示；后续依据第 8 条及相关授权法案执行。",
  "Do not fill/display; repeats data point 11.": "不填写且不展示；该项与数据点 11 重复。",
  "For industrial batteries, applicable where lifetime can be expressed in cycles.": "对工业电池，仅在寿命可按循环次数表达时适用。",
  "Mandatory for EV; not to be filled/displayed for LMT and industrial batteries.": "电动汽车电池必填；轻型交通工具电池和工业电池不填写或展示。",
  "Reference-test temperature range is mandatory for all three categories.": "三类电池均须填写参考测试温度范围。",
  "Applicable where a commercial warranty is envisaged.": "计划提供商业质保时适用。",
  "For industrial batteries, applicable only to relevant battery designs.": "对工业电池，仅在该技术参数与具体电池设计相关时适用。",
  "Applicable where the cadmium or lead threshold requires the symbol.": "镉或铅含量达到法规规定的标识阈值时适用。",
  "Declaration referred to in Article 18.": "填写第 18 条所述声明。",
  "Information laid down in Article 74(1)(a) to (f).": "填写第 74(1)(a) 至 (f) 项规定的信息。",
  "Not to be filled/displayed as of February 2027; application provisions are on hold pending Omnibus adoption.": "截至 2027 年 2 月暂不填写或展示；适用条款等待 Omnibus 法案通过。",
  "Include exploded diagrams, disassembly sequence, fasteners, tools, damage warnings, cell count and layout.": "应包括爆炸图、拆解顺序、紧固件、所需工具、损坏风险提示、电芯数量及布局。",
  "Covers Regulation requirements and delegated or implementing acts adopted under it.": "覆盖《电池法规》及其后续授权法案或实施法案规定的要求。",
  "Same concept as data point 11, but recorded dynamically; industrial batteries where applicable.": "与数据点 11 概念相同，但作为动态数据记录；工业电池在适用时填写。",
  "Industrial batteries where applicable.": "工业电池在适用时填写。",
  "Applicable where this technical parameter is relevant.": "该技术参数与产品设计或使用场景相关时适用。",
  "Except non-cycle applications; industrial batteries where applicable.": "非循环应用除外；工业电池在适用时填写。",
  "Not displayed for EV; mandatory for LMT; industrial batteries where applicable.": "电动汽车电池不展示；轻型交通工具电池必填；工业电池在适用时填写。",
  "Not displayed for EV; mandatory for LMT; industrial batteries where applicable and possible.": "电动汽车电池不展示；轻型交通工具电池必填；工业电池在适用且技术可行时填写。",
  "Allowed values: original, repurposed, re-used, remanufactured or waste.": "允许值为：原始使用、梯次利用、再使用、再制造或废弃。",
  "Applicable where this information is relevant and recorded.": "该信息与产品相关且已被记录时适用。",
  "Applicable where a negative event has occurred.": "发生影响电池状态的负面事件时适用。",
  "Applicable where operating environmental conditions are recorded.": "已记录运行环境条件时适用。",
  "Applicable where state of charge is periodically recorded.": "周期性记录荷电状态时适用。",
};

export function localizedRegulatorySourceNote(field: BatteryRegulatoryField, locale: "en" | "zh") {
  return locale === "zh" ? SOURCE_NOTE_ZH[field.sourceNote] || field.sourceNote : field.sourceNote;
}

function scopedCategory(classification: BatteryClassificationResult): "ev" | "lmt" | "industrial" | null {
  return ["ev", "lmt", "industrial"].includes(classification.legalCategory)
    ? classification.legalCategory as "ev" | "lmt" | "industrial"
    : null;
}

export function regulatoryStatusForField(
  field: BatteryRegulatoryField,
  classification: BatteryClassificationResult,
): BatteryRegulatoryStatus {
  const category = scopedCategory(classification);
  return category ? field.status[category] : "not_applicable";
}

export function regulatoryFieldsForBattery(
  classification: BatteryClassificationResult,
  options: {
    chapter?: string;
    includeExcluded?: boolean;
    dynamic?: boolean;
  } = {},
) {
  return EU_BATTERY_PASSPORT_FIELDS.filter((field) => {
    if (options.chapter && field.chapter !== options.chapter) return false;
    if (options.dynamic !== undefined && field.dynamic !== options.dynamic) return false;
    if (options.includeExcluded) return true;
    return !["future", "duplicate", "not_applicable"].includes(
      regulatoryStatusForField(field, classification),
    );
  });
}

export function statusCountsTowardsCompleteness(status: BatteryRegulatoryStatus) {
  return status === "mandatory" || status === "conditional";
}

export function requirementStatusForRegulatoryStatus(status: BatteryRegulatoryStatus): RequirementStatus {
  if (status === "mandatory") return "CONFIRMED_MANDATORY";
  if (status === "conditional") return "CONDITIONAL_MANDATORY";
  if (status === "optional") return "VOLUNTARY";
  return "NOT_APPLICABLE";
}

export function accessLevelForRegulatoryAccess(access: BatteryRegulatoryAccess): AccessLevel {
  if (access === "professional") return "LEGITIMATE_INTEREST";
  if (access === "regulator") return "AUTHORITY_ONLY";
  return "PUBLIC";
}

export function dataGranularityForLevel(level: BatteryDataLevel) {
  if (level === "batch") return "BATCH" as const;
  if (level === "individual" || level === "lifecycle") return "ITEM" as const;
  return "MODEL" as const;
}

export function fieldValueForRegulatoryField(
  field: BatteryRegulatoryField,
  values: Record<string, BatteryFieldValue>,
) {
  const candidateCodes = [field.canonicalFieldCode, ...field.legacyFieldCodes];
  for (const fieldCode of candidateCodes) {
    if (values[fieldCode] !== undefined) return { fieldCode, value: values[fieldCode] };
  }
  return { fieldCode: field.canonicalFieldCode, value: undefined };
}

export function fieldForCanonicalCode(fieldCode: string) {
  return EU_BATTERY_PASSPORT_FIELDS.find((field) => field.canonicalFieldCode === fieldCode);
}

export function categoriesCoveredByGuidance(): BatteryLegalCategory[] {
  return ["ev", "lmt", "industrial"];
}
