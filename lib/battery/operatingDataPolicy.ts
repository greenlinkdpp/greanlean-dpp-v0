import type { BatteryClassificationResult, BatterySchemaCode } from "./catalog.ts";

export type BatteryOperatingCollectionMode =
  | "BMS_DAILY"
  | "CONNECTED_OR_SERVICE"
  | "SERVICE_SNAPSHOT"
  | "VOLUNTARY"
  | "MANUAL_REVIEW";

export type BatteryOperatingMetricDefinition = {
  code: string;
  labelEn: string;
  labelZh: string;
  defaultUnit: string;
  updateMode: "DAILY_SNAPSHOT" | "CUMULATIVE_SNAPSHOT" | "EVENT_COUNTER";
};

export type BatteryOperatingDataPolicy = {
  schemaCode: BatterySchemaCode;
  collectionMode: BatteryOperatingCollectionMode;
  passportOperatingDataApplies: boolean;
  bmsRequired: boolean;
  recommendedSyncHours: number | null;
  accessLevel: "LEGITIMATE_INTEREST";
  legalBasisEn: string;
  legalBasisZh: string;
  guidanceEn: string;
  guidanceZh: string;
};

export const BATTERY_OPERATING_METRICS: BatteryOperatingMetricDefinition[] = [
  { code: "REMAINING_CAPACITY", labelEn: "Remaining capacity", labelZh: "剩余容量", defaultUnit: "Ah", updateMode: "DAILY_SNAPSHOT" },
  { code: "CAPACITY_FADE", labelEn: "Capacity fade", labelZh: "容量衰减", defaultUnit: "%", updateMode: "DAILY_SNAPSHOT" },
  { code: "REMAINING_USABLE_ENERGY", labelEn: "Remaining usable energy", labelZh: "剩余可用能量", defaultUnit: "kWh", updateMode: "DAILY_SNAPSHOT" },
  { code: "SOCE", labelEn: "State of certified energy", labelZh: "认证能量状态", defaultUnit: "%", updateMode: "DAILY_SNAPSHOT" },
  { code: "SOC", labelEn: "State of charge", labelZh: "荷电状态", defaultUnit: "%", updateMode: "DAILY_SNAPSHOT" },
  { code: "REMAINING_POWER_CAPABILITY", labelEn: "Remaining power capability", labelZh: "剩余功率能力", defaultUnit: "W", updateMode: "DAILY_SNAPSHOT" },
  { code: "POWER_FADE", labelEn: "Power fade", labelZh: "功率衰减", defaultUnit: "%", updateMode: "DAILY_SNAPSHOT" },
  { code: "REMAINING_ROUND_TRIP_EFFICIENCY", labelEn: "Remaining round-trip efficiency", labelZh: "剩余往返能量效率", defaultUnit: "%", updateMode: "DAILY_SNAPSHOT" },
  { code: "ROUND_TRIP_EFFICIENCY_FADE", labelEn: "Round-trip efficiency fade", labelZh: "往返能量效率衰减", defaultUnit: "%", updateMode: "DAILY_SNAPSHOT" },
  { code: "CURRENT_SELF_DISCHARGE_RATE", labelEn: "Current self-discharge rate", labelZh: "当前自放电率", defaultUnit: "%/month", updateMode: "DAILY_SNAPSHOT" },
  { code: "SELF_DISCHARGE_EVOLUTION", labelEn: "Self-discharge evolution", labelZh: "自放电率变化", defaultUnit: "%", updateMode: "DAILY_SNAPSHOT" },
  { code: "INTERNAL_RESISTANCE_INCREASE", labelEn: "Internal resistance increase", labelZh: "内阻增长", defaultUnit: "%", updateMode: "DAILY_SNAPSHOT" },
  { code: "FULL_CYCLE_COUNT", labelEn: "Full charge-discharge cycles", labelZh: "完整充放电循环次数", defaultUnit: "cycle", updateMode: "CUMULATIVE_SNAPSHOT" },
  { code: "ENERGY_THROUGHPUT", labelEn: "Energy throughput", labelZh: "能量吞吐量", defaultUnit: "kWh", updateMode: "CUMULATIVE_SNAPSHOT" },
  { code: "CAPACITY_THROUGHPUT", labelEn: "Capacity throughput", labelZh: "容量吞吐量", defaultUnit: "Ah", updateMode: "CUMULATIVE_SNAPSHOT" },
  { code: "TEMPERATURE", labelEn: "Operating temperature", labelZh: "运行温度", defaultUnit: "°C", updateMode: "DAILY_SNAPSHOT" },
  { code: "HIGH_TEMPERATURE_DURATION", labelEn: "Time above temperature boundary", labelZh: "高于温度边界的持续时间", defaultUnit: "h", updateMode: "CUMULATIVE_SNAPSHOT" },
  { code: "LOW_TEMPERATURE_DURATION", labelEn: "Time below temperature boundary", labelZh: "低于温度边界的持续时间", defaultUnit: "h", updateMode: "CUMULATIVE_SNAPSHOT" },
  { code: "HIGH_TEMPERATURE_CHARGING_DURATION", labelEn: "Charging time above temperature boundary", labelZh: "高温边界以上充电持续时间", defaultUnit: "h", updateMode: "CUMULATIVE_SNAPSHOT" },
  { code: "LOW_TEMPERATURE_CHARGING_DURATION", labelEn: "Charging time below temperature boundary", labelZh: "低温边界以下充电持续时间", defaultUnit: "h", updateMode: "CUMULATIVE_SNAPSHOT" },
  { code: "DEEP_DISCHARGE_EVENT_COUNT", labelEn: "Deep-discharge event count", labelZh: "深度放电事件次数", defaultUnit: "count", updateMode: "EVENT_COUNTER" },
  { code: "OVERCHARGE_EVENT_COUNT", labelEn: "Overcharge event count", labelZh: "过充事件次数", defaultUnit: "count", updateMode: "EVENT_COUNTER" },
  { code: "SOH_VOLUNTARY", labelEn: "State of health", labelZh: "健康状态", defaultUnit: "%", updateMode: "DAILY_SNAPSHOT" },
];

