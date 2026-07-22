import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const migrationDirectory = "supabase/migrations";
const rollbackDirectory = "supabase/rollbacks";
const migrationFiles = (await readdir(migrationDirectory)).filter((name) => name.endsWith(".sql")).sort();
const rollbackFiles = (await readdir(rollbackDirectory)).filter((name) => name.endsWith(".down.sql")).sort();
const batteryBundleMigrations = ["0001_project_migration_ledger.sql", "0006_schema_registry.sql", "0007_field_definitions_and_rules.sql", "0009_battery_domain.sql", "0010_battery_dynamic_metrics.sql"];
const batteryBundleRollbacks = ["0010_battery_dynamic_metrics.down.sql", "0009_battery_domain.down.sql", "0007_field_definitions_and_rules.down.sql", "0006_schema_registry.down.sql", "0001_project_migration_ledger.down.sql"];

test("every numbered migration has a matching rollback", () => {
  assert.ok(migrationFiles.length > 0);
  for (const migration of migrationFiles) {
    assert.match(migration, /^\d{4}_[a-z0-9_]+\.sql$/);
    const expectedRollback = migration.replace(/\.sql$/, ".down.sql");
    assert.ok(rollbackFiles.includes(expectedRollback), `Missing rollback: ${expectedRollback}`);
  }
});

test("migrations are transactional and avoid legacy product mutations", async () => {
  for (const file of migrationFiles) {
    const sql = await readFile(`${migrationDirectory}/${file}`, "utf8");
    assert.match(sql, /^begin;/i, `${file} must start a transaction`);
    assert.match(sql, /commit;\s*$/i, `${file} must commit its transaction`);
    assert.doesNotMatch(sql, /\b(update|delete\s+from|truncate)\s+public\.(products|product_)/i, `${file} mutates legacy product data`);
  }
});

test("Schema Registry foundation includes versioning, rules, access, and immutability", async () => {
  const schemaSql = await readFile(`${migrationDirectory}/0006_schema_registry.sql`, "utf8");
  const fieldSql = await readFile(`${migrationDirectory}/0007_field_definitions_and_rules.sql`, "utf8");
  for (const table of ["access_level", "schema_definition", "schema_version", "regulatory_reference", "codelist", "codelist_value"]) {
    assert.match(schemaSql, new RegExp(`create table if not exists public\\.${table}\\b`, "i"));
  }
  for (const table of ["field_definition", "validation_rule", "applicability_rule", "field_regulatory_reference", "access_policy"]) {
    assert.match(fieldSql, new RegExp(`create table if not exists public\\.${table}\\b`, "i"));
  }
  assert.match(schemaSql, /Published Schema versions are immutable/i);
  assert.match(schemaSql, /Published codelists are immutable/i);
  assert.match(fieldSql, /published Schema version is immutable/i);
});

test("battery domain migration contains scoped value tables and public read-only policies", async () => {
  const sql = await readFile(`${migrationDirectory}/0009_battery_domain.sql`, "utf8");
  for (const table of [
    "battery_schema_profile",
    "battery_model_profile",
    "battery_batch",
    "battery_item",
    "battery_field_value",
    "battery_material_composition",
    "battery_sustainability_data",
    "battery_performance_spec",
    "battery_compliance_document",
    "battery_disassembly_information",
    "battery_lifecycle_event",
  ]) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}\\b`, "i"));
  }
  assert.match(sql, /battery_field_model_unique_idx/i);
  assert.match(sql, /battery_field_batch_unique_idx/i);
  assert.match(sql, /battery_field_item_unique_idx/i);
  assert.match(sql, /battery_lifecycle_event_append_only/i);
  assert.doesNotMatch(sql, /for\s+(all|insert|update|delete)\s+to\s+authenticated/i);
});

test("battery operating metrics preserve immutable measurements and a secure latest projection", async () => {
  const sql = await readFile(`${migrationDirectory}/0010_battery_dynamic_metrics.sql`, "utf8");
  for (const column of ["battery_item_id", "metric_type", "metric_value", "unit", "measured_at", "data_source", "source_device", "verification_status"]) {
    assert.match(sql, new RegExp(`\\b${column}\\b`, "i"));
  }
  assert.match(sql, /battery_operating_metric_append_only/i);
  assert.match(sql, /with\s*\(security_invoker\s*=\s*true\)/i);
  assert.doesNotMatch(sql, /for\s+(all|insert|update|delete)\s+to\s+authenticated/i);
});

test("generated battery Preview bundles preserve source order and checksums", async () => {
  const install = await readFile("supabase/bundles/battery_dpp_preview_install.sql", "utf8");
  const rollback = await readFile("supabase/bundles/battery_dpp_preview_rollback.sql", "utf8");
  let previous = -1;
  for (const file of batteryBundleMigrations) {
    const source = await readFile(`${migrationDirectory}/${file}`, "utf8");
    const marker = `-- SOURCE: ${migrationDirectory}/${file}`;
    const index = install.indexOf(marker);
    assert.ok(index > previous, `${file} is missing or out of order in the install bundle`);
    assert.ok(install.includes(`-- SHA256: ${createHash("sha256").update(source).digest("hex")}`));
    assert.ok(install.includes(source.trim()), `${file} content differs from the bundle`);
    previous = index;
  }
  previous = -1;
  for (const file of batteryBundleRollbacks) {
    const marker = `-- SOURCE: ${rollbackDirectory}/${file}`;
    const index = rollback.indexOf(marker);
    assert.ok(index > previous, `${file} is missing or out of order in the rollback bundle`);
    previous = index;
  }
});
