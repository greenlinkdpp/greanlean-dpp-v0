import longlist from "../../config/battery/battery-pass-ready-longlist-v1.3.json" with { type: "json" };
import type { AccessLevel, DataBehavior, DataGranularity, RequirementStatus } from "../schemaRegistry.ts";

export type BatteryLegalCategory = "ev" | "lmt" | "industrial" | "portable" | "sli" | "other";
export type BatterySchemaCode =
  | "battery.ev"
  | "battery.lmt"
  | "battery.industrial.without_bms"
  | "battery.industrial.non_stationary"
  | "battery.industrial.stationary"
  | "battery.portable"
  | "battery.sli"
  | "battery.other";
export type BatteryPassportApplicability = "REQUIRED" | "NOT_REQUIRED" | "CONDITIONAL" | "TBD";
export type BatteryWorkflowStepCode =
  | "identity"
  | "manufacturing"
  | "materials"
  | "sustainability"
  | "performance"
  | "safety"
  | "repair"
  | "health"
  | "lifecycle"
  | "evidence";

export type BatteryCatalogField = {
  sequence: number;
  fieldCode: string;
  groupCode: string;
  groupLabelEn: string;
  groupLabelZh: string;
  subgroupLabelEn: string | null;
  labelEn: string;
  labelZh: string;
  descriptionEn: string;
  instructionZh: string;
  requirementsEn: string | null;
  recommendationsEn: string | null;
  regulatoryReference: string | null;
  unit: string | null;
  sourceDataFormat: string | null;
  dataType: "string" | "integer" | "decimal" | "boolean" | "date" | "datetime" | "uri" | "array";
  sourceAccessRights: string | null;
  accessLevel: AccessLevel;
  dataBehavior: DataBehavior;
  updateRequirement: string | null;
  sourceGranularity: string | null;
  dataGranularity: DataGranularity;
  componentApplicability: { pack: boolean; module: boolean; cell: boolean };
  categoryRequirementStatus: Record<string, RequirementStatus>;
  jsonPointers: Record<string, string | null>;
  workflowStep: BatteryWorkflowStepCode;
  evidenceRequired: boolean;
  sourceSuggestionZh: string;
};

export type BatteryCategoryDefinition = {
  code: BatteryLegalCategory;
  labelEn: string;
  labelZh: string;
  passportRuleZh: string;
};

export type BatteryClassificationInput = {
  legalCategory: BatteryLegalCategory;
  capacityKwh?: number | null;
  stationary?: boolean | null;
  bmsPresent?: boolean | null;
};

export type BatteryClassificationResult = {
  legalCategory: BatteryLegalCategory;
  technicalVariant: string | null;
  schemaCode: BatterySchemaCode;
  applicability: BatteryPassportApplicability;
  reasonEn: string;
  reasonZh: string;
};

export type BatteryFieldValue = {
  value: unknown;
  dataStatus?: "missing" | "pending" | "declared" | "verified" | "not_applicable";
  evidenceStatus?: "missing" | "declared" | "uploaded" | "verified" | "rejected" | "not_applicable";
  verificationStatus?: "unverified" | "in_review" | "verified" | "rejected";
  expertReviewStatus?: "not_required" | "pending" | "confirmed" | "questioned";
  expertReviewNote?: string | null;
  sourceType?: string | null;
  sourceReference?: string | null;
  observedAt?: string | null;
  lastUpdated?: string | null;
  evidenceCount?: number;
  fieldOrigin?: "eu_guidance_v2" | "batterypass_ready_v1_3" | "greanlean_extension" | "legacy";
};

export const BATTERY_CATEGORIES: BatteryCategoryDefinition[] = [
  { code: "ev", labelEn: "Electric vehicle battery", labelZh: "电动汽车电池", passportRuleZh: "属于电池护照法定适用类别。" },
  { code: "lmt", labelEn: "Light means of transport battery", labelZh: "轻型交通工具电池（LMT）", passportRuleZh: "属于电池护照法定适用类别。" },
  { code: "industrial", labelEn: "Industrial battery", labelZh: "工业电池", passportRuleZh: "额定容量超过 2kWh 时适用电池护照。" },
  { code: "portable", labelEn: "Portable battery", labelZh: "便携式电池", passportRuleZh: "当前不因便携式类别本身自动适用电池护照。" },
  { code: "sli", labelEn: "Starting, lighting and ignition battery", labelZh: "启动、照明和点火电池（SLI）", passportRuleZh: "当前不因 SLI 类别本身自动适用电池护照。" },
  { code: "other", labelEn: "Other configurable battery", labelZh: "其他可配置电池", passportRuleZh: "需要人工确认法定类别和适用规则。" },
];

