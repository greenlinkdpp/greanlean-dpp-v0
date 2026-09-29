import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");

test("Platform Admin authority remains separate from Tenant membership", async () => {
  const [migration, pdp, context] = await Promise.all([
    read("supabase/migrations/0036_v2_platform_operator_multitenant.sql"),
    read("lib/server/v2/policyDecisionPoint.ts"),
    read("app/api/v2/backoffice/context/route.ts"),
  ]);
  assert.match(migration, /platform_role_assignment/);
  assert.doesNotMatch(migration, /insert into public\.tenant_membership/i);
  assert.match(pdp, /PLATFORM_ASSIGNMENT/);
  assert.match(pdp, /tenant\.data\?\.status === "ACTIVE"/);
  assert.match(context, /authorityType: "PLATFORM"/);
  assert.match(context, /tenantOperationCapabilities/);
});

test("platform inventory is capability protected and preserves Tenant ownership", async () => {
  const [security, repository, organisations, products, dpps, operations] = await Promise.all([
    read("lib/server/v2/platformSecurity.ts"),
    read("lib/server/v2/platformRepository.ts"),
    read("app/api/v2/platform/organisations/route.ts"),
    read("app/api/v2/platform/products/route.ts"),
    read("app/api/v2/platform/dpps/route.ts"),
    read("app/api/v2/platform/operations/route.ts"),
  ]);
  assert.match(security, /PLATFORM_CAPABILITY_DENIED/);
  assert.match(security, /platform_operator_audit/);
  assert.match(repository, /withTenant/);
  assert.match(repository, /tenantName/);
  assert.match(organisations, /platform\.organisation\.view/);
  assert.match(products, /platform\.product\.view/);
  assert.match(dpps, /platform\.dpp\.view/);
  assert.match(operations, /platform\.operations\.view/);
});

test("every platform business write is rebound to an explicit active Tenant", async () => {
  const [consoleSource, platformConsole, policy, security, shell, login] = await Promise.all([
    read("components/v2/backoffice/BackofficeConsole.tsx"),
    read("components/v2/platform/PlatformConsole.tsx"),
    read("lib/v2/policy.ts"),
    read("lib/server/v2/security.ts"),
    read("components/DashboardShell.tsx"),
    read("app/login/page.tsx"),
  ]);
  assert.match(consoleSource, /x-tenant-id/);
  assert.match(consoleSource, /Active Tenant/);
  assert.match(consoleSource, /authorityType === "PLATFORM"/);
  assert.doesNotMatch(consoleSource, /contexts\[0\]/);
  assert.doesNotMatch(platformConsole, /setActiveTenantId\(reference/);
  assert.match(platformConsole, /<option value="">\{t\.chooseTenant\}<\/option>/);
  assert.match(policy, /PLATFORM_CAPABILITY_ACTIVE_TENANT/);
  assert.match(security, /A valid x-tenant-id header is required/);
  assert.match(shell, /\/dashboard\/platform/);
  assert.match(login, /PLATFORM_CONSOLE_PATH/);
});

test("manual claim entry and file preflight retain provenance and controlled states", async () => {
  const [consoleSource, claimRoute] = await Promise.all([
    read("components/v2/backoffice/BackofficeConsole.tsx"),
    read("app/api/v2/canonical-claims/route.ts"),
  ]);
  for (const state of ["INHERIT", "OVERRIDE", "CLEAR", "NOT_APPLICABLE", "UNKNOWN"]) {
    assert.match(consoleSource, new RegExp(state));
  }
  assert.match(consoleSource, /evidence_references/);
  assert.match(consoleSource, /raw_value_reference/);
  assert.match(consoleSource, /PREFLIGHT/);
  assert.match(claimRoute, /createManualClaim/);
});

test("Round 1 uses the approved owner logo asset without destructive cropping", async () => {
  const [logoSource, asset] = await Promise.all([
    read("components/BrandLogo.tsx"),
    readFile("public/brand/greanlean-wordmark.png"),
  ]);
  assert.match(logoSource, /\/brand\/greanlean-wordmark\.png/);
  assert.match(logoSource, /object-contain/);
  assert.doesNotMatch(logoSource, /overflow-hidden/);
  assert.equal(createHash("sha256").update(asset).digest("hex"), "729fc6d0249c8613bd8246dfc58011da42ccdb9c8f9de00874e1d6796c240eec");
});
