import assert from "node:assert/strict";
import test from "node:test";
import { projectBatteryValuesIntoLegacyDpp } from "../../lib/battery/legacyProjection.ts";

test("uses canonical BatteryPass values for duplicated legacy display fields", () => {
  const projected = projectBatteryValuesIntoLegacyDpp({
    esg: [{ carbon_footprint: 62, water_usage: 28 }],
    digitalIdentity: [{ serial_id: "OLD-SERIAL", gtin: "06900000004804" }],
  }, {
    "battery.battery_carbon_footprint_per_functional_unit": {
      "kgCO2-equivalentPerKilowattHourValue": 65,
      "kgCO2-equivalentPerKilowattHour": "kgCO2-eq/kWh",
    },
    "battery.battery_serial_number": "LMT-48V15AH-TEST-001",
  });

  assert.equal(projected.esg[0].carbon_footprint, 65);
  assert.equal(projected.esg[0].water_usage, 28);
  assert.equal(projected.digitalIdentity[0].serial_id, "LMT-48V15AH-TEST-001");
  assert.equal(projected.digitalIdentity[0].gtin, "06900000004804");
});
