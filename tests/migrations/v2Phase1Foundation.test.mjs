import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = "supabase/migrations/0027_v2_phase1_tenant_access_foundation.sql";
const rollbackPath = "supabase/rollbacks/0027_v2_phase1_tenant_access_foundation.down.sql";

test("Phase 1 migration is additive, reversible, and never mutates V1 tables", async () => {
  const migration = await readFile(migrationPath, "utf8");
  const rollback = await readFile(rollbackPath, "utf8");
  assert.match(migration, /^begin;/);
  assert.match(migration, /commit;\s*$/);
  assert.match(rollback, /^begin;/);
  assert.match(rollback, /commit;\s*$/);
  assert.doesNotMatch(migration, /alter table public\.(products|dpp_organisation|dpp_publication)\b/i);
  assert.doesNotMatch(migration, /drop table/i);
  assert.match(rollback, /drop table if exists public\.tenant/);
});

test("Partner is platform-level and customer access requires authorization", async () => {
  const migration = await readFile(migrationPath, "utf8");
  const partnerTable = migration.match(/create table public\.partner \([\s\S]*?\n\);/)?.[0] || "";
  assert.ok(partnerTable);
  assert.doesNotMatch(partnerTable, /tenant_id|organisation_id/);
  assert.match(migration, /create table public\.partner_tenant_authorization/);
  assert.match(migration, /v2_user_has_partner_capability/);
  assert.match(migration, /v2_user_has_partner_resource_capability/);
  assert.match(migration, /allow_scope\.resource_id is null or allow_scope\.resource_id = target_resource_id/);
  assert.match(migration, /deny_scope\.effect = 'DENY'/);
  assert.match(migration, /authz\.status = 'ACTIVE'/);
});

test("tenant membership rejects cross-tenant and PLATFORM roles at the database", async () => {
  const migration = await readFile(migrationPath, "utf8");
  assert.match(migration, /role_class text generated always as \('TENANT'\) stored/);
  assert.match(migration, /foreign key \(role_id, tenant_id, role_class\)/);
  assert.match(migration, /references public\.role\(id, tenant_id, role_class\)/);
  assert.match(migration, /\(role_class = 'TENANT' and tenant_id is not null\)/);
});

test("RLS and append-only policy audit cover every Phase 1 tenant resource", async () => {
  const migration = await readFile(migrationPath, "utf8");
  for (const table of [
    "tenant",
    "organisation_v2",
    "tenant_membership",
    "partner_tenant_authorization",
    "scope_grant",
    "policy_decision_audit",
  ]) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
  }
  assert.match(migration, /V2_POLICY_AUDIT_APPEND_ONLY/);
  assert.match(migration, /revoke all on public\.policy_decision_audit from anon, authenticated/);
});
