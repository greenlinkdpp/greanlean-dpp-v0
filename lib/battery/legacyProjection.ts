type LegacyDppData = {
  esg?: Array<Record<string, any>>;
  digitalIdentity?: Array<Record<string, any>>;
  [key: string]: any;
};

function numericProperty(value: unknown, key: string) {
  if (!value || typeof value !== "object") return null;
  const number = Number((value as Record<string, unknown>)[key]);
  return Number.isFinite(number) ? number : null;
}

export function projectBatteryValuesIntoLegacyDpp<T extends LegacyDppData>(
  data: T,
  values: Record<string, unknown>,
): T {
  const carbonFootprint = numericProperty(
    values["battery.battery_carbon_footprint_per_functional_unit"],
    "kgCO2-equivalentPerKilowattHourValue",
  );
  const serialNumber = values["battery.battery_serial_number"];
  const epcSerial = typeof serialNumber === "string"
    ? serialNumber.replaceAll(/[^A-Za-z0-9]/g, "").slice(0, 20)
    : "";
  return {
    ...data,
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
  } as T;
}
