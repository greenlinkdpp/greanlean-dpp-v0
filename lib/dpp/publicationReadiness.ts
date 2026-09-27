import type { BatteryReadiness } from "../battery/readiness.ts";
import type { CanonicalRecord } from "./canonicalPublication.ts";

export type PublicationValidationCheck = {
  ruleCode: string;
  severity: "BLOCKER" | "WARNING" | "INFO";
  moduleCode: string | null;
  fieldCode: string | null;
  passed: boolean;
  messageZh: string;
  messageEn: string;
  details: Record<string, unknown>;
};

type BatteryPublicationReadinessInput = {
  sectorCode: string;
  profilePresent: boolean;
  applicability: string | null;
  readiness: BatteryReadiness | null;
};

export type SectorTemplateReadiness = {
  required: {
    complete: number;
    total: number;
    missingFieldCodes: string[];
  };
  evidence: {
    complete: number;
    total: number;
    missingFieldCodes: string[];
  };
};

function check(
  ruleCode: string,
  severity: PublicationValidationCheck["severity"],
  moduleCode: string | null,
  passed: boolean,
  messageZh: string,
  messageEn: string,
  details: Record<string, unknown> = {},
): PublicationValidationCheck {
  return {
    ruleCode,
    severity,
    moduleCode,
    fieldCode: null,
    passed,
    messageZh,
    messageEn,
    details,
  };
}

export function batteryPublicationReadinessChecks(
  input: BatteryPublicationReadinessInput,
): PublicationValidationCheck[] {
  if (input.sectorCode !== "battery") return [];

  const profileCheck = check(
    "BATTERY_MODEL_PROFILE_REQUIRED",
    "BLOCKER",
    "sector",
    input.profilePresent,
    input.profilePresent ? "电池型号档案已建立。" : "缺少电池型号档案。",
    input.profilePresent
      ? "The battery model profile is present."
      : "The battery model profile is missing.",
  );
  if (!input.profilePresent || !input.readiness) return [profileCheck];

  const applicability = String(input.applicability || "TBD").toUpperCase();
  const applicabilityConfirmed = ["REQUIRED", "NOT_REQUIRED"].includes(applicability);
  const applicabilityCheck = check(
    "BATTERY_PASSPORT_APPLICABILITY_CONFIRMED",
    "BLOCKER",
    "sector",
    applicabilityConfirmed,
    applicabilityConfirmed
      ? `电池护照适用性已确认：${applicability}。`
      : "电池护照适用性尚未确认。",
    applicabilityConfirmed
      ? `Battery-passport applicability is confirmed: ${applicability}.`
      : "Battery-passport applicability has not been confirmed.",
    { applicability },
  );

  if (applicability !== "REQUIRED") {
    return [profileCheck, applicabilityCheck];
  }

  const { readiness } = input;
  const mandatoryPassed = readiness.confirmedMandatory.total > 0
    && readiness.confirmedMandatory.complete === readiness.confirmedMandatory.total;
  const evidencePassed = readiness.evidence.complete === readiness.evidence.total;
  const registryPassed = readiness.registry.total > 0
    && readiness.registry.complete === readiness.registry.total;
  const conditionalPassed = readiness.conditionalMandatory.complete
    === readiness.conditionalMandatory.total;
  const expertReviewPassed = readiness.expertReview.total > 0
    && readiness.expertReview.complete === readiness.expertReview.total
    && readiness.questionedFieldCount === 0;
  const verificationPassed = readiness.verification.complete
    === readiness.verification.total;

  return [
    profileCheck,
    applicabilityCheck,
    check(
      "BATTERY_CONFIRMED_MANDATORY_FIELDS_COMPLETE",
      "BLOCKER",
      "sector",
      mandatoryPassed,
      `电池法规必填字段：${readiness.confirmedMandatory.complete}/${readiness.confirmedMandatory.total}。`,
      `Battery mandatory fields: ${readiness.confirmedMandatory.complete}/${readiness.confirmedMandatory.total}.`,
      { ...readiness.confirmedMandatory },
    ),
    check(
      "BATTERY_REQUIRED_EVIDENCE_PRESENT",
      "BLOCKER",
      "evidence",
      evidencePassed,
      `电池必需证据：${readiness.evidence.complete}/${readiness.evidence.total}。`,
      `Battery required evidence: ${readiness.evidence.complete}/${readiness.evidence.total}.`,
      { ...readiness.evidence },
    ),
    check(
      "BATTERY_REGISTRY_IDENTIFIERS_COMPLETE",
      "BLOCKER",
      "identity",
      registryPassed,
      `注册库关键标识：${readiness.registry.complete}/${readiness.registry.total}。`,
      `Registry identifiers: ${readiness.registry.complete}/${readiness.registry.total}.`,
      { ...readiness.registry },
    ),
    check(
      "BATTERY_CONDITIONAL_FIELDS_REVIEWED",
      "BLOCKER",
      "sector",
      conditionalPassed,
      `条件适用项已填写或确认不适用：${readiness.conditionalMandatory.complete}/${readiness.conditionalMandatory.total}。`,
      `Conditional fields populated or confirmed not applicable: ${readiness.conditionalMandatory.complete}/${readiness.conditionalMandatory.total}.`,
      { ...readiness.conditionalMandatory },
    ),
    check(
      "BATTERY_EXPERT_REVIEW_COMPLETE",
      "BLOCKER",
      "sector",
      expertReviewPassed,
      `必填及条件适用项专家复核：${readiness.expertReview.complete}/${readiness.expertReview.total}；有疑问 ${readiness.questionedFieldCount} 项。`,
      `Expert review of mandatory and conditional fields: ${readiness.expertReview.complete}/${readiness.expertReview.total}; ${readiness.questionedFieldCount} questioned.`,
      { ...readiness.expertReview, questionedFieldCount: readiness.questionedFieldCount },
    ),
    check(
      "BATTERY_FILLED_FIELDS_VERIFIED",
      "WARNING",
      "evidence",
      verificationPassed,
      `已填字段核验：${readiness.verification.complete}/${readiness.verification.total}。`,
      `Verification of populated fields: ${readiness.verification.complete}/${readiness.verification.total}.`,
      { ...readiness.verification },
    ),
    check(
      "BATTERY_DELEGATED_ACT_FIELDS_CONFIRMED",
      "WARNING",
      "sector",
      readiness.tbdFieldCount === 0,
      readiness.tbdFieldCount === 0
        ? "当前目录不存在尚未启用的未来法规字段。"
        : `当前目录保留 ${readiness.tbdFieldCount} 个尚未启用、等待后续法规或指南确认的字段。`,
      readiness.tbdFieldCount === 0
        ? "The current catalog has no inactive future regulatory fields."
        : `${readiness.tbdFieldCount} inactive future fields remain pending later legislation or guidance.`,
      { tbdFieldCount: readiness.tbdFieldCount },
    ),
  ];
}

