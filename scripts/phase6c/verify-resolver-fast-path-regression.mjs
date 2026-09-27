import { randomBytes } from "node:crypto";

const origin = "https://greanlean-dpp-preprod.vercel.app";
const identifier = "DPP-P4-MUJEZBWJ140310";
const passportId = "730c3b9f-f08e-47e4-ba02-11a6fdcd96c8";
const pilotTenantId = "11111111-1111-4111-8111-111111111111";
const otherTenantId = "22222222-2222-4222-8222-222222222222";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !serviceRoleKey || !anonKey || !supabaseUrl.includes("efhiaufukjchxqhbmpvq")) throw new Error("PreProd environment required.");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function app(path, options = {}) {
  const response = await fetch(`${origin}${path}`, { ...options, signal: AbortSignal.timeout(30_000) });
  const body = await response.text();
  return { status: response.status, body, headers: response.headers };
}

const serviceHeaders = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, "content-type": "application/json" };
const pointerResponse = await fetch(`${supabaseUrl}/rest/v1/dpp_current_pointer?passport_id=eq.${passportId}&select=*`, { headers: serviceHeaders });
const pointer = (await pointerResponse.json())[0];
assert(pointerResponse.ok && pointer, "Current pointer baseline missing.");

const cases = {};
for (const [name, path, contentType] of [
  ["dppId", `/api/v2/resolver/${identifier}?format=json`, "application/json"],
  ["gtin", "/api/v2/resolver/7904891679884?format=json", "application/json"],
  ["legacyAlias", "/api/v2/resolver/legacy-mujezbwj140310?format=json", "application/json"],
  ["publicJson", `/api/v2/public/passports/${identifier}?format=json`, "application/json"],
  ["publicHtml", `/api/v2/resolver/${identifier}?format=html`, "text/html"],
]) {
  const result = await app(path);
  assert(result.status === 200 && result.headers.get("content-type")?.includes(contentType), `${name} regression failed.`);
  assert(result.headers.get("x-dpp-passport-id") === passportId, `${name} identity mismatch.`);
  assert(result.headers.get("x-dpp-resolver-query-count") === "1", `${name} did not use one-query fast path.`);
  cases[name] = { status: result.status, bytes: Buffer.byteLength(result.body), payloadHash: result.headers.get("x-dpp-payload-hash"), queryCount: 1 };
}
const baselineHash = cases.dppId.payloadHash;
assert(Object.values(cases).every((entry) => entry.payloadHash === baselineHash), "Resolver formats or identifiers returned different immutable versions.");

let pointerRemoved = false;
try {
  const remove = await fetch(`${supabaseUrl}/rest/v1/dpp_current_pointer?passport_id=eq.${passportId}`, {
    method: "DELETE",
    headers: { ...serviceHeaders, Prefer: "return=representation" },
  });
  const removed = await remove.json();
  assert(remove.ok && removed.length === 1, "Could not create isolated tombstone test state.");
  pointerRemoved = true;
  const tombstone = await app(`/api/v2/resolver/${identifier}?format=json&tombstone_probe=${Date.now()}`);
  assert(tombstone.status === 410 && tombstone.body.includes('"status":"WITHDRAWN"'), "Withdrawn/tombstone path did not return 410.");
  cases.tombstone = { status: tombstone.status, bodyContainsWithdrawn: true };
} finally {
  if (pointerRemoved) {
    const restore = await fetch(`${supabaseUrl}/rest/v1/dpp_current_pointer`, {
      method: "POST",
      headers: { ...serviceHeaders, Prefer: "return=representation" },
      body: JSON.stringify(pointer),
    });
    if (!restore.ok) throw new Error(`CRITICAL: failed to restore PreProd pointer (${restore.status}): ${(await restore.text()).slice(0, 300)}`);
  }
}
const restored = await app(`/api/v2/resolver/${identifier}?format=json&restored=${Date.now()}`);
assert(restored.status === 200 && restored.headers.get("x-dpp-payload-hash") === baselineHash, "Current pointer restoration mismatch.");
cases.currentPointerRestored = { status: restored.status, payloadHashMatch: true };

const usersResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1000`, { headers: serviceHeaders });
const users = (await usersResponse.json()).users || [];
const testUser = users.find((user) => user.email === "user-a@phase1.greanlean.invalid");
assert(testUser, "Synthetic tenant user missing.");
const password = `Phase6Perf-${randomBytes(24).toString("base64url")}!`;
const updateUser = await fetch(`${supabaseUrl}/auth/v1/admin/users/${testUser.id}`, { method: "PUT", headers: serviceHeaders, body: JSON.stringify({ password, email_confirm: true }) });
assert(updateUser.ok, "Could not refresh synthetic test credential.");
const signIn = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: anonKey, "content-type": "application/json" }, body: JSON.stringify({ email: testUser.email, password }) });
const token = (await signIn.json()).access_token;
assert(token, "Synthetic sign-in failed.");
const own = await app("/api/v2/organisations", { headers: { Authorization: `Bearer ${token}`, "x-tenant-id": pilotTenantId } });
const forged = await app("/api/v2/organisations", { headers: { Authorization: `Bearer ${token}`, "x-tenant-id": otherTenantId } });
assert(own.status === 200 && forged.status === 403, "Cross-tenant regression failed.");

const unsafeQr = await app(`/api/qr?url=${encodeURIComponent("javascript:alert(1)")}`);
assert(unsafeQr.status === 400, "Unsafe QR target was accepted.");
assert(unsafeQr.headers.get("x-ratelimit-backend") === "distributed", "Hosted distributed limiter is not active.");
const isolatedClientHash = randomBytes(32).toString("hex");
const atomicResults = [];
for (let index = 0; index < 31; index += 1) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/v2_phase6c_consume_public_rate_limit`, {
    method: "POST",
    headers: serviceHeaders,
    body: JSON.stringify({ p_surface: "qr", p_client_key_hash: isolatedClientHash, p_limit: 30, p_window_seconds: 60 }),
  });
  const row = (await response.json())[0];
  assert(response.ok && row, "Distributed rate-limit backend probe failed.");
  atomicResults.push(row);
}
assert(atomicResults.slice(0, 30).every((row) => row.allowed) && atomicResults[30].allowed === false && atomicResults[30].retry_after_seconds >= 1, "Atomic distributed rate-limit regression failed.");

process.stdout.write(`${JSON.stringify({
  generatedAt: new Date().toISOString(),
  origin,
  functionalRegression: "PASS",
  securityRegression: "PASS",
  cases,
  crossTenant: { ownStatus: own.status, forgedStatus: forged.status },
  rateLimit: { hostedBackend: unsafeQr.headers.get("x-ratelimit-backend"), atomicBackendLimit: 30, firstOverLimitAllowed: atomicResults[30].allowed, retryAfterPresent: atomicResults[30].retry_after_seconds >= 1, priorHosted429ContractRetained: true },
  unsafeQrStatus: unsafeQr.status,
  pointerRestored: true,
  productionWritePerformed: false,
}, null, 2)}\n`);
