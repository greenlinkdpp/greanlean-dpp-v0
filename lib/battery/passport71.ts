import catalog from "../../config/battery/eu-battery-passport-datapoints-v2.0.json" with { type: "json" };
import { demoDigitalLinkPath, demoDigitalLinkIdentity } from "../demoDigitalLinks.ts";

export const BATTERY_71_CHAPTERS = catalog.chapters;
export type Battery71Category = "ev" | "lmt" | "industrial" | "other";
export type Battery71State = "provided" | "missing" | "restricted" | "not_applicable" | "future" | "duplicate";
export type Battery71Source = {
  passportIdentifier?: string;
  audience: string;
  fields: Array<{ fieldCode: string; value: unknown; unit?: string | null; verificationStatus?: string; observedAt?: string | null }>;
};
export type Battery71Row = {
  id: string; number: number; chapter: string; labelEn: string; labelZh: string;
  access: string; dynamic: boolean; unit: string | null; applicability: string;
  state: Battery71State; value: unknown; verificationStatus: string | null; observedAt: string | null;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function present(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.some(present);
  if (typeof value === "object") return Object.values(record(value)).some(present);
  return true; // Zero and false are supplied values.
}

export function battery71Category(source: Battery71Source): Battery71Category | null {
  const fields = new Map(source.fields.map((field) => [field.fieldCode, field.value]));
  const technical = record(fields.get("technical.specification"));
  const product = record(fields.get("identity.product"));
  const value = fields.get("battery.battery_category") || technical.product_category || product.product_category;
  const category = String(record(value).en || record(value).zh || value || "").toLowerCase();
  if (/industrial|energy storage|工业|储能/.test(category)) return "industrial";
  if (/(?:^|[ _.-])lmt(?:$|[ _.-])|e-bike|轻型交通|轻型运输/.test(category)) return "lmt";
  if (/(?:^|[ _.-])ev(?:$|[ _.-])|electric vehicle|电动汽车/.test(category)) return "ev";
  if (source.fields.some((field) => field.fieldCode.startsWith("battery.")) || /battery|电池/.test(category)) return "other";
  return null;
}

/** Maps an already-authorized projection to presentation rows. Never fetches
 * claims or privileged data, changes published payloads, or estimates values. */
export function buildBattery71Rows(source: Battery71Source, category = battery71Category(source) || "other"): Battery71Row[] {
  const byCode = new Map(source.fields.map((field) => [field.fieldCode, field]));
  const object = (code: string) => record(byCode.get(code)?.value);
  const product = object("identity.product");
  const item = object("identity.item");
  const technical = object("technical.specification");
  const organisations = object("enterprise.organisations");
  const manufacturer = record(organisations.manufacturer);
  const materials = object("sustainability.materials");
  const recycled = object("sustainability.recycled-content");
  const compliance = object("compliance.synthetic");
  const repair = object("repair.service");
  const bms = object("bms.snapshot");
  const durability = object("performance.durability");
  const endOfLife = object("end-of-life");
  const identity = source.passportIdentifier ? demoDigitalLinkIdentity(source.passportIdentifier) : undefined;
  const digitalPath = source.passportIdentifier ? demoDigitalLinkPath(source.passportIdentifier) : null;
  const documents = byCode.get("documents.public")?.value;
  const documentValues = Array.isArray(documents) ? documents.map(record) : [];
  const document = (types: string[]) => documentValues.filter((doc) => types.includes(String(doc.document_type))).map((doc) => ({
    title: doc.title,
    url: typeof doc.file === "string" ? `/api/demo-document?file=${encodeURIComponent(doc.file)}` : doc.url,
  }));
  const mapped = new Map<number, { value: unknown; source: string }>();
  const add = (number: number, value: unknown, sourceCode: string) => { if (present(value)) mapped.set(number, { value, source: sourceCode }); };
  add(1, digitalPath ? `https://www.greanlean.com${digitalPath}` : item.unique_product_identifier, "identity.item");
  add(2, organisations.responsible_economic_operator, "enterprise.organisations");
  add(3, manufacturer.name || product.manufacturer, manufacturer.name ? "enterprise.organisations" : "identity.product");
  add(4, manufacturer.address, "enterprise.organisations");
  add(5, { website: manufacturer.website, contact: manufacturer.contact }, "enterprise.organisations");
  add(6, category === "other" ? technical.product_category : { en: { ev: "EV battery", lmt: "LMT battery", industrial: "Industrial battery" }[category], zh: { ev: "电动汽车电池", lmt: "轻型交通工具电池", industrial: "工业电池" }[category] }, "technical.specification");
  add(7, { model: product.modelCode, batch: item.batch_number, serial: identity?.serialNumber || item.serial_number, gtin: identity?.gtin }, "identity.item");
  add(8, item.manufacturing_place || technical.manufacturing_place, "identity.item");
  add(9, typeof item.manufacturing_date === "string" ? item.manufacturing_date.slice(0, 7) : item.manufacturing_date, "identity.item");
  add(10, technical.weight_kg, "technical.specification");
  add(11, technical.rated_capacity_ah, "technical.specification");
  add(12, technical.chemistry, "technical.specification");
  add(13, materials.hazardous_substances, "sustainability.materials");
  add(14, compliance.extinguishing_agent, "compliance.synthetic");
  add(15, materials.critical_raw_materials, "sustainability.materials");
  add(20, recycled.recycled_cobalt_pct, "sustainability.recycled-content");
  add(21, recycled.recycled_lithium_pct, "sustainability.recycled-content");
  add(22, recycled.recycled_nickel_pct, "sustainability.recycled-content");
  add(23, recycled.recycled_lead_pct, "sustainability.recycled-content");
  add(24, materials.renewable_content_pct, "sustainability.materials");
  add(26, technical.minimum_voltage_v, "technical.specification");
  add(27, technical.nominal_voltage_v, "technical.specification");
  add(28, technical.charge_cutoff_voltage_v ?? technical.maximum_voltage_v, "technical.specification");
  add(29, technical.original_power_capability_w, "technical.specification");
  add(30, technical.maximum_power_w, "technical.specification");
  add(31, technical.cycle_life, "technical.specification");
  add(32, technical.cycle_life_reference_test, "technical.specification");
  add(33, technical.capacity_threshold_pct, "technical.specification");
  add(34, technical.storage_temperature_range, "technical.specification");
  add(35, present(repair.warranty_months) ? { months: repair.warranty_months } : undefined, "repair.service");
  add(36, technical.initial_round_trip_efficiency_pct, "technical.specification");
  add(37, technical.round_trip_efficiency_at_50_pct, "technical.specification");
  add(40, compliance.separate_collection_symbol, "compliance.synthetic");
  add(41, compliance.symbols_for_cadmium_and_lead, "compliance.synthetic");
  add(42, document(["DECLARATION_OF_CONFORMITY", "EU_DECLARATION_OF_CONFORMITY"]), "documents.public");
  // Some published examples use the general DECLARATION type: select CE only.
  if (!mapped.has(42)) {
    const ce = documentValues.filter((doc) => String(record(doc.title).en || doc.title).includes("CE Declaration of Conformity"));
    add(42, ce.map((doc) => ({ title: doc.title, url: typeof doc.file === "string" ? `/api/demo-document?file=${encodeURIComponent(doc.file)}` : doc.url })), "documents.public");
  }
  add(43, endOfLife.collection_route, "end-of-life");
  add(44, document(["USER_MANUAL", "USER_GUIDE", "OPERATING_INSTRUCTIONS"]), "documents.public");
  add(45, { cathode: materials.cathode_material, anode: materials.anode_material, electrolyte: materials.electrolyte_type }, "sustainability.materials");
  add(46, repair.part_numbers, "repair.service");
  add(47, repair.spare_parts_contact, "repair.service");
  add(48, byCode.get("repair.disassembly")?.value, "repair.disassembly");
  add(49, compliance.safety_warning, "compliance.synthetic");
  add(50, document(["TEST_REPORT"]), "documents.public");
  const dynamic: Record<number, unknown> = {
    51: bms.rated_capacity_ah, 52: bms.capacity_fade_pct, 53: bms.remaining_power_w,
    54: bms.power_fade_pct, 55: bms.internal_resistance_ohm, 56: bms.internal_resistance_increase_pct,
    57: bms.round_trip_efficiency_pct, 58: bms.round_trip_efficiency_fade_pct,
    61: bms.soce_pct, 62: bms.remaining_capacity_ah, 63: bms.remaining_power_w,
    64: bms.round_trip_efficiency_pct, 65: bms.self_discharge_rate_pct, 66: bms.internal_resistance_ohm,
    68: bms.cycle_count, 70: bms.temperature_c, 71: bms.soc_pct,
  };
  for (const [number, value] of Object.entries(dynamic)) add(Number(number), value, "bms.snapshot");
  add(59, technical.expected_lifetime_reference_cycles, "technical.specification");
  add(60, technical.design_life_years, "technical.specification");
  add(67, item.battery_status || durability.battery_status, "identity.item");
  if (!mapped.has(68)) add(68, durability.cycle_count, "performance.durability");
  if (!mapped.has(70)) add(70, durability.temperature_c, "performance.durability");
  if (!mapped.has(71)) add(71, durability.state_of_charge_pct, "performance.durability");

  const audienceRank = ({ PUBLIC: 0, LEGITIMATE_INTEREST: 1, AUTHORITY: 2, AUTHORITY_ONLY: 2, INTERNAL: 3 } as Record<string, number>)[source.audience.toUpperCase()] ?? 0;
  return catalog.fields.map((field) => {
    const applicability = category === "other" ? "unconfirmed" : field.status[category];
    const requiredRank = ({ public: 0, professional: 1, regulator: 2 } as Record<string, number>)[field.access];
    const base = { id: field.id, number: field.number, chapter: field.chapter, labelEn: field.nameEn, labelZh: field.nameZh, access: field.access, dynamic: field.dynamic, unit: field.unit, applicability, value: null, verificationStatus: null, observedAt: null };
    if (["future", "duplicate", "not_applicable"].includes(applicability)) return { ...base, state: applicability as Battery71State };
    if (audienceRank < requiredRank) return { ...base, state: "restricted" };
    const direct = [field.canonicalFieldCode, ...field.legacyFieldCodes].map((code) => byCode.get(code)).find((value) => value && present(value.value));
    const fallback = mapped.get(field.number);
    const sourceField = direct || (fallback ? byCode.get(fallback.source) : undefined);
    const value = direct?.value ?? fallback?.value;
    if (!present(value) || value === "UNKNOWN" || value === "NOT_PROVIDED") return { ...base, state: "missing" };
    if (value === "NOT_APPLICABLE") return { ...base, state: "not_applicable" };
    if (["REDACTED", "NOT_AUTHORIZED"].includes(String(value))) return { ...base, state: "restricted" };
    return { ...base, state: "provided", value, unit: direct?.unit || field.unit, verificationStatus: sourceField?.verificationStatus || "UNVERIFIED", observedAt: sourceField?.observedAt || (sourceField?.fieldCode === "bms.snapshot" && typeof bms.captured_at === "string" ? bms.captured_at : null) };
  });
}
