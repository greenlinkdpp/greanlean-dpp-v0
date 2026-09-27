import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = "supabase/migrations/0031_v2_phase5_integration_registry_connectors.sql";
const rollbackPath = "supabase/rollbacks/0031_v2_phase5_integration_registry_connectors.down.sql";

test("Phase 5 migration is additive, transactional and reversible", async () => {
  const [migration, rollback] = await Promise.all([readFile(migrationPath, "utf8"), readFile(rollbackPath, "utf8")]);
  assert.match(migration, /^begin;/);
  assert.match(migration, /commit;\s*$/);
  assert.match(rollback, /^begin;/);
  assert.match(rollback, /commit;\s*$/);
  const tables = ["connector_definition","connector_instance","connector_credential_reference","connector_rate_limit_counter","connector_job","connector_attempt","connector_receipt","connector_webhook_event","connector_dead_letter","external_identifier_mapping","registry_submission_v2","connector_import_session","bms_aggregation_snapshot","connector_audit_event"];
  for (const table of tables) {
    assert.match(migration, new RegExp("create table public\\." + table));
    assert.match(rollback, new RegExp("drop table if exists public\\." + table));
  }
  assert.doesNotMatch(migration, /drop table public\./);
});

test("Tenant-owned integration tables use RLS and cross-Tenant foreign keys", async () => {
  const migration = await readFile(migrationPath, "utf8");
  for (const table of ["connector_instance","connector_credential_reference","connector_rate_limit_counter","connector_job","connector_attempt","connector_receipt","connector_webhook_event","connector_dead_letter","external_identifier_mapping"]) {
    assert.match(migration, new RegExp("alter table public\\." + table + " enable row level security"));
  }
  assert.match(migration, /connector_job_instance_tenant_fk/);
  assert.match(migration, /connector_attempt_job_tenant_fk/);
  assert.match(migration, /connector_receipt_job_tenant_fk/);
  assert.match(migration, /connector_rate_credential_tenant_fk/);
  assert.match(migration, /v2_user_has_partner_resource_capability\(tenant_id,'connector\.view','CONNECTOR',id,null\)/);
});

test("Production, published-version and append-only guards are database enforced", async () => {
  const migration = await readFile(migrationPath, "utf8");
  assert.match(migration, /connector_instance_production_disabled check \(environment <> 'PRODUCTION'\)/);
  assert.match(migration, /CONNECTOR_PRODUCTION_FORBIDDEN/);
  assert.match(migration, /REGISTRY_VERSION_NOT_PUBLISHED/);
  assert.match(migration, /version_state is distinct from 'PUBLISHED'/);
  assert.match(migration, /CONNECTOR_EVIDENCE_IMMUTABLE/);
  assert.match(migration, /connector_attempt_immutable/);
  assert.match(migration, /connector_receipt_immutable/);
});

test("Capabilities, TEST definitions, retry limits, observability and secret references are explicit", async () => {
  const migration = await readFile(migrationPath, "utf8");
  for (const capability of ["connector.view","connector.manage","connector.execute","connector.retry","connector.read_receipt","webhook.manage"]) assert.match(migration, new RegExp(capability.replace(".", "\\.")));
  for (const definition of ["REGISTRY_TEST","GENERIC_REST","GENERIC_FILE_IMPORT","ERP_ADAPTER","MES_ADAPTER","PLM_ADAPTER","BMS_AGGREGATION"]) assert.match(migration, new RegExp(definition));
  assert.match(migration, /maxAttempts/);
  assert.match(migration, /connector_observability/);
  assert.match(migration, /v2_phase5_consume_rate_limit/);
  assert.match(migration, /credential_scope, route_key, window_started_at/);
  assert.match(migration, /webhook_reject_count/);
  assert.match(migration, /bms_replay_reject_count/);
  assert.match(migration, /secret_reference ~ '\^\(env\|test-vault\|dev-secret\)/);
});
