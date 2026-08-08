import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const migrationDirectory = "supabase/migrations";
const rollbackDirectory = "supabase/rollbacks";
const migrationFiles = (await readdir(migrationDirectory)).filter((name) => name.endsWith(".sql")).sort();
const rollbackFiles = (await readdir(rollbackDirectory)).filter((name) => name.endsWith(".down.sql")).sort();
const batteryBundleMigrations = ["0001_project_migration_ledger.sql", "0006_schema_registry.sql", "0007_field_definitions_and_rules.sql", "0009_battery_domain.sql", "0010_battery_dynamic_metrics.sql", "0011_registry_adapter.sql"];
const batteryBundleRollbacks = ["0011_registry_adapter.down.sql", "0010_battery_dynamic_metrics.down.sql", "0009_battery_domain.down.sql", "0007_field_definitions_and_rules.down.sql", "0006_schema_registry.down.sql", "0001_project_migration_ledger.down.sql"];
const backofficePhase1Migrations = [
  "0015_dpp_publication_foundation.sql",
  "0016_dpp_publication_review.sql",
  "0017_publication_review_function_permissions.sql",
];
const backofficePhase1Rollbacks = [
  "0017_publication_review_function_permissions.down.sql",
  "0016_dpp_publication_review.down.sql",
  "0015_dpp_publication_foundation.down.sql",
];

test("every numbered migration has a matching rollback", () => {
  assert.ok(migrationFiles.length > 0);
  for (const migration of migrationFiles) {
    assert.match(migration, /^\d{4}_[a-z0-9_]+\.sql$/);
    const expectedRollback = migration.replace(/\.sql$/, ".down.sql");
    assert.ok(rollbackFiles.includes(expectedRollback), `Missing rollback: ${expectedRollback}`);
  }
});

test("migrations are transactional and legacy mutations are isolated to the reversible publication migration", async () => {
  for (const file of migrationFiles) {
    const sql = await readFile(`${migrationDirectory}/${file}`, "utf8");
    assert.match(sql, /^begin;/i, `${file} must start a transaction`);
    assert.match(sql, /commit;\s*$/i, `${file} must commit its transaction`);
    if (file !== "0012_unified_dpp_publications.sql") {
      assert.doesNotMatch(sql, /\b(update|delete\s+from|truncate)\s+public\.(products|product_)/i, `${file} mutates legacy product data`);
    }
  }
});

test("unified DPP publication migration is scoped, backed up, versioned, and reversible", async () => {
  const migration = await readFile(`${migrationDirectory}/0012_unified_dpp_publications.sql`, "utf8");
  const rollback = await readFile(`${rollbackDirectory}/0012_unified_dpp_publications.down.sql`, "utf8");

  assert.match(migration, /create table if not exists public\.dpp_identifier_alias/i);
  assert.match(migration, /create table if not exists public\.greanlean_0012_data_backup/i);
  assert.match(migration, /expected exactly four unified DPP case products/i);
  assert.match(migration, /'publicDpp'/);
  assert.match(migration, /'database-publication'/);
  assert.match(migration, /'unified_publication'/);
  assert.match(migration, /encode\(extensions\.digest\(snapshot::text, 'sha256'\), 'hex'\)/i);
  assert.match(migration, /verification_status = 'pending'/i);
  assert.doesNotMatch(migration, /truncate\s+public\./i);

  assert.match(rollback, /greanlean_0012_data_backup/i);
  assert.match(rollback, /update public\.products/i);
  assert.match(rollback, /drop table if exists public\.dpp_identifier_alias/i);
  assert.match(rollback, /delete from public\.product_versions/i);
});

