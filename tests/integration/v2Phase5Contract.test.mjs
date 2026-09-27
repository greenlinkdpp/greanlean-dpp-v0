import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const routes = [
  "app/api/v2/connectors/route.ts", "app/api/v2/connectors/[id]/route.ts",
  "app/api/v2/connectors/[id]/test/route.ts", "app/api/v2/connectors/[id]/jobs/route.ts",
  "app/api/v2/connectors/[id]/credentials/route.ts", "app/api/v2/connector-jobs/[id]/route.ts",
  "app/api/v2/connector-jobs/[id]/retry/route.ts", "app/api/v2/connector-jobs/[id]/cancel/route.ts",
  "app/api/v2/connector-receipts/[id]/route.ts", "app/api/v2/registry-submissions/route.ts",
  "app/api/v2/registry-submissions/[id]/route.ts", "app/api/v2/imports/route.ts", "app/api/v2/bms/aggregate/route.ts",
  "app/api/v2/registry-submissions/[id]/poll/route.ts",
];

test("Phase 5 tenant routes are PDP and feature gated", async () => {
  const shared = await readFile("lib/server/v2/phase5Routes.ts", "utf8");
  const routeSources = await Promise.all(routes.map((path) => readFile(path, "utf8")));
  const completeRouteContract = [shared, ...routeSources].join("\n");
  assert.match(shared, /requireV2PolicyContext/);
  assert.match(shared, /executeIdempotentWrite/);
  for (const capability of ["connector.view","connector.manage","connector.execute","connector.retry","connector.read_receipt","registry.submit","import.commit"]) assert.match(completeRouteContract, new RegExp(capability.replace(".", "\\.")));
  for (let index = 0; index < routes.length; index += 1) {
    const path = routes[index];
    const source = routeSources[index];
    if (/phase5Routes/.test(source) && !/requireV2PolicyContext/.test(source)) continue;
    assert.match(source, /requireV2PolicyContext/, path);
    assert.doesNotMatch(source, /createSupabaseAdminClient/, path);
  }
});

test("Credential and receipts never expose secret reference internals", async () => {
  const [repository, migration] = await Promise.all([
    readFile("lib/server/v2/phase5Repository.ts", "utf8"),
    readFile("supabase/migrations/0031_v2_phase5_integration_registry_connectors.sql", "utf8"),
  ]);
  assert.match(repository, /select\("id,tenant_id,connector_instance_id,credential_type,status,last_verified_at,created_at,updated_at"\)/);
  assert.match(migration, /no authenticated policy on connector_credential_reference/i);
  assert.match(migration, /revoke all on public\.connector_credential_reference from anon, authenticated/);
  assert.match(repository, /redactExternalResult/);
});

test("Registry, imports, webhook and BMS retain their domain boundaries", async () => {
  const repository = await readFile("lib/server/v2/phase5Repository.ts", "utf8");
  assert.match(repository, /publication_state !== "PUBLISHED"/);
  assert.match(repository, /prepareRegistrySubmission/);
  assert.match(repository, /external_identifier_mapping/);
  assert.match(repository, /mapping_version_id/);
  assert.match(repository, /source_record/);
  assert.match(repository, /provenance_record/);
  assert.match(repository, /canonical_claim/);
  assert.match(repository, /verifyWebhookSignature/);
  assert.match(repository, /bms_aggregation_snapshot/);
  assert.match(repository, /Claim candidate requires authorized commit/);
  assert.match(repository, /v2_phase5_consume_rate_limit/);
  for (const scope of ["connectors.test", "connector.jobs:", "registry-submissions.submit", "registry-submissions.poll", "imports:", "bms.aggregate", "webhooks:"]) {
    assert.match(repository, new RegExp(scope.replace(/[.:]/g, "\\$&")));
  }
});

test("Phase 5 flags and required error codes are declared", async () => {
  const [example, errors] = await Promise.all([readFile(".env.example", "utf8"), readFile("lib/v2/phase5Errors.ts", "utf8")]);
  for (const flag of ["FEATURE_V2_INTEGRATION_CORE","FEATURE_V2_FILE_IMPORT","FEATURE_V2_REGISTRY_TEST","FEATURE_V2_EXTERNAL_CONNECTORS","FEATURE_V2_BMS_ADAPTER"]) assert.match(example, new RegExp(flag + "=false"));
  for (const code of ["CONNECTOR_HOST_NOT_ALLOWED","CONNECTOR_TIMEOUT","CONNECTOR_DEAD_LETTER","WEBHOOK_SIGNATURE_INVALID","REGISTRY_VERSION_NOT_PUBLISHED","IMPORT_MAPPING_REQUIRED","EXTERNAL_SCHEMA_DRIFT","BMS_DEVICE_BINDING_INVALID"]) assert.match(errors, new RegExp(code));
});
