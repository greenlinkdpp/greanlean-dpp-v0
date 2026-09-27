import { safeFingerprint } from "./connectorSecurity.ts";

export type PublishedVersion = {
  id: string;
  passport_id: string;
  publication_state: string;
  payload_hash: string;
  canonical_payload: Record<string, unknown>;
};

export const REGISTRY_ADAPTER_VERSION = "registry-test-v1";

export function prepareRegistrySubmission(version: PublishedVersion, registryProfile = "TEST_GENERIC_V1") {
  if (version.publication_state !== "PUBLISHED") throw new Error("REGISTRY_VERSION_NOT_PUBLISHED");
  const payload = {
    registryProfile,
    passportId: version.passport_id,
    versionId: version.id,
    sourcePayloadHash: version.payload_hash,
    dpp: version.canonical_payload,
  };
  return {
    payload,
    payloadHash: version.payload_hash,
    submissionPayloadHash: safeFingerprint(JSON.stringify(payload)),
    registryProfile,
    adapterVersion: REGISTRY_ADAPTER_VERSION,
  };
}

export function validateRegistrySubmission(prepared: ReturnType<typeof prepareRegistrySubmission>) {
  const errors: string[] = [];
  if (!prepared.payload.passportId) errors.push("passportId");
  if (!prepared.payload.versionId) errors.push("versionId");
  if (!/^[a-f0-9]{64}$/.test(prepared.payloadHash)) errors.push("payloadHash");
  return { valid: errors.length === 0, errors };
}

export type RegistryFixtureMode = "ACCEPTED" | "REJECTED" | "PENDING" | "FAILED" | "TIMEOUT" | "DUPLICATE";

export function registryTestResult(mode: RegistryFixtureMode, requestId: string) {
  if (mode === "TIMEOUT") return { status: "PENDING", httpStatus: 504, retryable: true, externalRequestId: requestId };
  if (mode === "DUPLICATE") return { status: "SUBMITTED", httpStatus: 409, retryable: false, externalRequestId: requestId, duplicate: true };
  if (mode === "FAILED") return { status: "FAILED", httpStatus: 500, retryable: true, externalRequestId: requestId };
  if (mode === "REJECTED") return { status: "REJECTED", httpStatus: 422, retryable: false, externalRequestId: requestId };
  return { status: mode, httpStatus: mode === "PENDING" ? 202 : 200, retryable: false, externalRequestId: requestId, ...(mode === "ACCEPTED" ? { externalObjectId: `TEST-${requestId}` } : {}) };
}

export const registryTestAdapter = {
  prepareSubmission: prepareRegistrySubmission,
  validateSubmission: validateRegistrySubmission,
  submit(mode: RegistryFixtureMode, requestId: string) { return registryTestResult(mode, requestId); },
  getStatus(mode: RegistryFixtureMode, requestId: string) { return registryTestResult(mode, requestId); },
  receiveCallback(payload: { externalRequestId: string; status: RegistryFixtureMode }) {
    if (!payload.externalRequestId) throw new Error("REGISTRY_SUBMISSION_CONFLICT");
    return registryTestResult(payload.status, payload.externalRequestId);
  },
  cancel(currentStatus: string) {
    if (["ACCEPTED", "REJECTED", "FAILED"].includes(currentStatus)) return { cancelled: false, externalStateUnknown: false };
    return { cancelled: true, externalStateUnknown: currentStatus === "SUBMITTED" };
  },
  mapExternalIdentifier(externalObjectId: string) {
    return { identifierType: "REGISTRY_ID", issuer: "GREANLEAN_TEST_REGISTRY", scheme: "TEST_REGISTRY_ID", value: externalObjectId };
  },
};
