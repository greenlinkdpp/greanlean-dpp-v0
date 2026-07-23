import assert from "node:assert/strict";
import test from "node:test";
import { projectBatteryValuesIntoLegacyDpp } from "../../lib/battery/legacyProjection.ts";

test("uses canonical BatteryPass values for duplicated legacy display fields", () => {
  const projected = projectBatteryValuesIntoLegacyDpp({
    esg: [{ carbon_footprint: 62, water_usage: 28 }],
    digitalIdentity: [{
      serial_id: "OLD-SERIAL",
      gtin: "06900000004804",
      rfid_epc: "urn:epc:id:sgtin:6900000.000480.OLD-SERIAL",
    }],
  }, {
    "battery.battery_carbon_footprint_per_functional_unit": {
      "kgCO2-equivalentPerKilowattHourValue": 65,
      "kgCO2-equivalentPerKilowattHour": "kgCO2-eq/kWh",
    },
    "battery.battery_serial_number": "LMT-48V15AH-TEST-001",
    "battery.battery_model_identifier": "GL-LMT-48V15AH-NMC",
    "battery.battery_mass": { gramKgValue: 4.2, gramKg: "kg" },
    "battery.battery_chemistry": { chemicalCodeValue: "Li-ion NMC" },
    "battery.rated_capacity": {
      amperehourMiliamperehourValue: 15,
      ampereHourMiliamperehour: "Ah",
    },
    "battery.nominal_voltage": { voltValue: 48, volt: "V" },
    "battery.maximum_permitted_battery_power": { wattValue: 750, watt: "W" },
    "battery.initial_round_trip_energy_efficiency": {
      percentageValue: 94,
      percent: "%",
    },
    "battery.expected_lifetime_in_calendar_years": 5,
    "battery.expected_lifetime_number_of_charge_discharge_cycles": 800,
    "battery.temperature_range_idle_state_lower_boundary": {
      celsiusValue: -20,
      degreeCelsius: "°C",
    },
    "battery.temperature_range_idle_state_upper_boundary": {
      celsiusValue: 45,
      degreeCelsius: "°C",
    },
  });

  assert.equal(projected.esg[0].carbon_footprint, 65);
  assert.equal(projected.esg[0].water_usage, 28);
  assert.equal(projected.digitalIdentity[0].serial_id, "LMT-48V15AH-TEST-001");
  assert.equal(projected.digitalIdentity[0].gtin, "06900000004804");
  assert.equal(projected.digitalIdentity[0].rfid_epc, "urn:epc:id:sgtin:6900000.000480.LMT48V15AHTEST001");
  assert.deepEqual(projected.batteryPresentation, {
    modelIdentifier: "GL-LMT-48V15AH-NMC",
    chemistry: "Li-ion NMC",
    massKg: 4.2,
    ratedCapacityAh: 15,
    nominalVoltageV: 48,
    maximumPowerW: 750,
    initialEfficiencyPercent: 94,
    expectedCalendarYears: 5,
    expectedCycles: 800,
    idleTemperatureMinC: -20,
    idleTemperatureMaxC: 45,
    carbonFootprintKgCo2ePerKwh: 65,
  });
});
