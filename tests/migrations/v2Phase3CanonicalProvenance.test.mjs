import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = "supabase/migrations/0029_v2_phase3_schema_canonical_provenance.sql";
const rollbackPath = "supabase/rollbacks/0029_v2_phase3_schema_canonical_provenance.down.sql";

test("Phase 3 extends the existing Schema Registry and is reversible", async () => {
  const [migration, rollback] = await Promise.all([readFile(migrationPath, "utf8"), readFile(rollbackPath, "utf8")]);
  assert.match(migration, /^begin;/);
  assert.match(migration, /commit;\s*$/);
  assert.match(rollback, /^begin;/);
  assert.match(rollback, /commit;\s*$/);
  assert.match(migration, /alter table public\.schema_definition/);
  assert.match(migration, /alter table public\.field_definition/);
  assert.doesNotMatch(migration, /create table public\.(?:schema_definition_v2|schema_v2|field_definition_v2)/);
  for (const table of [
    "data_source", "source_record", "mapping_profile", "mapping_version", "mapping_rule",
    "transformation_result", "canonical_claim", "provenance_record",
  ]) {
    assert.match(migration, new RegExp("create table public\\." + table));
    assert.match(migration, new RegExp("alter table public\\." + table + " enable row level security"));
    assert.match(rollback, new RegExp("drop table if exists public\\." + table));
  }
  assert.match(migration, /'0029'/);
  assert.match(rollback, /migration_number = '0029'/);
});

test("Schema and Mapping published states are immutable", async () => {
  const [migration, registryFields] = await Promise.all([
    readFile(migrationPath, "utf8"),
    readFile("supabase/migrations/0007_field_definitions_and_rules.sql", "utf8"),
  ]);
  assert.match(registryFields, /greanlean_protect_published_schema_child/);
  assert.match(migration, /v2_phase3_protect_active_mapping_version/);
  assert.match(migration, /MAPPING_VERSION_IMMUTABLE/);
  assert.match(migration, /mapping_rule_immutable/);
});

test("Canonical Claims are append-oriented, hierarchy-valid, and provenance-aware", async () => {
  const migration = await readFile(migrationPath, "utf8");
  assert.match(migration, /'INHERIT', 'OVERRIDE', 'CLEAR', 'NOT_APPLICABLE', 'UNKNOWN'/);
  assert.match(migration, /unique \(supersedes_claim_id\)/);
  assert.match(migration, /v2_phase3_subject_exists/);
  assert.match(migration, /FIELD_NOT_APPLICABLE/);
  assert.match(migration, /PROVENANCE_INCOMPLETE/);
  assert.doesNotMatch(migration, /create policy canonical_claim_update/);
});

test("Phase 3 RLS covers all Tenant-owned data and protects Tenant extensions", async () => {
  const migration = await readFile(migrationPath, "utf8");
  assert.match(migration, /schema_definition_v2_select/);
  assert.match(migration, /owner_type = 'GLOBAL'/);
  assert.match(migration, /owner_type = 'TENANT_EXTENSION'/);
  assert.match(migration, /v2_user_has_capability\(tenant_id, 'import\.commit'\)/);
  assert.match(migration, /v2_user_has_partner_resource_capability\(tenant_id, 'product\.view', 'CANONICAL_CLAIM'/);
  assert.match(migration, /v2_phase3_partner_field_visible/);
  assert.match(migration, /security definer/);
  assert.match(migration, /access_level_code <> 'INTERNAL'/);
});
