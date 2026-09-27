import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = "supabase/migrations/0028_v2_phase2_product_core.sql";
const rollbackPath = "supabase/rollbacks/0028_v2_phase2_product_core.down.sql";

test("Phase 2 Product Core migration is additive and reversible", async () => {
  const [migration, rollback] = await Promise.all([
    readFile(migrationPath, "utf8"),
    readFile(rollbackPath, "utf8"),
  ]);
  assert.match(migration, /^begin;/);
  assert.match(migration, /commit;\s*$/);
  assert.match(rollback, /^begin;/);
  assert.match(rollback, /commit;\s*$/);
  assert.doesNotMatch(
    migration,
    /alter table public\.(products|battery_model_profile|battery_batch|battery_item)\b/i,
  );
  assert.doesNotMatch(
    migration,
    /drop table|rename\s+(?:table|column)|delete from public\.(products|battery_)/i,
  );
  for (const table of [
    "product_family",
    "product_model",
    "sku",
    "product_batch",
    "batch_sku_link",
    "product_item",
    "product_subject_identifier",
  ]) {
    assert.match(migration, new RegExp("create table public\\." + table + "\\b"));
    assert.match(migration, new RegExp("alter table public\\." + table + " enable row level security"));
    assert.match(rollback, new RegExp("drop table if exists public\\." + table));
  }
  assert.match(migration, /'0028'/);
  assert.match(rollback, /migration_number = '0028'/);
});

test("Tenant and Model consistency is enforced with composite foreign keys", async () => {
  const migration = await readFile(migrationPath, "utf8");
  assert.match(migration, /foreign key \(family_id, tenant_id\)[\s\S]*product_family\(id, tenant_id\)/);
  assert.match(migration, /foreign key \(manufacturer_organisation_id, tenant_id\)[\s\S]*organisation_v2\(id, tenant_id\)/);
  assert.match(migration, /foreign key \(model_id, tenant_id\)[\s\S]*product_model\(id, tenant_id\)/);
  assert.match(migration, /foreign key \(batch_id, tenant_id, model_id\)[\s\S]*product_batch\(id, tenant_id, model_id\)/);
  assert.match(migration, /foreign key \(sku_id, tenant_id, model_id\)[\s\S]*sku\(id, tenant_id, model_id\)/);
  assert.match(migration, /BATCH_SKU_LINK_REQUIRED/);
  for (const constraint of [
    "product_model_family_tenant_fk",
    "sku_model_tenant_fk",
    "product_batch_model_tenant_fk",
    "batch_sku_link_batch_model_tenant_fk",
    "batch_sku_link_sku_model_tenant_fk",
    "product_item_model_tenant_fk",
    "product_item_sku_model_tenant_fk",
    "product_item_batch_model_tenant_fk",
  ]) {
    assert.match(migration, new RegExp("constraint " + constraint + " foreign key"));
  }
});

test("Identifier model normalizes, scopes collisions, and reserves future types", async () => {
  const migration = await readFile(migrationPath, "utf8");
  assert.match(migration, /v2_gtin_is_valid/);
  assert.match(migration, /v2_normalize_product_identifier/);
  assert.match(migration, /product_identifier_tenant_active_unique/);
  assert.match(migration, /product_identifier_global_active_unique/);
  assert.match(migration, /where status = 'ACTIVE'/);
  assert.match(migration, /'PASSPORT'/);
  assert.match(migration, /IDENTIFIER_PASSPORT_NOT_ENABLED/);
  assert.match(migration, /identifier_type not in \('DPP_ID', 'REGISTRY_ID', 'CREDENTIAL_ID'\)/);
});

test("Product Core RLS reuses Phase 1 capability and Partner resource scope", async () => {
  const migration = await readFile(migrationPath, "utf8");
  for (const policy of [
    "product_family_select",
    "product_model_select",
    "sku_select",
    "product_batch_select",
    "batch_sku_link_select",
    "product_item_select",
    "product_identifier_select",
  ]) {
    assert.match(migration, new RegExp("create policy " + policy));
  }
  assert.match(migration, /v2_user_has_capability\(tenant_id, 'product\.view'\)/);
  assert.match(migration, /v2_user_has_partner_resource_capability/);
  assert.match(migration, /'identifier\.manage'/);
});
