import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = "supabase/migrations/0032_v2_phase6_seed_trigger_compatibility_fix.sql";
const rollbackPath = "supabase/rollbacks/0032_v2_phase6_seed_trigger_compatibility_fix.down.sql";

test("Phase 6 seed-trigger repair is transactional, additive and reversible", async () => {
  const [migration, rollback] = await Promise.all([
    readFile(migrationPath, "utf8"),
    readFile(rollbackPath, "utf8"),
  ]);
  assert.match(migration, /^begin;/);
  assert.match(migration, /commit;\s*$/);
  assert.match(rollback, /^begin;/);
  assert.match(rollback, /commit;\s*$/);
  assert.doesNotMatch(migration, /drop\s+(table|column|schema)/i);
  assert.match(migration, /to_jsonb\(new\)->>'battery_batch_id'/);
  assert.match(migration, /migration_number[\s\S]*'0032'/);
  assert.match(rollback, /new\.battery_batch_id/);
  assert.match(rollback, /delete from public\.greanlean_migration_ledger where migration_number = '0032'/);
});

test("Phase 6 repair never changes the trigger bindings or legacy tables", async () => {
  const migration = await readFile(migrationPath, "utf8");
  assert.doesNotMatch(migration, /create\s+trigger/i);
  assert.doesNotMatch(migration, /drop\s+trigger/i);
  assert.doesNotMatch(migration, /alter\s+table/i);
  assert.match(migration, /create or replace function public\.greanlean_p0_validate_battery_hierarchy/);
});
