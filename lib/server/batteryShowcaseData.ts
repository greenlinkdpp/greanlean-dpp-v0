type MetricDefinition = {
  code: string;
  labelZh: string;
  labelEn: string;
  unit: string;
  value: number;
};

type BatteryShowcaseProfile = {
  itemId: string;
  gtin: string;
  batchIdentifier: string;
  serialIdentifier: string;
  uniqueProductIdentifier: string;
  presentation: Record<string, string | number>;
  metrics: MetricDefinition[];
  historyCodes: string[];
  lifecycleEvents: Array<{
    type: string;
    daysAgo: number;
    noteZh: string;
    noteEn: string;
  }>;
};

const PROFILES: Record<string, BatteryShowcaseProfile> = {
  "DPP-LMT-BAT-48V15AH": {
    itemId: "lmt-48v15ah-product-item",
    gtin: "06900000004807",
    batchIdentifier: "LMT-BAT-BATCH-2026-01",
    serialIdentifier: "LMT-48V15AH-000001",
    uniqueProductIdentifier: "https://greanlean.com/p/DPP-LMT-BAT-48V15AH",
    presentation: {
      chemistry: "NMC",
      ratedCapacityAh: 15,
      ratedEnergyKWh: 0.72,
      nominalVoltageV: 48,
      maximumPowerW: 720,
      initialEfficiencyPercent: 94.2,
      expectedCycles: 800,
      expectedCalendarYears: 6,
      idleTemperatureMinC: -10,
      idleTemperatureMaxC: 40,
      modelIdentifier: "GL-LMT-48V15AH-NMC",
      serialNumber: "LMT-48V15AH-000001",
    },
    metrics: [
      { code: "SOC", labelZh: "荷电状态", labelEn: "State of charge", unit: "%", value: 82 },
      { code: "SOH_VOLUNTARY", labelZh: "健康状态", labelEn: "State of health", unit: "%", value: 96.4 },
      { code: "FULL_CHARGE_CAPACITY", labelZh: "满充容量", labelEn: "Full charge capacity", unit: "Ah", value: 14.46 },
      { code: "REMAINING_CAPACITY", labelZh: "剩余容量", labelEn: "Remaining capacity", unit: "Ah", value: 11.86 },
      { code: "FULL_CYCLE_COUNT", labelZh: "完整循环次数", labelEn: "Full cycle count", unit: "次", value: 186 },
      { code: "TEMPERATURE", labelZh: "电池温度", labelEn: "Battery temperature", unit: "°C", value: 27.4 },
      { code: "CURRENT_INTERNAL_RESISTANCE", labelZh: "当前内阻", labelEn: "Current internal resistance", unit: "mΩ", value: 48 },
      { code: "REMAINING_POWER_CAPABILITY", labelZh: "剩余功率能力", labelEn: "Remaining power capability", unit: "W", value: 648 },
      { code: "ENERGY_THROUGHPUT", labelZh: "累计能量吞吐量", labelEn: "Energy throughput", unit: "kWh", value: 128.6 },
    ],
    historyCodes: ["SOC", "SOH_VOLUNTARY", "TEMPERATURE", "FULL_CYCLE_COUNT"],
    lifecycleEvents: [
      {
        type: "COMMISSIONING",
        daysAgo: 210,
        noteZh: "完成车辆配对、安全检查并投入使用。",
        noteEn: "Vehicle pairing and safety checks completed before commissioning.",
      },
      {
        type: "INSPECTION",
        daysAgo: 18,
        noteZh: "完成连接器、锁止机构和电池状态例行检查。",
        noteEn: "Routine inspection of connectors, locking mechanism and battery status completed.",
      },
    ],
  },
  "DPP-GV-ESS-14K3-000001": {
    itemId: "gv-ess-14k3-product-item",
    gtin: "06900000014332",
    batchIdentifier: "GV-ESS-BATCH-2026-01",
    serialIdentifier: "GVESS14K3000001",
    uniqueProductIdentifier: "https://greanlean.com/p/DPP-GV-ESS-14K3-000001",
    presentation: {
      chemistry: "LFP",
      ratedCapacityAh: 280,
      ratedEnergyKWh: 14.336,
      nominalVoltageV: 51.2,
      maximumPowerW: 7168,
      initialEfficiencyPercent: 95.6,
      expectedCycles: 6000,
      expectedCalendarYears: 15,
      idleTemperatureMinC: -20,
      idleTemperatureMaxC: 45,
      modelIdentifier: "GV-ESS-14K3-2026",
      serialNumber: "GVESS14K3000001",
    },
    metrics: [
      { code: "SOC", labelZh: "荷电状态", labelEn: "State of charge", unit: "%", value: 74 },
      { code: "SOH_VOLUNTARY", labelZh: "健康状态", labelEn: "State of health", unit: "%", value: 98.2 },
      { code: "FULL_CHARGE_CAPACITY", labelZh: "满充容量", labelEn: "Full charge capacity", unit: "Ah", value: 274.9 },
      { code: "REMAINING_CAPACITY", labelZh: "剩余容量", labelEn: "Remaining capacity", unit: "Ah", value: 203.4 },
      { code: "FULL_CYCLE_COUNT", labelZh: "完整循环次数", labelEn: "Full cycle count", unit: "次", value: 124 },
      { code: "TEMPERATURE", labelZh: "电池温度", labelEn: "Battery temperature", unit: "°C", value: 25.8 },
      { code: "CURRENT_INTERNAL_RESISTANCE", labelZh: "当前内阻", labelEn: "Current internal resistance", unit: "mΩ", value: 22 },
      { code: "REMAINING_POWER_CAPABILITY", labelZh: "剩余功率能力", labelEn: "Remaining power capability", unit: "kW", value: 6.7 },
      { code: "ENERGY_THROUGHPUT", labelZh: "累计能量吞吐量", labelEn: "Energy throughput", unit: "MWh", value: 3.58 },
    ],
    historyCodes: ["SOC", "SOH_VOLUNTARY", "TEMPERATURE", "ENERGY_THROUGHPUT"],
    lifecycleEvents: [
      {
        type: "COMMISSIONING",
        daysAgo: 240,
        noteZh: "完成储能柜联调、保护参数核对并投入运行。",
        noteEn: "Cabinet integration, protection settings and commissioning checks completed.",
      },
      {
        type: "MAINTENANCE",
        daysAgo: 24,
        noteZh: "完成绝缘、端子扭矩、热管理和通信状态例行维护。",
        noteEn: "Routine maintenance covered insulation, terminal torque, thermal management and communications.",
      },
    ],
  },
};

