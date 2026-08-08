import assert from "node:assert/strict";
import test from "node:test";
import { CANONICAL_MODULE_CODES } from "../../lib/dpp/canonicalPublication.ts";
import { canonicalJson } from "../../lib/server/dppCanonicalization.ts";
import {
  buildDppPublicationCandidateFromSources,
  finalizeDppPublicationCandidate,
  projectionContainsRestrictedFields,
  projectionForAudience,
  type DppPublicationSources,
} from "../../lib/server/dppPublicationCandidate.ts";

function fixture(): DppPublicationSources {
  return {
    product: {
      id: "10000000-0000-4000-8000-000000000001",
      name: "Test battery",
      name_zh: "测试电池",
      description: "A product",
      description_zh: "一个产品",
      brand: "GREANLEAN",
      sku: "BAT-001",
      dpp_id: "DPP-TEST-001",
      status: "draft",
      sector_code: "battery",
      dpp_profile_key: "battery.lmt",
      granularity_level: "item",
      updated_at: "2026-07-25T10:00:00.000Z",
      created_at: "2026-07-20T10:00:00.000Z",
    },
    profile: {
      id: "20000000-0000-4000-8000-000000000001",
      profile_key: "battery.lmt",
      schema_version: "1.3.0",
    },
    templates: [
      {
        id: "30000000-0000-4000-8000-000000000001",
        field_key: "battery_public_note",
        field_label: "Public note",
        field_label_zh: "公开说明",
        module_key: "sector",
        visibility_level: "public",
      },
      {
        id: "30000000-0000-4000-8000-000000000002",
        field_key: "battery_internal_note",
        field_label: "Internal note",
        field_label_zh: "内部说明",
        module_key: "sector",
        visibility_level: "internal",
      },
    ],
    validationRules: [],
    digitalIdentity: [{
      id: "40000000-0000-4000-8000-000000000001",
      product_uuid: "https://greanlean.com/p/DPP-TEST-001",
      gtin: "0690000000001",
      batch_id: "BATCH-001",
      serial_id: "SERIAL-001",
      digital_link_url: "https://greanlean.com/p/DPP-TEST-001",
    }],
    materials: [],
    bom: [],
    esg: [],
    sectorFieldValues: [
      {
        id: "50000000-0000-4000-8000-000000000001",
        field_key: "battery_public_note",
        field_value: "Public value",
        visibility_level: "public",
        evidence_status: "verified",
        source_type: "manufacturer",
        updated_at: "2026-07-25T09:00:00.000Z",
      },
      {
        id: "50000000-0000-4000-8000-000000000002",
        field_key: "battery_internal_note",
        field_value: "Internal value",
        visibility_level: "internal",
        evidence_status: "verified",
        source_type: "internal",
        updated_at: "2026-07-25T09:00:00.000Z",
      },
    ],
    suppliers: [],
    supplierProducts: [],
    traceability: [],
    certificates: [],
    documents: [],
    evidenceLinks: [],
    fileAssets: [],
    fileVersions: [],
    fieldEvidenceLinks: [],
    circularity: [],
    consumerTransparency: [],
    dataGovernance: [],
    lifecycleEvents: [],
    battery: {
      modelProfile: {
        id: "60000000-0000-4000-8000-000000000001",
        legal_category_code: "lmt",
        technical_variant_code: "default",
        passport_applicability: "REQUIRED",
        verification_status: "verified",
        source_type: "manufacturer",
        updated_at: "2026-07-25T08:00:00.000Z",
      },
      fieldValues: [
        {
          id: "70000000-0000-4000-8000-000000000000",
          value_json: "BATTERY-SERIAL-001",
          verification_status: "verified",
          data_source: "manufacturer",
          field_definition: {
            field_code: "battery.battery_serial_number",
            label_en: "Battery serial number",
            label_zh: "电池序列号",
            access_level_code: "PUBLIC",
            data_behavior: "STATIC",
          },
        },
        {
          id: "70000000-0000-4000-8000-000000000001",
          value_json: 48,
          unit_code: "V",
          verification_status: "verified",
          data_source: "manufacturer",
          field_definition: {
            field_code: "battery.nominal_voltage",
            label_en: "Nominal voltage",
            label_zh: "标称电压",
            unit_code: "V",
            access_level_code: "PUBLIC",
            data_behavior: "STATIC",
          },
        },
        {
          id: "70000000-0000-4000-8000-000000000002",
          value_json: 90,
          unit_code: "%",
          verification_status: "DEVICE_REPORTED",
          data_source: "BMS",
          field_definition: {
            field_code: "battery.state_of_health",
            label_en: "State of health",
            label_zh: "健康状态",
            unit_code: "%",
            access_level_code: "LEGITIMATE_INTEREST",
            data_behavior: "DYNAMIC",
          },
        },
      ],
      batches: [],
      items: [],
      complianceDocuments: [],
      lifecycleEvents: [],
    },
  };
}

test("canonical JSON sorts object keys and preserves array order", () => {
  assert.equal(
    canonicalJson({ z: 1, a: { y: 2, x: [3, 1] } }),
    "{\"a\":{\"x\":[3,1],\"y\":2},\"z\":1}",
  );
});

