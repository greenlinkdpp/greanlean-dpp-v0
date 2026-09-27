import assert from "node:assert/strict";
import test from "node:test";
import {
  batteryPublicationReadinessChecks,
  evidenceExpiryReadinessCheck,
  sectorTemplateReadinessChecks,
} from "../../lib/dpp/publicationReadiness.ts";

function batteryReadiness(
  mandatoryComplete: number,
  mandatoryTotal: number,
) {
  return {
    confirmedMandatory: {
      complete: mandatoryComplete,
      total: mandatoryTotal,
      percent: Math.round((mandatoryComplete / mandatoryTotal) * 100),
    },
    conditionalMandatory: { complete: 1, total: 1, percent: 100 },
    expertReview: { complete: 84, total: 84, percent: 100 },
    optional: { complete: 0, total: 1, percent: 0 },
    evidence: { complete: 3, total: 3, percent: 100 },
    verification: { complete: 80, total: 83, percent: 96 },
    registry: { complete: 4, total: 4, percent: 100 },
    tbdFieldCount: 0,
    questionedFieldCount: 0,
    futureFieldCount: 0,
    duplicateFieldCount: 0,
    notApplicableFieldCount: 0,
  };
}

test("required battery passport blocks approval when mandatory fields are incomplete", () => {
  const checks = batteryPublicationReadinessChecks({
    sectorCode: "battery",
    profilePresent: true,
    applicability: "REQUIRED",
    readiness: batteryReadiness(66, 83),
  });
  const mandatory = checks.find(
    (item) => item.ruleCode === "BATTERY_CONFIRMED_MANDATORY_FIELDS_COMPLETE",
  );

  assert.equal(mandatory?.severity, "BLOCKER");
  assert.equal(mandatory?.passed, false);
  assert.deepEqual(mandatory?.details, {
    complete: 66,
    total: 83,
    percent: 80,
  });
});

test("required battery passport passes hard readiness gates when complete", () => {
  const checks = batteryPublicationReadinessChecks({
    sectorCode: "battery",
    profilePresent: true,
    applicability: "REQUIRED",
    readiness: batteryReadiness(83, 83),
  });
  const blockers = checks.filter((item) => item.severity === "BLOCKER");

  assert.ok(blockers.length >= 4);
  assert.ok(blockers.every((item) => item.passed));
  assert.equal(
    checks.find((item) => item.ruleCode === "BATTERY_FILLED_FIELDS_VERIFIED")?.passed,
    false,
  );
});

test("unresolved conditional fields and pending expert review block publication", () => {
  const readiness = batteryReadiness(83, 83);
  readiness.conditionalMandatory = { complete: 0, total: 1, percent: 0 };
  readiness.expertReview = { complete: 83, total: 84, percent: 99 };
  const checks = batteryPublicationReadinessChecks({
    sectorCode: "battery",
    profilePresent: true,
    applicability: "REQUIRED",
    readiness,
  });
  assert.equal(checks.find((item) => item.ruleCode === "BATTERY_CONDITIONAL_FIELDS_REVIEWED")?.severity, "BLOCKER");
  assert.equal(checks.find((item) => item.ruleCode === "BATTERY_CONDITIONAL_FIELDS_REVIEWED")?.passed, false);
  assert.equal(checks.find((item) => item.ruleCode === "BATTERY_EXPERT_REVIEW_COMPLETE")?.severity, "BLOCKER");
  assert.equal(checks.find((item) => item.ruleCode === "BATTERY_EXPERT_REVIEW_COMPLETE")?.passed, false);
});

test("future regulatory fields remain visible as pending guidance", () => {
  const readiness = batteryReadiness(83, 83);
  readiness.tbdFieldCount = 8;
  readiness.futureFieldCount = 8;
  const checks = batteryPublicationReadinessChecks({
    sectorCode: "battery",
    profilePresent: true,
    applicability: "REQUIRED",
    readiness,
  });
  const future = checks.find((item) => item.ruleCode === "BATTERY_DELEGATED_ACT_FIELDS_CONFIRMED");
  assert.equal(future?.severity, "WARNING");
  assert.equal(future?.passed, false);
  assert.match(future?.messageEn || "", /8 inactive future fields/);
});

test("unconfirmed battery applicability is a publication blocker", () => {
  const checks = batteryPublicationReadinessChecks({
    sectorCode: "battery",
    profilePresent: true,
    applicability: "CONDITIONAL",
    readiness: batteryReadiness(0, 83),
  });

  assert.equal(
    checks.find((item) => item.ruleCode === "BATTERY_PASSPORT_APPLICABILITY_CONFIRMED")?.passed,
    false,
  );
  assert.equal(
    checks.some((item) => item.ruleCode === "BATTERY_CONFIRMED_MANDATORY_FIELDS_COMPLETE"),
    false,
  );
});

test("non-battery sector templates report missing mandatory fields and evidence", () => {
  const checks = sectorTemplateReadinessChecks("textile", {
    required: {
      complete: 8,
      total: 10,
      missingFieldCodes: ["fiber_composition", "care_instruction"],
    },
    evidence: {
      complete: 1,
      total: 2,
      missingFieldCodes: ["chemical_declaration"],
    },
  });

  assert.equal(checks.length, 2);
  assert.ok(checks.every((item) => item.severity === "BLOCKER"));
  assert.ok(checks.every((item) => !item.passed));
});

test("non-battery sector with only optional fields passes mandatory readiness", () => {
  const checks = sectorTemplateReadinessChecks("consumer_electronics", {
    required: {
      complete: 0,
      total: 0,
      missingFieldCodes: [],
    },
    evidence: {
      complete: 0,
      total: 0,
      missingFieldCodes: [],
    },
  });

  assert.equal(checks.length, 2);
  assert.ok(checks.every((item) => item.passed));
});

test("T10 expired evidence blocks a new publication without mutating history", () => {
  const result = evidenceExpiryReadinessCheck([{
    id: "expired-certificate",
    recordType: "certificate",
    accessLevel: "PUBLIC",
    fields: [{
      code: "evidence.expiry_date",
      value: "2025-12-31",
      label: { en: "Expiry" },
      accessLevel: "PUBLIC",
      applicability: "APPLICABLE",
      verificationStatus: "VERIFIED",
      sourceType: "DATABASE_RECORD",
      evidenceIds: [],
    }],
  }], new Date("2026-08-03T00:00:00Z"));
  assert.equal(result.ruleCode, "EVD-001");
  assert.equal(result.passed, false);
  assert.deepEqual(result.details.expiredEvidenceIds, ["expired-certificate"]);
});
