import assert from "node:assert/strict";
import test from "node:test";
import {
  P0_APPLICABILITY_RULE_VERSION,
  assessBatteryApplicability,
  presentBatteryApplicability,
  validateBatteryTechnicalValues,
} from "../../lib/p0/applicability.ts";

test("LMT and industrial batteries above 2 kWh receive a preliminary, versioned scope result", () => {
  const lmt = assessBatteryApplicability({
    batteryCategory: "LMT",
    intendedUse: "electric bicycle",
    ratedEnergyKwh: 0.72,
    euMarketStatus: "PLANNED",
    placingOperatorRole: "MANUFACTURER",
    disclaimerAcknowledged: true,
  });
  const industrial = assessBatteryApplicability({
    batteryCategory: "INDUSTRIAL",
    intendedUse: "home energy storage",
    ratedEnergyKwh: 14.336,
    euMarketStatus: "YES",
    placingOperatorRole: "IMPORTER",
    disclaimerAcknowledged: true,
  });
  assert.equal(lmt.ruleVersion, P0_APPLICABILITY_RULE_VERSION);
  assert.equal(lmt.result, "PRELIMINARY_APPLICABLE");
  assert.equal(industrial.result, "PRELIMINARY_APPLICABLE");
  assert.match(industrial.disclaimer, /not legal certification/i);
});

test("portable and incomplete records remain pending instead of inventing a legal conclusion", () => {
  const portable = assessBatteryApplicability({
    batteryCategory: "PORTABLE",
    intendedUse: "consumer audio",
    euMarketStatus: "YES",
    placingOperatorRole: "MANUFACTURER",
  });
  const incomplete = assessBatteryApplicability({ batteryCategory: "INDUSTRIAL" });
  assert.equal(portable.result, "PENDING");
  assert.equal(incomplete.result, "INSUFFICIENT");
  assert.ok(incomplete.pendingQuestions.length >= 3);
  assert.ok(incomplete.tasks.some((task) => task.priority === "CRITICAL"));
});

test("public applicability presentation localizes results, reasons, tasks and priorities", () => {
  const assessment = assessBatteryApplicability({
    batteryCategory: "LMT",
    intendedUse: "electric bicycle",
    ratedEnergyKwh: 0.72,
    euMarketStatus: "PLANNED",
    placingOperatorRole: "MANUFACTURER",
    disclaimerAcknowledged: true,
  });
  const zh = presentBatteryApplicability(assessment, "zh");
  const en = presentBatteryApplicability(assessment, "en");

  assert.equal(zh.result, "初步判断适用");
  assert.match(zh.reason, /轻型交通工具电池/);
  assert.equal(zh.tasks[0].displayTitle, "提供型号物料清单和材料组成");
  assert.equal(zh.tasks[0].displayPriority, "高");
  assert.equal(en.result, "Preliminarily applicable");
  assert.equal(en.tasks[0].displayTitle, assessment.tasks[0].title);
  assert.doesNotMatch(en.tasks[0].displayDescription, /missing: BOM/);
});

test("P0 technical rules cover energy consistency, negative values and material totals", () => {
  assert.deepEqual(validateBatteryTechnicalValues({
    nominalVoltageV: 51.2,
    ratedCapacityAh: 280,
    ratedEnergyKwh: 14.336,
    componentPercentages: [76, 2.1, 18.2, 3.7],
  }), []);
  const errors = validateBatteryTechnicalValues({
    nominalVoltageV: 48,
    ratedCapacityAh: 15,
    ratedEnergyKwh: 1.2,
    componentPercentages: [80, 30],
  });
  assert.ok(errors.some((error) => error.code === "BAT-001"));
  assert.ok(errors.some((error) => error.code === "MAT-001"));
});