test("battery regulatory serial overrides the public passport identity serial", async () => {
  const candidate = await buildDppPublicationCandidateFromSources(fixture());
  const identityFields = candidate.snapshot.modules.identity.fields;
  const serial = identityFields.find((item) => item.code === "identity.serial_id");
  const sgtin = identityFields.find((item) => item.code === "identity.sgtin");

  assert.equal(serial?.value, "BATTERY-SERIAL-001");
  assert.equal(serial?.sourceRecord?.table, "battery_field_value");
  assert.equal(sgtin?.value, null);
});

test("immutable file versions and lifecycle events enter canonical modules", async () => {
  const sources = fixture();
  sources.fileAssets = [{
    id: "80000000-0000-4000-8000-000000000001",
    product_id: sources.product.id,
    title: "Material declaration",
    document_type: "declaration",
    access_level_code: "LEGITIMATE_INTEREST",
  }];
  sources.fileVersions = [{
    id: "81000000-0000-4000-8000-000000000001",
    asset_id: sources.fileAssets[0].id,
    version_number: 1,
    access_level_code: "LEGITIMATE_INTEREST",
    checksum_sha256: "a".repeat(64),
    hash_algorithm: "SHA-256",
  }];
  sources.fieldEvidenceLinks = [{
    id: "82000000-0000-4000-8000-000000000001",
    product_id: sources.product.id,
    file_version_id: sources.fileVersions[0].id,
    module_code: "materials",
    field_code: "materials.chemical_information",
    claim_value: { status: "compliant" },
    access_level_code: "LEGITIMATE_INTEREST",
    verification_status: "VERIFIED",
  }];
  sources.lifecycleEvents = [{
    id: "83000000-0000-4000-8000-000000000001",
    product_id: sources.product.id,
    scope_type: "MODEL",
    event_type: "REPAIR_COMPLETED",
    event_time: "2026-07-25T12:00:00.000Z",
    location: { country: "DE" },
    event_data: { action: "connector replaced" },
    data_source: "service",
    access_level_code: "LEGITIMATE_INTEREST",
    verification_status: "VERIFIED",
    event_hash: "b".repeat(64),
    file_version_id: sources.fileVersions[0].id,
  }];

  const candidate = await buildDppPublicationCandidateFromSources(sources);
  const evidence = candidate.snapshot.evidenceIndex[0];
  const lifecycle = candidate.snapshot.modules.lifecycle.records[0];

  assert.equal(evidence.fileVersionId, sources.fileVersions[0].id);
  assert.equal(evidence.url, `/api/dpp-files/${sources.fileVersions[0].id}`);
  assert.equal(lifecycle.recordType, "lifecycle_event");
  assert.equal(lifecycle.accessLevel, "LEGITIMATE_INTEREST");
  assert.equal(
    lifecycle.fields.find((item) => item.code === "lifecycle.event_hash")?.value,
    "b".repeat(64),
  );
});

test("candidate contains all nine modules and excludes dynamic battery values", () => {
  const candidate = buildDppPublicationCandidateFromSources(fixture());
  assert.deepEqual(Object.keys(candidate.snapshot.modules), [...CANONICAL_MODULE_CODES]);
  assert.ok(candidate.snapshot.modules.sector.fields.some((field) =>
    field.code === "battery.nominal_voltage"
  ));
  assert.ok(!candidate.snapshot.modules.sector.fields.some((field) =>
    field.code === "battery.state_of_health"
  ));
  assert.equal(candidate.snapshot.governance.dynamicDataPolicy.includedInSnapshot, false);
});

test("public projection removes internal fields and source-record details", () => {
  const candidate = buildDppPublicationCandidateFromSources(fixture());
  const projection = projectionForAudience(candidate, "PUBLIC");
  const sectorCodes = projection.modules.sector.fields.map((field) => field.code);
  assert.ok(sectorCodes.includes("battery_public_note"));
  assert.ok(!sectorCodes.includes("battery_internal_note"));
  assert.equal(projectionContainsRestrictedFields(projection, "PUBLIC"), false);
  assert.ok(projection.modules.identity.fields.every((field) => !field.sourceRecord));
  assert.equal("generatedBy" in projection.governance, false);
  assert.equal("sourceTables" in projection.governance, false);
});

test("same source data produces the same source fingerprint and candidate hash", () => {
  const first = buildDppPublicationCandidateFromSources(fixture());
  const second = buildDppPublicationCandidateFromSources(fixture());
  assert.equal(first.sourceFingerprint, second.sourceFingerprint);
  assert.equal(first.snapshotHash, second.snapshotHash);
  assert.equal(first.canonicalPayload, second.canonicalPayload);
});

test("finalization binds immutable publication metadata and recalculates the hash", () => {
  const candidate = buildDppPublicationCandidateFromSources(fixture());
  const final = finalizeDppPublicationCandidate(candidate, {
    publicationId: "80000000-0000-4000-8000-000000000001",
    version: 2,
    publishedAt: "2026-07-25T12:00:00.000Z",
    publishedBy: "90000000-0000-4000-8000-000000000001",
    supersedesPublicationId: "80000000-0000-4000-8000-000000000000",
  });
  assert.equal(final.snapshot.publication.status, "PUBLISHED");
  assert.equal(final.snapshot.publication.version, 2);
  assert.equal(final.snapshot.integrity.digest, final.snapshotHash);
  assert.notEqual(final.snapshotHash, candidate.snapshotHash);
  assert.equal(final.sourceFingerprint, candidate.sourceFingerprint);
});
