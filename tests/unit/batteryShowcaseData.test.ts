import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBatteryShowcaseOperatingData,
  enrichBatteryShowcaseData,
} from "../../lib/server/batteryShowcaseData.ts";

const fixedNow = new Date("2026-07-26T08:00:00.000Z");

test("both battery showcase products include operating snapshots, trends and lifecycle events", () => {
  for (const identifier of [
    "DPP-LMT-BAT-48V15AH",
    "DPP-GV-ESS-14K3-000001",
  ]) {
    const data = buildBatteryShowcaseOperatingData(identifier, fixedNow);
    assert.ok(data);
    assert.equal(data.latest.length, 9);
    assert.ok(data.history.length >= 120);
    assert.equal(data.events.length, 2);
    assert.equal(data.summary.dataSource, "INITIAL_DATASET");
    assert.equal(data.summary.verificationStatus, "UNVERIFIED");
  }
});

test("industrial battery showcase fills performance and lifecycle overview gaps", () => {
  const data = enrichBatteryShowcaseData(
    {
      product: { dpp_id: "DPP-GV-ESS-14K3-000001" },
      traceability: [],
    },
    "DPP-GV-ESS-14K3-000001",
  );

  assert.equal(data.batteryPresentation.chemistry, "LFP");
  assert.equal(data.batteryPresentation.ratedEnergyKWh, 14.336);
  assert.equal(data.batteryPresentation.expectedCycles, 6000);
  assert.equal(data.traceability.length, 2);
  assert.match(data.traceability[0].event_name_zh, /投运/);
});