export const BATTERY_WORKFLOW_STEPS: Array<{
  code: BatteryWorkflowStepCode;
  number: number;
  labelEn: string;
  labelZh: string;
}> = [
  { code: "identity", number: 1, labelEn: "Product and battery identity", labelZh: "产品及电池身份" },
  { code: "manufacturing", number: 2, labelEn: "Manufacturing information", labelZh: "制造信息" },
  { code: "materials", number: 3, labelEn: "Materials and composition", labelZh: "材料与组成" },
  { code: "sustainability", number: 4, labelEn: "Carbon footprint and sustainability", labelZh: "碳足迹与可持续性" },
  { code: "performance", number: 5, labelEn: "Performance and durability", labelZh: "性能与耐久性" },
  { code: "safety", number: 6, labelEn: "Compliance and safety", labelZh: "合规与安全" },
  { code: "repair", number: 7, labelEn: "Components, dismantling and repair", labelZh: "组件、拆解与维修" },
  { code: "health", number: 8, labelEn: "Battery health and dynamic data", labelZh: "电池健康与动态数据" },
  { code: "lifecycle", number: 9, labelEn: "Lifecycle status and events", labelZh: "生命周期状态与事件" },
  { code: "evidence", number: 10, labelEn: "Data sources and evidence", labelZh: "数据来源与证据" },
];

export const BATTERY_FIELD_CATALOG = longlist.fields as BatteryCatalogField[];
export const BATTERY_CATALOG_METADATA = {
  catalogVersion: longlist.catalogVersion,
  sourceName: longlist.sourceName,
  sourceVersion: longlist.sourceVersion,
  sourceDate: longlist.sourceDate,
  sourceSha256: longlist.sourceSha256,
  disclaimerZh: longlist.disclaimerZh,
};

export function classifyBattery(input: BatteryClassificationInput): BatteryClassificationResult {
  if (input.legalCategory === "ev") {
    return { legalCategory: "ev", technicalVariant: null, schemaCode: "battery.ev", applicability: "REQUIRED", reasonEn: "Electric vehicle batteries are in the battery-passport scope.", reasonZh: "电动汽车电池属于电池护照法定适用范围。" };
  }
  if (input.legalCategory === "lmt") {
    return { legalCategory: "lmt", technicalVariant: null, schemaCode: "battery.lmt", applicability: "REQUIRED", reasonEn: "LMT batteries are in the battery-passport scope.", reasonZh: "轻型交通工具电池属于电池护照法定适用范围。" };
  }
  if (input.legalCategory === "industrial") {
    const technicalVariant = input.bmsPresent === false ? "without_bms" : input.stationary ? "stationary_above_2kwh" : "non_stationary_above_2kwh";
    const schemaCode: BatterySchemaCode = input.bmsPresent === false
      ? "battery.industrial.without_bms"
      : input.stationary
        ? "battery.industrial.stationary"
        : "battery.industrial.non_stationary";
    if (input.capacityKwh == null || !Number.isFinite(input.capacityKwh)) {
      return { legalCategory: "industrial", technicalVariant, schemaCode, applicability: "CONDITIONAL", reasonEn: "Industrial-battery passport applicability depends on confirming capacity above 2 kWh.", reasonZh: "工业电池是否适用电池护照，需要先确认额定容量是否超过 2kWh。" };
    }
    return input.capacityKwh > 2
      ? { legalCategory: "industrial", technicalVariant, schemaCode, applicability: "REQUIRED", reasonEn: "Industrial batteries above 2 kWh are in the battery-passport scope.", reasonZh: "额定容量超过 2kWh 的工业电池属于电池护照适用范围。" }
      : { legalCategory: "industrial", technicalVariant, schemaCode, applicability: "NOT_REQUIRED", reasonEn: "This industrial battery is not above the 2 kWh passport threshold.", reasonZh: "该工业电池未超过 2kWh 的电池护照适用阈值。" };
  }
  if (input.legalCategory === "portable") {
    return { legalCategory: "portable", technicalVariant: null, schemaCode: "battery.portable", applicability: "NOT_REQUIRED", reasonEn: "Portable batteries are not automatically in the current battery-passport scope.", reasonZh: "便携式电池目前不因该类别本身自动进入电池护照适用范围。" };
  }
  if (input.legalCategory === "sli") {
    return { legalCategory: "sli", technicalVariant: null, schemaCode: "battery.sli", applicability: "NOT_REQUIRED", reasonEn: "SLI batteries are not automatically in the current battery-passport scope.", reasonZh: "SLI 电池目前不因该类别本身自动进入电池护照适用范围。" };
  }
  return { legalCategory: "other", technicalVariant: null, schemaCode: "battery.other", applicability: "TBD", reasonEn: "The legal category and passport rule require manual confirmation.", reasonZh: "需要人工确认法定类别及电池护照适用规则。" };
}

export function requirementStatusForField(field: BatteryCatalogField, classification: BatteryClassificationResult) {
  if (classification.schemaCode === "battery.industrial.without_bms") {
    return field.categoryRequirementStatus["battery.industrial.non_stationary"] || "TBD";
  }
  return field.categoryRequirementStatus[classification.schemaCode] || "TBD";
}

export function fieldsForBattery(
  classification: BatteryClassificationResult,
  options: { includeNotApplicable?: boolean; workflowStep?: BatteryWorkflowStepCode } = {},
) {
  return BATTERY_FIELD_CATALOG.filter((field) => {
    if (options.workflowStep && field.workflowStep !== options.workflowStep) return false;
    return options.includeNotApplicable || requirementStatusForField(field, classification) !== "NOT_APPLICABLE";
  });
}

export function hasBatteryFieldValue(value: BatteryFieldValue | undefined) {
  if (!value) return false;
  if (Array.isArray(value.value)) return value.value.length > 0;
  if (value.value && typeof value.value === "object") return Object.keys(value.value as object).length > 0;
  return value.value !== null && value.value !== undefined && String(value.value).trim() !== "";
}
