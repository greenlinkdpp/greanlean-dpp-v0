type LegacyDppData = {
  esg?: Array<Record<string, any>>;
  digitalIdentity?: Array<Record<string, any>>;
  batteryPresentation?: Record<string, unknown>;
  [key: string]: any;
};

function numericProperty(value: unknown, key: string) {
  if (!value || typeof value !== "object") return null;
  const number = Number((value as Record<string, unknown>)[key]);
  return Number.isFinite(number) ? number : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function projectBatteryValuesIntoLegacyDpp<T extends LegacyDppData>(
  data: T,
  values: Record<string, unknown>,
): T & { batteryPresentation: Record<string, unknown> } {
  const carbonFootprint = numericProperty(
    values["battery.battery_carbon_footprint_per_functional_unit"],
    "kgCO2-equivalentPerKilowattHourValue",
  );
  const serialNumber = values["battery.battery_serial_number"];
  const epcSerial = typeof serialNumber === "string"
    ? serialNumber.replaceAll(/[^A-Za-z0-9]/g, "").slice(0, 20)
    : "";
  const mass = numericProperty(values["battery.battery_mass"], "gramKgValue");
  const ratedCapacity = numericProperty(
    values["battery.rated_capacity"],
    "amperehourMiliamperehourValue",
  );
  const nominalVoltage = numericProperty(values["battery.nominal_voltage"], "voltValue");
  const maximumPower = numericProperty(
    values["battery.maximum_permitted_battery_power"],
    "wattValue",
  );
  const initialEfficiency = numericProperty(
    values["battery.initial_round_trip_energy_efficiency"],
    "percentageValue",
  );
  const expectedYears = Number(values["battery.expected_lifetime_in_calendar_years"]);
  const expectedCycles = Number(
    values["battery.expected_lifetime_number_of_charge_discharge_cycles"],
  );
  const idleTemperatureMin = numericProperty(
    values["battery.temperature_range_idle_state_lower_boundary"],
    "celsiusValue",
  );
  const idleTemperatureMax = numericProperty(
    values["battery.temperature_range_idle_state_upper_boundary"],
    "celsiusValue",
  );
  const chemistryValue = values["battery.battery_chemistry"];
  const chemistry = chemistryValue && typeof chemistryValue === "object"
    ? stringValue((chemistryValue as Record<string, unknown>).chemicalCodeValue)
    : stringValue(chemistryValue);
  return {
    ...data,
    batteryPresentation: {
      modelIdentifier: stringValue(values["battery.battery_model_identifier"]),
      chemistry,
      massKg: mass,
      ratedCapacityAh: ratedCapacity,
      nominalVoltageV: nominalVoltage,
      maximumPowerW: maximumPower,
      initialEfficiencyPercent: initialEfficiency,
      expectedCalendarYears: Number.isFinite(expectedYears) ? expectedYears : null,
      expectedCycles: Number.isFinite(expectedCycles) ? expectedCycles : null,
      idleTemperatureMinC: idleTemperatureMin,
      idleTemperatureMaxC: idleTemperatureMax,
      carbonFootprintKgCo2ePerKwh: carbonFootprint,
    },
    esg: (data.esg || []).map((row, index) => (
      index === 0 && carbonFootprint !== null
        ? { ...row, carbon_footprint: carbonFootprint }
        : row
    )),
    digitalIdentity: (data.digitalIdentity || []).map((row, index) => (
      index === 0 && typeof serialNumber === "string" && serialNumber
        ? {
          ...row,
          serial_id: serialNumber,
          rfid_epc: typeof row.rfid_epc === "string" && epcSerial
            ? row.rfid_epc.replace(/[^.]+$/, epcSerial)
            : row.rfid_epc,
        }
        : row
    )),
  } as T & { batteryPresentation: Record<string, unknown> };
}
