import assert from "node:assert/strict";
import test from "node:test";
import { BATTERY_REFERENCE_SECTIONS, buildBatteryReferenceModel } from "../../lib/battery/referencePassport.ts";
import { batteryIllustrationIdentity, batteryIllustrationSvg } from "../../lib/battery/demoIllustration.ts";
import type { Battery71Source } from "../../lib/battery/passport71.ts";
import { legacyBatteryReferenceSource } from "../../lib/battery/legacyReferenceSource.ts";

const sample = (identifier = "DPP-GLR-LMT-000002", marked = true): Battery71Source => ({
  passportIdentifier: identifier, audience: "PUBLIC", fields: [
    { fieldCode: "demo.warning", value: { classification: marked ? "SYNTHETIC_DEMO" : "CUSTOMER" } },
    { fieldCode: "technical.specification", value: { product_category: identifier.includes("ESS") ? "Industrial energy storage" : "E-bike battery pack", nominal_voltage_v: 36, rated_capacity_ah: 18, rated_energy_wh: 648, chemistry: "NMC" } },
    { fieldCode: "identity.product", value: { modelCode: "GLR-S36B", productName: { zh: "演示电池", en: "Demo battery" } } },
    { fieldCode: "bms.snapshot", value: { soh_pct: 94, soc_pct: 64, cycle_count: 212 } },
    { fieldCode: "sustainability.materials", value: { copper_pct: 4, aluminium_pct: 8, steel_pct: 3, plastic_pct: 12, electronics_pct: 6 } },
    { fieldCode: "battery.remaining_capacity", value: "DO-NOT-PUBLISH-RESTRICTED-CLAIM" },
  ],
});

test("the reference layout groups exactly 71 fields into its eight sections", () => {
  for (const id of ["DPP-GLR-LMT-000001", "DPP-GLR-LMT-000002", "DPP-GLR-LMT-000003", "DPP-DEMO-ESS-000001"]) {
    const input = sample(id);
    const before = JSON.stringify(input);
    const model = buildBatteryReferenceModel(input);
    assert.equal(model.rows.length, 71);
    assert.equal(BATTERY_REFERENCE_SECTIONS.length, 8);
    assert.equal(new Set(model.rows.map((row) => row.section)).size, 8);
    assert.ok(model.rows.some((row) => row.cells.length > 0));
    assert.ok(model.rows.filter((row) => row.state === "restricted").every((row) => row.cells.length === 0));
    assert.equal(model.rows.find((row) => row.number === 61)?.state, "not_applicable");
    assert.equal(JSON.stringify(input), before);
    assert.ok(!JSON.stringify(model).includes("DO-NOT-PUBLISH-RESTRICTED-CLAIM"));
  }
});

test("synthetic supplementation requires both a known demo ID and a synthetic marker", () => {
  for (const input of [sample("REAL-CUSTOMER"), sample("DPP-GLR-LMT-000002", false)]) {
    const model = buildBatteryReferenceModel(input);
    assert.equal(model.synthetic, false);
    assert.ok(model.rows.every((row) => !row.generated));
    assert.deepEqual(model.rows.find((row) => row.number === 62)?.cells, []);
    assert.equal(model.stats.mass, "—");
  }
});

test("the golf-cart showcase supplies 71 authored examples without reading restricted claims", () => {
  const input = sample("DPP-DEMO-GOLF-000001");
  input.fields.find(field => field.fieldCode === "identity.product")!.value = { modelCode: "GLR-GC51-105", productName: "Golf cart battery" };
  input.fields.find(field => field.fieldCode === "technical.specification")!.value = { product_category: "Industrial traction battery", nominal_voltage_v: 51.2, rated_capacity_ah: 105, rated_energy_wh: 5376, weight_kg: 46, chemistry: "LFP" };
  const before = JSON.stringify(input);
  const model = buildBatteryReferenceModel(input);
  assert.equal(model.completeShowcase, true);
  assert.equal(model.rows.length, 71);
  assert.ok(model.rows.every(row => row.cells.length > 0 && !row.generated));
  assert.equal(model.rows.find(row => row.number === 62)?.cells[0].value, 102.9);
  assert.equal(model.rows.find(row => row.number === 71)?.cells[0].value, 82);
  assert.ok(!JSON.stringify(model.rows).includes("DO-NOT-PUBLISH-RESTRICTED-CLAIM"));
  assert.equal(JSON.stringify(input), before);
  for (const mismatch of [
    { ...input, passportIdentifier: "REAL-CUSTOMER" },
    { ...input, fields: input.fields.filter(field => field.fieldCode !== "demo.warning") },
    { ...input, fields: input.fields.map(field => field.fieldCode === "identity.product" ? { ...field, value: { modelCode: "OTHER" } } : field) },
  ]) assert.equal(buildBatteryReferenceModel(mismatch).completeShowcase, false);
});

