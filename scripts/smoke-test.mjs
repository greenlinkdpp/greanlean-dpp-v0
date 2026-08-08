import assert from "node:assert/strict";
import process from "node:process";

const baseUrl = process.env.BASE_URL;
if (!baseUrl) {
  throw new Error("Set BASE_URL to a running local or preview deployment.");
}

const checks = [
  { path: "/", contentType: "text/html" },
  { path: "/p/DPP-LMT-BAT-48V15AH?lang=zh&showcase=1", contentType: "text/html" },
  { path: "/p/DPP-GV-ESS-14K3-000001?lang=en&showcase=1", contentType: "text/html" },
  { path: "/p/DPP-SFJK-31-1-REC?lang=zh&showcase=1", contentType: "text/html" },
  { path: "/p/DPP-CE-EARBUDS-001?lang=en&showcase=1", contentType: "text/html" },
  { path: "/api/dpp-export?format=json&product=DPP-LMT-BAT-48V15AH", contentType: "application/json" },
  { path: "/api/dpp-export?format=json&product=DPP-GV-ESS-14K3-000001", contentType: "application/json" },
  {
    path: `/api/qr?url=${encodeURIComponent(`${baseUrl}/p/DPP-LMT-BAT-48V15AH`)}`,
    contentType: "image/png",
    correlationId: "greanlean-smoke-qr",
  },
];

for (const check of checks) {
  const response = await fetch(new URL(check.path, baseUrl), {
    headers: check.correlationId ? { "x-correlation-id": check.correlationId } : undefined,
  });
  assert.equal(response.status, 200, `${check.path} returned ${response.status}`);
  assert.match(response.headers.get("content-type") || "", new RegExp(check.contentType));
  if (check.correlationId) {
    assert.equal(response.headers.get("x-correlation-id"), check.correlationId);
  }
  const body = await response.arrayBuffer();
  assert.ok(body.byteLength > 0, `${check.path} returned an empty body`);
  console.info(`PASS ${check.path}`);
}
