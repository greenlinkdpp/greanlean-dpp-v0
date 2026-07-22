import {
  fieldsForBattery,
  hasBatteryFieldValue,
  requirementStatusForField,
  type BatteryClassificationResult,
  type BatteryFieldValue,
} from "./catalog.ts";

export type ReadinessMetric = {
  complete: number;
  total: number;
  percent: number;
};

export type BatteryReadiness = {
  confirmedMandatory: ReadinessMetric;
  conditionalMandatory: ReadinessMetric;
  evidence: ReadinessMetric;
  verification: ReadinessMetric;
  registry: ReadinessMetric;
  tbdFieldCount: number;
};

const registryFieldCodes = new Set([
  "battery.unique_battery_identifier_unique_product_identifier",
  "battery.battery_model_identifier",
  "battery.battery_serial_number",
  "battery.unique_economic_operator_identifier",
]);

function metric(complete: number, total: number): ReadinessMetric {
  return { complete, total, percent: total ? Math.round((complete / total) * 100) : 100 };
}

export function calculateBatteryReadiness(
  classification: BatteryClassificationResult,
  values: Record<string, BatteryFieldValue>,
): BatteryReadiness {
  const fields = fieldsForBattery(classification);
  const confirmed = fields.filter((field) => requirementStatusForField(field, classification) === "CONFIRMED_MANDATORY");
  const conditional = fields.filter((field) => requirementStatusForField(field, classification) === "CONDITIONAL_MANDATORY");
  const evidenceFields = fields.filter((field) => field.evidenceRequired && hasBatteryFieldValue(values[field.fieldCode]));
  const filledFields = fields.filter((field) => hasBatteryFieldValue(values[field.fieldCode]));
  const registryFields = fields.filter((field) => registryFieldCodes.has(field.fieldCode));

  return {
    confirmedMandatory: metric(confirmed.filter((field) => hasBatteryFieldValue(values[field.fieldCode])).length, confirmed.length),
    conditionalMandatory: metric(conditional.filter((field) => hasBatteryFieldValue(values[field.fieldCode])).length, conditional.length),
    evidence: metric(evidenceFields.filter((field) => ["uploaded", "verified"].includes(values[field.fieldCode]?.evidenceStatus || "")).length, evidenceFields.length),
    verification: metric(filledFields.filter((field) => values[field.fieldCode]?.verificationStatus === "verified").length, filledFields.length),
    registry: metric(registryFields.filter((field) => hasBatteryFieldValue(values[field.fieldCode])).length, registryFields.length),
    tbdFieldCount: fields.filter((field) => requirementStatusForField(field, classification) === "TBD").length,
  };
}