test("pgcrypto runtime migration makes secure hashing available to trigger functions", async () => {
  const migration = await readFile(`${migrationDirectory}/0022_pgcrypto_runtime_search_path.sql`, "utf8");
  const rollback = await readFile(`${rollbackDirectory}/0022_pgcrypto_runtime_search_path.down.sql`, "utf8");
  const install = await readFile("supabase/bundles/publication_hash_runtime_fix_install.sql", "utf8");
  const verification = await readFile("supabase/bundles/publication_hash_runtime_fix_verify.sql", "utf8");

  for (const functionName of [
    "greanlean_prepare_publication_record",
    "greanlean_prepare_publication_review",
    "greanlean_prepare_lifecycle_event",
  ]) {
    assert.match(migration, new RegExp(`alter function public\\.${functionName}\\(\\)[\\s\\S]*set search_path = public, extensions`, "i"));
    assert.match(rollback, new RegExp(`alter function public\\.${functionName}\\(\\)[\\s\\S]*set search_path = public;`, "i"));
    assert.match(install, new RegExp(`alter function public\\.${functionName}\\(\\)[\\s\\S]*set search_path = public, extensions`, "i"));
  }

  assert.match(migration, /to_regprocedure\('extensions\.digest\(bytea,text\)'\)/i);
  assert.match(install, /^--[\s\S]*\nbegin;/i);
  assert.match(install, /commit;\s*$/i);
  assert.match(verification, /pgcrypto bytea digest/i);
  assert.match(verification, /runtime sha256 probe/i);
});

