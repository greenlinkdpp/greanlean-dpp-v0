import assert from "node:assert/strict";
import test from "node:test";
import { projectImmutableDpp, type ImmutableDppPayload } from "../../lib/v2/audienceProjection.ts";
import {
  businessState,
  formatValue,
  humanizeFieldKey,
  normalizeDppProjection,
  presentationMetadataFor,
  safeExternalUrl,
} from "../../lib/v2/presentation.ts";
import { createAudiencePreviewGrant, verifyAudiencePreviewGrant } from "../../lib/server/v2/audiencePreview.ts";

const payload: ImmutableDppPayload = {
  passportId: "passport-1",
  passportIdentifier: "DPP-DEMO-1",
  versionNumber: 1,
  schemaVersionId: "schema-1",
  candidateHash: "candidate",
  payloadHash: "hash",
  publishedAt: "2026-09-28T00:00:00Z",
  publicationStatus: "PUBLISHED",
  subject: { type: "ITEM", id: "item-1" },
  fields: [
    { fieldCode: "identity.product", accessLevel: "PUBLIC", value: { brand: "Example", productName: "Battery", modelCode: "B-1" } },
    { fieldCode: "technical.specification", accessLevel: "PUBLIC", value: { nominal_voltage_v: 48, rated_capacity_ah: 15, rated_capacity_wh: 720, chemistry: "NMC" } },
    { fieldCode: "sustainability.carbon-footprint", accessLevel: "PUBLIC", verificationStatus: "UNVERIFIED", value: { total_kg_co2e_per_battery: 58.4 } },
    { fieldCode: "documents.public", accessLevel: "PUBLIC", value: [{ title: "Metadata record", document_id: "DOC-1" }] },
    { fieldCode: "repair.service", accessLevel: "LEGITIMATE_INTEREST", value: { interval_months: 12 } },
    { fieldCode: "bms.snapshot", accessLevel: "INTERNAL", value: { soc_pct: 82, soh_pct: 98, cycle_count: 12 } },
    { fieldCode: "future.unknown-field", accessLevel: "PUBLIC", value: { nested_value: "safe fallback" } },
  ],
};

test("resolver projection normalizes into a presentation view model", () => {
  const view = normalizeDppProjection(projectImmutableDpp(payload, "PUBLIC"), "en");
  assert.equal(view.brand, "Example");
  assert.equal(view.productName, "Battery");
  assert.deepEqual(view.metrics.slice(0, 4).map((metric) => metric.value), [48, 15, 720, "NMC"]);
  assert.ok(view.sections.some((section) => section.id === "sustainability"));
});

test("field and unit formatting is human readable", () => {
  assert.equal(humanizeFieldKey("rated_capacity_wh"), "Rated Capacity Wh");
  assert.equal(formatValue(48, "en", "V"), "48 V");
  assert.equal(formatValue(true, "zh"), "是");
  assert.equal(formatValue({ en: "Organic cotton T-shirt", zh: "有机棉 T 恤" }, "zh"), "有机棉 T 恤");
  assert.equal(formatValue({ en: "Organic cotton T-shirt", zh: "有机棉 T 恤" }, "en"), "Organic cotton T-shirt");
});

test("business null states preserve their semantics", () => {
  assert.equal(businessState("UNKNOWN", "en"), "Unknown");
  assert.equal(businessState("NOT_APPLICABLE", "en"), "Not applicable");
  assert.equal(businessState("NOT_AUTHORIZED", "zh"), "无权访问");
});

test("unverified provenance is not presented as verified", () => {
  const field = projectImmutableDpp(payload, "PUBLIC").fields.find((candidate) => candidate.fieldCode.includes("carbon"));
  assert.equal(field?.verificationStatus, "UNVERIFIED");
  assert.doesNotMatch(JSON.stringify(field), /retained and verified/i);
});

test("public projection never contains restricted or internal fields", () => {
  const publicProjection = projectImmutableDpp(payload, "PUBLIC");
  assert.equal(publicProjection.fields.some((field) => field.fieldCode === "repair.service"), false);
  assert.equal(publicProjection.fields.some((field) => field.fieldCode === "bms.snapshot"), false);
  const internalProjection = projectImmutableDpp(payload, "INTERNAL");
  assert.equal(internalProjection.fields.some((field) => field.fieldCode === "bms.snapshot"), true);
});

test("specialized and future field renderers are selected by metadata", () => {
  assert.equal(presentationMetadataFor("bms.snapshot").renderType, "bms");
  assert.equal(presentationMetadataFor("sustainability.carbon-footprint").renderType, "carbon");
  assert.equal(presentationMetadataFor("documents.public").renderType, "documents");
  assert.equal(presentationMetadataFor("future.unknown-field").renderType, "key-value");
  assert.equal(presentationMetadataFor("future.unknown-field").section, "technical");
});

test("external links accept HTTPS only", () => {
  assert.equal(safeExternalUrl("https://example.com/document.pdf"), "https://example.com/document.pdf");
  assert.equal(safeExternalUrl("javascript:alert(1)"), null);
  assert.equal(safeExternalUrl("http://example.com"), null);
});

test("audience preview requires a valid bounded PreProd server signature", () => {
  const previous = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "unit-test-server-secret";
  const now = 2_000_000_000;
  const grant = createAudiencePreviewGrant("DPP-DEMO-1", "AUTHORITY", now + 600);
  assert.equal(verifyAudiencePreviewGrant({ host: "greanlean-dpp-preprod.vercel.app", identifier: "DPP-DEMO-1", role: "AUTHORITY", grant, now }), true);
  assert.equal(verifyAudiencePreviewGrant({ host: "greanlean-dpp-preprod.vercel.app", identifier: "DPP-DEMO-1", role: "MANUFACTURER", grant, now }), false);
  assert.equal(verifyAudiencePreviewGrant({ host: "greanlean-dpp.vercel.app", identifier: "DPP-DEMO-1", role: "AUTHORITY", grant, now }), false);
  assert.equal(verifyAudiencePreviewGrant({ host: "greanlean-dpp-preprod.vercel.app", identifier: "DPP-DEMO-1", role: "AUTHORITY", grant, now: now + 601 }), false);
  if (previous === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SUPABASE_SERVICE_ROLE_KEY = previous;
});
