import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("backoffice context is derived from authenticated membership and partner authority", async () => {
  const source = await read("app/api/v2/backoffice/context/route.ts");
  assert.match(source, /requireAuthenticatedUser/);
  assert.match(source, /tenant_membership/);
  assert.match(source, /partner_tenant_authorization/);
  assert.doesNotMatch(source, /service_role|secret_reference|config_json/);
});

test("snapshot is protected by PDP and repository queries remain Tenant scoped", async () => {
  const [route, repository] = await Promise.all([read("app/api/v2/backoffice/snapshot/route.ts"), read("lib/server/v2/backofficeRepository.ts")]);
  assert.match(route, /requireV2PolicyContext/);
  assert.match(route, /tenant\.view/);
  assert.match(repository, /assertVerifiedPolicyContext/);
  assert.match(repository, /\.eq\("tenant_id", tenantId\)/);
  assert.doesNotMatch(repository, /secret_reference|config_json|candidate_payload|canonical_payload/);
});

test("operator writes retain capability and idempotency enforcement", async () => {
  const [ui, phase4, phase5, approve] = await Promise.all([read("components/v2/backoffice/BackofficeConsole.tsx"), read("lib/server/v2/phase4Routes.ts"), read("lib/server/v2/phase5Routes.ts"), read("app/api/v2/passport-reviews/[id]/approve/route.ts")]);
  assert.match(ui, /idempotency-key/);
  assert.match(phase4, /requireIdempotencyKey/);
  assert.match(approve, /dpp\.approve/);
  assert.match(phase5, /import\.commit/);
  assert.match(ui, /capabilities\.includes/);
});

test("backoffice includes bilingual productized views and safe file preflight", async () => {
  const [ui, model] = await Promise.all([read("components/v2/backoffice/BackofficeConsole.tsx"), read("lib/v2/backoffice.ts")]);
  assert.match(model, /V2 Operations Console/); assert.match(model, /V2 运营控制台/);
  assert.match(ui, /\.csv,\.json,\.xlsx/);
  assert.match(ui, /PREFLIGHT/);
  assert.match(ui, /Audience preview boundary/);
  assert.doesNotMatch(ui, /dangerouslySetInnerHTML/);
});

test("strict CSP pages are request-rendered so framework scripts receive the nonce", async () => {
  const [layout, middleware] = await Promise.all([read("app/layout.tsx"), read("middleware.ts")]);
  assert.match(layout, /dynamic = "force-dynamic"/);
  assert.match(middleware, /requestHeaders\.set\("x-nonce", nonce\)/);
  assert.match(middleware, /'strict-dynamic'/);
});

test("V2-only Tenant members bypass the legacy dashboard gate only for V2 routes", async () => {
  const shell = await read("components/DashboardShell.tsx");
  assert.match(shell, /Promise\.all\(\[/);
  assert.match(shell, /const canUseLegacy = response\.ok/);
  assert.match(shell, /const canUseV2Backoffice = tenantContexts\.length > 0/);
  assert.match(shell, /!canUseLegacy && canUseV2Backoffice && !isV2Route/);
  assert.match(shell, /router\.replace\(`\/dashboard\/v2\?lang=\$\{locale\}`\)/);
  assert.match(shell, /canUseLegacy && !identity\.isPlatformAdmin && !partnerRouteAllowed/);
});
