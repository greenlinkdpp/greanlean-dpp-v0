import { canReadField, type AccessLevel } from "../schemaRegistry.ts";
import type { BatteryClassificationResult, BatteryFieldValue } from "./catalog.ts";
import {
  EU_BATTERY_PASSPORT_CHAPTERS,
  accessLevelForRegulatoryAccess,
  dataGranularityForLevel,
  fieldValueForRegulatoryField,
  localizedRegulatorySourceNote,
  regulatoryFieldsForBattery,
  regulatoryStatusForField,
  requirementStatusForRegulatoryStatus,
} from "./regulatoryCatalog.ts";

export function projectBatteryFields(
  classification: BatteryClassificationResult,
  values: Record<string, BatteryFieldValue>,
  viewerAccess: AccessLevel,
  options: { includeMissing?: boolean } = {},
) {
  return regulatoryFieldsForBattery(classification)
    .filter((field) => canReadField(viewerAccess, accessLevelForRegulatoryAccess(field.access)))
    .map((field) => ({ field, resolved: fieldValueForRegulatoryField(field, values) }))
    .filter(({ resolved }) => options.includeMissing || resolved.value !== undefined)
    .map(({ field, resolved }) => {
      const chapter = EU_BATTERY_PASSPORT_CHAPTERS.find((item) => item.code === field.chapter);
      const value = resolved.value || { value: null, dataStatus: "missing" } satisfies BatteryFieldValue;
      const status = regulatoryStatusForField(field, classification);
      return {
      id: field.id,
      number: field.number,
      fieldCode: field.canonicalFieldCode,
      valueFieldCode: resolved.fieldCode,
      groupCode: field.chapter,
      groupLabelEn: chapter?.labelEn || field.chapter,
      groupLabelZh: chapter?.labelZh || field.chapter,
      labelEn: field.nameEn,
      labelZh: field.nameZh,
      legalSource: field.legalSource,
      sourceNote: field.sourceNote,
      sourceNoteZh: localizedRegulatorySourceNote(field, "zh"),
      value: value.value,
      unit: field.unit,
      dataBehavior: field.dynamic ? "DYNAMIC" : "STATIC",
      dataLevel: field.dataLevel,
      dataGranularity: dataGranularityForLevel(field.dataLevel),
      accessLevel: accessLevelForRegulatoryAccess(field.access),
      applicabilityStatus: status,
      requirementStatus: requirementStatusForRegulatoryStatus(status),
      dataStatus: value.dataStatus || (value.verificationStatus === "verified" ? "verified" : "declared"),
      evidenceStatus: value.evidenceStatus || "missing",
      evidenceCount: value.evidenceCount || 0,
      verificationStatus: value.verificationStatus || "unverified",
      expertReviewStatus: value.expertReviewStatus || field.expertReviewStatus,
      expertReviewNote: value.expertReviewNote ?? field.expertReviewNote,
      sourceType: value.sourceType || null,
      sourceReference: value.sourceReference || null,
      observedAt: value.observedAt || null,
      lastUpdated: value.lastUpdated || null,
      fieldOrigin: value.fieldOrigin || field.fieldOrigin,
      mappingQuality: field.mappingQuality,
    };
    });
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
