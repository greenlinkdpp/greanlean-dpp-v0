import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

const fixturePath = process.env.REFERENCE_FIXTURE_PATH
  || fileURLToPath(new URL("../../fixtures/internal-reference/GreanLean_Reference_Ebike_Catalog_From_EN50604.json", import.meta.url));

const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
const variants = fixture.models.flatMap((model) => model.variants.map((variant) => ({ model, variant })));

test("reference catalog preserves the approved neutral synthetic boundary", () => {
  assert.equal(fixture.fixture_classification, "INTERNAL_SYNTHETIC_REFERENCE");
  assert.equal(fixture.customer_verified, false);
  assert.equal(fixture.registry_submission_allowed, false);
  assert.equal(fixture.regulatory_submission_allowed, false);
  assert.equal(fixture.virtual_tenant.name, "GreanLean Reference Mobility");
  assert.equal(fixture.virtual_tenant.brand, "GreanLean Reference");
  assert.equal(fixture.virtual_tenant.organisation_name, "GreanLean Reference Mobility Ltd. (Synthetic)");
});

test("reference catalog has the deterministic 8/22/8/22/22 topology", () => {
  assert.equal(fixture.models.length, 8);
  assert.equal(variants.length, 22);
  assert.equal(new Set(fixture.models.map((model) => model.variants[0].synthetic_batch)).size, 8);
  assert.equal(new Set(variants.map(({ variant }) => variant.synthetic_sku)).size, 22);
  assert.equal(new Set(variants.map(({ variant }) => variant.synthetic_serial)).size, 22);
  assert.equal(new Set(variants.map(({ variant }) => variant.synthetic_dpp_id)).size, 22);
});

test("derived configuration and energy values are arithmetically reproducible", () => {
  for (const { model, variant } of variants) {
    const match = /^(\d+)S(\d+)P$/u.exec(model.configuration);
    assert.ok(match, model.synthetic_model_code);
    assert.equal(model.series_count, Number(match[1]));
    assert.equal(model.parallel_count, Number(match[2]));
    assert.equal(model.cell_count, Number(match[1]) * Number(match[2]));
    assert.ok(Math.abs(variant.rated_energy_wh_derived - model.voltage_v * variant.capacity_ah) < 0.001);
  }
});

test("source provenance categories remain explicit and do not invent identifiers", () => {
  for (const { variant } of variants) {
    assert.equal(Object.hasOwn(variant, "gtin"), false);
    assert.equal(Object.hasOwn(variant, "registry_id"), false);
    assert.ok(Object.values(variant.source_provenance).every((value) =>
      value === "SOURCE_SPREADSHEET" || value === "DERIVED_ARITHMETIC"));
  }
});

test("source filename is not interpreted as conformity evidence", () => {
  assert.match(fixture.source_interpretation_note, /not evidence|not be treated|cannot be treated/i);
  assert.equal(fixture.global_rules.do_not_infer_compliance_from_filename, true);
  assert.equal(fixture.global_rules.do_not_publish_source_vendor_identity, true);
  assert.equal(fixture.global_rules.do_not_infer_registered_gtin, true);
  assert.match(fixture.global_rules.unknown_chemistry_rule, /Do not infer NMC\/LFP\/NCA/);
});
