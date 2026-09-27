import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import https from "node:https";

const origin = "https://greanlean-dpp-preprod.vercel.app";
const deploymentOrigin = "https://greanlean-dpp-preprod-gkrnle7l2-songweinie-1175s-projects.vercel.app";
const pilotTenantId = "11111111-1111-4111-8111-111111111111";
const otherTenantId = "22222222-2222-4222-8222-222222222222";
const identifier = "DPP-P4-MUJEZBWJ140310";
const gtin = "7904891679884";
const alias = "legacy-mujezbwj140310";

function parseEnv(source) {
  return Object.fromEntries(source.split(/\r?\n/u).flatMap((raw) => {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) return [];
    const index = line.indexOf("=");
    return [[line.slice(0, index), line.slice(index + 1).replace(/^(['"])(.*)\1$/u, "$2")]];
  }));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function percentile(values, quantile) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * quantile) - 1)];
}

function summarize(values, elapsedMs) {
  return {
    requests: values.length,
    minMs: Number(Math.min(...values).toFixed(2)),
    p50Ms: Number(percentile(values, 0.5).toFixed(2)),
    p95Ms: Number(percentile(values, 0.95).toFixed(2)),
    p99Ms: Number(percentile(values, 0.99).toFixed(2)),
    maxMs: Number(Math.max(...values).toFixed(2)),
    throughputRps: Number((values.length / (elapsedMs / 1000)).toFixed(2)),
  };
}

function serverTiming(value) {
  return Object.fromEntries((value || "").split(",").flatMap((part) => {
    const match = part.trim().match(/^([^;]+);dur=([0-9.]+)$/u);
    return match ? [[match[1], Number(match[2])]] : [];
  }));
}

async function timedRequest(path, options = {}) {
  const started = performance.now();
  const response = await fetch(`${origin}${path}`, {
    ...options,
    redirect: options.redirect || "manual",
    signal: AbortSignal.timeout(30_000),
  });
  const bytes = new Uint8Array(await response.arrayBuffer());
  return {
    status: response.status,
    elapsedMs: performance.now() - started,
    bytes: bytes.length,
    headers: response.headers,
    body: new TextDecoder().decode(bytes),
  };
}

async function measure(label, path) {
  const cold = await timedRequest(`${path}${path.includes("?") ? "&" : "?"}phase6c_cold=${Date.now()}-${label}`);
  assert(cold.status === 200, `${label} cold request failed (${cold.status}).`);
  const warmup = await timedRequest(path);
  assert(warmup.status === 200, `${label} warmup failed (${warmup.status}).`);
  const values = [];
  let failures = 0;
  const started = performance.now();
  for (let offset = 0; offset < 12; offset += 2) {
    const pair = await Promise.all([timedRequest(path), timedRequest(path)]);
    for (const result of pair) {
      if (result.status === 200) values.push(result.elapsedMs);
      else failures += 1;
    }
  }
  const elapsedMs = performance.now() - started;
  return {
    label,
    path,
    cold: {
      status: cold.status,
      elapsedMs: Number(cold.elapsedMs.toFixed(2)),
      cache: cold.headers.get("x-vercel-cache"),
      serverTiming: serverTiming(cold.headers.get("server-timing")),
    },
    warmup: {
      elapsedMs: Number(warmup.elapsedMs.toFixed(2)),
      cache: warmup.headers.get("x-vercel-cache"),
      serverTiming: serverTiming(warmup.headers.get("server-timing")),
    },
    warm: summarize(values, elapsedMs),
    failures,
    errorRate: failures / 12,
  };
}

function chunkedRequest(bytes) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${origin}/api/v2/connectors`);
    const request = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: "POST",
      headers: { "content-type": "application/json", "transfer-encoding": "chunked" },
    }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve({ status: response.statusCode, body: Buffer.concat(chunks).toString("utf8") }));
    });
    request.setTimeout(30_000, () => request.destroy(new Error("Chunked probe timed out.")));
    request.on("error", reject);
    const chunk = bytes === 2 ? Buffer.from("{}") : Buffer.alloc(64 * 1024, 0x61);
    let remaining = bytes;
    while (remaining > 0) {
      const size = Math.min(remaining, chunk.length);
      request.write(chunk.subarray(0, size));
      remaining -= size;
    }
    request.end();
  });
}

const env = parseEnv(await readFile(".env.preproduction.local", "utf8"));
const serviceHeaders = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };
const anonHeaders = { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY };

const performanceResults = [];
for (const [label, path] of [
  ["dpp-id", `/api/v2/resolver/${identifier}?format=json`],
  ["gtin", `/api/v2/resolver/${gtin}?format=json`],
  ["legacy-alias", `/api/v2/resolver/${alias}?format=json`],
  ["public-json", `/api/v2/public/passports/${identifier}?format=json`],
  ["public-html", `/api/v2/resolver/${identifier}?format=html`],
]) performanceResults.push(await measure(label, path));

const allWarm = performanceResults.flatMap((result) => {
  const value = result.warm;
  return Array(value.requests).fill(value.p95Ms);
});
const performanceSummary = {
  requests: performanceResults.reduce((sum, result) => sum + result.warm.requests, 0),
  failures: performanceResults.reduce((sum, result) => sum + result.failures, 0),
  errorRate: performanceResults.reduce((sum, result) => sum + result.failures, 0) / 60,
  worstRouteP95Ms: Math.max(...performanceResults.map((result) => result.warm.p95Ms)),
  representativeP95Ms: percentile(allWarm, 0.95),
};

const homepage = await timedRequest("/");
assert(homepage.status === 200, "Hosted homepage is unavailable.");
const securityHeaders = {
  csp: homepage.headers.get("content-security-policy"),
  hsts: homepage.headers.get("strict-transport-security"),
  nosniff: homepage.headers.get("x-content-type-options"),
  frameOptions: homepage.headers.get("x-frame-options"),
  referrerPolicy: homepage.headers.get("referrer-policy"),
};
assert(securityHeaders.csp?.includes("'strict-dynamic'"), "Hosted CSP is incomplete.");
assert(securityHeaders.hsts && securityHeaders.nosniff === "nosniff" && securityHeaders.frameOptions === "DENY", "Hosted security headers are incomplete.");

const httpRedirect = await fetch(`http://greanlean-dpp-preprod.vercel.app/api/v2/resolver/${identifier}`, { redirect: "manual" });
await httpRedirect.arrayBuffer();
assert([301, 302, 307, 308].includes(httpRedirect.status) && httpRedirect.headers.get("location")?.startsWith("https://"), "HTTPS redirect failed.");

const spoofResults = [];
for (const headers of [
  { "x-forwarded-for": "198.51.100.10" },
  { "x-forwarded-for": "203.0.113.20" },
  { "x-vercel-forwarded-for": "192.0.2.30" },
]) {
  const response = await timedRequest(`/api/v2/resolver/${identifier}?format=json&spoof=${Math.random()}`, { headers });
  spoofResults.push({
    status: response.status,
    remaining: Number(response.headers.get("x-ratelimit-remaining")),
    backend: response.headers.get("x-ratelimit-backend"),
    identity: response.headers.get("x-ratelimit-identity"),
  });
}
assert(spoofResults.every((result) => result.status === 200 && result.backend === "distributed"), "Hosted distributed limiter was not active.");
assert(spoofResults.every((result) => result.identity && result.identity === spoofResults[0].identity), "Forwarded-IP spoof changed rate-limit identity.");

const externalQr = await timedRequest(`/api/qr?url=${encodeURIComponent("https://evil.example/p/DPP-1")}`);
assert(externalQr.status === 400 && externalQr.body.includes("QR_TARGET_NOT_APPROVED"), "Arbitrary external QR target was not rejected.");
const unsafeQr = await timedRequest(`/api/qr?url=${encodeURIComponent("javascript:alert(1)")}`);
assert(unsafeQr.status === 400, "Unsafe QR scheme was not rejected.");
const validQrTarget = `${origin}/api/v2/resolver/${identifier}`;
const qrRemaining = Number(unsafeQr.headers.get("x-ratelimit-remaining"));
assert(Number.isInteger(qrRemaining) && qrRemaining >= 0 && qrRemaining <= 28, "QR rate-limit remaining value was invalid.");
const qrStatuses = await Promise.all(Array.from({ length: qrRemaining }, async (_, index) => {
  const response = await timedRequest(`/api/qr?data=${encodeURIComponent(validQrTarget)}&probe=${index}`);
  return response.status;
}));
assert(qrStatuses.every((status) => status === 200), "QR requests within the reported remaining budget were rejected.");
const limitedQr = await timedRequest(`/api/qr?data=${encodeURIComponent(validQrTarget)}&probe=limited`);
assert(limitedQr.status === 429 && Number(limitedQr.headers.get("retry-after")) >= 1, "Rate-limit response is missing Retry-After.");

const declaredBody = "a".repeat(1_048_577);
const declaredOversize = await timedRequest("/api/v2/connectors", {
  method: "POST",
  headers: { "content-type": "application/json", "content-length": String(Buffer.byteLength(declaredBody)) },
  body: declaredBody,
});
assert(declaredOversize.status === 413, "Declared oversized body was not rejected.");
const chunkedOversize = await chunkedRequest(1_048_577);
assert(chunkedOversize.status === 413 && chunkedOversize.body.includes("REQUEST_BODY_TOO_LARGE"), "Chunked oversized body bypassed the streaming limit.");
const chunkedSmall = await chunkedRequest(2);
assert([400, 401, 403, 404].includes(chunkedSmall.status), "Unknown-length small request did not reach normal authorization/validation.");

const usersResponse = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1000`, { headers: serviceHeaders });
const users = (await usersResponse.json()).users || [];
const testUser = users.find((user) => user.email === "user-a@phase1.greanlean.invalid");
assert(testUser, "Synthetic tenant-A user is missing.");
const password = `Phase6C-${randomBytes(24).toString("base64url")}!`;
const updateUser = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${testUser.id}`, {
  method: "PUT",
  headers: { ...serviceHeaders, "content-type": "application/json" },
  body: JSON.stringify({ password, email_confirm: true }),
});
assert(updateUser.ok, "Synthetic user credential refresh failed.");
const signIn = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { ...anonHeaders, "content-type": "application/json" },
  body: JSON.stringify({ email: testUser.email, password }),
});
const token = (await signIn.json()).access_token;
assert(token, "Synthetic user sign-in failed.");
const ownTenant = await timedRequest("/api/v2/organisations", { headers: { Authorization: `Bearer ${token}`, "x-tenant-id": pilotTenantId } });
const forgedTenant = await timedRequest("/api/v2/organisations", { headers: { Authorization: `Bearer ${token}`, "x-tenant-id": otherTenantId } });
assert(ownTenant.status === 200 && forgedTenant.status === 403, "Hosted cross-tenant/IDOR denial failed.");

