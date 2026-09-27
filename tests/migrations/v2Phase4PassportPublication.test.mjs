import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = "supabase/migrations/0030_v2_phase4_passport_publication_resolver.sql";
const rollbackPath = "supabase/rollbacks/0030_v2_phase4_passport_publication_resolver.down.sql";

test("Phase 4 migration is additive, transactional, and reversible", async () => {
  const [migration, rollback] = await Promise.all([readFile(migrationPath, "utf8"), readFile(rollbackPath, "utf8")]);
  assert.match(migration, /^begin;/);
  assert.match(migration, /commit;\s*$/);
  assert.match(rollback, /^begin;/);
  assert.match(rollback, /commit;\s*$/);
  for (const table of ["dpp_passport", "dpp_review_task", "dpp_version", "dpp_current_pointer", "resolver_mapping", "dpp_publication_audit"]) {
    assert.match(migration, new RegExp("create table public\\." + table));
    assert.match(migration, new RegExp("alter table public\\." + table + " enable row level security"));
    assert.match(rollback, new RegExp("drop table if exists public\\." + table));
  }
  assert.doesNotMatch(migration, /drop table public\.dpp_publication/);
  assert.match(migration, /legacy_publication_id uuid references public\.dpp_publication/);
});

test("published versions and current pointers are protected in the database", async () => {
  const migration = await readFile(migrationPath, "utf8");
  assert.match(migration, /VERSION_IMMUTABLE/);
  assert.match(migration, /before update or delete on public\.dpp_version/);
  assert.match(migration, /unique \(passport_id, version_number\)/);
  assert.match(migration, /dpp_version_one_published_current_idx/);
  assert.match(migration, /CURRENT_POINTER_INVALID/);
  assert.match(migration, /deferrable initially deferred/);
});

test("publish, supersede, pointer update, audit, and withdraw are atomic RPC operations", async () => {
  const migration = await readFile(migrationPath, "utf8");
  assert.match(migration, /function public\.v2_publish_approved_review/);
  assert.match(migration, /REVIEW_APPROVAL_STALE/);
  assert.match(migration, /publication_state = 'SUPERSEDED'/);
  assert.match(migration, /insert into public\.dpp_current_pointer/);
  assert.match(migration, /'publication\.publish'/);
  assert.match(migration, /function public\.v2_withdraw_current_version/);
  assert.match(migration, /publication_state = 'WITHDRAWN'/);
  assert.match(migration, /delete from public\.dpp_current_pointer/);
});

test("Resolver enforces allowlisted hosts, bounded aliases, non-reassignment, and DPP_ID reuse", async () => {
  const migration = await readFile(migrationPath, "utf8");
  assert.match(migration, /resolver_host_allowlist/);
  assert.match(migration, /RESOLVER_OPEN_REDIRECT/);
  assert.match(migration, /RESOLVER_ALIAS_CYCLE/);
  assert.match(migration, /depth > 8/);
  assert.match(migration, /RESOLVER_PATH_REASSIGNMENT/);
  assert.match(migration, /identifier_type = 'DPP_ID' and subject_type = 'PASSPORT'/);
  assert.doesNotMatch(migration, /create table public\.passport_identifier/);
});

