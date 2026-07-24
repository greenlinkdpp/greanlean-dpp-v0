import assert from "node:assert/strict";
import test from "node:test";
import {
  INDUSTRIAL_DEMO,
  INDUSTRIAL_DEMO_FIELD_GROUPS,
  INDUSTRIAL_DEMO_METRICS,
  industrialDemoStructuredPayload,
  isIndustrialDemoIdentifier,
} from "../../lib/battery/industrialDemo.ts";

test("industrial battery demo has stable public identifiers", () => {
  assert.equal(isIndustrialDemoIdentifier(INDUSTRIAL_DEMO.dppId), true);
  assert.equal(isIndustrialDemoIdentifier(INDUSTRIAL_DEMO.slug), true);
  assert.match(INDUSTRIAL_DEMO.upi, /^https:\/\/www\.greanlean\.com\/passports\//);
  assert.match(INDUSTRIAL_DEMO.image, /^\/images\/.+\.png$/);
});

test("industrial demo fields carry traceable metadata", () => {
  assert.ok(INDUSTRIAL_DEMO_FIELD_GROUPS.length >= 8);
  const fields = INDUSTRIAL_DEMO_FIELD_GROUPS.flatMap((group) => group.fields);
  assert.ok(fields.length >= 60);
  assert.equal(new Set(fields.map((field) => field.code)).size, fields.length);
  for (const field of fields) {
    assert.ok(field.labelZh);
    assert.ok(field.labelEn);
    assert.ok(field.granularity);
    assert.ok(field.access);
    assert.ok(field.requirement);
    assert.ok(field.source);
    assert.ok(field.verification);
  }
});

test("structured payload is explicitly synthetic and never claims compliance", () => {
  const payload = industrialDemoStructuredPayload();
  assert.equal(payload.passportMetadata.dataSource, "SYNTHETIC_DEMO");
  assert.equal(payload.completeness.complianceClaim, false);
  assert.equal(payload.completeness.supportingDocumentCompletenessPct, 0);
  assert.equal(payload.completeness.verificationCoveragePct, 0);
  assert.equal(payload.dueDiligence.thirdPartyVerification, false);
  assert.equal(payload.carbonFootprint.performanceClass, "TBD");
  assert.ok(payload.demoDisclaimer.zh.includes("仅用于"));
  assert.ok(payload.demoDisclaimer.en.includes("demonstration only"));
});

test("operating metrics are timestamped restricted history records", () => {
  assert.ok(INDUSTRIAL_DEMO_METRICS.length >= 7);
  for (const metric of INDUSTRIAL_DEMO_METRICS) {
    assert.equal(metric.dataBehavior, "DYNAMIC");
    assert.equal(metric.accessLevel, "LEGITIMATE_INTEREST");
    assert.equal(metric.verificationStatus, "SYNTHETIC_DEMO");
    assert.match(metric.measuredAt, /^\d{4}-\d{2}-\d{2}T/);
  }
});
