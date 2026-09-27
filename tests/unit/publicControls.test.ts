import assert from "node:assert/strict";
import test from "node:test";
import {
  consumePublicRateLimit,
  publicSurfaceRule,
  requestBodyLimit,
  resetPublicRateLimitsForTests,
} from "../../lib/server/publicControls.ts";

test("all required public surfaces have bounded route-level rules", () => {
  const paths = [
    "/api/v2/resolver/example",
    "/api/v2/public/passports/example",
    "/api/battery-dpp/public/example",
    "/p/example",
    "/api/qr",
    "/01/09506000134352",
  ];
  for (const path of paths) {
    const rule = publicSurfaceRule(path);
    assert.ok(rule, path);
    assert.ok(rule.limit > 0 && rule.limit <= 120);
    assert.equal(rule.windowMs, 60_000);
  }
  assert.equal(publicSurfaceRule("/api/v2/passports"), null);
});

test("rate limiter rejects the first request above the route limit", () => {
  resetPublicRateLimitsForTests();
  const rule = { surface: "qr" as const, limit: 2, windowMs: 60_000 };
  assert.equal(consumePublicRateLimit("client-a", rule, 1_000).allowed, true);
  assert.equal(consumePublicRateLimit("client-a", rule, 1_001).allowed, true);
  const rejected = consumePublicRateLimit("client-a", rule, 1_002);
  assert.equal(rejected.allowed, false);
  assert.equal(rejected.remaining, 0);
  assert.equal(rejected.retryAfterSeconds, 60);
});

test("request body limits distinguish JSON and controlled multipart uploads", () => {
  assert.equal(requestBodyLimit("/api/v2/products", "application/json"), 1024 * 1024);
  assert.equal(requestBodyLimit("/api/internal/dpp-files", "multipart/form-data; boundary=x"), 30 * 1024 * 1024);
  assert.equal(requestBodyLimit("/p/example", "text/html"), null);
});
