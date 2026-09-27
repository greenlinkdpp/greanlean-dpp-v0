import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { findDisabledV2Flags, type V2FeatureFlag } from "../../lib/v2/featureSwitches.ts";

test("Phase 6 kill switches are explicit and default off", async () => {
  const [example, featureFlags, featureSwitches, security] = await Promise.all([
    readFile(".env.example", "utf8"),
    readFile("lib/server/v2/featureFlags.ts", "utf8"),
    readFile("lib/v2/featureSwitches.ts", "utf8"),
    readFile("lib/server/v2/security.ts", "utf8"),
  ]);
  for (const flag of [
    "FEATURE_V2_PUBLIC_READ",
    "FEATURE_V2_TENANT_API",
    "FEATURE_V2_PUBLICATION_WRITE",
    "FEATURE_V2_CONNECTOR_EXECUTION",
  ]) {
    assert.match(example, new RegExp(`^${flag}=false$`, "m"));
    assert.match(featureSwitches, new RegExp(flag));
  }
  assert.match(featureFlags, /const requiredFlags = \[[\s\S]*FEATURE_V2_TENANT_API/);
  assert.match(security, /publicationWriteFeature[\s\S]*FEATURE_V2_PUBLICATION_WRITE/);
  assert.match(security, /connectorExecutionFeature[\s\S]*FEATURE_V2_CONNECTOR_EXECUTION/);
});

test("kill-switch evaluator fails closed and allows switches independently", () => {
  const flags: V2FeatureFlag[] = [
    "FEATURE_V2_PUBLIC_READ",
    "FEATURE_V2_TENANT_API",
    "FEATURE_V2_PUBLICATION_WRITE",
    "FEATURE_V2_CONNECTOR_EXECUTION",
  ];
  const allEnabled = Object.fromEntries(flags.map((flag) => [flag, "true"]));
  assert.deepEqual(findDisabledV2Flags(allEnabled, flags), []);
  for (const flag of flags) {
    assert.deepEqual(findDisabledV2Flags({ ...allEnabled, [flag]: "false" }, flags), [flag]);
    assert.deepEqual(findDisabledV2Flags({ ...allEnabled, [flag]: undefined }, flags), [flag]);
  }
});

test("public, publication and connector execution surfaces are wired to kill switches", async () => {
  const files = await Promise.all([
    readFile("app/api/v2/resolver/[identifier]/route.ts", "utf8"),
    readFile("app/api/v2/publications/route.ts", "utf8"),
    readFile("lib/server/v2/phase5Routes.ts", "utf8"),
    readFile("app/api/v2/webhooks/[connectorCode]/route.ts", "utf8"),
  ]);
  assert.match(files[0], /FEATURE_V2_PUBLIC_READ/);
  assert.match(files[1], /publicationWriteFeature: true/);
  assert.match(files[2], /connectorExecutionFeature: true/);
  assert.match(files[3], /FEATURE_V2_CONNECTOR_EXECUTION/);
});
