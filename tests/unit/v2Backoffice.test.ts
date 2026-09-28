import assert from "node:assert/strict";
import test from "node:test";
import { backofficeNavigation, dashboardMetrics, mappingStatus, modelRelationships, readinessForPassport, type BackofficeSnapshot } from "../../lib/v2/backoffice.ts";

function snapshot(overrides: Partial<BackofficeSnapshot> = {}): BackofficeSnapshot {
  const keys = ["organisations","memberships","partnerAuthorizations","families","models","skus","batches","batchSkuLinks","items","identifiers","dataSources","sourceRecords","mappingProfiles","mappingVersions","mappingRules","transformations","provenance","claims","fields","validationRules","accessPolicies","passports","reviews","versions","currentPointers","resolverMappings","publicationAudit","connectors","connectorDefinitions","connectorJobs","connectorAttempts","connectorReceipts","deadLetters","importSessions","registrySubmissions","bmsSnapshots","connectorAudit","policyAudit"] as const;
  const empty = Object.fromEntries(keys.map((key) => [key, []])) as unknown as BackofficeSnapshot;
  return { ...empty, generatedAt: "2026-09-27T00:00:00Z", tenant: { id: "tenant-1", name: "SOODOO E-bike" }, ...overrides };
}

test("backoffice exposes every required operating area", () => {
  assert.equal(backofficeNavigation.length, 26);
  for (const section of ["dashboard","tenants","models","imports","mappings","claims","validation","reviews","publications","passports","identifiers","documents","lifecycle","bms","audiences","integrations","registry","audit","settings"]) {
    assert.ok(backofficeNavigation.some((item) => item.section === section), section);
  }
});

test("dashboard metrics are derived from Tenant-scoped snapshot data", () => {
  const data = snapshot({ models: [{ id: "m" }], items: [{ id: "i" }], passports: [{ id: "p", status: "ACTIVE" }], versions: [{ passport_id: "p", publication_state: "PUBLISHED" }], reviews: [{ passport_id: "p", status: "IN_REVIEW", validation_summary: { errors: 2 } }] });
  assert.deepEqual(dashboardMetrics(data), { tenants: 1, models: 1, skus: 0, batches: 0, items: 1, passports: 1, published: 1, draft: 0, review: 1, rejected: 0, validationIssues: 2, connectors: 0, registrySubmitted: 0 });
});

test("model relationship view preserves parallel SKU and Batch dimensions", () => {
  const data = snapshot({ skus: [{ id: "s", model_id: "m" }], batches: [{ id: "b", model_id: "m" }], items: [{ id: "i", model_id: "m", sku_id: "s", batch_id: "b" }] });
  const relation = modelRelationships(data, "m");
  assert.equal(relation.skus.length, 1); assert.equal(relation.batches.length, 1); assert.equal(relation.items.length, 1);
});

test("readiness and mapping statuses use controlled workflow states", () => {
  const data = snapshot({ passports: [{ id: "p" }], reviews: [{ passport_id: "p", status: "APPROVED" }] });
  assert.equal(readinessForPassport(data, { id: "p" }), "READY_TO_PUBLISH");
  assert.equal(mappingStatus({ status: "ACTIVE" }), "MAPPED");
  assert.equal(mappingStatus({ status: "DRAFT" }), "REVIEW_REQUIRED");
  assert.equal(mappingStatus(undefined), "UNMAPPED");
});
