import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { assertSafeResponse, isPrivateAddress, redactExternalResult, validateConnectorUrl, validateRedirectChain, verifyWebhookSignature } from "../../lib/v2/connectorSecurity.ts";

test("Connector URL policy rejects SSRF targets and unsafe schemes", async () => {
  await assert.rejects(() => validateConnectorUrl("file:///etc/passwd", { allowedHosts: ["localhost"] }), /CONNECTOR_HOST_NOT_ALLOWED/);
  await assert.rejects(() => validateConnectorUrl("http://169.254.169.254/latest/meta-data", { allowedHosts: ["169.254.169.254"], resolveHost: async () => ["169.254.169.254"] }), /CONNECTOR_HOST_NOT_ALLOWED/);
  await assert.rejects(() => validateConnectorUrl("https://private.example/data", { allowedHosts: ["private.example"], resolveHost: async () => ["10.0.0.1"] }), /CONNECTOR_HOST_NOT_ALLOWED/);
  const local = await validateConnectorUrl("http://localhost:8787/fixture", { allowedHosts: ["localhost"], allowLocalMock: true, resolveHost: async () => ["127.0.0.1"] });
  assert.equal(local.hostname, "localhost");
  await assert.rejects(() => validateRedirectChain(["https://allowed.example", "http://localhost/private"], { allowedHosts: ["allowed.example", "localhost"], resolveHost: async (host) => host === "localhost" ? ["127.0.0.1"] : ["203.0.113.5"] }), /CONNECTOR_HOST_NOT_ALLOWED/);
  assert.equal(isPrivateAddress("192.168.1.2"), true);
  assert.equal(isPrivateAddress("8.8.8.8"), false);
});

test("Webhook HMAC validates timestamp and signature", () => {
  const rawBody = JSON.stringify({ eventId: "evt-1" });
  const timestamp = "1700000000";
  const secret = "development-only-secret";
  const signature = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  assert.match(verifyWebhookSignature({ rawBody, timestamp, signature, secret, now: 1_700_000_000_000 }), /^[a-f0-9]{64}$/);
  assert.throws(() => verifyWebhookSignature({ rawBody, timestamp, signature: "0".repeat(64), secret, now: 1_700_000_000_000 }), /WEBHOOK_SIGNATURE_INVALID/);
  assert.throws(() => verifyWebhookSignature({ rawBody, timestamp, signature, secret, now: 1_700_001_000_000 }), /WEBHOOK_REPLAY_DETECTED/);
});

test("External receipts are redacted and bounded", () => {
  assert.deepEqual(redactExternalResult({ token: "never", nested: { password: "never", ok: true } }), { nested: { ok: true } });
  assert.throws(() => assertSafeResponse("text/html", 10), /CONNECTOR_EXTERNAL_ERROR/);
  assert.throws(() => assertSafeResponse("application/json", 2_000_000, 100), /CONNECTOR_EXTERNAL_ERROR/);
});

