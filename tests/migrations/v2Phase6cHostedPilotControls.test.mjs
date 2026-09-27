import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = "supabase/migrations/0034_phase6c_hosted_pilot_controls.sql";
const rollbackPath = "supabase/rollbacks/0034_phase6c_hosted_pilot_controls.down.sql";

test("Phase 6C migration provides an atomic service-role-only distributed limiter", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /create table public\.v2_public_rate_limit_counter/u);
  assert.match(sql, /on conflict \(surface, client_key_hash, window_started_at\)/u);
  assert.match(sql, /security definer/u);
  assert.match(sql, /grant execute on function public\.v2_phase6c_consume_public_rate_limit[^;]+to service_role/u);
  assert.match(sql, /revoke all on function public\.v2_phase6c_consume_public_rate_limit[^;]+from public, anon, authenticated/u);
  assert.match(sql, /'greanlean-dpp-preprod\.vercel\.app'/u);
  assert.match(sql, /'0034'/u);
});

test("Phase 6C rollback removes only the hosted Pilot controls", async () => {
  const sql = await readFile(rollbackPath, "utf8");
  assert.match(sql, /delete from public\.resolver_mapping/u);
  assert.match(sql, /drop function if exists public\.v2_phase6c_consume_public_rate_limit/u);
  assert.match(sql, /drop table if exists public\.v2_public_rate_limit_counter/u);
  assert.match(sql, /migration_number = '0034'/u);
});
