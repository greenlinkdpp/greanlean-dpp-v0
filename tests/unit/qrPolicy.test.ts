import assert from "node:assert/strict";
import test from "node:test";
import { approvedQrHosts, validateOfficialQrTarget } from "../../lib/v2/qrPolicy.ts";

test("official QR policy accepts only approved DPP and Resolver paths", () => {
  const origin = "https://greanlean-dpp-preprod.vercel.app";
  const hosts = approvedQrHosts("greanlean-dpp-preprod.vercel.app");
  assert.equal(
    validateOfficialQrTarget(`${origin}/api/v2/resolver/DPP-1`, origin, hosts),
    `${origin}/api/v2/resolver/DPP-1`,
  );
  assert.equal(validateOfficialQrTarget(`${origin}/p/DPP-1`, origin, hosts), `${origin}/p/DPP-1`);
  assert.equal(validateOfficialQrTarget(`${origin}/01/09506000134352`, origin, hosts), `${origin}/01/09506000134352`);
});

test("official QR policy rejects arbitrary targets and unsafe URL forms", () => {
  const origin = "https://greanlean-dpp-preprod.vercel.app";
  const hosts = approvedQrHosts("greanlean-dpp-preprod.vercel.app");
  for (const target of [
    "https://evil.example/p/DPP-1",
    "http://greanlean-dpp-preprod.vercel.app/p/DPP-1",
    "javascript:alert(1)",
    "file:///etc/passwd",
    "https://127.0.0.1/p/DPP-1",
    `${origin}/`,
    `${origin}/api/v2/resolver/DPP-1?next=https://evil.example`,
  ]) assert.throws(() => validateOfficialQrTarget(target, origin, hosts));
});
