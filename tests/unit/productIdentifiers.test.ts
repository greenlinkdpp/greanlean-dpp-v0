import assert from "node:assert/strict";
import test from "node:test";
import {
  identifierCollisionKey,
  isValidGtin,
  normalizeProductIdentifier,
} from "../../lib/v2/productIdentifiers.ts";

test("GTIN display punctuation normalizes and checksum is enforced", () => {
  assert.equal(normalizeProductIdentifier("GTIN", "4006 3813 3393 1"), "4006381333931");
  assert.equal(isValidGtin("4006381333931"), true);
  assert.throws(() => normalizeProductIdentifier("GTIN", "4006381333932"), /IDENTIFIER_INVALID/);
});

test("serial collision scope includes Tenant, scheme, and issuer", () => {
  const base = {
    tenantId: "tenant-a",
    type: "SERIAL_NUMBER" as const,
    scheme: "manufacturer-serial",
    issuer: "Maker A",
    value: " ab  123 ",
  };
  assert.equal(
    identifierCollisionKey(base),
    "tenant-a|SERIAL_NUMBER|MANUFACTURER-SERIAL|MAKER A|AB 123",
  );
  assert.notEqual(
    identifierCollisionKey(base),
    identifierCollisionKey({ ...base, tenantId: "tenant-b" }),
  );
  assert.notEqual(
    identifierCollisionKey(base),
    identifierCollisionKey({ ...base, scheme: "alternate" }),
  );
});

test("GTIN and UPI collision scope is global while UPI must be HTTPS", () => {
  const first = identifierCollisionKey({
    tenantId: "tenant-a",
    type: "GTIN",
    scheme: "GS1",
    issuer: "GS1",
    value: "4006381333931",
  });
  const second = identifierCollisionKey({
    tenantId: "tenant-b",
    type: "GTIN",
    scheme: "GS1",
    issuer: "GS1",
    value: "4006381333931",
  });
  assert.equal(first, second);
  assert.equal(normalizeProductIdentifier("UPI", " https://id.example/item/1 "), "https://id.example/item/1");
  assert.throws(() => normalizeProductIdentifier("UPI", "http://id.example/item/1"), /IDENTIFIER_INVALID/);
});