test("supplemented health, capacity, power and resistance values remain consistent", () => {
  const model = buildBatteryReferenceModel({ ...sample(), audience: "INTERNAL" });
  const value = (n: number, index = 0) => model.rows.find((row) => row.number === n)!.cells[index].value;
  assert.equal(value(25), value(51));
  assert.equal(value(52), 6);
  assert.equal(value(62), 16.92);
  assert.equal(value(53), value(63));
  assert.equal(value(53), 676.8);
  assert.equal(value(55), value(66));
  assert.equal(value(56), 15);
  assert.equal(value(59), 588);
  assert.equal(value(68), 212);
  assert.equal(value(71), 64);
  assert.equal(model.materials.find((row) => row[1] === "Copper")?.[3], 4);
  assert.ok(Math.abs(model.materials.reduce((sum, row) => sum + row[3], 0) - 100) < 0.001);
});

test("the GS1 identity and generated attachments stay bound to the selected demo", () => {
  const model = buildBatteryReferenceModel(sample());
  assert.equal(model.serial, "GLR-LMT-000002");
  assert.equal(model.url, "https://www.greanlean.com/01/09506000134352/21/GLR-LMT-000002");
  assert.equal(batteryIllustrationIdentity("DPP-GLR-LMT-000001", "label")?.model, "GLR-P25A");
  assert.equal(batteryIllustrationIdentity("DPP-GLR-LMT-000003", "label")?.model, "GLR-X48C");
  assert.equal(batteryIllustrationIdentity("REAL-CUSTOMER", "label"), null);
  assert.equal(batteryIllustrationIdentity("DPP-GLR-LMT-000002", "../secret"), null);
  const svg = batteryIllustrationSvg(model.id, "serial", true, '<svg viewBox="0 0 49 49"><path d="M0 0"/></svg>')!;
  assert.match(svg, /viewBox="0 0 49 49"/);
  assert.match(svg, /GLR-LMT-000002/);
  assert.match(svg, /DEMO ONLY/);
  assert.match(svg, /非实物照片、检测报告或合规证明/);
});

test("reference numbering preserves the semantic identity of labels, documents and C-rates", () => {
  const input = { ...sample(), audience: "INTERNAL" };
  input.fields.push({ fieldCode: "documents.public", value: [{ document_type: "DECLARATION_OF_CONFORMITY", title: "SOURCE-DECLARATION", file: "round-b2-glr-s36b-03.html" }] });
  const rows = buildBatteryReferenceModel(input).rows;
  const row = (n: number) => rows.find((item) => item.number === n)!;
  assert.equal(row(39).cells[0].en, "Test charge C-rate");
  assert.equal(row(40).cells[0].en, "Test discharge C-rate");
  assert.match(row(41).labelZh, /电池标签/);
  assert.equal(row(41).cells[0].en, "Separate collection");
  assert.match(row(42).labelZh, /镉/);
  assert.equal(row(42).cells[0].en, "Label note");
  assert.match(row(43).labelZh, /符合性声明/);
  assert.match(JSON.stringify(row(43).cells), /SOURCE-DECLARATION/);
  assert.equal(row(46).cells[0].en, "Cathode");
  assert.ok(row(47).cells.some((entry) => entry.en === "BMS part number"));
  assert.ok(row(47).cells.some((entry) => entry.en === "Spare-parts contact"));
});

test("legacy battery pages reuse their public identity and quantities without inventing telemetry", () => {
  const source = legacyBatteryReferenceSource({
    product: { dpp_id: "LEGACY-LMT", name: "Legacy battery", name_zh: "旧版电池" },
    profile: { legalCategory: "lmt", batteryModelIdentifier: "48V15AH", ratedEnergyKwh: 0.72, batteryMassKg: 4.2, chemistry: "Li-ion NMC" },
    accessLevel: "PUBLIC", fields: [
      { fieldCode: "battery.battery_category", value: { batteryCategoryValue: "LMT battery" } },
      { fieldCode: "battery.nominal_voltage", value: { volt: "V", voltValue: 48 } },
      { fieldCode: "battery.rated_capacity", value: { amperehourMiliamperehourValue: 15 } },
      { fieldCode: "battery.manufacturing_date", value: "2026-06-30" },
    ],
  });
  const model = buildBatteryReferenceModel(source);
  assert.equal(model.synthetic, false);
  assert.equal(model.category, "lmt");
  assert.equal(model.model, "48V15AH");
  assert.equal(model.date, "2026-06");
  assert.equal(model.serial, "—");
  assert.deepEqual(model.stats, { voltage: 48, capacity: 15, energy: 720, mass: 4.2, chemistry: "Li-ion NMC" });
  assert.deepEqual(model.rows.find((row) => row.number === 71)?.cells, []);
});
