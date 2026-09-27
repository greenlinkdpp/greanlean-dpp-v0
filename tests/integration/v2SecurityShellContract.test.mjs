import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const routes = [
  "app/api/v2/tenants/route.ts",
  "app/api/v2/organisations/route.ts",
  "app/api/v2/partners/route.ts",
  "app/api/v2/partner-authorizations/route.ts",
  "app/api/v2/partner-authorizations/[authorizationId]/approve/route.ts",
  "app/api/v2/partner-authorizations/[authorizationId]/revoke/route.ts",
  "app/api/v2/memberships/route.ts",
  "app/api/v2/roles/route.ts",
  "app/api/v2/capabilities/route.ts",
];

test("all Phase 1 API V2 routes use the shared capability and PDP boundary", async () => {
  for (const path of routes) {
    const source = await readFile(path, "utf8");
    assert.match(source, /requireV2PolicyContext|createTenantCollectionHandlers/, path);
    assert.doesNotMatch(source, /createSupabaseAdminClient/, `${path} creates an unguarded admin client`);
  }
  const security = await readFile("lib/server/v2/security.ts", "utf8");
  const pdp = await readFile("lib/server/v2/policyDecisionPoint.ts", "utf8");
  assert.match(security, /x-tenant-id/);
  assert.match(security, /evaluatePolicyDecisionPoint/);
  assert.match(security, /VERIFIED_POLICY_CONTEXT_REQUIRED/);
  assert.match(pdp, /policy_decision_audit/);
  assert.match(pdp, /reason_code/);
  assert.match(pdp, /policy_version/);
});

test("every Phase 1 write route requires persistent idempotency", async () => {
  const repository = await readFile("lib/server/v2/repository.ts", "utf8");
  const collection = await readFile("lib/server/v2/collectionRoute.ts", "utf8");
  assert.match(repository, /v2_idempotency_record/);
  assert.match(repository, /IDEMPOTENCY_KEY_REUSED/);
  assert.match(repository, /VERIFIED_POLICY_CONTEXT_REQUIRED|assertVerifiedPolicyContext/);
  assert.match(collection, /requireIdempotencyKey/);
  for (const path of [routes[0], routes[2], routes[3], routes[4], routes[5], routes[6], routes[7]]) {
    const source = await readFile(path, "utf8");
    assert.match(source, /requireIdempotencyKey|createTenantCollectionHandlers/, path);
  }
});

test("Production denylist cannot be bypassed by ordinary development scripts", async () => {
  const guard = await readFile("scripts/assert-development-target.mjs", "utf8");
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));
  assert.match(guard, /REFUSED: Production target detected/);
  assert.doesNotMatch(guard, /override|force|skip/i);
  assert.match(packageJson.scripts["dev:v2"], /assert-development-target/);
});
