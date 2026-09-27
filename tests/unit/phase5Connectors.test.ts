import assert from "node:assert/strict";
import test from "node:test";
import { aggregateBmsSamples, bmsClaimCandidate } from "../../lib/v2/bmsAggregation.ts";
import { canCancelJob, retryDecision, transitionCircuit } from "../../lib/v2/connectorJobs.ts";
import { mappingDryRun, parseImportFile, reconcileExternalRecord } from "../../lib/v2/externalAdapters.ts";
import { prepareRegistrySubmission, registryTestAdapter, registryTestResult, validateRegistrySubmission } from "../../lib/v2/registryTestAdapter.ts";

const retryProfile = { maxAttempts: 3, baseDelayMs: 100, maxDelayMs: 5000, backoffMode: "EXPONENTIAL" as const };

test("Retry classification is bounded and creates dead letter decisions", () => {
  assert.deepEqual(retryDecision(1, retryProfile, { status: 429 }).state, "RETRY_WAIT");
  assert.equal(retryDecision(1, retryProfile, { status: 500 }).retryable, true);
  assert.equal(retryDecision(1, retryProfile, { status: 400 }).retryable, false);
  assert.equal(retryDecision(1, retryProfile, { status: 401 }).retryable, false);
  assert.equal(retryDecision(1, retryProfile, { timedOut: true }).state, "RETRY_WAIT");
  assert.equal(retryDecision(3, retryProfile, { status: 500 }).state, "DEAD_LETTER");
  assert.equal(canCancelJob("QUEUED"), true);
  assert.equal(canCancelJob("RUNNING"), false);
  assert.equal(transitionCircuit({ state: "CLOSED", failures: 4 }, false).state, "OPEN");
});

test("CSV and JSON imports require Mapping and report schema drift", () => {
  const csv = parseImportFile("CSV", "material,weight,unknown\nMAT-1,42,drift");
  const json = parseImportFile("JSON", '[{"material":"MAT-1","weight":42}]');
  assert.equal(csv.length, 1);
  assert.equal(json.length, 1);
  const dryRun = mappingDryRun(csv, [{ source: "/material", targetFieldCode: "identity.material" }, { source: "/weight", targetFieldCode: "mass.value" }]);
  assert.deepEqual(dryRun.unmappedFields, ["unknown"]);
  assert.deepEqual(dryRun.outputs[0], { "identity.material": "MAT-1", "mass.value": "42" });
  assert.throws(() => mappingDryRun(csv, []), /IMPORT_MAPPING_REQUIRED/);
  const record = { kind: "ERP" as const, externalId: "MAT-1", updatedAt: "2026-01-01T00:00:00Z", subjectType: "MODEL" as const, payload: { material: "MAT-1" } };
  const first = reconcileExternalRecord(null, record);
  assert.equal(first.state, "NEW");
  assert.equal(reconcileExternalRecord(first.hash, record).state, "UNCHANGED");
  assert.equal(reconcileExternalRecord(first.hash, { ...record, payload: { material: "MAT-2" } }).state, "CHANGED");
  assert.equal(reconcileExternalRecord(first.hash, record, ["identity.material"]).state, "CONFLICT");
});

test("Registry adapter is immutable-version sourced and failures remain separate", () => {
  const version = { id: "v1", passport_id: "p1", publication_state: "PUBLISHED", payload_hash: "a".repeat(64), canonical_payload: { public: true } };
  const prepared = prepareRegistrySubmission(version);
  assert.equal(validateRegistrySubmission(prepared).valid, true);
  assert.equal(registryTestResult("ACCEPTED", "r1").status, "ACCEPTED");
  assert.equal(registryTestResult("REJECTED", "r1").status, "REJECTED");
  assert.equal(registryTestResult("TIMEOUT", "r1").retryable, true);
  assert.equal(registryTestResult("DUPLICATE", "r1").duplicate, true);
  assert.equal(registryTestAdapter.getStatus("PENDING", "r1").status, "PENDING");
  assert.equal(registryTestAdapter.receiveCallback({ externalRequestId: "r1", status: "ACCEPTED" }).status, "ACCEPTED");
  assert.equal(registryTestAdapter.cancel("SUBMITTED").externalStateUnknown, true);
  assert.equal(registryTestAdapter.mapExternalIdentifier("TEST-1").identifierType, "REGISTRY_ID");
  assert.throws(() => prepareRegistrySubmission({ ...version, publication_state: "UNPUBLISHED" }), /REGISTRY_VERSION_NOT_PUBLISHED/);
});

test("BMS telemetry is reduced to a window snapshot and claim is rule gated", () => {
  const now = Date.parse("2026-01-01T00:02:00Z");
  const samples = [
    { eventId: "e1", deviceId: "A", itemId: "A001", timestamp: "2026-01-01T00:00:00Z", soc: 80, temperature: 20, voltage: 48, current: 2 },
    { eventId: "e2", deviceId: "A", itemId: "A001", timestamp: "2026-01-01T00:01:00Z", soc: 70, soh: 96, temperature: 55, voltage: 47, current: 3 },
  ];
  const snapshot = aggregateBmsSamples(samples, { expectedDeviceId: "A", expectedItemId: "A001", now, thresholds: { temperature: { max: 50 } } });
  assert.equal(snapshot.sampleCount, 2);
  assert.deepEqual(snapshot.aggregate.soc, { latest: 70, min: 70, max: 80, avg: 75 });
  assert.equal(snapshot.thresholdEvents.length, 1);
  assert.equal(bmsClaimCandidate(snapshot, { enabled: false, metric: "soc", fieldDefinitionId: "f", schemaVersionId: "s" }), null);
  assert.ok(bmsClaimCandidate(snapshot, { enabled: true, metric: "soc", fieldDefinitionId: "f", schemaVersionId: "s" }));
  assert.throws(() => aggregateBmsSamples([{ ...samples[0], itemId: "OTHER" }], { expectedDeviceId: "A", expectedItemId: "A001", now }), /BMS_DEVICE_BINDING_INVALID/);
  assert.throws(() => aggregateBmsSamples([samples[0], samples[0]], { expectedDeviceId: "A", expectedItemId: "A001", now }), /WEBHOOK_REPLAY_DETECTED/);
});
