import {
  BATTERY_FIELD_CATALOG,
  type BatteryClassificationResult,
  type BatteryFieldValue,
} from "./catalog.ts";

type BatteryWorkspaceForExport = {
  product: Record<string, any>;
  profile: Record<string, any> | null;
  classification: BatteryClassificationResult;
  values: Record<string, BatteryFieldValue>;
  items: Array<Record<string, any>>;
  metrics: Array<Record<string, any>>;
  lifecycleEvents: Array<Record<string, any>>;
};

const metricByFieldCode: Record<string, string> = {
  "battery.remaining_capacity": "REMAINING_CAPACITY",
  "battery.state_of_charge_soc": "SOC",
  "battery.remaining_power_capability": "REMAINING_POWER_CAPABILITY",
  "battery.remaining_round_trip_energy_efficiency": "REMAINING_ROUND_TRIP_EFFICIENCY",
  "battery.current_self_discharge_rate": "CURRENT_SELF_DISCHARGE_RATE",
  "battery.evolution_of_self_discharge_rates": "SELF_DISCHARGE_EVOLUTION",
  "battery.number_of_full_charging_and_discharging_cycles": "FULL_CYCLE_COUNT",
  "battery.energy_throughput": "ENERGY_THROUGHPUT",
  "battery.capacity_throughput": "CAPACITY_THROUGHPUT",
  "battery.temperature_information": "TEMPERATURE",
  "battery.time_spent_in_extreme_temperatures_above_boundary": "HIGH_TEMPERATURE_DURATION",
  "battery.time_spent_in_extreme_temperatures_below_boundary": "LOW_TEMPERATURE_DURATION",
  "battery.time_spent_charging_during_extreme_temperatures_above_boundary": "HIGH_TEMPERATURE_CHARGING_DURATION",
  "battery.time_spent_charging_during_extreme_temperatures_below_boundary": "LOW_TEMPERATURE_CHARGING_DURATION",
  "battery.number_of_deep_discharge_events": "DEEP_DISCHARGE_EVENT_COUNT",
  "battery.number_of_overcharge_events": "OVERCHARGE_EVENT_COUNT",
};

function percent(value: number) {
  return { percent: "%", percentageValue: value };
}

function metricValue(workspace: BatteryWorkspaceForExport, fieldCode: string) {
  const metricType = metricByFieldCode[fieldCode];
  const row = workspace.metrics.find((metric) => metric.metric_type === metricType);
  return row ? Number(row.metric_value) : null;
}

function latestUpdate(workspace: BatteryWorkspaceForExport) {
  const timestamps = [
    workspace.product.updated_at,
    ...workspace.metrics.map((metric) => metric.measured_at),
    ...workspace.lifecycleEvents.map((event) => event.event_time),
  ].filter(Boolean).map((value) => new Date(value).getTime()).filter(Number.isFinite);
  return timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : new Date().toISOString();
}

function batteryStatus(status: string | null | undefined) {
  if (status === "reused") return "re-used";
  if (status === "remanufactured" || status === "repurposed" || status === "waste") return status;
  return "original";
}

