import { canReadField, type AccessLevel } from "../schemaRegistry.ts";
import {
  fieldsForBattery,
  requirementStatusForField,
  type BatteryClassificationResult,
  type BatteryFieldValue,
} from "./catalog.ts";

export function projectBatteryFields(
  classification: BatteryClassificationResult,
  values: Record<string, BatteryFieldValue>,
  viewerAccess: AccessLevel,
) {
  return fieldsForBattery(classification)
    .filter((field) => canReadField(viewerAccess, field.accessLevel))
    .filter((field) => values[field.fieldCode] !== undefined)
    .map((field) => ({
      fieldCode: field.fieldCode,
      groupCode: field.groupCode,
      groupLabelEn: field.groupLabelEn,
      groupLabelZh: field.groupLabelZh,
      labelEn: field.labelEn,
      labelZh: field.labelZh,
      value: values[field.fieldCode]?.value,
      unit: field.unit,
      dataBehavior: field.dataBehavior,
      dataGranularity: field.dataGranularity,
      accessLevel: field.accessLevel,
      requirementStatus: requirementStatusForField(field, classification),
      evidenceStatus: values[field.fieldCode]?.evidenceStatus || "missing",
      verificationStatus: values[field.fieldCode]?.verificationStatus || "unverified",
      observedAt: values[field.fieldCode]?.observedAt || null,
    }));
}

export function projectionAccessForAudience(
  audience: string | null,
  grantedAccess: AccessLevel | null,
): AccessLevel | null {
  if (!audience || audience === "public") return "PUBLIC";
  if (!grantedAccess) return null;
  const rank: Record<AccessLevel, number> = { PUBLIC: 0, LEGITIMATE_INTEREST: 1, AUTHORITY_ONLY: 2, INTERNAL: 3 };
  if (audience === "professional") return rank[grantedAccess] >= 1 ? "LEGITIMATE_INTEREST" : null;
  if (audience === "authority") return rank[grantedAccess] >= 2 ? "AUTHORITY_ONLY" : null;
  if (audience === "internal") return grantedAccess === "INTERNAL" ? "INTERNAL" : null;
  return null;
}
