import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("partner backoffice access is role-gated, product-scoped, and excludes platform controls", async () => {
  const access = await readFile("lib/server/dppAccess.ts", "utf8");
  const shell = await readFile("components/DashboardShell.tsx", "utf8");
  const install = await readFile("supabase/bundles/orintent_partner_account_install.sql", "utf8");
  const writeRoute = await readFile("app/api/internal/data-write/route.ts", "utf8");
  const editor = await readFile("components/ProductEditor.tsx", "utf8");

  assert.match(access, /PARTNER_EDITOR_ROLES/);
  assert.match(access, /organisation_admin/);
  assert.match(access, /greanlean_product_access_level/);
  assert.match(access, /PRODUCT_SCOPE_NOT_GRANTED/);
  assert.match(shell, /isPlatformAdmin[\s\S]*\/dashboard\/products/);
  assert.match(shell, /partnerRole/);
  assert.match(shell, /partnerRouteAllowed/);
  assert.match(shell, /pathname\.startsWith\("\/dashboard\/products\/"\)/);
  assert.match(install, /greanlean_is_partner_editor/);
  assert.match(install, /Partner editors read assigned products/);
  assert.match(install, /greanlean_product_access_level\(product_id, auth\.uid\(\)\) = ''INTERNAL''/);
  assert.match(writeRoute, /PRODUCT_CREATE_NOT_ALLOWED/);
  assert.match(editor, /PartnerPreviewPanel/);
  assert.match(editor, /isPlatformAdmin \? \(/);
});

test("Orintent V2 pilot upgrade grants DPP management without approval or publication authority", async () => {
  const [install, verify, rollback] = await Promise.all([
    readFile("supabase/bundles/orintent_v2_dpp_manager_install.sql", "utf8"),
    readFile("supabase/bundles/orintent_v2_dpp_manager_verify.sql", "utf8"),
    readFile("supabase/bundles/orintent_v2_dpp_manager_rollback.sql", "utf8"),
  ]);

  assert.match(install, /orintent@greanlean\.com/);
  assert.match(install, /greanlean-reference-mobility/);
  assert.match(install, /code = 'dpp_manager'/);
  assert.match(install, /on conflict \(tenant_id, user_id\)/);
  for (const capability of ["dpp.approve", "dpp.publish", "dpp.withdraw", "membership.manage", "tenant.manage"]) {
    assert.match(verify, new RegExp(capability.replace(".", "\\.")));
  }
  assert.match(rollback, /delete from public\.tenant_membership/);
});
