import assert from "node:assert/strict";
import test from "node:test";
import { classifyBattery } from "../../lib/battery/catalog.ts";
import {
  BATTERY_OPERATING_METRICS,
  operatingDataFreshness,
  operatingDataPolicyForBattery,
  validateOperatingMetricValue,
} from "../../lib/battery/operatingDataPolicy.ts";

test("applies mandatory daily BMS snapshots only to the Article 14 battery categories", () => {
  for (const classification of [
    classifyBattery({ legalCategory: "ev" }),
    classifyBattery({ legalCategory: "lmt" }),
    classifyBattery({ legalCategory: "industrial", capacityKwh: 20, stationary: true, bmsPresent: true }),
  ]) {
    const policy = operatingDataPolicyForBattery(classification);
    assert.equal(policy.collectionMode, "BMS_DAILY");
    assert.equal(policy.bmsRequired, true);
    assert.equal(policy.recommendedSyncHours, 24);
    assert.equal(policy.accessLevel, "LEGITIMATE_INTEREST");
  }
});

test("uses service snapshots for no-BMS batteries and does not invent passport duties for portable or SLI", () => {
  const noBms = operatingDataPolicyForBattery(classifyBattery({
    legalCategory: "industrial",
    capacityKwh: 4,
    bmsPresent: false,
  }));
  assert.equal(noBms.collectionMode, "SERVICE_SNAPSHOT");
  assert.equal(noBms.passportOperatingDataApplies, true);
  assert.equal(noBms.bmsRequired, false);

  for (const category of ["portable", "sli"] as const) {
    const policy = operatingDataPolicyForBattery(classifyBattery({ legalCategory: category }));
    assert.equal(policy.collectionMode, "VOLUNTARY");
    assert.equal(policy.passportOperatingDataApplies, false);
    assert.equal(policy.bmsRequired, false);
  }
});

test("turns sub-2kWh and unconfirmed industrial profiles into voluntary or review states", () => {
  const belowThreshold = operatingDataPolicyForBattery(classifyBattery({
    legalCategory: "industrial",
    capacityKwh: 1.5,
    bmsPresent: true,
  }));
  assert.equal(belowThreshold.collectionMode, "VOLUNTARY");
  assert.equal(belowThreshold.passportOperatingDataApplies, false);

  const unknownCapacity = operatingDataPolicyForBattery(classifyBattery({
    legalCategory: "industrial",
    bmsPresent: true,
  }));
  assert.equal(unknownCapacity.collectionMode, "MANUAL_REVIEW");
});

test("defines the complete restricted operating metric catalog", () => {
  assert.equal(BATTERY_OPERATING_METRICS.length, 25);
  assert.equal(new Set(BATTERY_OPERATING_METRICS.map((metric) => metric.code)).size, 25);
  assert.ok(BATTERY_OPERATING_METRICS.every((metric) => metric.labelZh && metric.labelEn && metric.defaultUnit));
  assert.ok(BATTERY_OPERATING_METRICS.some((metric) => metric.code === "FULL_CHARGE_CAPACITY"));
  assert.ok(BATTERY_OPERATING_METRICS.some((metric) => metric.code === "CURRENT_INTERNAL_RESISTANCE"));
});

test("calculates daily snapshot freshness without treating the DPP as a real-time dashboard", () => {
  const policy = operatingDataPolicyForBattery(classifyBattery({ legalCategory: "lmt" }));
  const now = new Date("2026-07-23T12:00:00Z");
  assert.equal(operatingDataFreshness(policy, "2026-07-22T13:00:00Z", now).status, "CURRENT");
  assert.equal(operatingDataFreshness(policy, "2026-07-22T11:00:00Z", now).status, "DUE");
  assert.equal(operatingDataFreshness(policy, "2026-07-20T12:00:00Z", now).status, "OVERDUE");
  assert.equal(operatingDataFreshness(policy, null, now).status, "MISSING");
});

test("rejects impossible percentages, temperatures and cumulative values", () => {
  assert.equal(validateOperatingMetricValue("SOC", 76), true);
  assert.equal(validateOperatingMetricValue("SOC", 101), false);
  assert.equal(validateOperatingMetricValue("TEMPERATURE", -101), false);
  assert.equal(validateOperatingMetricValue("CURRENT_INTERNAL_RESISTANCE", -0.1), false);
  assert.equal(validateOperatingMetricValue("FULL_CYCLE_COUNT", -1), false);
  assert.equal(validateOperatingMetricValue("ENERGY_THROUGHPUT", 1200), true);
});