test("canonical public snapshot resolution is pointer-based, public-safe, and reversible", async () => {
  const migration = await readFile(`${migrationDirectory}/0023_canonical_public_snapshot_resolution.sql`, "utf8");
  const rollback = await readFile(`${rollbackDirectory}/0023_canonical_public_snapshot_resolution.down.sql`, "utf8");
  const install = await readFile("supabase/bundles/canonical_public_snapshot_resolution_install.sql", "utf8");
  const verification = await readFile("supabase/bundles/canonical_public_snapshot_resolution_verify.sql", "utf8");

  for (const sql of [migration, install]) {
    assert.match(sql, /resolved_product_id uuid/i);
    assert.match(sql, /exists\s*\([\s\S]*dpp_identifier_alias/i);
    assert.match(sql, /dpp_product_publication_pointer pointer/i);
    assert.match(sql, /publication\.status = 'PUBLISHED'/i);
    assert.match(sql, /set row_security = off/i);
    assert.match(sql, /grant execute[\s\S]*to anon, authenticated/i);
  }

  assert.match(rollback, /create or replace function public\.greanlean_public_canonical_dpp_snapshot/i);
  assert.match(verification, /four_public_snapshots_passed/i);
  assert.match(verification, /canonical_schema_passed/i);
  assert.match(verification, /no_public_source_record_passed/i);
  assert.match(verification, /no_public_source_tables_passed/i);
});

test("canonical schema compatibility follows the formal contract without rewriting snapshots", async () => {
  const migration = await readFile(`${migrationDirectory}/0024_canonical_schema_identifier_compatibility.sql`, "utf8");
  const rollback = await readFile(`${rollbackDirectory}/0024_canonical_schema_identifier_compatibility.down.sql`, "utf8");
  const install = await readFile("supabase/bundles/canonical_schema_identifier_compatibility_install.sql", "utf8");

  for (const sql of [migration, install]) {
    assert.match(sql, /https:\/\/greanlean\.com\/schemas\/dpp-publication\/1\.0/i);
    assert.match(sql, /greanlean\.dpp\.publication/i);
    assert.doesNotMatch(sql, /update\s+public\.dpp_publication/i);
  }

  assert.match(rollback, /source_snapshot\s*->>\s*'schema'\s+is distinct from 'greanlean\.dpp\.publication'/i);
  assert.match(rollback, /return projected_snapshot/i);
});

test("identity and access migration is server-enforced, audited, and reversible", async () => {
  const migration = await readFile(`${migrationDirectory}/0013_identity_and_access.sql`, "utf8");
  const rollback = await readFile(`${rollbackDirectory}/0013_identity_and_access.down.sql`, "utf8");
  const verification = await readFile("supabase/bundles/identity_and_access_verify.sql", "utf8");

  for (const table of [
    "dpp_organisation",
    "dpp_user_membership",
    "dpp_product_access_grant",
    "dpp_access_request",
    "dpp_access_audit",
  ]) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}\\b`, "i"));
    assert.match(rollback, new RegExp(`drop table if exists public\\.${table}\\b`, "i"));
  }
  assert.match(migration, /greanlean_product_access_level/i);
  assert.match(migration, /greanlean_resolve_dpp_access/i);
  assert.match(migration, /greanlean_public_dpp_snapshot/i);
  assert.match(migration, /greanlean_authorized_dpp_snapshot/i);
  assert.match(migration, /drop policy if exists "Public can read published product versions"/i);
  assert.match(migration, /dpp_access_audit_append_only/i);
  assert.match(migration, /Platform administrators manage/i);
  assert.match(migration, /to_regclass\(format\('public\.%I', target_table\)\) is null/i);
  assert.match(migration, /drop policy if exists "Platform administrators read audit logs"/i);
  assert.match(migration, /drop policy if exists "Users can read their access requests"/i);
  assert.match(migration, /raw_app_meta_data\s*->>\s*'dpp_access_level'/i);
  assert.doesNotMatch(migration, /permanent[^;\n]*token/i);
  assert.match(verification, /select count\(\*\) = 2[\s\S]*dpp_access_audit_append_only/i);
  assert.match(verification, /append_only_audit_passed/i);
  assert.doesNotMatch(verification, /union all/i);
  assert.doesNotMatch(verification, /from checks/i);
});

test("battery operating-data integration is device-bound, idempotent, append-only, and reversible", async () => {
  const migration = await readFile(`${migrationDirectory}/0014_battery_operating_data_integration.sql`, "utf8");
  const rollback = await readFile(`${rollbackDirectory}/0014_battery_operating_data_integration.down.sql`, "utf8");
  const verification = await readFile("supabase/bundles/battery_operating_data_verify.sql", "utf8");

  for (const table of [
    "battery_source_device",
    "battery_integration_credential",
    "battery_ingestion_request",
  ]) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}\\b`, "i"));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
    assert.match(rollback, new RegExp(`drop table if exists public\\.${table}\\b`, "i"));
  }
  assert.match(migration, /greanlean_ingest_battery_metrics/i);
  assert.match(migration, /greanlean_ingest_battery_events/i);
  assert.match(migration, /unique \(credential_id, idempotency_key\)/i);
  assert.match(migration, /battery_ingestion_request_append_only/i);
  assert.match(migration, /secret_hash text not null unique/i);
  assert.match(migration, /grant execute[\s\S]+to service_role/i);
  assert.doesNotMatch(migration, /create policy[^;]+to anon[^;]+battery_(integration|ingestion)/is);
  assert.doesNotMatch(migration, /\bplaintext_secret\b|\bapi_key\s+text\b/i);
  assert.match(verification, /no_plaintext_secret_column_passed/i);
  assert.doesNotMatch(verification, /union all|from checks/i);
});

