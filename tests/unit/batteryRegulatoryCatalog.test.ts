import assert from "node:assert/strict";
import test from "node:test";
import { classifyBattery, type BatteryFieldValue } from "../../lib/battery/catalog.ts";
import { calculateBatteryReadiness } from "../../lib/battery/readiness.ts";
import {
  EU_BATTERY_PASSPORT_CHAPTERS,
  EU_BATTERY_PASSPORT_FIELDS,
  regulatoryFieldsForBattery,
  regulatoryStatusForField,
} from "../../lib/battery/regulatoryCatalog.ts";

test("v2.0 regulatory catalog preserves all 71 bilingual data points and ten chapters", () => {
  assert.equal(EU_BATTERY_PASSPORT_FIELDS.length, 71);
  assert.equal(new Set(EU_BATTERY_PASSPORT_FIELDS.map((field) => field.number)).size, 71);
  assert.deepEqual(EU_BATTERY_PASSPORT_FIELDS.map((field) => field.number), Array.from({ length: 71 }, (_, index) => index + 1));
  assert.equal(EU_BATTERY_PASSPORT_CHAPTERS.length, 10);
  assert.ok(EU_BATTERY_PASSPORT_FIELDS.every((field) => field.nameEn && field.nameZh && field.legalSource && field.sourceNote));
  assert.ok(EU_BATTERY_PASSPORT_FIELDS.every((field) => ["ev", "lmt", "industrial"].every((category) => field.status[category as keyof typeof field.status])));
});

test("category columns remain independent and GreenVault uses industrial applicability only", () => {
  const expected = {
    ev: { mandatory: 47, optional: 1, duplicate: 2, future: 8, conditional: 8, not_applicable: 5 },
    lmt: { mandatory: 50, optional: 1, duplicate: 2, future: 8, conditional: 8, not_applicable: 2 },
    industrial: { mandatory: 32, optional: 1, duplicate: 2, future: 8, conditional: 26, not_applicable: 2 },
  } as const;
  for (const category of ["ev", "lmt", "industrial"] as const) {
    const counts = Object.fromEntries(Object.keys(expected[category]).map((status) => [
      status,
      EU_BATTERY_PASSPORT_FIELDS.filter((field) => field.status[category] === status).length,
    ]));
    assert.deepEqual(counts, expected[category]);
  }
  const industrial = classifyBattery({ legalCategory: "industrial", capacityKwh: 14.336, stationary: true });
  assert.equal(regulatoryFieldsForBattery(industrial).filter((field) => regulatoryStatusForField(field, industrial) === "mandatory").length, 32);
});

test("future, duplicate and not-applicable fields remain configured but do not count as missing", () => {
  const industrial = classifyBattery({ legalCategory: "industrial", capacityKwh: 14.336, stationary: true });
  const visible = regulatoryFieldsForBattery(industrial);
  assert.ok(visible.every((field) => !["future", "duplicate", "not_applicable"].includes(regulatoryStatusForField(field, industrial))));
  const readiness = calculateBatteryReadiness(industrial, {});
  assert.equal(readiness.confirmedMandatory.total, 32);
  assert.equal(readiness.conditionalMandatory.total, 26);
  assert.equal(readiness.futureFieldCount, 8);
  assert.equal(readiness.duplicateFieldCount, 2);
  assert.equal(readiness.notApplicableFieldCount, 2);
});

test("conditional values explicitly marked not applicable leave the completeness denominator", () => {
  const industrial = classifyBattery({ legalCategory: "industrial", capacityKwh: 14.336, stationary: true });
  const conditional = regulatoryFieldsForBattery(industrial).find((field) => regulatoryStatusForField(field, industrial) === "conditional")!;
  const values: Record<string, BatteryFieldValue> = {
    [conditional.canonicalFieldCode]: { value: null, dataStatus: "not_applicable" },
  };
  const before = calculateBatteryReadiness(industrial, {});
  const readiness = calculateBatteryReadiness(industrial, values);
  assert.ok(readiness.conditionalMandatory.total < before.conditionalMandatory.total);
  assert.equal(readiness.conditionalMandatory.complete, 0);
});

test("passport status and lifecycle status are distinct concepts", () => {
  const lifecycleStatus = EU_BATTERY_PASSPORT_FIELDS.find((field) => field.number === 67)!;
  assert.equal(lifecycleStatus.canonicalFieldCode, "battery.battery_status");
  assert.equal(lifecycleStatus.chapter, "lifecycle");
  assert.notEqual(lifecycleStatus.canonicalFieldCode, "battery.dpp_status");
});
