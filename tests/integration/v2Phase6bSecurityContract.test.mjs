import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Phase 6B middleware defines nonce CSP and required response headers", async () => {
  const middleware = await readFile("middleware.ts", "utf8");
  for (const expected of [
    "Content-Security-Policy",
    "Strict-Transport-Security",
    "X-Content-Type-Options",
    "Referrer-Policy",
    "Permissions-Policy",
    "frame-ancestors 'none'",
    "'nonce-${nonce}'",
    "'strict-dynamic'",
  ]) assert.match(middleware, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")));
  assert.doesNotMatch(middleware, /script-src \*/u);
  assert.doesNotMatch(middleware, /connect-src \*/u);
  assert.match(middleware, /production \? "" : " 'unsafe-eval'"/u);
});

test("Phase 6B public surfaces have 429, retry, and bounded capacity contracts", async () => {
  const [middleware, controls, repository] = await Promise.all([
    readFile("middleware.ts", "utf8"),
    readFile("lib/server/publicControls.ts", "utf8"),
    readFile("lib/server/v2/repository.ts", "utf8"),
  ]);
  for (const route of ["/api/v2/resolver/", "/api/v2/public/passports/", "/api/battery-dpp/public/", "/p/", "/api/qr", "/01/"]) {
    assert.ok(controls.includes(route), route);
  }
  assert.match(middleware, /status: 429/u);
  assert.match(middleware, /Retry-After/u);
  assert.match(middleware, /status: 413/u);
  assert.match(controls, /MAX_COUNTERS = 20_000/u);
  assert.match(repository, /\.limit\(200\)/u);
});

test("Hosted client key trusts only Vercel-owned forwarding and ignores caller x-forwarded-for", async () => {
  const middleware = await readFile("middleware.ts", "utf8");
  assert.match(middleware, /process\.env\.VERCEL === "1"/u);
  assert.match(middleware, /request\.headers\.get\("x-vercel-forwarded-for"\) \|\| request\.headers\.get\("x-real-ip"\) \|\| "unknown"/u);
  assert.doesNotMatch(middleware, /request\.headers\.get\("x-forwarded-for"\)/u);
  assert.match(middleware, /consumeDistributedPublicRateLimit/u);
  assert.match(middleware, /PUBLIC_RATE_LIMIT_UNAVAILABLE/u);
});

test("API wrapper streams a clone to enforce unknown-length and chunked JSON capacity", async () => {
  const route = await readFile("lib/server/apiRoute.ts", "utf8");
  assert.match(route, /request\.clone\(\)\.body\?\.getReader\(\)/u);
  assert.match(route, /received > maximumBytes/u);
  assert.match(route, /REQUEST_BODY_TOO_LARGE/u);
});
