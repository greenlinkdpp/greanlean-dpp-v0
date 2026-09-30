import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);
const read = (file) => readFile(new URL(file, root), "utf8");

test("Round A.2 wires real capability-gated CRUD surfaces instead of read-only cards", async () => {
  const [backoffice, platform, organisation, productRoutes, productRepository, relationMigration] = await Promise.all([
    read("components/v2/backoffice/BackofficeConsole.tsx"), read("components/v2/platform/PlatformConsole.tsx"),
    read("lib/server/v2/organisationRoutes.ts"), read("lib/server/v2/productRoutes.ts"), read("lib/server/v2/productRepository.ts"),
    read("supabase/migrations/0037_v2_product_organisation_relationships.sql"),
  ]);
  assert.match(backoffice, /DataWorkspaceLanding/);
  assert.match(backoffice, /Manual Entry/);
  assert.match(backoffice, /TenantProfilePanel/);
  assert.match(backoffice, /CrudActionPanel/);
  assert.match(backoffice, /ProductOrganisationActions/);
  assert.match(platform, /Create Tenant/);
  assert.match(platform, /Archive/);
  assert.match(organisation, /ORGANISATION_DELETE_BLOCKED/);
  assert.match(productRepository, /PRODUCT_DELETE_BLOCKED/);
  assert.match(relationMigration, /product_organisation_relation/);
  assert.match(relationMigration, /enable row level security/);
});

test("Round A.2 mutation paths retain tenant scope and idempotency boundaries", async () => {
  const [backoffice, organisation, productRoutes] = await Promise.all([
    read("components/v2/backoffice/BackofficeConsole.tsx"), read("lib/server/v2/organisationRoutes.ts"), read("lib/server/v2/productRoutes.ts"),
  ]);
  assert.match(backoffice, /"x-tenant-id": context\.tenantId/);
  assert.match(backoffice, /"idempotency-key": crypto\.randomUUID\(\)/);
  assert.match(organisation, /requireV2PolicyContext/);
  assert.match(productRoutes, /requireV2PolicyContext/);
  assert.match(productRoutes, /executeIdempotentWrite/);
});
