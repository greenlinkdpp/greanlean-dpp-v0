import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("identity migration defines organisation, membership, product grants, requests and append-only audit", async () => {
  const sql = await readFile("supabase/migrations/0013_identity_and_access.sql", "utf8");
  for (const table of [
    "dpp_organisation",
    "dpp_user_membership",
    "dpp_product_access_grant",
    "dpp_access_request",
    "dpp_access_audit",
  ]) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}\\b`, "i"));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  }
  assert.match(sql, /greanlean_resolve_dpp_access/);
  assert.match(sql, /greanlean_submit_access_request/);
  assert.match(sql, /greanlean_decide_access_request/);
  assert.match(sql, /dpp_access_audit_append_only/);
  assert.match(sql, /QR codes and URL parameters never create grants/i);
  assert.doesNotMatch(sql, /create policy[^;]+to anon[^;]+dpp_access_/is);
});

test("restricted DPP access is authenticated and resolved by the database", async () => {
  const route = await readFile("app/api/dpp-access/[identifier]/route.ts", "utf8");
  const repository = await readFile("lib/server/dppAccess.ts", "utf8");
  assert.match(route, /requireAuthenticatedUser/);
  assert.match(route, /resolveDppAccess/);
  assert.match(route, /Cache-Control": "private, no-store"/);
  assert.match(repository, /\.rpc\("greanlean_authorized_dpp_snapshot"/);
  assert.match(repository, /DPP_ACCESS_NOT_GRANTED/);
  assert.match(repository, /new ApiError\(403/);
});

test("authorised canonical snapshots are adapted before the shared DPP page renders them", async () => {
  const repository = await readFile("lib/server/dppAccess.ts", "utf8");
  assert.match(repository, /isCanonicalPublicationSnapshot\(projectedData\)/);
  assert.match(repository, /canonicalPublicationToLegacyDpp\(projectedData,\s*liveProduct\)/);
  assert.match(repository, /\.eq\("id", access\.productId\)/);
});

test("public DPP page treats view as a request, not a granted audience", async () => {
  const page = await readFile("app/p/[slug]/page.tsx", "utf8");
  const client = await readFile("components/AccessAwareDppPage.tsx", "utf8");
  assert.match(page, /AccessAwareDppPage/);
  assert.match(page, /requestedView=\{searchParams\?\.view\}/);
  assert.doesNotMatch(page, /searchParams\?\.view === "audit"\s*\?\s*"AUTHORITY_ONLY"/);
  assert.match(client, /\/api\/dpp-access\//);
  assert.match(client, /Authorization: `Bearer \$\{session\.access_token\}`/);
  assert.match(client, /response\.status === 403/);
  assert.match(client, /let audience:\s*DppAudience\s*=\s*"PUBLIC"/);
});

test("access requests and decisions use server APIs and database RPCs", async () => {
  const requestRoute = await readFile("app/api/access-requests/route.ts", "utf8");
  const decisionRoute = await readFile("app/api/access-requests/[requestId]/route.ts", "utf8");
  const repository = await readFile("lib/server/dppAccess.ts", "utf8");
  assert.match(requestRoute, /requireAuthenticatedUser/);
  assert.match(requestRoute, /submitDppAccessRequest/);
  assert.match(decisionRoute, /decideDppAccessRequest/);
  assert.match(repository, /greanlean_submit_access_request/);
  assert.match(repository, /greanlean_decide_access_request/);
});

test("dashboard and internal APIs require database-backed role and product identity", async () => {
  const shell = await readFile("components/DashboardShell.tsx", "utf8");
  assert.match(shell, /\/api\/access-context/);
  assert.match(shell, /identity\?\.canUseDashboard/);
  const batteryWorkspace = await readFile("app/api/battery-dpp/[productId]/route.ts", "utf8");
  assert.match(batteryWorkspace, /requireProductEditorAccess/);
  assert.match(batteryWorkspace, /createServerAuthClient\(accessToken\)/);
  for (const route of [
    "app/api/battery-dpp/[productId]/batterypass-export/route.ts",
    "app/api/registry/[productId]/route.ts",
    "app/api/registry/[productId]/export/[submissionId]/route.ts",
  ]) {
    const source = await readFile(route, "utf8");
    assert.match(source, /requireDppInternalUser/);
    assert.match(source, /createServerAuthClient\(accessToken\)/);
  }
});

test("login return paths reject protocol-relative redirects", async () => {
  const login = await readFile("app/login/page.tsx", "utf8");
  assert.match(login, /requestedNext\?\.startsWith\("\/"\)/);
  assert.match(login, /!requestedNext\.startsWith\("\/\/"\)/);
});
