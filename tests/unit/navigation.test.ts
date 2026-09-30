import assert from "node:assert/strict";
import test from "node:test";
import {
  localizedPath,
  PRIMARY_V2_DEMO_PATH,
  safeLoginReturnPath,
  V2_BACKOFFICE_PATH,
} from "../../lib/navigation.ts";

test("public demo entry paths preserve the selected language", () => {
  assert.equal(localizedPath(PRIMARY_V2_DEMO_PATH, "zh"), "/demo?lang=zh");
  assert.equal(localizedPath(V2_BACKOFFICE_PATH, "en"), "/dashboard/v2?lang=en");
});

test("login defaults to the V2 Backoffice and accepts only safe same-origin paths", () => {
  assert.equal(safeLoginReturnPath(null, "zh"), "/dashboard/v2?lang=zh");
  assert.equal(safeLoginReturnPath("/dashboard/v2", "en"), "/dashboard/v2?lang=en");
  assert.equal(safeLoginReturnPath("/dashboard/v2?lang=zh", "en"), "/dashboard/v2?lang=zh");
  assert.equal(safeLoginReturnPath("/p/DPP-GLR-EBIKE-000001#passport", "zh"), "/p/DPP-GLR-EBIKE-000001?lang=zh#passport");
});

test("login rejects external and ambiguous redirect forms", () => {
  for (const target of [
    "https://evil.example/",
    "//evil.example/",
    "/\\evil.example/",
    "/%5cevil.example/",
    "/%2fevil.example/",
    "/dashboard%0d%0aLocation:https://evil.example/",
    "javascript:alert(1)",
  ]) {
    assert.equal(safeLoginReturnPath(target, "en"), "/dashboard/v2?lang=en");
  }
});
