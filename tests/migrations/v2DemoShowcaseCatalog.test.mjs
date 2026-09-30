import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = new URL("../../supabase/migrations/0038_v2_demo_showcase_catalog.sql", import.meta.url);
const rollbackPath = new URL("../../supabase/rollbacks/0038_v2_demo_showcase_catalog.down.sql", import.meta.url);

test("Demo Showcase catalog is platform-managed, public-safe, and reversible", async () => {
  const [migration, rollback] = await Promise.all([readFile(migrationPath, "utf8"), readFile(rollbackPath, "utf8")]);
  assert.match(migration, /^begin;/m);
  assert.match(migration, /create table public\.demo_showcase_entry/i);
  assert.match(migration, /is_demo boolean not null default true check \(is_demo\)/i);
  assert.match(migration, /synthetic boolean not null default true check \(synthetic\)/i);
  assert.match(migration, /alter table public\.demo_showcase_entry enable row level security/i);
  assert.match(migration, /using \(is_public and is_demo and synthetic\)/i);
  assert.match(migration, /platform\.demo\.view/i);
  assert.match(migration, /platform\.demo\.manage/i);
  assert.doesNotMatch(migration, /\bdrop\s+(table|column)\b/i);
  assert.match(rollback, /drop table if exists public\.demo_showcase_entry/i);
  assert.match(rollback, /delete from public\.greanlean_migration_ledger where migration_number = '0038'/i);
});
