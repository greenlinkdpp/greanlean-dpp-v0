import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile("supabase/migrations/0033_v2_phase6b_future_tenant_connector_capabilities.sql", "utf8");
const rollback = await readFile("supabase/rollbacks/0033_v2_phase6b_future_tenant_connector_capabilities.down.sql", "utf8");

test("Phase 6B seeds Phase 5 capabilities for future tenant roles", () => {
  assert.match(migration, /after insert on public\.role/i);
  assert.match(migration, /v2_phase6b_seed_connector_role_capabilities/i);
  for (const capability of ["connector.view", "connector.manage", "connector.execute", "connector.retry", "connector.read_receipt", "webhook.manage"]) {
    assert.match(migration, new RegExp(capability.replace(".", "\\.")));
  }
  assert.match(migration, /greanlean_0033_role_capability_delta/i);
  assert.match(migration, /migration_number[\s\S]*'0033'/i);
});

test("Phase 6B capability repair rollback removes only bindings added by 0033", () => {
  assert.match(rollback, /using public\.greanlean_0033_role_capability_delta/i);
  assert.match(rollback, /drop trigger if exists role_seed_phase6b_connector_capabilities/i);
  assert.match(rollback, /delete from public\.greanlean_migration_ledger where migration_number = '0033'/i);
});
