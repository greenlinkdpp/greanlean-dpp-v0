import assert from "node:assert/strict";
import test from "node:test";
import { BATTERY_71_CHAPTERS, battery71Category, buildBattery71Rows, type Battery71Source } from "../../lib/battery/passport71.ts";
import { publicHtml } from "../../lib/v2/publicFormats.ts";

const source = (fields: Battery71Source["fields"], audience = "PUBLIC"): Battery71Source => ({ audience, fields });

test("the full catalog retains all 71 numbered data points, including duplicate and deferred entries", () => {
  for (const category of ["ev", "lmt", "industrial"] as const) {
    const rows = buildBattery71Rows(source([]), category);
    assert.equal(rows.length, 71);
    assert.equal(new Set(rows.map((row) => row.id)).size, 71);
    assert.deepEqual(rows.map((row) => row.number), Array.from({ length: 71 }, (_, i) => i + 1));
    assert.equal(rows.find((row) => row.id === "DP-25")?.state, "duplicate");
    assert.equal(rows.find((row) => row.id === "DP-17")?.state, "future");
    assert.equal(new Set(rows.map((row) => row.chapter)).size, BATTERY_71_CHAPTERS.length);
  }
});

test("access classes hide values before considering direct fields or aggregate fallback data", () => {
  const fields = [
    { fieldCode: "battery.economic_operator_information", value: "REGULATOR_SECRET" },
    { fieldCode: "battery.remaining_capacity", value: 12.7, unit: "Ah" },
    { fieldCode: "bms.snapshot", value: { soc_pct: 64, captured_at: "2026-10-01T12:00:00Z" } },
  ];
  const publicRows = buildBattery71Rows(source(fields), "lmt");
  for (const id of ["DP-02", "DP-62", "DP-71"]) {
    const row = publicRows.find((row) => row.id === id)!;
    assert.equal(row.state, "restricted");
    assert.equal(row.value, null);
    assert.equal(row.observedAt, null);
  }
  const professional = buildBattery71Rows(source(fields, "LEGITIMATE_INTEREST"), "lmt");
  assert.equal(professional.find((row) => row.id === "DP-02")?.value, null);
  assert.equal(professional.find((row) => row.id === "DP-62")?.value, 12.7);
  assert.equal(professional.find((row) => row.id === "DP-71")?.observedAt, "2026-10-01T12:00:00Z");
  const authority = buildBattery71Rows(source(fields, "AUTHORITY"), "lmt");
  assert.equal(authority.find((row) => row.id === "DP-02")?.value, "REGULATOR_SECRET");
});

test("battery category selects the same 71-entry view without imposing EV fields on LMT or industrial batteries", () => {
  const fields = [{ fieldCode: "battery.state_of_certified_energy_soce", value: 90 }];
  assert.equal(buildBattery71Rows(source(fields, "INTERNAL"), "ev").find((row) => row.id === "DP-61")?.value, 90);
  for (const category of ["lmt", "industrial"] as const) {
    const row = buildBattery71Rows(source(fields, "INTERNAL"), category).find((row) => row.id === "DP-61")!;
    assert.equal(row.state, "not_applicable");
    assert.equal(row.value, null);
  }
  assert.equal(battery71Category(source([{ fieldCode: "technical.specification", value: { product_category: "E-bike battery pack" } }])), "lmt");
  assert.equal(battery71Category(source([{ fieldCode: "identity.product", value: { product_category: { en: "Industrial energy storage" } } }])), "industrial");
  assert.equal(battery71Category(source([{ fieldCode: "technical.specification", value: { product_category: "Consumer electronics" } }])), null);
});

test("zero is provided; missing quantities are never estimated from related performance values", () => {
  const rows = buildBattery71Rows(source([
    { fieldCode: "technical.specification", value: { rated_capacity_ah: 20, rated_power_kw: 7.2 } },
    { fieldCode: "bms.snapshot", value: { soh_pct: 94, cycle_count: 0 } },
    { fieldCode: "enterprise.organisations", value: { manufacturer: { address: "POSTAL ADDRESS ONLY" } } },
    { fieldCode: "sustainability.carbon-footprint", value: { renewable_energy_pct: 42 } },
  ], "INTERNAL"), "lmt");
  assert.equal(rows.find((row) => row.id === "DP-11")?.value, 20);
  assert.equal(rows.find((row) => row.id === "DP-68")?.state, "provided");
  assert.equal(rows.find((row) => row.id === "DP-68")?.value, 0);
  for (const id of ["DP-08", "DP-24", "DP-29", "DP-51", "DP-52", "DP-62"]) assert.equal(rows.find((row) => row.id === id)?.state, "missing");
});

test("the stable GS1 item identity is used without changing the published source payload", () => {
  const input: Battery71Source = { passportIdentifier: "DPP-GLR-LMT-000002", audience: "PUBLIC", fields: [{ fieldCode: "identity.product", value: { modelCode: "GLR-S36B" } }, { fieldCode: "identity.item", value: { serial_number: "LEGACY-INTERNAL-SERIAL" } }] };
  const before = JSON.stringify(input);
  const rows = buildBattery71Rows(input, "lmt");
  assert.equal(rows.find((row) => row.id === "DP-01")?.value, "https://www.greanlean.com/01/09506000134352/21/GLR-LMT-000002");
  assert.equal((rows.find((row) => row.id === "DP-07")?.value as Record<string, unknown>).serial, "GLR-LMT-000002");
  assert.equal(JSON.stringify(input), before);
});

test("the standalone public HTML also renders 71 entries from the authorized publication", () => {
  const html = publicHtml({
    passportId: "test", passportIdentifier: "BATTERY-TEST", versionNumber: 1, schemaVersionId: "schema",
    candidateHash: "candidate", publishedAt: "2026-11-03T00:00:00Z", publicationStatus: "PUBLISHED",
    subject: { type: "ITEM", id: "item" }, fields: [
      { fieldCode: "battery.battery_category", value: "LMT", accessLevel: "PUBLIC" },
      { fieldCode: "battery.remaining_capacity", value: "PRIVATE-CAPACITY", accessLevel: "LEGITIMATE_INTEREST" },
    ],
  }, "PUBLIC");
  assert.equal((html.match(/data-battery-field=/g) || []).length, 71);
  assert.ok(html.includes("DP-71"));
  assert.ok(!html.includes("PRIVATE-CAPACITY"));
});
