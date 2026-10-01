import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Round E treats demo sort_order as a global showcase contract", async () => {
  const [catalog, platformRoute, script] = await Promise.all([
    readFile("lib/server/v2/demoShowcase.ts", "utf8"),
    readFile("app/api/v2/platform/demos/route.ts", "utf8"),
    readFile("scripts/phase7/apply-round-e-preprod-demo-order.mjs", "utf8"),
  ]);
  assert.match(catalog, /\.order\("sort_order"\)\.order\("id"\)/);
  assert.doesNotMatch(catalog, /\.order\("category_code"\)\.order\("sort_order"\)/);
  assert.match(platformRoute, /\.order\("sort_order"\)\.order\("id"\)/);
  for (const identifier of ["DPP-GLR-LMT-000001", "DPP-GLR-LMT-000003", "DPP-DEMO-HW-000001"]) assert.match(script, new RegExp(identifier));
  assert.match(script, /Expected eight approved Demo entries/);
});