test("DPP publication foundation is immutable, server-written, and reversible", async () => {
  const migration = await readFile(`${migrationDirectory}/0015_dpp_publication_foundation.sql`, "utf8");
  const rollback = await readFile(`${rollbackDirectory}/0015_dpp_publication_foundation.down.sql`, "utf8");

  for (const table of ["dpp_publication", "dpp_product_publication_pointer"]) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}\\b`, "i"));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
    assert.match(rollback, new RegExp(`drop table if exists public\\.${table}\\b`, "i"));
  }
  assert.match(migration, /greanlean_store_dpp_publication/i);
  assert.match(migration, /greanlean_withdraw_current_dpp_publication/i);
  assert.match(migration, /dpp_publication_content_immutable/i);
  assert.match(migration, /dpp_publication_one_current_idx/i);
  assert.match(migration, /PUBLICATION_VERSION_CONFLICT/i);
  assert.match(migration, /grant execute[\s\S]+greanlean_store_dpp_publication[\s\S]+to service_role/i);
  assert.doesNotMatch(migration, /grant execute[\s\S]+greanlean_store_dpp_publication[\s\S]+to (anon|authenticated)/i);
  assert.doesNotMatch(migration, /\b(update|delete\s+from|truncate)\s+public\.(products|product_)/i);
});

test("DPP review foundation requires validation, approval, and a stable source fingerprint", async () => {
  const migration = await readFile(`${migrationDirectory}/0016_dpp_publication_review.sql`, "utf8");
  const rollback = await readFile(`${rollbackDirectory}/0016_dpp_publication_review.down.sql`, "utf8");
  const verification = await readFile("supabase/bundles/backoffice_alignment_phase1_verify.sql", "utf8");

  for (const table of [
    "dpp_publication_review",
    "dpp_publication_validation_run",
    "dpp_publication_validation_result",
  ]) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}\\b`, "i"));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
    assert.match(rollback, new RegExp(`drop table if exists public\\.${table}\\b`, "i"));
  }
  assert.match(migration, /PUBLICATION_REVIEW_VALIDATION_REQUIRED/i);
  assert.match(migration, /PUBLICATION_REVIEW_BLOCKERS_REMAIN/i);
  assert.match(migration, /PUBLICATION_SOURCE_CHANGED_AFTER_REVIEW/i);
  assert.match(migration, /dpp_validation_result_append_only/i);
  assert.match(migration, /greanlean_is_platform_admin\(auth\.uid\(\)\)/i);
  assert.match(migration, /grant execute[\s\S]+greanlean_publish_approved_review[\s\S]+to service_role/i);
  assert.doesNotMatch(verification, /union all|from checks/i);
});

test("publication review function permissions explicitly separate anonymous, authenticated, and service roles", async () => {
  const migration = await readFile(`${migrationDirectory}/0017_publication_review_function_permissions.sql`, "utf8");
  const rollback = await readFile(`${rollbackDirectory}/0017_publication_review_function_permissions.down.sql`, "utf8");
  const verification = await readFile("supabase/bundles/backoffice_alignment_phase1_verify.sql", "utf8");

  assert.match(migration, /greanlean_decide_publication_review/i);
  assert.match(migration, /from public, anon, authenticated/i);
  assert.match(migration, /to authenticated/i);
  assert.match(migration, /greanlean_publish_approved_review[\s\S]+to service_role/i);
  assert.match(rollback, /revoke all on function public\.greanlean_decide_publication_review/i);
  assert.match(verification, /authenticated_review_execute_passed/i);
  assert.match(verification, /anonymous_review_execute_denied_passed/i);
});

test("canonical publication finalization binds real metadata and disables draft publication functions", async () => {
  const migration = await readFile(`${migrationDirectory}/0018_canonical_publication_finalization.sql`, "utf8");
  const rollback = await readFile(`${rollbackDirectory}/0018_canonical_publication_finalization.down.sql`, "utf8");
  const verification = await readFile("supabase/bundles/backoffice_alignment_phase2_verify.sql", "utf8");

  assert.match(migration, /greanlean_store_final_dpp_publication/i);
  assert.match(migration, /greanlean_publish_final_approved_review/i);
  assert.match(migration, /PUBLICATION_FINAL_STATUS_REQUIRED/i);
  assert.match(migration, /PUBLICATION_VERSION_NUMBER_MISMATCH/i);
  assert.match(migration, /PUBLICATION_REVIEWED_CONTENT_CHANGED/i);
  assert.match(migration, /from public, anon, authenticated, service_role/i);
  assert.match(migration, /to service_role/i);
  assert.match(rollback, /rollback refused: canonical publication business data exists/i);
  assert.match(verification, /legacy_publication_functions_disabled_passed/i);
  assert.doesNotMatch(verification, /union all|from checks/i);
});

