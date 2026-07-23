import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { batteryDynamicValuesForWorkspace, buildBatteryPassLmtPayload } from "../../lib/battery/batteryPass.ts";
import { classifyBattery } from "../../lib/battery/catalog.ts";

const schema = JSON.parse(readFileSync("config/battery/schemas/LMT.json", "utf8"));
const fixture = JSON.parse(readFileSync("config/battery/demo/lmt-48v15ah-batterypass-test.json", "utf8"));

test("generated LMT fixture validates against the original BatteryPass Schema", () => {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  assert.equal(validate(fixture), true, JSON.stringify(validate.errors));
  assert.deepEqual(
    Object.keys(fixture.Battery_Passport).sort(),
    [
      "BatteryCarbonFootprint",
      "BatteryMaterialsAndComposition",
      "CircularityAndResourceEfficiency",
      "IdentifiersAndProductData",
      "PerformanceAndDurability",
      "SupplyChainDueDiligence",
      "SymbolsLabelsAndDocumentationOfConformity",
    ].sort(),
  );
});

test("operating metrics are projected into BatteryPass unit objects", () => {
  const workspace = {
    product: {
      id: "product",
      dpp_id: "DPP-LMT-TEST",
      unique_product_identifier: "https://example.com/p/DPP-LMT-TEST",
      updated_at: "2026-07-23T12:00:00Z",
    },
    profile: { verification_status: "unverified" },
    classification: classifyBattery({ legalCategory: "lmt" }),
    values: {},
    items: [{
      unique_product_identifier: "https://example.com/p/DPP-LMT-TEST",
      battery_status_code: "reused",
      verification_status: "unverified",
    }],
    metrics: [
      { metric_type: "SOC", metric_value: 76, measured_at: "2026-07-23T14:00:00Z", verification_status: "unverified" },
      { metric_type: "REMAINING_CAPACITY", metric_value: 14.6, measured_at: "2026-07-23T14:00:00Z", verification_status: "unverified" },
    ],
    lifecycleEvents: [],
  };
  const values = batteryDynamicValuesForWorkspace(workspace, "https://example.com");
  assert.deepEqual(values["battery.state_of_charge_soc"].value, { percent: "%", percentageValue: 76 });
  assert.deepEqual(values["battery.remaining_capacity"].value, {
    amperehourMiliamperehourValue: 15,
    ampereHourMiliamperehour: "Ah",
  });
  assert.deepEqual(values["battery.battery_status"].value, { batteryStatusValues: "re-used" });
});

test("payload builder writes catalog values to BatteryPass JSON pointers", () => {
  const workspace = {
    product: {
      id: "product",
      dpp_id: "DPP-LMT-TEST",
      unique_product_identifier: "https://example.com/p/DPP-LMT-TEST",
      updated_at: "2026-07-23T12:00:00Z",
    },
    profile: { verification_status: "unverified" },
    classification: classifyBattery({ legalCategory: "lmt" }),
    values: {
      "battery.dpp_schema_version": { value: "1.0" },
      "battery.dpp_status": { value: { dppStatusValue: "Active" } },
    },
    items: [{ battery_status_code: "original", verification_status: "unverified" }],
    metrics: [],
    lifecycleEvents: [],
  };
  const payload = buildBatteryPassLmtPayload(workspace, "https://example.com");
  assert.equal(payload.Battery_Passport.IdentifiersAndProductData.DPPSchemaVersion, "1.0");
  assert.deepEqual(payload.Battery_Passport.IdentifiersAndProductData.DPPStatus, { dppStatusValue: "Active" });
});
