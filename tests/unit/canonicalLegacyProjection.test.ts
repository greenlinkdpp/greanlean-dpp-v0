import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalPublicationToLegacyDpp,
  isCanonicalPublicationSnapshot,
} from "../../lib/dpp/canonicalLegacyProjection.ts";
import { CANONICAL_MODULE_CODES } from "../../lib/dpp/canonicalPublication.ts";

function emptyModules() {
  return Object.fromEntries(
    CANONICAL_MODULE_CODES.map((code) => [code, { code, fields: [], records: [] }]),
  ) as any;
}

test("canonical publications adapt to the shared DPP presentation contract", () => {
  const modules = emptyModules();
  modules.identity.fields = [
    {
      code: "identity.product_name",
      value: "Battery pack",
      display: { zh: "电池包", en: "Battery pack" },
      label: { zh: "产品名称", en: "Product name" },
      accessLevel: "PUBLIC",
      applicability: "APPLICABLE",
      verificationStatus: "VERIFIED",
      sourceType: "DATABASE",
      evidenceIds: [],
    },
    {
      code: "identity.dpp_id",
      value: "DPP-TEST-001",
      label: { zh: "DPP ID", en: "DPP ID" },
      accessLevel: "PUBLIC",
      applicability: "APPLICABLE",
      verificationStatus: "VERIFIED",
      sourceType: "DATABASE",
      evidenceIds: [],
    },
  ];
  modules.materials.records = [{
    id: "material-1",
    recordType: "material",
    accessLevel: "PUBLIC",
    fields: [{
      code: "materials.material_name",
      value: "Aluminium",
      display: { zh: "铝", en: "Aluminium" },
      label: { zh: "材料", en: "Material" },
      accessLevel: "PUBLIC",
      applicability: "APPLICABLE",
      verificationStatus: "VERIFIED",
      sourceType: "DATABASE",
      evidenceIds: [],
    }],
  }];
  const snapshot: any = {
    schema: "https://greanlean.com/schemas/dpp-publication/1.0",
    schemaVersion: "1.0",
    publication: {
      publicationId: "11111111-1111-4111-8111-111111111111",
      productId: "22222222-2222-4222-8222-222222222222",
      dppId: "DPP-TEST-001",
      version: 1,
      status: "PUBLISHED",
      publishedAt: "2026-07-25T00:00:00.000Z",
      publishedBy: null,
      supersedesPublicationId: null,
      languageCoverage: ["zh", "en"],
    },
    classification: {
      sectorCode: "battery",
      profileKey: "battery.lmt",
      profileVersion: "1.0",
      productGranularity: "item",
    },
    modules,
    evidenceIndex: [],
    audienceManifest: {
      PUBLIC: { fieldCount: 3, evidenceCount: 0 },
    },
    governance: {
      sourceFingerprint: "a".repeat(64),
      generatedAt: "2026-07-25T00:00:00.000Z",
      generatedBy: null,
      sourceTables: [],
      dynamicDataPolicy: {
        includedInSnapshot: false,
        projection: "AUTHORIZED_RUNTIME",
        applicable: true,
      },
    },
    integrity: {
      algorithm: "SHA-256",
      canonicalization: "JCS",
      digest: "b".repeat(64),
      generatedAt: "2026-07-25T00:00:00.000Z",
      anchorStatus: "NOT_CONFIGURED",
    },
  };

  assert.equal(isCanonicalPublicationSnapshot(snapshot), true);
  const result = canonicalPublicationToLegacyDpp(snapshot, {
    id: snapshot.publication.productId,
    main_image: "/battery.png",
    status: "published",
  });
  assert.equal(result.product.name_zh, "电池包");
  assert.equal(result.product.main_image, "/battery.png");
  assert.equal(result.materials[0].material_name_zh, "铝");
  assert.equal(result.publication.publicationId, "DPP-TEST-001:v1");
  assert.equal(result.product.id, "DPP-TEST-001");
  assert.equal("canonicalPublication" in result, false);
  assert.doesNotMatch(JSON.stringify(result), /11111111-1111-4111-8111-111111111111|22222222-2222-4222-8222-222222222222/);
});

test("canonical snapshot detection accepts the legacy short schema identifier", () => {
  assert.equal(isCanonicalPublicationSnapshot({
    schema: "greanlean.dpp.publication",
    modules: {},
    publication: {},
  }), true);
  assert.equal(isCanonicalPublicationSnapshot({
    schema: "https://example.com/unknown-schema",
    modules: {},
    publication: {},
  }), false);
});
