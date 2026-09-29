import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile("supabase/migrations/0036_v2_platform_operator_multitenant.sql", "utf8");
const rollback = await readFile("supabase/rollbacks/0036_v2_platform_operator_multitenant.down.sql", "utf8");

test("platform operator authority is explicit, capability based, audited and reversible", () => {
  assert.match(migration, /create table public\.platform_role_assignment/i);
  assert.match(migration, /role_class = 'PLATFORM'/i);
  assert.match(migration, /platform\.tenant\.list/i);
  assert.match(migration, /platform\.product\.manage/i);
  assert.match(migration, /platform\.dpp\.publish/i);
  assert.match(migration, /create table public\.platform_operator_audit/i);
  assert.match(migration, /platform_operator_audit_append_only/i);
  assert.match(migration, /identity_context text not null check \(identity_context = 'PLATFORM_OPERATOR'\)/i);
  assert.match(migration, /tenant_id uuid references public\.tenant/i);
  assert.match(migration, /migration_number = '0035'/i);
  assert.match(migration, /'0036', 'v2_platform_operator_multitenant'/i);
  assert.doesNotMatch(migration, /insert into public\.tenant_membership/i);
  assert.doesNotMatch(migration, /\b(update|delete\s+from|truncate)\s+public\.(products|product_)/i);
  assert.match(rollback, /drop table if exists public\.platform_operator_audit/i);
  assert.match(rollback, /drop table if exists public\.platform_role_assignment/i);
  assert.match(rollback, /migration_number = '0036'/i);
});