test("M4 evidence files and lifecycle history are immutable, authorised, and reversible", async () => {
  const migration = await readFile(`${migrationDirectory}/0019_file_evidence_lifecycle_foundation.sql`, "utf8");
  const rollback = await readFile(`${rollbackDirectory}/0019_file_evidence_lifecycle_foundation.down.sql`, "utf8");
  const verification = await readFile("supabase/bundles/backoffice_alignment_phase3_verify.sql", "utf8");
  const fileRepository = await readFile("lib/server/dppFileRepository.ts", "utf8");

  for (const table of [
    "dpp_file_asset",
    "dpp_file_version",
    "dpp_field_evidence_link",
    "dpp_lifecycle_event",
  ]) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}\\b`, "i"));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
    assert.match(rollback, new RegExp(`drop table if exists public\\.${table}\\b`, "i"));
  }
  assert.match(migration, /dpp_file_version_append_only/i);
  assert.match(migration, /create table if not exists public\.dpp_file_version[\s\S]+access_level_code text not null/i);
  assert.match(migration, /dpp_field_evidence_append_only/i);
  assert.match(migration, /dpp_lifecycle_append_only/i);
  assert.match(migration, /DPP_EVIDENCE_FILE_ACCESS_TOO_LOW/i);
  assert.match(migration, /DPP_LIFECYCLE_PREVIOUS_HASH_CONFLICT/i);
  assert.match(fileRepository, /upsert:\s*false/i);
  assert.match(fileRepository, /createSignedUrl/i);
  assert.match(migration, /grant execute[\s\S]+greanlean_append_file_version[\s\S]+to service_role/i);
  assert.doesNotMatch(migration, /grant all on public\.dpp_(file|field|lifecycle)/i);
  assert.doesNotMatch(migration, /grant\s+[^;]*\b(delete|truncate)\b[^;]*to service_role/i);
  assert.doesNotMatch(migration, /for\s+(all|insert|update|delete)\s+to\s+(anon|authenticated)/i);
  assert.match(rollback, /rollback refused: M4 file, evidence, or lifecycle business data exists/i);
  assert.doesNotMatch(verification, /union all|from checks/i);
});

test("M5 system operations are server-only and real connector receipts are append-only", async () => {
  const migration = await readFile(`${migrationDirectory}/0020_system_operation_security_boundary.sql`, "utf8");
  const rollback = await readFile(`${rollbackDirectory}/0020_system_operation_security_boundary.down.sql`, "utf8");
  const verification = await readFile("supabase/bundles/backoffice_alignment_phase4_verify.sql", "utf8");

  for (const table of [
    "dpp_blockchain_connector",
    "dpp_blockchain_anchor_request",
    "dpp_blockchain_anchor_receipt",
  ]) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}\\b`, "i"));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
    assert.match(rollback, new RegExp(`drop table if exists public\\.${table}\\b`, "i"));
  }
  assert.match(migration, /create table if not exists public\.dpp_blockchain_anchors\b/i);
  assert.match(migration, /alter table public\.dpp_blockchain_anchors enable row level security/i);
  assert.match(migration, /revoke insert, update, delete, truncate[\s\S]+from anon, authenticated/i);
  assert.match(migration, /greanlean_request_blockchain_anchor/i);
  assert.match(migration, /greanlean_record_blockchain_receipt/i);
  assert.match(migration, /BLOCKCHAIN_CONNECTOR_NOT_ACTIVE/i);
  assert.match(migration, /REGISTRY_TEST_CANNOT_RECORD_PRODUCTION_SUCCESS/i);
  assert.match(migration, /dpp_blockchain_receipt_append_only/i);
  assert.match(migration, /grant execute[\s\S]+greanlean_request_blockchain_anchor[\s\S]+to service_role/i);
  assert.doesNotMatch(migration, /\b(api_key|private_key|plaintext_secret|access_token)\s+text\b/i);
  assert.doesNotMatch(migration, /grant all on public\./i);
  assert.match(rollback, /rollback refused: blockchain connector, request, or receipt data exists/i);
  assert.doesNotMatch(verification, /union all|from checks/i);
});

