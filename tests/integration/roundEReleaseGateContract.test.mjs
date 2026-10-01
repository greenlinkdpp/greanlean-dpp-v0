import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Round E public homepage paths do not hard-code a PreProd host or localhost", async () => {
  const sources = await Promise.all([
    "app/page.tsx",
    "components/v2/demo/HomepageDemoMix.tsx",
    "components/LeadForm.tsx",
    "app/api/public/demo-showcase/route.ts",
  ].map((path) => readFile(path, "utf8")));
  for (const source of sources) {
    assert.doesNotMatch(source, /greanlean-dpp-preprod\.vercel\.app/i);
    assert.doesNotMatch(source, /localhost/i);
  }
});

test("Round E keeps its Production audit read-only and its Demo-order write PreProd-bound", async () => {
  const [audit, ordering] = await Promise.all([
    readFile("scripts/phase7/audit-round-e-production-readonly.mjs", "utf8"),
    readFile("scripts/phase7/apply-round-e-preprod-demo-order.mjs", "utf8"),
  ]);
  assert.match(audit, /read_only: true/);
  assert.doesNotMatch(audit, /\b(update|insert|delete|alter|drop)\b/i);
  assert.match(ordering, /efhiaufukjchxqhbmpvq/);
  assert.match(ordering, /Hosted PreProd is required/);
});
