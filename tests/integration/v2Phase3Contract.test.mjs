import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const routes = [
  "app/api/v2/schemas/route.ts",
  "app/api/v2/schema-versions/route.ts",
  "app/api/v2/field-definitions/route.ts",
  "app/api/v2/data-sources/route.ts",
  "app/api/v2/source-records/route.ts",
  "app/api/v2/mapping-profiles/route.ts",
  "app/api/v2/mapping-versions/route.ts",
  "app/api/v2/mapping-versions/[id]/dry-run/route.ts",
  "app/api/v2/mapping-versions/[id]/commit/route.ts",
  "app/api/v2/canonical-claims/route.ts",
  "app/api/v2/products/[subjectType]/[subjectId]/resolved-data/route.ts",
  "app/api/v2/products/[subjectType]/[subjectId]/validation/route.ts",
];

test("every Phase 3 API is capability/PDP and feature gated", async () => {
  for (const path of routes) {
    const source = await readFile(path, "utf8");
    if (source.includes("createPhase3TenantCollectionHandlers")) continue;
    assert.match(source, /requireV2PolicyContext/, path);
    assert.doesNotMatch(source, /createSupabaseAdminClient/, path);
    assert.match(source, /(?:schema|canonical|provenance|resolution)Feature: true/, path);
  }
  const shared = await readFile("lib/server/v2/phase3Routes.ts", "utf8");
  assert.match(shared, /requireV2PolicyContext/);
  assert.match(shared, /executeIdempotentWrite/);
});

test("every Phase 3 mutating API uses persistent idempotency except Dry Run", async () => {
  for (const path of routes.filter((path) => !path.includes("dry-run") && !path.includes("resolved-data") && !path.includes("validation"))) {
    const source = await readFile(path, "utf8");
    if (source.includes("createPhase3TenantCollectionHandlers")) continue;
    assert.match(source, /executeIdempotentWrite/, path);
    assert.match(source, /requireIdempotencyKey/, path);
  }
  const dryRun = await readFile("app/api/v2/mapping-versions/[id]/dry-run/route.ts", "utf8");
  assert.doesNotMatch(dryRun, /executeIdempotentWrite/);
});

test("Phase 3 repository enforces verified context and does not publish DPP", async () => {
  const source = await readFile("lib/server/v2/phase3Repository.ts", "utf8");
  assert.match(source, /assertVerifiedPolicyContext/);
  assert.match(source, /dryRunMapping/);
  assert.match(source, /field_definition_id:\s*rule\.target_field_definition_id/);
  assert.match(source, /buildResolvedCandidate/);
  assert.doesNotMatch(source, /dpp_version|publish(?:ed|ing)?_dpp|current_pointer/i);
});

test("required Phase 3 feature flags and error codes are declared", async () => {
  const [example, errors] = await Promise.all([
    readFile(".env.example", "utf8"),
    readFile("lib/v2/phase3Errors.ts", "utf8"),
  ]);
  for (const flag of ["FEATURE_V2_SCHEMA_CORE", "FEATURE_V2_CANONICAL_DATA", "FEATURE_V2_PROVENANCE", "FEATURE_V2_RESOLUTION_ENGINE"]) {
    assert.match(example, new RegExp(flag + "=false"));
  }
  for (const code of [
    "SCHEMA_NOT_FOUND", "SCHEMA_VERSION_IMMUTABLE", "FIELD_NOT_FOUND", "FIELD_NOT_APPLICABLE",
    "FIELD_VALUE_INVALID", "UNIT_NOT_COMPATIBLE", "MAPPING_NOT_FOUND", "MAPPING_VERSION_IMMUTABLE",
    "MAPPING_UNMAPPED_FIELD", "MAPPING_LOSSY", "TRANSFORMATION_FAILED", "CLAIM_CONFLICT",
    "CLAIM_ACCESS_DENIED", "RESOLUTION_CONFLICT", "REQUIRED_VALUE_UNKNOWN", "PROVENANCE_INCOMPLETE",
  ]) assert.match(errors, new RegExp(code));
});