test("M6 canonical cutover is tracked, audience-projected, and logically reversible", async () => {
  const migration = await readFile(`${migrationDirectory}/0021_publication_backfill_and_read_cutover.sql`, "utf8");
  const rollback = await readFile(`${rollbackDirectory}/0021_publication_backfill_and_read_cutover.down.sql`, "utf8");
  const verification = await readFile("supabase/bundles/backoffice_alignment_phase5_verify.sql", "utf8");

  for (const table of [
    "dpp_publication_read_control",
    "dpp_migration_batch",
    "dpp_migration_issue",
    "dpp_publication_comparison",
  ]) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}\\b`, "i"));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  }
  assert.match(migration, /values\s*\(true,\s*'LEGACY'\)/i);
  assert.match(migration, /greanlean_public_canonical_dpp_snapshot/i);
  assert.match(migration, /greanlean_authorized_canonical_dpp_snapshot/i);
  assert.match(migration, /greanlean_project_canonical_snapshot/i);
  assert.match(migration, /CANONICAL_CUTOVER_REQUIRES_FOUR_CURRENT_PUBLICATIONS/i);
  assert.match(migration, /add column if not exists publication_id uuid/i);
  assert.match(migration, /num_nonnulls\(product_version_id,\s*publication_id\)\s*=\s*1/i);
  assert.doesNotMatch(migration, /for\s+(all|insert|update|delete)\s+to\s+(anon|authenticated)/i);
  assert.match(rollback, /set read_mode = 'LEGACY'/i);
  assert.doesNotMatch(rollback, /drop table|delete from public\.dpp_publication/i);
  assert.doesNotMatch(verification, /union all|from checks/i);
});

test("public page and export share the database publication repository without static product payloads", async () => {
  const page = await readFile("app/p/[slug]/page.tsx", "utf8");
  const exportRoute = await readFile("app/api/dpp-export/route.ts", "utf8");
  const repository = await readFile("lib/dpp/publicDppRepository.ts", "utf8");

  assert.match(page, /loadPublicDppData/);
  assert.match(exportRoute, /loadPublicDppData/);
  assert.match(repository, /product_versions/);
  assert.match(repository, /snapshot\.publicDpp/);
  assert.doesNotMatch(page, /withDemoDppData|industrialDemoLegacyData/);
  assert.doesNotMatch(exportRoute, /demoPayload|industrialDemoStructuredPayload|SYNTHETIC/);
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

test("Registry adapter isolates environments and keeps evidence append-only", async () => {
  const sql = await readFile(`${migrationDirectory}/0011_registry_adapter.sql`, "utf8");
  for (const table of ["registry_mapping", "registry_organisation_enrolment", "registry_submission", "registry_validation_result", "registry_error_log", "registry_registration_proof"]) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}\\b`, "i"));
  }
  assert.match(sql, /environment in \('TEST', 'PRODUCTION'\)/i);
  assert.match(sql, /battery_semantics_check/i);
  assert.match(sql, /registry_schema_version is null/i);
  assert.match(sql, /registry_validation_append_only/i);
  assert.match(sql, /registry_error_append_only/i);
  assert.match(sql, /registry_proof_append_only/i);
  assert.doesNotMatch(sql, /create policy[\s\S]*registry_/i);
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

test("generated backoffice Phase 1 bundles preserve source order and checksums", async () => {
  const install = await readFile("supabase/bundles/backoffice_alignment_phase1_install.sql", "utf8");
  const rollback = await readFile("supabase/bundles/backoffice_alignment_phase1_rollback.sql", "utf8");
  let previous = -1;

  for (const file of backofficePhase1Migrations) {
    const source = await readFile(`${migrationDirectory}/${file}`, "utf8");
    const marker = `-- SOURCE: ${migrationDirectory}/${file}`;
    const index = install.indexOf(marker);
    assert.ok(index > previous, `${file} is missing or out of order in the install bundle`);
    assert.ok(install.includes(`-- SHA256: ${createHash("sha256").update(source).digest("hex")}`));
    assert.ok(install.includes(source.trim()), `${file} content differs from the bundle`);
    previous = index;
  }

  previous = -1;
  for (const file of backofficePhase1Rollbacks) {
    const source = await readFile(`${rollbackDirectory}/${file}`, "utf8");
    const marker = `-- SOURCE: ${rollbackDirectory}/${file}`;
    const index = rollback.indexOf(marker);
    assert.ok(index > previous, `${file} is missing or out of order in the rollback bundle`);
    assert.ok(rollback.includes(`-- SHA256: ${createHash("sha256").update(source).digest("hex")}`));
    assert.ok(rollback.includes(source.trim()), `${file} content differs from the bundle`);
    previous = index;
  }
});