const connectedLegalBasis = {
  legalBasisEn: "Regulation (EU) 2023/1542, Article 14 and Annex VII; passport access follows Article 77 and Annex XIII.",
  legalBasisZh: "《欧盟电池法规》(EU) 2023/1542 第14条及附件VII；护照访问权限按第77条及附件XIII执行。",
};

const policyBySchema: Record<BatterySchemaCode, Omit<BatteryOperatingDataPolicy, "schemaCode">> = {
  "battery.ev": {
    collectionMode: "BMS_DAILY",
    passportOperatingDataApplies: true,
    bmsRequired: true,
    recommendedSyncHours: 24,
    accessLevel: "LEGITIMATE_INTEREST",
    ...connectedLegalBasis,
    guidanceEn: "Collect the latest item-level values from the BMS at least daily and after material status or safety events.",
    guidanceZh: "通过 BMS 至少每日形成一次单体级最新快照，并在重要状态变化或安全事件后追加记录。",
  },
  "battery.lmt": {
    collectionMode: "BMS_DAILY",
    passportOperatingDataApplies: true,
    bmsRequired: true,
    recommendedSyncHours: 24,
    accessLevel: "LEGITIMATE_INTEREST",
    ...connectedLegalBasis,
    guidanceEn: "Collect the latest item-level values from the BMS at least daily and after material status or safety events.",
    guidanceZh: "通过 BMS 至少每日形成一次单体级最新快照，并在重要状态变化或安全事件后追加记录。",
  },
  "battery.industrial.stationary": {
    collectionMode: "BMS_DAILY",
    passportOperatingDataApplies: true,
    bmsRequired: true,
    recommendedSyncHours: 24,
    accessLevel: "LEGITIMATE_INTEREST",
    ...connectedLegalBasis,
    guidanceEn: "Collect the latest item-level values from the BMS at least daily and retain the complete append-only history.",
    guidanceZh: "通过 BMS 至少每日形成一次单体级最新快照，并完整保留只追加的历史记录。",
  },
  "battery.industrial.non_stationary": {
    collectionMode: "CONNECTED_OR_SERVICE",
    passportOperatingDataApplies: true,
    bmsRequired: false,
    recommendedSyncHours: 24,
    accessLevel: "LEGITIMATE_INTEREST",
    legalBasisEn: "Regulation (EU) 2023/1542, Article 77 and Annex XIII apply to industrial batteries above 2 kWh.",
    legalBasisZh: "额定容量超过2kWh的工业电池按《欧盟电池法规》第77条及附件XIII管理护照数据。",
    guidanceEn: "Use a BMS or equipment gateway where available; otherwise append verified service snapshots and lifecycle events.",
    guidanceZh: "具备条件时接入 BMS 或设备网关；无法自动采集时，追加经核验的维保快照和生命周期事件。",
  },
  "battery.industrial.without_bms": {
    collectionMode: "SERVICE_SNAPSHOT",
    passportOperatingDataApplies: true,
    bmsRequired: false,
    recommendedSyncHours: null,
    accessLevel: "LEGITIMATE_INTEREST",
    legalBasisEn: "Regulation (EU) 2023/1542, Article 77 and Annex XIII apply where the industrial battery exceeds 2 kWh.",
    legalBasisZh: "工业电池超过2kWh时按《欧盟电池法规》第77条及附件XIII管理护照数据。",
    guidanceEn: "Do not simulate live telemetry. Record signed commissioning, inspection, repair, repurposing and end-of-life snapshots.",
    guidanceZh: "不得伪造实时遥测；应记录投入使用、检验、维修、梯次利用和退役时的签名快照。",
  },
  "battery.portable": {
    collectionMode: "VOLUNTARY",
    passportOperatingDataApplies: false,
    bmsRequired: false,
    recommendedSyncHours: null,
    accessLevel: "LEGITIMATE_INTEREST",
    legalBasisEn: "Portable batteries are not automatically within the Article 77 battery-passport scope.",
    legalBasisZh: "便携式电池目前不因该类别本身自动进入第77条电池护照适用范围。",
    guidanceEn: "Operating data is optional. Any voluntarily collected item telemetry remains restricted and append-only.",
    guidanceZh: "运行数据为自愿记录；如采集单体遥测，仍必须按受限、只追加数据管理。",
  },
  "battery.sli": {
    collectionMode: "VOLUNTARY",
    passportOperatingDataApplies: false,
    bmsRequired: false,
    recommendedSyncHours: null,
    accessLevel: "LEGITIMATE_INTEREST",
    legalBasisEn: "SLI batteries are not automatically within the Article 77 battery-passport scope.",
    legalBasisZh: "SLI 电池目前不因该类别本身自动进入第77条电池护照适用范围。",
    guidanceEn: "Operating data is optional. Any voluntarily collected item telemetry remains restricted and append-only.",
    guidanceZh: "运行数据为自愿记录；如采集单体遥测，仍必须按受限、只追加数据管理。",
  },
  "battery.other": {
    collectionMode: "MANUAL_REVIEW",
    passportOperatingDataApplies: false,
    bmsRequired: false,
    recommendedSyncHours: null,
    accessLevel: "LEGITIMATE_INTEREST",
    legalBasisEn: "The legal category and applicable battery-passport obligations require confirmation.",
    legalBasisZh: "需要先确认法定电池类别及相应的电池护照义务。",
    guidanceEn: "Do not activate automated operating-data claims until the legal category and technical profile are confirmed.",
    guidanceZh: "在法定类别和技术配置确认前，不应启用自动运行数据合规声明。",
  },
};

