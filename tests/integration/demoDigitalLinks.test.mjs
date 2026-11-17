import assert from "node:assert/strict";
import test from "node:test";
import { DEMO_DIGITAL_LINK_IDENTITIES, demoDigitalLinkPath } from "../../lib/demoDigitalLinks.ts";
import { isValidGtin } from "../../lib/dppCompliance.ts";
import { productPassportHref } from "../../lib/dppNavigation.ts";
import { buildApprovedResolverUrl } from "../../lib/v2/resolver.ts";
import { validateOfficialQrTarget } from "../../lib/v2/qrPolicy.ts";
import nextConfig from "../../next.config.mjs";

const origin = "https://www.greanlean.com";

test("every showcase item has a unique, check-digit-valid GTIN and a GS1-length serial", async () => {
  const identities = DEMO_DIGITAL_LINK_IDENTITIES;
  assert.equal(identities.length, 9);
  assert.equal(new Set(identities.map((identity) => identity.gtin)).size, identities.length);
  const rewrites = (await nextConfig.rewrites()).beforeFiles;
  for (const identity of identities) {
    assert.match(identity.gtin, /^\d{14}$/);
    assert.ok(isValidGtin(identity.gtin));
    assert.ok(identity.serialNumber.length > 0 && identity.serialNumber.length <= 20);
    if (identity.gtinSource === "GS1_952_DEMONSTRATION") assert.ok(identity.gtin.startsWith("0952"));
    const path = demoDigitalLinkPath(identity.passportIdentifier);
    assert.match(path, /^\/01\/\d{14}\/21\/[^/]+$/);
    assert.deepEqual(rewrites.find((rule) => rule.source === path), {
      source: path, destination: `/p/${identity.passportIdentifier}`,
    });
    for (const lang of ["zh", "en"]) {
      assert.equal(productPassportHref(identity.passportIdentifier, lang), `${path}?lang=${lang}`);
    }
    assert.equal(buildApprovedResolverUrl({ origin, identifier: identity.passportIdentifier, approvedHosts: ["www.greanlean.com"] }), `${origin}${path}`);
    assert.equal(validateOfficialQrTarget(`${origin}${path}`, origin, ["www.greanlean.com"]), `${origin}${path}`);
    assert.ok(!rewrites.some((rule) => rule.source === `${path}-WRONG`));
  }
});

test("the existing owner-selected URL is stable and non-demo passports keep their routes", () => {
  assert.equal(demoDigitalLinkPath("DPP-GLR-LMT-000002"), "/01/09506000134352/21/GLR-LMT-000002");
  assert.equal(demoDigitalLinkPath("DPP-OTHER"), null);
  assert.equal(productPassportHref("DPP-OTHER", "en"), "/p/DPP-OTHER?lang=en");
  assert.equal(buildApprovedResolverUrl({ origin, identifier: "DPP-OTHER", approvedHosts: ["www.greanlean.com"] }), `${origin}/r/DPP-OTHER`);
});

test("QR generation accepts each requested granularity and rejects malformed GS1 identifiers", () => {
  for (const suffix of ["", "/10/BATCH-001", "/21/SERIAL-001", "/21/A%2FB"]) {
    const url = `${origin}/01/09520000000011${suffix}`;
    assert.equal(validateOfficialQrTarget(url, origin, ["www.greanlean.com"]), url);
  }
  for (const path of ["/01/09520000000012/21/ABC", "/01/09520000000011/21/", "/01/09520000000011/99/ABC", `/01/09520000000011/21/${"A".repeat(21)}`, "/01/09520000000011/21/%ZZ"]) {
    assert.throws(() => validateOfficialQrTarget(`${origin}${path}`, origin, ["www.greanlean.com"]));
  }
});
