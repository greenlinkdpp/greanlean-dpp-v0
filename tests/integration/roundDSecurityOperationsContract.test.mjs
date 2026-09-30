import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");

test("Round D deletes only an archived empty tenant through an audited database transaction", async () => {
  const [migration, route] = await Promise.all([
    read("supabase/migrations/0039_round_d_security_operations_closeout.sql"),
    read("lib/server/v2/platformTenantRoutes.ts"),
  ]);
  assert.match(migration, /v2_delete_empty_archived_tenant/i);
  assert.match(migration, /target\.status <> 'ARCHIVED'/i);
  assert.match(migration, /TENANT_SYSTEM_REFERENCE_PROTECTED/i);
  assert.match(migration, /information_schema\.columns/i);
  assert.match(migration, /TENANT_DELETE_BLOCKED/i);
  assert.match(migration, /delete from public\.role where tenant_id = p_tenant_id/i);
  assert.match(migration, /delete from public\.tenant where id = p_tenant_id/i);
  assert.match(migration, /ARCHIVED_EMPTY_TENANT_DELETED/i);
  assert.match(migration, /revoke all on function[\s\S]*from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function[\s\S]*to service_role/i);
  assert.match(route, /requirePlatformCapability\(request, requestContext, "platform\.tenant\.manage"/);
  assert.match(route, /admin\.rpc\("v2_delete_empty_archived_tenant"/);
  assert.doesNotMatch(route, /\.from\("tenant"\)\.delete\(/);
});

test("Round D removes the unused public backup table rather than adding a broad policy", async () => {
  const migration = await read("supabase/migrations/0039_round_d_security_operations_closeout.sql");
  assert.match(migration, /drop table if exists public\.greanlean_0012_data_backup/i);
  assert.doesNotMatch(migration, /using\s*\(\s*true\s*\)/i);
});
