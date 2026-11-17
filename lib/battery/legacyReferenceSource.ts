import type { Battery71Source } from "./passport71.ts";

const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const quantity = (value: unknown, key: string) => typeof value === "number" ? value : object(value)[key];

/** Uses only the already-authorized legacy public projection, without estimates. */
export function legacyBatteryReferenceSource(input: unknown): Battery71Source {
  const data = object(input);
  const product = object(data.product);
  const profile = object(data.profile);
  const fields = (Array.isArray(data.fields) ? data.fields : []).map((entry) => object(entry)) as Battery71Source["fields"];
  const byCode = new Map(fields.map((field) => [field.fieldCode, field.value]));
  const category = profile.legalCategory === "industrial" ? "Industrial battery" : profile.legalCategory === "ev" ? "EV battery" : "LMT battery";
  const date = byCode.get("battery.manufacturing_date");
  return {
    passportIdentifier: String(product.dpp_id || product.public_slug || ""),
    audience: String(data.accessLevel || "PUBLIC"),
    fields: [
      ...fields,
      { fieldCode: "identity.product", value: { modelCode: profile.batteryModelIdentifier, productName: { en: product.name, zh: product.name_zh || product.name }, product_category: category } },
      { fieldCode: "identity.item", value: { manufacturing_date: typeof date === "string" ? date : undefined } },
      { fieldCode: "battery.battery_category", value: category },
      { fieldCode: "technical.specification", value: {
        product_category: category,
        nominal_voltage_v: quantity(byCode.get("battery.nominal_voltage"), "voltValue"),
        rated_capacity_ah: quantity(byCode.get("battery.rated_capacity"), "amperehourMiliamperehourValue"),
        rated_energy_wh: typeof profile.ratedEnergyKwh === "number" ? profile.ratedEnergyKwh * 1000 : undefined,
        weight_kg: profile.batteryMassKg,
        chemistry: profile.chemistry,
      } },
    ],
  };
}
