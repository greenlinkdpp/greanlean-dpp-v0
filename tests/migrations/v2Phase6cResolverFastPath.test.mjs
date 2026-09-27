import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = "supabase/migrations/0035_phase6c_resolver_fast_path.sql";
const rollbackPath = "supabase/rollbacks/0035_phase6c_resolver_fast_path.down.sql";

test("Phase 6C Resolver fast path is indexed, bounded, and service-role only", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /product_identifier_normalized_active_idx/u);
  assert.match(sql, /with recursive seeds/u);
  assert.match(sql, /chain\.depth < 8/u);
  assert.match(sql, /not target\.id = any\(chain\.visited\)/u);
  assert.match(sql, /publication_state <> 'PUBLISHED'/u);
  assert.match(sql, /publication_state = 'WITHDRAWN'/u);
  assert.match(sql, /security definer/u);
  assert.match(sql, /revoke all on function public\.v2_phase6c_resolve_public_passport[^;]+from public, anon, authenticated/u);
  assert.match(sql, /grant execute on function public\.v2_phase6c_resolve_public_passport[^;]+to service_role/u);
  assert.match(sql, /'0035'/u);
});

test("Phase 6C Resolver fast path rollback is scoped", async () => {
  const sql = await readFile(rollbackPath, "utf8");
  assert.match(sql, /drop function if exists public\.v2_phase6c_resolve_public_passport/u);
  assert.match(sql, /drop index if exists public\.product_identifier_normalized_active_idx/u);
  assert.match(sql, /migration_number = '0035'/u);
});
