import {
  hasBatteryFieldValue,
  type BatteryClassificationResult,
  type BatteryFieldValue,
} from "./catalog.ts";
import {
  fieldValueForRegulatoryField,
  regulatoryFieldsForBattery,
  regulatoryStatusForField,
} from "./regulatoryCatalog.ts";

export type ReadinessMetric = {
  complete: number;
  total: number;
  percent: number;
};

export type BatteryReadiness = {
  confirmedMandatory: ReadinessMetric;
  conditionalMandatory: ReadinessMetric;
  expertReview: ReadinessMetric;
  optional: ReadinessMetric;
  evidence: ReadinessMetric;
  verification: ReadinessMetric;
  registry: ReadinessMetric;
  tbdFieldCount: number;
  questionedFieldCount: number;
  futureFieldCount: number;
  duplicateFieldCount: number;
  notApplicableFieldCount: number;
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
  const allFields = regulatoryFieldsForBattery(classification, { includeExcluded: true });
  const fields = allFields.filter((field) => !["future", "duplicate", "not_applicable"].includes(regulatoryStatusForField(field, classification)));
  const resolved = (field: (typeof fields)[number]) => fieldValueForRegulatoryField(field, values).value;
  const isExplicitlyNotApplicable = (field: (typeof fields)[number]) => resolved(field)?.dataStatus === "not_applicable";
  const complete = (field: (typeof fields)[number]) => hasBatteryFieldValue(resolved(field));
  const confirmed = fields.filter((field) => regulatoryStatusForField(field, classification) === "mandatory");
  const conditional = fields.filter((field) => regulatoryStatusForField(field, classification) === "conditional");
  const conditionalResolved = (field: (typeof fields)[number]) => complete(field) || isExplicitlyNotApplicable(field);
  const reviewFields = fields.filter((field) => ["mandatory", "conditional"].includes(regulatoryStatusForField(field, classification)));
  const expertReviewComplete = (field: (typeof fields)[number]) => {
    if (field.expertReviewStatus === "not_required") return true;
    return resolved(field)?.expertReviewStatus === "confirmed";
  };
  const optional = fields.filter((field) => regulatoryStatusForField(field, classification) === "optional");
  const evidenceFields = fields.filter((field) => field.evidenceRequired && !isExplicitlyNotApplicable(field));
  const filledFields = fields.filter((field) => complete(field) && !isExplicitlyNotApplicable(field));
  const registryFields = fields.filter((field) => registryFieldCodes.has(field.canonicalFieldCode));

  return {
    confirmedMandatory: metric(confirmed.filter(complete).length, confirmed.length),
    conditionalMandatory: metric(conditional.filter(conditionalResolved).length, conditional.length),
    expertReview: metric(reviewFields.filter(expertReviewComplete).length, reviewFields.length),
    optional: metric(optional.filter(complete).length, optional.length),
    evidence: metric(evidenceFields.filter((field) => ["uploaded", "verified"].includes(resolved(field)?.evidenceStatus || "") || (resolved(field)?.evidenceCount || 0) > 0).length, evidenceFields.length),
    verification: metric(filledFields.filter((field) => resolved(field)?.verificationStatus === "verified" || resolved(field)?.dataStatus === "verified").length, filledFields.length),
    registry: metric(registryFields.filter(complete).length, registryFields.length),
    // The v2.0 guidance marks these fields as future/not-yet-active. Keeping
    // them visible here prevents the publication workflow from claiming that
    // no secondary-legislation or guidance work remains.
    tbdFieldCount: allFields.filter((field) => regulatoryStatusForField(field, classification) === "future").length,
    questionedFieldCount: reviewFields.filter((field) => resolved(field)?.expertReviewStatus === "questioned").length,
    futureFieldCount: allFields.filter((field) => regulatoryStatusForField(field, classification) === "future").length,
    duplicateFieldCount: allFields.filter((field) => regulatoryStatusForField(field, classification) === "duplicate").length,
    notApplicableFieldCount: allFields.filter((field) => regulatoryStatusForField(field, classification) === "not_applicable").length,
  };
}