export function operatingDataPolicyForBattery(classification: BatteryClassificationResult): BatteryOperatingDataPolicy {
  const base = policyBySchema[classification.schemaCode];
  if (classification.applicability === "NOT_REQUIRED" && classification.schemaCode.startsWith("battery.industrial")) {
    return {
      ...base,
      schemaCode: classification.schemaCode,
      collectionMode: "VOLUNTARY",
      passportOperatingDataApplies: false,
      bmsRequired: false,
      recommendedSyncHours: null,
      guidanceEn: "This industrial battery does not exceed the 2 kWh passport threshold. Any operating-data record is voluntary and restricted.",
      guidanceZh: "该工业电池未超过2kWh护照阈值；运行数据属于自愿记录，且仍按受限数据管理。",
    };
  }
  if (classification.applicability === "CONDITIONAL") {
    return {
      ...base,
      schemaCode: classification.schemaCode,
      collectionMode: "MANUAL_REVIEW",
      passportOperatingDataApplies: false,
      bmsRequired: false,
      recommendedSyncHours: null,
      guidanceEn: "Confirm rated energy and the technical variant before activating operating-data obligations.",
      guidanceZh: "请先确认额定能量及技术类型，再启用运行数据义务。",
    };
  }
  return { ...base, schemaCode: classification.schemaCode };
}

export function operatingDataFreshness(
  policy: BatteryOperatingDataPolicy,
  measuredAt: string | null | undefined,
  now = new Date(),
) {
  if (!policy.passportOperatingDataApplies) return { status: "NOT_APPLICABLE" as const, ageHours: null };
  if (!measuredAt) return { status: "MISSING" as const, ageHours: null };
  const ageHours = Math.max(0, (now.getTime() - new Date(measuredAt).getTime()) / 3_600_000);
  if (!policy.recommendedSyncHours) return { status: "RECORDED" as const, ageHours };
  if (ageHours <= policy.recommendedSyncHours) return { status: "CURRENT" as const, ageHours };
  if (ageHours <= policy.recommendedSyncHours * 2) return { status: "DUE" as const, ageHours };
  return { status: "OVERDUE" as const, ageHours };
}

export function validateOperatingMetricValue(metricType: string, value: number) {
  const percentageMetrics = new Set([
    "CAPACITY_FADE",
    "SOCE",
    "SOC",
    "POWER_FADE",
    "REMAINING_ROUND_TRIP_EFFICIENCY",
    "ROUND_TRIP_EFFICIENCY_FADE",
    "CURRENT_SELF_DISCHARGE_RATE",
    "SELF_DISCHARGE_EVOLUTION",
    "INTERNAL_RESISTANCE_INCREASE",
    "SOH_VOLUNTARY",
  ]);
  if (percentageMetrics.has(metricType) && (value < 0 || value > 100)) return false;
  if (metricType === "TEMPERATURE" && (value < -100 || value > 200)) return false;
  if (
    ["FULL_CYCLE_COUNT", "ENERGY_THROUGHPUT", "CAPACITY_THROUGHPUT", "HIGH_TEMPERATURE_DURATION", "LOW_TEMPERATURE_DURATION",
      "HIGH_TEMPERATURE_CHARGING_DURATION", "LOW_TEMPERATURE_CHARGING_DURATION", "DEEP_DISCHARGE_EVENT_COUNT",
      "OVERCHARGE_EVENT_COUNT", "REMAINING_CAPACITY", "REMAINING_USABLE_ENERGY", "REMAINING_POWER_CAPABILITY"].includes(metricType)
    && value < 0
  ) return false;
  return true;
}