function isoDaysAgo(now: Date, daysAgo: number) {
  return new Date(now.getTime() - daysAgo * 86_400_000).toISOString();
}

function historyValue(metric: MetricDefinition, index: number, length: number) {
  const progress = length <= 1 ? 1 : index / (length - 1);
  if (metric.code === "SOC") {
    const cycle = [-12, -5, 4, 10, 2, -8][index % 6];
    return Math.max(18, Math.min(96, metric.value + cycle));
  }
  if (metric.code === "SOH_VOLUNTARY") {
    return Number((metric.value + (1 - progress) * 0.5).toFixed(2));
  }
  if (metric.code === "TEMPERATURE") {
    return Number((metric.value + Math.sin(index / 2.2) * 2.3).toFixed(1));
  }
  if (metric.code === "FULL_CYCLE_COUNT") {
    return Math.max(0, Math.round(metric.value - (length - index - 1) * 0.8));
  }
  if (metric.code === "ENERGY_THROUGHPUT") {
    const monthlyIncrease = metric.unit === "MWh" ? 0.32 : 14;
    return Number((metric.value - monthlyIncrease * (1 - progress)).toFixed(2));
  }
  return metric.value;
}

function mergeMissing(
  current: Record<string, unknown> | null | undefined,
  fallback: Record<string, string | number>,
) {
  const merged = { ...fallback };
  for (const [key, value] of Object.entries(current || {})) {
    if (value !== null && value !== undefined && value !== "") merged[key] = value as string | number;
  }
  return merged;
}