export function batteryDynamicValuesForWorkspace(
  workspace: BatteryWorkspaceForExport,
  baseUrl: string,
): Record<string, BatteryFieldValue> {
  const item = workspace.items[0];
  const dppIdentifier = workspace.product.dpp_id || workspace.product.public_slug || workspace.product.id;
  const publicDppUrl = item?.unique_product_identifier
    || workspace.product.unique_product_identifier
    || `${baseUrl.replace(/\/$/, "")}/p/${encodeURIComponent(dppIdentifier)}`;
  const accidentEvent = workspace.lifecycleEvents.find((event) => event.event_type === "accident_declaration");
  const accidentUri = accidentEvent?.event_data?.uri;
  const values: Record<string, BatteryFieldValue> = {
    "battery.date_time_of_latest_update_of_dpp": {
      value: latestUpdate(workspace),
      sourceType: "system_projection",
      verificationStatus: "unverified",
    },
    "battery.unique_battery_passport_identifier_unique_dpp_identifier": {
      value: publicDppUrl,
      sourceType: "system_projection",
      verificationStatus: item?.verification_status || workspace.profile?.verification_status || "unverified",
    },
    "battery.battery_status": {
      value: { batteryStatusValues: batteryStatus(item?.battery_status_code) },
      sourceType: "system_projection",
      verificationStatus: item?.verification_status || "unverified",
    },
  };

  const converters: Record<string, (value: number) => unknown> = {
    "battery.remaining_capacity": (value) => ({
      amperehourMiliamperehourValue: Math.round(value),
      ampereHourMiliamperehour: "Ah",
    }),
    "battery.state_of_charge_soc": percent,
    "battery.remaining_power_capability": (value) => ({
      wattValueAt80SoC: Math.round(value),
      wattValueAt20SoC: Math.round(value * 0.8056),
      watt: "W",
    }),
    "battery.remaining_round_trip_energy_efficiency": percent,
    "battery.current_self_discharge_rate": (value) => ({
      percentMonth: "%/month",
      percentMonthValue: value,
    }),
    "battery.evolution_of_self_discharge_rates": percent,
    "battery.number_of_full_charging_and_discharging_cycles": Math.round,
    "battery.energy_throughput": (value) => ({ kilowattHourValue: value, kilowattHour: "kWh" }),
    "battery.capacity_throughput": (value) => ({
      amperehourMiliamperehourValue: value,
      amperehourMiliamperehour: "Ah",
    }),
    "battery.temperature_information": (value) => ({
      degreeCelsius: "°C",
      celsiusValue: Math.round(value),
    }),
    "battery.time_spent_in_extreme_temperatures_above_boundary": Math.round,
    "battery.time_spent_in_extreme_temperatures_below_boundary": Math.round,
    "battery.time_spent_charging_during_extreme_temperatures_above_boundary": Math.round,
    "battery.time_spent_charging_during_extreme_temperatures_below_boundary": Math.round,
    "battery.number_of_deep_discharge_events": Math.round,
    "battery.number_of_overcharge_events": Math.round,
  };

  for (const [fieldCode, converter] of Object.entries(converters)) {
    const value = metricValue(workspace, fieldCode);
    if (value === null || !Number.isFinite(value)) continue;
    const metric = workspace.metrics.find((row) => row.metric_type === metricByFieldCode[fieldCode]);
    values[fieldCode] = {
      value: converter(value),
      sourceType: metric?.data_source || "operating_metric",
      observedAt: metric?.measured_at || null,
      verificationStatus: metric?.verification_status || "unverified",
    };
  }

  if (typeof accidentUri === "string" && accidentUri) {
    values["battery.information_on_accidents"] = {
      value: accidentUri,
      sourceType: accidentEvent?.data_source || "lifecycle_event",
      observedAt: accidentEvent?.event_time || null,
      verificationStatus: accidentEvent?.verification_status || "unverified",
    };
  }
  return values;
}

export function setJsonPointer(target: Record<string, any>, pointer: string, value: unknown) {
  const segments = pointer.split("/").slice(1).map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"));
  let node = target;
  for (const segment of segments.slice(0, -1)) node = node[segment] ||= {};
  node[segments[segments.length - 1]] = value;
}

export function buildBatteryPassPayload(
  workspace: BatteryWorkspaceForExport,
  baseUrl: string,
) {
  const values = {
    ...workspace.values,
    ...batteryDynamicValuesForWorkspace(workspace, baseUrl),
  };
  const payload: Record<string, any> = {};
  for (const field of BATTERY_FIELD_CATALOG) {
    const pointer = field.jsonPointers[workspace.classification.schemaCode];
    const value = values[field.fieldCode]?.value;
    if (!pointer || value === undefined || value === null || value === "") continue;
    setJsonPointer(payload, pointer, value);
  }
  return payload;
}

export function buildBatteryPassLmtPayload(
  workspace: BatteryWorkspaceForExport,
  baseUrl: string,
) {
  if (workspace.classification.schemaCode !== "battery.lmt") {
    throw new Error("BatteryPass LMT export requires an LMT battery workspace.");
  }
  return buildBatteryPassPayload(workspace, baseUrl);
}