const enumeration = await timedRequest(`/api/v2/resolver/UNKNOWN-${randomBytes(8).toString("hex")}?format=json`);
assert(enumeration.status === 404 && enumeration.body.includes("RESOLVER_NOT_FOUND") && !enumeration.body.includes("Supabase"), "Resolver enumeration response was not generic.");
const unauthenticatedConnector = await timedRequest("/api/v2/connectors/00000000-0000-4000-8000-000000000000/test", {
  method: "POST",
  headers: { "content-type": "application/json", "idempotency-key": `phase6c-${Date.now()}` },
  body: JSON.stringify({}),
});
assert([401, 403, 404].includes(unauthenticatedConnector.status), "Hosted connector/SSRF surface did not fail closed.");
const unauthenticatedPublication = await timedRequest("/api/v2/publications", {
  method: "POST",
  headers: { "content-type": "application/json", "idempotency-key": `phase6c-${Date.now()}` },
  body: JSON.stringify({ passport_id: "00000000-0000-4000-8000-000000000000" }),
});
assert([400, 401, 403, 404, 409, 422].includes(unauthenticatedPublication.status), "Published-payload mutation surface did not fail closed.");

const directAnonMutation = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/dpp_version?id=eq.41aa415e-46e6-45a8-9f9e-2d2041261f46`, {
  method: "PATCH",
  headers: { ...anonHeaders, "content-type": "application/json", Prefer: "return=representation" },
  body: JSON.stringify({ canonical_payload: { tampered: true } }),
});
const directAnonMutationBody = await directAnonMutation.text();
assert(!directAnonMutation.ok || directAnonMutationBody === "[]", "Anonymous published payload mutation was accepted.");

const deploymentHostProbe = await fetch(`${deploymentOrigin}/api/v2/resolver/${identifier}?format=json`, { redirect: "manual" });
await deploymentHostProbe.arrayBuffer();

process.stdout.write(`${JSON.stringify({
  generatedAt: new Date().toISOString(),
  hostedOrigin: origin,
  deploymentOrigin,
  performance: { routes: performanceResults, summary: performanceSummary },
  security: {
    homepageStatus: homepage.status,
    securityHeaders,
    httpsRedirect: { status: httpRedirect.status, locationIsHttps: httpRedirect.headers.get("location")?.startsWith("https://") },
    distributedRateLimit: {
      backend: "supabase",
      spoofedForwardedIpMaintainedIdentity: true,
      spoofResults,
      qrLimit: 30,
      successfulWithinWindow: qrStatuses.filter((status) => status === 200).length,
      firstOverLimitStatus: limitedQr.status,
      retryAfterPresent: Number(limitedQr.headers.get("retry-after")) >= 1,
      crossDeploymentHostProbeStatus: deploymentHostProbe.status,
    },
    bodyCapacity: {
      limitBytes: 1_048_576,
      declaredOversizeStatus: declaredOversize.status,
      chunkedOversizeStatus: chunkedOversize.status,
      unknownLengthSmallStatus: chunkedSmall.status,
    },
    qrPolicy: { decision: "DEPRECATED", externalTargetStatus: externalQr.status, unsafeSchemeStatus: unsafeQr.status },
    crossTenant: { ownTenantStatus: ownTenant.status, forgedTenantStatus: forgedTenant.status },
    resolverEnumerationStatus: enumeration.status,
    connectorSsrfSurfaceStatus: unauthenticatedConnector.status,
    publicationMutationStatus: unauthenticatedPublication.status,
    anonymousDatabaseMutationStatus: directAnonMutation.status,
  },
  productionWritePerformed: false,
  productionTrafficSwitched: false,
}, null, 2)}\n`);