export function sectorTemplateReadinessChecks(
  sectorCode: string,
  readiness: SectorTemplateReadiness | null,
): PublicationValidationCheck[] {
  if (sectorCode === "battery" || !readiness) return [];

  const requiredPassed = readiness.required.complete === readiness.required.total;
  const evidencePassed = readiness.evidence.complete === readiness.evidence.total;

  return [
    check(
      "SECTOR_REQUIRED_FIELDS_COMPLETE",
      "BLOCKER",
      "sector",
      requiredPassed,
      `行业必填字段：${readiness.required.complete}/${readiness.required.total}。`,
      `Sector mandatory fields: ${readiness.required.complete}/${readiness.required.total}.`,
      {
        complete: readiness.required.complete,
        total: readiness.required.total,
        missingFieldCodes: readiness.required.missingFieldCodes,
      },
    ),
    check(
      "SECTOR_REQUIRED_EVIDENCE_PRESENT",
      "BLOCKER",
      "evidence",
      evidencePassed,
      `行业必需证据：${readiness.evidence.complete}/${readiness.evidence.total}。`,
      `Sector required evidence: ${readiness.evidence.complete}/${readiness.evidence.total}.`,
      {
        complete: readiness.evidence.complete,
        total: readiness.evidence.total,
        missingFieldCodes: readiness.evidence.missingFieldCodes,
      },
    ),
  ];
}

export function evidenceExpiryReadinessCheck(
  evidenceRecords: CanonicalRecord[],
  asOf = new Date(),
): PublicationValidationCheck {
  const expiredEvidenceIds = evidenceRecords.flatMap((record) => {
    const expiry = record.fields.find((field) => field.code === "evidence.expiry_date")?.value;
    if (!expiry) return [];
    const expiryDate = new Date(String(expiry));
    if (Number.isNaN(expiryDate.getTime()) || expiryDate.getTime() >= asOf.getTime()) return [];
    return [record.id];
  });
  const passed = expiredEvidenceIds.length === 0;
  return check(
    "EVD-001",
    "BLOCKER",
    "evidence",
    passed,
    passed ? "证据有效期检查通过。" : `存在 ${expiredEvidenceIds.length} 份已到期证据。`,
    passed ? "Evidence validity checks passed." : `${expiredEvidenceIds.length} evidence record(s) have expired.`,
    { expiredEvidenceIds },
  );
}
