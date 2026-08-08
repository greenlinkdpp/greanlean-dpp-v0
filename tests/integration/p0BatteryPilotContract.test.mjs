import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile("supabase/migrations/0025_p0_battery_pilot_foundation.sql", "utf8");
const repository = await readFile("lib/server/p0Repository.ts", "utf8");
const shell = await readFile("components/DashboardShell.tsx", "utf8");
const editor = await readFile("components/ProductEditor.tsx", "utf8");
const workflow = await readFile("lib/server/dppPublicationWorkflow.ts", "utf8");

test("P0 tenant resources are organisation-scoped, RLS protected and server-written", () => {
  for (const table of [
    "dpp_economic_operator_profile", "dpp_project", "dpp_applicability_assessment",
    "dpp_project_task", "dpp_product_ownership", "dpp_identifier", "dpp_import_job",
  ]) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
  }
  assert.match(migration, /revoke all on public\.dpp_economic_operator_profile[\s\S]+from anon, authenticated/i);
  assert.match(migration, /greanlean_p0_is_organisation_member/i);
  assert.doesNotMatch(repository, /details:\s*\{\s*database/i);
  assert.match(repository, /P0_BACKOFFICE_ACCESS_REQUIRED/);
  assert.match(repository, /ORGANISATION_ADMIN_ACCESS_REQUIRED/);
});

test("T01 database constraints reject cross-model batches, cross-batch items and duplicate organisation serials", () => {
  assert.match(migration, /battery_batch_model_product_fk/i);
  assert.match(migration, /battery_item_model_product_fk/i);
  assert.match(migration, /battery_item_batch_model_product_fk/i);
  assert.match(migration, /battery_batch_model_product_organisation_fk/i);
  assert.match(migration, /battery_item_model_product_organisation_fk/i);
  assert.match(migration, /dpp_project_task_project_organisation_fk/i);
  assert.match(migration, /battery_item_organisation_serial_idx/i);
  assert.match(migration, /BATTERY_ITEM_BATCH_MISMATCH/i);
  assert.match(migration, /row_count < 1 or row_count > 100/i);
});

test("item UPI is HTTPS, globally unique, resolvable and kept separate from internal ids", () => {
  assert.match(migration, /unique \(normalized_value\)/i);
  assert.match(migration, /identifier_type <> 'UPI_URL'[\s\S]+value ~ '\^https:/i);
  assert.match(migration, /public_key text/i);
  assert.match(migration, /https:\/\/www\.greanlean\.com\/p\//i);
  assert.match(migration, /dpp_identifier_status_check[\s\S]+RETIRED/i);
});

test("applicability and operator profile writes are transactional, versioned and append-only", () => {
  assert.match(migration, /greanlean_p0_record_applicability/i);
  assert.match(migration, /source_assessment_id/i);
  assert.match(migration, /APPLICABILITY_ASSESSMENT_APPEND_ONLY/i);
  assert.match(migration, /greanlean_p0_save_economic_operator_profile/i);
  assert.match(migration, /ECONOMIC_OPERATOR_PROFILE_VERSION_IMMUTABLE/i);
});

test("backoffice exposes projects, organisation governance and the product hierarchy", () => {
  assert.match(shell, /\/dashboard\/projects/);
  assert.match(shell, /\/dashboard\/organisation/);
  assert.match(editor, /P0BatteryHierarchy/);
  assert.match(repository, /greanlean_p0_bulk_create_battery_items/);
});

test("battery hierarchy reads require both organisation context and product editor scope", async () => {
  const route = await readFile("app/api/v1/product-models/[productId]/hierarchy/route.ts", "utf8");
  assert.match(route, /p0OrganisationContext/);
  assert.match(route, /GET[\s\S]+requireProductEditorAccess/);
});

test("all checked-in P0 fixtures remain explicitly synthetic", async () => {
  const fixtureFiles = [
    "home_storage_product_model.csv", "home_storage_battery_items.csv",
    "lmt_product_model.csv", "demo_bom.csv", "demo_measurements.csv",
  ];
  for (const name of fixtureFiles) {
    const fixture = await readFile(`fixtures/p0/${name}`, "utf8");
    assert.match(fixture, /demo_marker/);
    for (const line of fixture.trim().split(/\r?\n/).slice(1)) assert.match(line, /^SYNTHETIC,/);
  }
});

test("T04 item publication reuses review gates and stores immutable item versions", () => {
  assert.match(migration, /greanlean_p0_create_item_publication_review/i);
  assert.match(migration, /greanlean_p0_publish_final_item_review/i);
  assert.match(migration, /PUBLICATION_REVIEW_BLOCKERS_REMAIN/i);
  assert.match(migration, /PUBLICATION_REVIEWED_CONTENT_CHANGED/i);
  assert.match(migration, /dpp_publication_one_current_item_idx/i);
  assert.match(migration, /DPP_ITEM_PUBLICATION_CREATED/i);
  assert.match(migration, /p0_item_status in \([^\n]+PUBLISHED/i);
  assert.match(workflow, /batteryItemId/);
  assert.match(workflow, /greanlean_p0_publish_final_item_review/);
  assert.match(migration, /greanlean_p0_public_item_snapshot/);
  assert.match(migration, /greanlean_project_canonical_snapshot\(target_snapshot, 'PUBLIC'\)/);
});

test("T02 import preflight is authenticated, tenant-scoped and field-locatable", async () => {
  const route = await readFile("app/api/v1/imports/preflight/route.ts", "utf8");
  const preflight = await readFile("lib/p0/importPreflight.ts", "utf8");
  assert.match(route, /requireAuthenticatedUser/);
  assert.match(route, /p0OrganisationContext/);
  assert.match(preflight, /rowNumber/);
  assert.match(preflight, /columnName/);
  assert.match(preflight, /validateBatteryTechnicalValues/);
  assert.match(preflight, /MAT-001/);
  assert.match(migration, /greanlean_p0_commit_bom_import/);
  assert.match(migration, /BOM_IMPORT_PREFLIGHT_MISMATCH/);
  assert.match(migration, /BOM_IMPORT_PRODUCT_SCOPE_DENIED/);
});

test("T05 item page, PDF and JSON resolve the same public snapshot metadata", async () => {
  const repositorySource = await readFile("lib/dpp/publicDppRepository.ts", "utf8");
  const exportRoute = await readFile("app/api/dpp-export/route.ts", "utf8");
  assert.match(repositorySource, /greanlean_p0_public_item_snapshot/);
  assert.match(exportRoute, /X-DPP-Version/);
  assert.match(exportRoute, /X-DPP-Snapshot-Hash/);
  assert.match(exportRoute, /X-DPP-Published-At/);
});
