import assert from "node:assert/strict";
import test from "node:test";
import { isSyntheticDemoPayload, projectImmutableDpp, provenanceSourceStatement, type ImmutableDppPayload } from "../../lib/v2/audienceProjection.ts";
import { JSON_LD_CONTEXT_VERSION, publicHtml, publicJsonLd, publicPdf } from "../../lib/v2/publicFormats.ts";
import { buildApprovedResolverUrl, normalizeResolverPath } from "../../lib/v2/resolver.ts";

const payload: ImmutableDppPayload = {
  passportId: "passport-a",
  passportIdentifier: "DPP-TEST-001",
  versionNumber: 2,
  schemaVersionId: "schema-v1",
  candidateHash: "a".repeat(64),
  payloadHash: "b".repeat(64),
  publishedAt: "2026-09-25T12:00:00.000Z",
  publicationStatus: "PUBLISHED",
  subject: { type: "ITEM", id: "item-a" },
  fields: [
    { fieldCode: "public.name", value: "Test", accessLevel: "PUBLIC", semanticUri: "https://example.test/name", provenance: { sourceStatement: "Public statement", rawSourceRecord: { secret: true } } },
    { fieldCode: "partner.cost", value: 10, accessLevel: "LEGITIMATE_INTEREST" },
    { fieldCode: "authority.serial", value: "S1", accessLevel: "AUTHORITY_ONLY" },
    { fieldCode: "internal.secret", value: "hidden", accessLevel: "INTERNAL", provenance: { internalFilePath: "/secret", reviewer: "private" } },
  ],
};

test("audience projection uses one immutable version and strictly filters fields", () => {
  const publicProjection = projectImmutableDpp(payload, "PUBLIC");
  const partnerProjection = projectImmutableDpp(payload, "LEGITIMATE_INTEREST");
  const authorityProjection = projectImmutableDpp(payload, "AUTHORITY");
  const internalProjection = projectImmutableDpp(payload, "INTERNAL");
  assert.deepEqual(publicProjection.fields.map((field) => field.fieldCode), ["public.name"]);
  assert.deepEqual(partnerProjection.fields.map((field) => field.fieldCode), ["public.name", "partner.cost"]);
  assert.deepEqual(authorityProjection.fields.map((field) => field.fieldCode), ["public.name", "partner.cost", "authority.serial"]);
  assert.equal(internalProjection.fields.length, 4);
  assert.equal(JSON.stringify(publicProjection).includes("rawSourceRecord"), false);
  assert.equal(JSON.stringify(internalProjection).includes("internalFilePath"), false);
  for (const projection of [publicProjection, partnerProjection, authorityProjection, internalProjection]) {
    assert.equal(projection.version, 2);
    assert.equal(projection.payloadHash, "b".repeat(64));
  }
});

test("HTML, JSON-LD and PDF carry the same publication identity", () => {
  const html = publicHtml(payload, "PUBLIC");
  const jsonLd = publicJsonLd(payload, "PUBLIC") as Record<string, any>;
  const pdf = publicPdf(payload, "PUBLIC");
  for (const value of [html, pdf]) {
    assert.match(value, /DPP-TEST-001/);
    assert.match(value, new RegExp("b".repeat(64)));
    assert.match(value, /schema-v1/);
  }
  assert.equal(jsonLd.contextVersion, JSON_LD_CONTEXT_VERSION);
  assert.equal(jsonLd.profileStatus, "PARTIAL_INTERNAL_PROFILE");
  assert.equal(jsonLd["https://example.test/name"], "Test");
  assert.equal(pdf.startsWith("%PDF-1.4"), true);
});

test("QR target accepts only an approved Resolver origin", () => {
  assert.equal(normalizeResolverPath("//p///DPP-1/"), "/p/DPP-1");
  assert.equal(buildApprovedResolverUrl({ origin: "https://dev.dpp.greanlean.test", identifier: "DPP-1", approvedHosts: ["dev.dpp.greanlean.test"] }), "https://dev.dpp.greanlean.test/r/DPP-1");
  assert.throws(() => buildApprovedResolverUrl({ origin: "https://evil.example", identifier: "DPP-1", approvedHosts: ["dev.dpp.greanlean.test"] }), /RESOLVER_OPEN_REDIRECT/);
  assert.throws(() => buildApprovedResolverUrl({ origin: "https://dev.dpp.greanlean.test", identifier: "https:\/\/evil.example", approvedHosts: ["dev.dpp.greanlean.test"] }), /RESOLVER_IDENTIFIER_INVALID/);
});

test("synthetic demo payloads are detected and unverified provenance is not described as verified", () => {
  const synthetic = {
    ...payload,
    fields: [...payload.fields, { fieldCode: "demo.warning", value: { dataClassification: "SYNTHETIC_DEMO" }, accessLevel: "PUBLIC" as const }],
  };
  assert.equal(isSyntheticDemoPayload(payload), false);
  assert.equal(isSyntheticDemoPayload(synthetic), true);
  assert.match(publicHtml(synthetic, "PUBLIC"), /SYNTHETIC DEMO DATA/);
  assert.match(publicHtml(synthetic, "PUBLIC"), /NOT CUSTOMER VERIFIED/);
  assert.equal(provenanceSourceStatement("UNVERIFIED"), "Source provenance retained; verification status: UNVERIFIED.");
  assert.equal(provenanceSourceStatement("UNVERIFIED").includes("retained and verified"), false);
});