test("generated backoffice M3 bundle preserves migration and rollback checksums", async () => {
  const install = await readFile("supabase/bundles/backoffice_alignment_phase2_install.sql", "utf8");
  const rollback = await readFile("supabase/bundles/backoffice_alignment_phase2_rollback.sql", "utf8");
  const migrationFile = "0018_canonical_publication_finalization.sql";
  const rollbackFile = "0018_canonical_publication_finalization.down.sql";
  const migration = await readFile(`${migrationDirectory}/${migrationFile}`, "utf8");
  const rollbackSource = await readFile(`${rollbackDirectory}/${rollbackFile}`, "utf8");

  assert.ok(install.includes(`-- SOURCE: ${migrationDirectory}/${migrationFile}`));
  assert.ok(install.includes(`-- SHA256: ${createHash("sha256").update(migration).digest("hex")}`));
  assert.ok(install.includes(migration.trim()));
  assert.ok(rollback.includes(`-- SOURCE: ${rollbackDirectory}/${rollbackFile}`));
  assert.ok(rollback.includes(`-- SHA256: ${createHash("sha256").update(rollbackSource).digest("hex")}`));
  assert.ok(rollback.includes(rollbackSource.trim()));
});

test("generated backoffice M4 bundle preserves migration and rollback checksums", async () => {
  const install = await readFile("supabase/bundles/backoffice_alignment_phase3_install.sql", "utf8");
  const rollback = await readFile("supabase/bundles/backoffice_alignment_phase3_rollback.sql", "utf8");
  const migrationFile = "0019_file_evidence_lifecycle_foundation.sql";
  const rollbackFile = "0019_file_evidence_lifecycle_foundation.down.sql";
  const migration = await readFile(`${migrationDirectory}/${migrationFile}`, "utf8");
  const rollbackSource = await readFile(`${rollbackDirectory}/${rollbackFile}`, "utf8");

  assert.ok(install.includes(`-- SOURCE: ${migrationDirectory}/${migrationFile}`));
  assert.ok(install.includes(`-- SHA256: ${createHash("sha256").update(migration).digest("hex")}`));
  assert.ok(install.includes(migration.trim()));
  assert.ok(rollback.includes(`-- SOURCE: ${rollbackDirectory}/${rollbackFile}`));
  assert.ok(rollback.includes(`-- SHA256: ${createHash("sha256").update(rollbackSource).digest("hex")}`));
  assert.ok(rollback.includes(rollbackSource.trim()));
});