export function buildBatteryShowcaseOperatingData(
  identifier: string,
  now = new Date(),
) {
  const profile = PROFILES[identifier];
  if (!profile) return null;
  const measuredAt = now.toISOString();
  const sourceDevice = `${profile.presentation.modelIdentifier}-EDGE-GW-01`;
  const latest = profile.metrics.map((metric) => ({
    id: `${identifier}-${metric.code}-latest`,
    metricType: metric.code,
    labelZh: metric.labelZh,
    labelEn: metric.labelEn,
    value: metric.value,
    unit: metric.unit,
    measuredAt,
    receivedAt: measuredAt,
    sourceDevice,
    dataSource: "INITIAL_DATASET",
    qualityStatus: "UNKNOWN",
    verificationStatus: "UNVERIFIED",
    collectionMode: "DAILY_SNAPSHOT",
  }));
  const historyLength = 31;
  const history = profile.historyCodes.flatMap((code) => {
    const metric = profile.metrics.find((item) => item.code === code);
    if (!metric) return [];
    return Array.from({ length: historyLength }, (_, index) => ({
      id: `${identifier}-${metric.code}-history-${index}`,
      metricType: metric.code,
      labelZh: metric.labelZh,
      labelEn: metric.labelEn,
      value: historyValue(metric, index, historyLength),
      unit: metric.unit,
      measuredAt: isoDaysAgo(now, historyLength - index - 1),
      receivedAt: isoDaysAgo(now, historyLength - index - 1),
      sourceDevice,
      dataSource: "INITIAL_DATASET",
      qualityStatus: "UNKNOWN",
      verificationStatus: "UNVERIFIED",
      collectionMode: "DAILY_SNAPSHOT",
    }));
  });
  const events = profile.lifecycleEvents.map((event, index) => ({
    id: `${identifier}-${event.type}-${index}`,
    eventType: event.type,
    eventTime: isoDaysAgo(now, event.daysAgo),
    eventData: {
      noteZh: event.noteZh,
      note: event.noteEn,
    },
    dataSource: "INITIAL_DATASET",
    sourceDevice,
    qualityStatus: "UNKNOWN",
    verificationStatus: "UNVERIFIED",
    collectionMode: "EVENT_DRIVEN",
  }));

  return {
    item: {
      id: profile.itemId,
      serialIdentifier: profile.serialIdentifier,
      uniqueProductIdentifier: profile.uniqueProductIdentifier,
      lifecycleStatus: "ACTIVE",
      commissionedAt: events[0]?.eventTime || measuredAt,
    },
    latest,
    history,
    events,
    summary: {
      latestMeasuredAt: measuredAt,
      receivedAt: measuredAt,
      sourceDevice,
      dataSource: "INITIAL_DATASET",
      qualityStatus: "UNKNOWN",
      verificationStatus: "UNVERIFIED",
      freshnessStatus: "CURRENT",
      ageHours: 0,
      range: "30d",
      updateMode: "DAILY_SNAPSHOT",
    },
  };
}

export function enrichBatteryShowcaseData(data: any, identifier: string) {
  const profile = PROFILES[identifier];
  if (!profile) return data;
  const lifecyclePattern = /commission|maint|inspect|repair|service|投入|维护|检查|维修|维保/i;
  const traceability = Array.isArray(data?.traceability) ? data.traceability : [];
  const hasLifecycleEvents = traceability.some((row: any) => lifecyclePattern.test(
    `${row?.event_type || ""} ${row?.event_name || ""} ${row?.event_name_zh || ""}`,
  ));
  const fallbackLifecycle = hasLifecycleEvents
    ? []
    : profile.lifecycleEvents.map((event, index) => ({
        id: `${identifier}-lifecycle-${index}`,
        event_type: event.type,
        event_name: event.type === "COMMISSIONING" ? "Commissioning completed" : "Scheduled maintenance completed",
        event_name_zh: event.type === "COMMISSIONING" ? "完成投运检查" : "完成计划维护",
        event_date: isoDaysAgo(new Date(), event.daysAgo),
        facility_name: identifier.includes("GV-ESS") ? "Authorised energy-storage service site" : "Authorised mobility service site",
        facility_name_zh: identifier.includes("GV-ESS") ? "授权储能维保站点" : "授权轻型交通工具维保站点",
        country: identifier.includes("GV-ESS") ? "Germany" : "China",
        city: identifier.includes("GV-ESS") ? "Hamburg" : "Shenzhen",
        verification_status: "recorded",
        notes: event.noteEn,
        notes_zh: event.noteZh,
        visibility_level: "professional",
      }));

  return {
    ...data,
    batteryPresentation: {
      ...mergeMissing(data?.batteryPresentation, profile.presentation),
      serialNumber: profile.presentation.serialNumber,
    },
    digitalIdentity: Array.isArray(data?.digitalIdentity)
      ? data.digitalIdentity.map((identity: any, index: number) => index === 0
        ? {
            ...identity,
            product_uuid: `01:${profile.gtin}|10:${profile.batchIdentifier}|21:${profile.serialIdentifier}`,
            gtin: profile.gtin,
            batch_id: profile.batchIdentifier,
            serial_id: profile.serialIdentifier,
            digital_link_url: `https://www.greanlean.com/01/${profile.gtin}/10/${profile.batchIdentifier}/21/${profile.serialIdentifier}`,
            data_carrier_url: `https://www.greanlean.com/01/${profile.gtin}/10/${profile.batchIdentifier}/21/${profile.serialIdentifier}`,
            sgtin: String(identity?.sgtin || "").replace(
              /LMT-48V15AH-TEST-001/g,
              profile.serialIdentifier,
            ),
          }
        : identity)
      : data?.digitalIdentity,
    traceability: [...traceability, ...fallbackLifecycle],
  };
}
