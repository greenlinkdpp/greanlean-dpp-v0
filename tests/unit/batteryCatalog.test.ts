import assert from "node:assert/strict";
import test from "node:test";
import {
  BATTERY_CATEGORIES,
  BATTERY_FIELD_CATALOG,
  classifyBattery,
  fieldsForBattery,
  type BatteryFieldValue,
} from "../../lib/battery/catalog.ts";
import { projectBatteryFields, projectionAccessForAudience } from "../../lib/battery/projection.ts";
import { calculateBatteryReadiness } from "../../lib/battery/readiness.ts";
import { DPP_SECTOR_PROFILES } from "../../lib/dppSectorProfiles.ts";

test("keeps legal categories separate from the five BatteryPass configurations", () => {
  assert.deepEqual(BATTERY_CATEGORIES.map((category) => category.code), ["ev", "lmt", "industrial", "portable", "sli", "other"]);
  assert.equal(classifyBattery({ legalCategory: "ev" }).schemaCode, "battery.ev");
  assert.equal(classifyBattery({ legalCategory: "lmt" }).applicability, "REQUIRED");
  assert.equal(classifyBattery({ legalCategory: "portable" }).applicability, "NOT_REQUIRED");
  assert.equal(classifyBattery({ legalCategory: "sli" }).applicability, "NOT_REQUIRED");
  assert.equal(classifyBattery({ legalCategory: "other" }).applicability, "TBD");
});

test("product creation exposes six legal battery categories and industrial technical variants", () => {
  const batteryProfiles = DPP_SECTOR_PROFILES.filter((profile) => profile.sectorCode === "battery");
  assert.equal(new Set(batteryProfiles.map((profile) => profile.categoryCode)).size, 6);
  assert.equal(batteryProfiles.filter((profile) => profile.legalCategoryCode === "industrial").length, 3);
  assert.equal(batteryProfiles.find((profile) => profile.legalCategoryCode === "portable")?.passportApplicability, "not_required");
  assert.equal(batteryProfiles.find((profile) => profile.legalCategoryCode === "sli")?.passportApplicability, "not_required");
});

test("classifies industrial batteries by capacity and technical variant", () => {
  assert.equal(classifyBattery({ legalCategory: "industrial" }).applicability, "CONDITIONAL");
  assert.equal(classifyBattery({ legalCategory: "industrial", capacityKwh: 1.8 }).applicability, "NOT_REQUIRED");
  const stationary = classifyBattery({ legalCategory: "industrial", capacityKwh: 4, stationary: true });
  assert.equal(stationary.applicability, "REQUIRED");
  assert.equal(stationary.schemaCode, "battery.industrial.stationary");
  const withoutBms = classifyBattery({ legalCategory: "industrial", capacityKwh: 3, bmsPresent: false });
  assert.equal(withoutBms.schemaCode, "battery.industrial.without_bms");
});

test("normalizes all 100 Longlist attributes with bilingual metadata", () => {
  assert.equal(BATTERY_FIELD_CATALOG.length, 100);
  assert.equal(BATTERY_FIELD_CATALOG.filter((field) => field.dataBehavior === "DYNAMIC").length, 22);
  assert.equal(BATTERY_FIELD_CATALOG.filter((field) => field.dataBehavior === "STATIC").length, 78);
  assert.ok(BATTERY_FIELD_CATALOG.every((field) => field.labelZh && field.instructionZh && field.sourceSuggestionZh));
  assert.equal(new Set(BATTERY_FIELD_CATALOG.map((field) => field.fieldCode)).size, 100);
});

test("does not invent Longlist applicability for portable and SLI batteries", () => {
  for (const category of ["portable", "sli"] as const) {
    const classification = classifyBattery({ legalCategory: category });
    const fields = fieldsForBattery(classification);
    assert.equal(fields.length, 100);
    assert.ok(fields.every((field) => field.categoryRequirementStatus[classification.schemaCode] === "TBD"));
  }
});

test("calculates separate readiness dimensions instead of one compliance score", () => {
  const classification = classifyBattery({ legalCategory: "lmt" });
  const mandatory = fieldsForBattery(classification).find((field) => field.categoryRequirementStatus["battery.lmt"] === "CONFIRMED_MANDATORY");
  assert.ok(mandatory);
  const values: Record<string, BatteryFieldValue> = {
    [mandatory!.fieldCode]: { value: "test", verificationStatus: "verified", evidenceStatus: "verified" },
  };
  const readiness = calculateBatteryReadiness(classification, values);
  assert.equal(typeof readiness.confirmedMandatory.percent, "number");
  assert.equal(typeof readiness.evidence.percent, "number");
  assert.equal(typeof readiness.verification.percent, "number");
  assert.equal(typeof readiness.registry.percent, "number");
  assert.ok(readiness.tbdFieldCount >= 0);
  assert.equal(Object.hasOwn(readiness, "compliancePercent"), false);
});

test("server projection removes fields above the viewer access level", () => {
  const classification = classifyBattery({ legalCategory: "lmt" });
  const publicField = fieldsForBattery(classification).find((field) => field.accessLevel === "PUBLIC")!;
  const restrictedField = fieldsForBattery(classification).find((field) => field.accessLevel === "LEGITIMATE_INTEREST")!;
  const values = {
    [publicField.fieldCode]: { value: "public-value" },
    [restrictedField.fieldCode]: { value: "restricted-value" },
  };
  assert.equal(projectBatteryFields(classification, values, "PUBLIC").length, 1);
  assert.equal(projectBatteryFields(classification, values, "LEGITIMATE_INTEREST").length, 2);
});

test("audience projections cap even higher-privileged accounts to the requested view", () => {
  assert.equal(projectionAccessForAudience("public", "INTERNAL"), "PUBLIC");
  assert.equal(projectionAccessForAudience("professional", "INTERNAL"), "LEGITIMATE_INTEREST");
  assert.equal(projectionAccessForAudience("authority", "INTERNAL"), "AUTHORITY_ONLY");
  assert.equal(projectionAccessForAudience("authority", "LEGITIMATE_INTEREST"), null);
  assert.equal(projectionAccessForAudience("internal", "AUTHORITY_ONLY"), null);
  assert.equal(projectionAccessForAudience("unknown", "INTERNAL"), null);
});