test("generated backoffice M5 bundle preserves migration and rollback checksums", async () => {
  const install = await readFile("supabase/bundles/backoffice_alignment_phase4_install.sql", "utf8");
  const rollback = await readFile("supabase/bundles/backoffice_alignment_phase4_rollback.sql", "utf8");
  const migrationFile = "0020_system_operation_security_boundary.sql";
  const rollbackFile = "0020_system_operation_security_boundary.down.sql";
  const migration = await readFile(`${migrationDirectory}/${migrationFile}`, "utf8");
  const rollbackSource = await readFile(`${rollbackDirectory}/${rollbackFile}`, "utf8");

  assert.ok(install.includes(`-- SOURCE: ${migrationDirectory}/${migrationFile}`));
  assert.ok(install.includes(`-- SHA256: ${createHash("sha256").update(migration).digest("hex")}`));
  assert.ok(install.includes(migration.trim()));
  assert.match(install, /create table if not exists public\.dpp_blockchain_connector\s*\(/i);
  assert.doesNotMatch(install, /dpp_blockchain_[^\x00-\x7F]+connector/i);
  assert.ok(rollback.includes(`-- SOURCE: ${rollbackDirectory}/${rollbackFile}`));
  assert.ok(rollback.includes(`-- SHA256: ${createHash("sha256").update(rollbackSource).digest("hex")}`));
  assert.ok(rollback.includes(rollbackSource.trim()));
});

test("generated backoffice M6 bundle preserves migration and rollback checksums", async () => {
  const install = await readFile("supabase/bundles/backoffice_alignment_phase5_install.sql", "utf8");
  const rollback = await readFile("supabase/bundles/backoffice_alignment_phase5_rollback.sql", "utf8");
  const migrationFile = "0021_publication_backfill_and_read_cutover.sql";
  const rollbackFile = "0021_publication_backfill_and_read_cutover.down.sql";
  const migration = await readFile(`${migrationDirectory}/${migrationFile}`, "utf8");
  const rollbackSource = await readFile(`${rollbackDirectory}/${rollbackFile}`, "utf8");

  assert.ok(install.includes(`-- SOURCE: ${migrationDirectory}/${migrationFile}`));
  assert.ok(install.includes(`-- SHA256: ${createHash("sha256").update(migration).digest("hex")}`));
  assert.ok(install.includes(migration.trim()));
  assert.ok(rollback.includes(`-- SOURCE: ${rollbackDirectory}/${rollbackFile}`));
  assert.ok(rollback.includes(`-- SHA256: ${createHash("sha256").update(rollbackSource).digest("hex")}`));
  assert.ok(rollback.includes(rollbackSource.trim()));
});

test("P0 battery pilot migration is reversible, tenant-scoped and keeps legacy rows compatible", async () => {
  const migration = await readFile(`${migrationDirectory}/0025_p0_battery_pilot_foundation.sql`, "utf8");
  const rollback = await readFile(`${rollbackDirectory}/0025_p0_battery_pilot_foundation.down.sql`, "utf8");
  assert.match(migration, /^begin;/i);
  assert.match(migration, /P0_MIGRATION_BLOCKED_BATCH_PRODUCT_MISMATCH/i);
  assert.match(migration, /P0_MIGRATION_BLOCKED_ITEM_HIERARCHY_MISMATCH/i);
  assert.match(migration, /add column if not exists organisation_id uuid/i);
  assert.match(migration, /where organisation_id is not null/i);
  assert.match(migration, /subject_type text not null default 'PRODUCT'/i);
  assert.match(migration, /dpp_item_publication_pointer/i);
  assert.match(rollback, /^begin;/i);
  assert.match(rollback, /P0_ROLLBACK_REQUIRES_DATA_EXPORT_OR_FORWARD_FIX/i);
  assert.match(rollback, /dpp_publication_product_version_key/i);
});

test("generated P0 install and rollback bundles exactly track migration sources", async () => {
  const migration = await readFile(`${migrationDirectory}/0025_p0_battery_pilot_foundation.sql`, "utf8");
  const rollback = await readFile(`${rollbackDirectory}/0025_p0_battery_pilot_foundation.down.sql`, "utf8");
  const installBundle = await readFile("supabase/bundles/p0_battery_pilot_install.sql", "utf8");
  const rollbackBundle = await readFile("supabase/bundles/p0_battery_pilot_rollback.sql", "utf8");
  assert.ok(installBundle.endsWith(migration));
  assert.ok(rollbackBundle.endsWith(rollback));
  assert.match(installBundle, /Generated from supabase\/migrations\/0025_p0_battery_pilot_foundation\.sql/);
  assert.match(rollbackBundle, /Generated from supabase\/rollbacks\/0025_p0_battery_pilot_foundation\.down\.sql/);
});
