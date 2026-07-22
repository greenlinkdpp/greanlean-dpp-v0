import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBatteryRegistryArtifact,
  isReadyForManualTest,
  parseRegistryError,
  registryPayloadHash,
  validateBatteryRegistrySource,
  type BatteryRegistrySource,
} from "../../lib/registry/adapter.ts";

function source(overrides: Partial<BatteryRegistrySource> = {}): BatteryRegistrySource {
  return {
    environment: "TEST",
    mappingVersion: "battery-test-file-1.0.0",
    operationalRuleVersion: "DPP Registry User Guide v1.0",
    registrySchemaVersion: null,
    mappingStatus: "published",
    productStatus: "published",
    passportId: "DPP-BATTERY-001",
    upi: "https://id.example/b/1",
    granularity: "ITEM",
    modelIdentifier: "MODEL-001",
    batchIdentifier: "BATCH-001",
    itemIdentifier: "SERIAL-001",
    commodityCode: "85076000",
    dppUri: "https://dpp.example/p/DPP-BATTERY-001",
    backupReference: "https://backup.example/p/DPP-BATTERY-001",
    dppVersion: "v1.0",
    dppVersionHash: "a".repeat(64),
    enrolmentVerified: true,
    declarationPresent: true,
    generatedAt: "2026-07-22T00:00:00.000Z",
    ...overrides,
  };
}

test("builds a TEST-only battery mapping without copying the full DPP dataset", () => {
  const artifact = buildBatteryRegistryArtifact(source());
  assert.equal(artifact.metadata.environment, "TEST");
  assert.equal(artifact.metadata.registrationCapable, false);
  assert.equal(artifact.metadata.officialBatterySemanticCatalogueAvailable, false);
  assert.equal(artifact.registrationRequests[0].productGroup, "battery");
  assert.equal(Object.hasOwn(artifact.registrationRequests[0], "batteryFields"), false);
  assert.match(registryPayloadHash(artifact), /^[a-f0-9]{64}$/);
});

test("allows a manual TEST file while retaining the official semantic blocker", () => {
  const results = validateBatteryRegistrySource(source());
  assert.equal(isReadyForManualTest(results), true);
  const semantic = results.find((result) => result.ruleCode === "BATTERY_SEMANTIC_CATALOGUE_AVAILABLE");
  assert.equal(semantic?.passed, false);
  assert.equal(semantic?.severity, "BLOCKER");
});

test("blocks local readiness when identifiers, version hash, or environment are invalid", () => {
  const results = validateBatteryRegistrySource(source({ environment: "PRODUCTION", upi: "DPP-1", dppVersionHash: null }));
  assert.equal(isReadyForManualTest(results), false);
  assert.ok(results.some((result) => result.ruleCode === "REGISTRY_TEST_ENVIRONMENT" && !result.passed));
  assert.ok(results.some((result) => result.ruleCode === "UPI_HTTPS_FORMAT" && !result.passed));
  assert.ok(results.some((result) => result.ruleCode === "DPP_VERSION_HASH" && !result.passed));
});

test("redacts credentials and classifies retryable Registry errors", () => {
  const parsed = parseRegistryError({ status: 503, code: "TEMPORARY", message: "Bearer secret-token unavailable", correlation_id: "corr-1" });
  assert.equal(parsed.retryable, true);
  assert.equal(parsed.httpStatus, 503);
  assert.equal(parsed.correlationId, "corr-1");
  assert.doesNotMatch(parsed.redactedMessage, /secret-token/);
});
