import { canonicalHash } from "../dppCanonicalization";
import { ApiError } from "../apiRoute";
import { aggregateBmsSamples, bmsClaimCandidate, type BmsSample } from "../../v2/bmsAggregation";
import { canCancelJob, retryDecision, type RetryProfile } from "../../v2/connectorJobs";
import { mappingDryRun, parseImportFile, reconcileExternalRecord, type ImportMappingRule } from "../../v2/externalAdapters";
import { redactExternalResult, safeFingerprint, verifyWebhookSignature } from "../../v2/connectorSecurity";
import { prepareRegistrySubmission, registryTestResult, validateRegistrySubmission, type RegistryFixtureMode } from "../../v2/registryTestAdapter";
import { assertVerifiedPolicyContext, type VerifiedV2PolicyContext } from "./security";
import { executeGenericRest } from "./genericRestConnector";

type AdminClient = any;

function phase5Error(error: any, fallback: string): never {
  const message = String(error?.message || "");
  const known = ["CONNECTOR_PRODUCTION_FORBIDDEN","CONNECTOR_CONFIG_INVALID","REGISTRY_VERSION_NOT_PUBLISHED","IMPORT_MAPPING_REQUIRED","CONNECTOR_EVIDENCE_IMMUTABLE"];
  const code = known.find((value) => message.includes(value));
  if (code) throw new ApiError(409, code, "The operation violates the Phase 5 integration contract.");
  if (error?.code === "23505") throw new ApiError(409, "CONNECTOR_JOB_CONFLICT", "An equivalent connector operation already exists.");
  if (error?.code === "23503") throw new ApiError(409, "CONNECTOR_ACCESS_DENIED", "A referenced integration resource is outside this Tenant.");
  throw new ApiError(500, fallback, "The Phase 5 integration operation could not be completed.", { database_code: error?.code || null });
}

async function audit(admin: AdminClient, context: VerifiedV2PolicyContext, eventType: string, values: Record<string, unknown>) {
  const { error } = await admin.from("connector_audit_event").insert({
    tenant_id: context.tenantId, event_type: eventType, actor_user_id: context.user.id,
    correlation_id: context.correlationId, safe_metadata: {}, ...values,
  });
  if (error) phase5Error(error, "CONNECTOR_AUDIT_FAILED");
}

async function consumeRateLimit(
  admin: AdminClient,
  tenantId: string,
  connectorInstanceId: string,
  routeKey: string,
  credentialReferenceId: string | null = null,
) {
  const { data, error } = await admin.rpc("v2_phase5_consume_rate_limit", {
    p_tenant_id: tenantId,
    p_connector_instance_id: connectorInstanceId,
    p_credential_reference_id: credentialReferenceId,
    p_route_key: routeKey,
  });
  if (error) phase5Error(error, "CONNECTOR_RATE_LIMIT_CHECK_FAILED");
  const result = Array.isArray(data) ? data[0] : data;
  if (!result?.allowed) {
    throw new ApiError(429, "CONNECTOR_RATE_LIMITED", "The Connector rate limit has been exceeded.", {
      limit_per_minute: result?.limit_per_minute ?? null,
      retry_after_seconds: result?.retry_after_seconds ?? null,
    });
  }
  return result;
}

export async function listConnectors(admin: AdminClient, context: VerifiedV2PolicyContext) {
  assertVerifiedPolicyContext(context);
  const { data, error } = await admin.from("connector_instance")
    .select("*,definition:connector_definition(code,name,connector_type,direction,version)")
    .eq("tenant_id", context.tenantId).order("created_at");
  if (error) phase5Error(error, "CONNECTOR_LIST_FAILED");
  const ids = (data || []).map((row: any) => row.id);
  const { data: credentials, error: credentialError } = ids.length
    ? await admin.from("connector_credential_status").select("connector_instance_id,configured,credential_type,status,last_verified_at,rotation_due_at").eq("tenant_id", context.tenantId).in("connector_instance_id", ids)
    : { data: [], error: null };
  if (credentialError) phase5Error(credentialError, "CONNECTOR_CREDENTIAL_STATUS_FAILED");
  return (data || []).map((row: any) => ({ ...row, credentials: (credentials || []).filter((credential: any) => credential.connector_instance_id === row.id) }));
}

export async function getConnector(admin: AdminClient, context: VerifiedV2PolicyContext, id: string) {
  assertVerifiedPolicyContext(context);
  const { data, error } = await admin.from("connector_instance")
    .select("*,definition:connector_definition(code,name,connector_type,direction,version)")
    .eq("tenant_id", context.tenantId).eq("id", id).maybeSingle();
  if (error) phase5Error(error, "CONNECTOR_LOAD_FAILED");
  if (!data) throw new ApiError(404, "CONNECTOR_NOT_FOUND", "The Connector was not found.");
  const { data: credentials, error: credentialError } = await admin.from("connector_credential_status")
    .select("configured,credential_type,status,last_verified_at,rotation_due_at")
    .eq("tenant_id", context.tenantId).eq("connector_instance_id", id);
  if (credentialError) phase5Error(credentialError, "CONNECTOR_CREDENTIAL_STATUS_FAILED");
  return { ...data, credentials: credentials || [] };
}

export async function createConnector(admin: AdminClient, context: VerifiedV2PolicyContext, input: Record<string, unknown>) {
  assertVerifiedPolicyContext(context);
  const environment = String(input.environment || "DEVELOPMENT").toUpperCase();
  if (environment === "PRODUCTION") throw new ApiError(409, "CONNECTOR_CONFIG_INVALID", "Production Connectors are forbidden in Phase 5.");
  const definitionCode = String(input.definition_code || "").toUpperCase();
  const { data: definition, error: definitionError } = await admin.from("connector_definition").select("id,code,version").eq("code", definitionCode).eq("status", "ACTIVE").maybeSingle();
  if (definitionError) phase5Error(definitionError, "CONNECTOR_DEFINITION_LOAD_FAILED");
  if (!definition) throw new ApiError(400, "CONNECTOR_CONFIG_INVALID", "The Connector Definition is not active.");
  const { data, error } = await admin.from("connector_instance").insert({
    tenant_id: context.tenantId, connector_definition_id: definition.id,
    name: String(input.name || "").trim(), environment, status: String(input.status || "DRAFT").toUpperCase(),
    config_json: input.config_json || {}, data_source_id: input.data_source_id || null,
    mapping_profile_id: input.mapping_profile_id || null, rate_limit_profile: input.rate_limit_profile || undefined,
    retry_profile: input.retry_profile || undefined, created_by: context.user.id,
  }).select().single();
  if (error) phase5Error(error, "CONNECTOR_CREATE_FAILED");
  await audit(admin, context, "connector.create", { connector_instance_id: data.id, safe_metadata: { definitionCode, environment } });
  return data;
}

export async function updateConnector(admin: AdminClient, context: VerifiedV2PolicyContext, id: string, input: Record<string, unknown>) {
  await getConnector(admin, context, id);
  if (String(input.environment || "").toUpperCase() === "PRODUCTION") throw new ApiError(409, "CONNECTOR_CONFIG_INVALID", "Production Connectors are forbidden in Phase 5.");
  const values = { ...input, updated_at: new Date().toISOString() };
  const { data, error } = await admin.from("connector_instance").update(values).eq("tenant_id", context.tenantId).eq("id", id).select().single();
  if (error) phase5Error(error, "CONNECTOR_UPDATE_FAILED");
  await audit(admin, context, data.status === "ACTIVE" ? "connector.activate" : data.status === "DISABLED" ? "connector.deactivate" : "connector.update", { connector_instance_id: id, safe_metadata: { fields: Object.keys(input).sort() } });
  return data;
}

export async function configureCredential(admin: AdminClient, context: VerifiedV2PolicyContext, connectorId: string, input: Record<string, unknown>) {
  await getConnector(admin, context, connectorId);
  const reference = String(input.secret_reference || "");
  if (!/^(env|test-vault|dev-secret):\/\/[A-Za-z0-9._/-]+$/.test(reference)) throw new ApiError(400, "CONNECTOR_CREDENTIAL_INVALID", "Only a Development secret reference may be stored.");
  const { data, error } = await admin.from("connector_credential_reference").upsert({
    tenant_id: context.tenantId, connector_instance_id: connectorId,
    secret_provider: String(input.secret_provider || "ENVIRONMENT"), secret_reference: reference,
    credential_type: String(input.credential_type || "API_KEY"), owner_reference: String(input.owner_reference || "default"),
    scope: input.scope || null, rotation_metadata: input.rotation_metadata || {}, status: "CONFIGURED",
  }, { onConflict: "connector_instance_id,credential_type,owner_reference" }).select("id,tenant_id,connector_instance_id,credential_type,status,last_verified_at,created_at,updated_at").single();
  if (error) phase5Error(error, "CONNECTOR_CREDENTIAL_CONFIGURE_FAILED");
  await audit(admin, context, "credential.configure", { connector_instance_id: connectorId });
  return { ...data, configured: true };
}

export async function testConnector(admin: AdminClient, context: VerifiedV2PolicyContext, id: string, input: Record<string, unknown>) {
  const connector = await getConnector(admin, context, id);
  if (connector.status === "DISABLED" || connector.status === "SUSPENDED") throw new ApiError(409, "CONNECTOR_DISABLED", "The Connector is disabled.");
  await consumeRateLimit(admin, context.tenantId, connector.id, "connectors.test");
  const configuredUrl = String(input.url || connector.config_json?.baseUrl || "");
  if (!configuredUrl) return { ok: true, mode: "CONFIG", destructiveWritePerformed: false, adapterVersion: connector.definition.version };
  const allowedHosts = Array.isArray(connector.config_json?.hostAllowlist) ? connector.config_json.hostAllowlist.map(String) : [];
  const result = await executeGenericRest({ url: configuredUrl, method: "GET", timeoutMs: Number(input.timeout_ms || 5000) }, {
    allowedHosts, allowLocalMock: connector.environment === "MOCK" || connector.environment === "DEVELOPMENT",
  });
  return { ok: result.httpStatus < 400, mode: "SAFE_READ", destructiveWritePerformed: false, httpStatus: result.httpStatus, latencyMs: result.latencyMs };
}

export async function listConnectorJobs(admin: AdminClient, context: VerifiedV2PolicyContext, connectorId?: string) {
  assertVerifiedPolicyContext(context);
  let query = admin.from("connector_job").select("*").eq("tenant_id", context.tenantId).order("requested_at", { ascending: false });
  if (connectorId) query = query.eq("connector_instance_id", connectorId);
  const { data, error } = await query;
  if (error) phase5Error(error, "CONNECTOR_JOB_LIST_FAILED");
  return data || [];
}

export async function getConnectorJob(admin: AdminClient, context: VerifiedV2PolicyContext, id: string) {
  assertVerifiedPolicyContext(context);
  const { data, error } = await admin.from("connector_job").select("*,attempts:connector_attempt(*),receipts:connector_receipt(*)").eq("tenant_id", context.tenantId).eq("id", id).maybeSingle();
  if (error) phase5Error(error, "CONNECTOR_JOB_LOAD_FAILED");
  if (!data) throw new ApiError(404, "CONNECTOR_NOT_FOUND", "The Connector Job was not found.");
  return data;
}

export async function createConnectorJob(admin: AdminClient, context: VerifiedV2PolicyContext, connectorId: string, input: Record<string, unknown>, idempotencyKey: string) {
  const connector = await getConnector(admin, context, connectorId);
  if (connector.status !== "ACTIVE") throw new ApiError(409, "CONNECTOR_DISABLED", "The Connector must be active before execution.");
  const jobType = String(input.job_type || "CONNECTOR_EXECUTE").toUpperCase();
  await consumeRateLimit(admin, context.tenantId, connector.id, `connector.jobs:${jobType}`);
  const { data, error } = await admin.from("connector_job").insert({
    tenant_id: context.tenantId, connector_instance_id: connectorId,
    job_type: jobType,
    direction: String(input.direction || (connector.definition.direction === "INBOUND" ? "INBOUND" : "OUTBOUND")).toUpperCase(),
    idempotency_key: idempotencyKey, subject_type: input.subject_type || null, subject_id: input.subject_id || null,
    passport_id: input.passport_id || null, version_id: input.version_id || null,
    mapping_version_id: input.mapping_version_id || null, requested_by: context.user.id,
    correlation_id: context.correlationId, adapter_version: connector.definition.version,
    operation_snapshot: redactExternalResult(input.operation_snapshot || {}),
  }).select().single();
  if (error) phase5Error(error, "CONNECTOR_JOB_CREATE_FAILED");
  await audit(admin, context, "connector.execute", { connector_instance_id: connectorId, connector_job_id: data.id, safe_metadata: { jobType: data.job_type } });
  return data;
}

export async function retryJob(admin: AdminClient, context: VerifiedV2PolicyContext, id: string) {
  const job = await getConnectorJob(admin, context, id);
  if (!["FAILED","RETRY_WAIT","DEAD_LETTER"].includes(job.status)) throw new ApiError(409, "CONNECTOR_JOB_NOT_RETRYABLE", "This Connector Job cannot be retried.");
  const connector = await getConnector(admin, context, job.connector_instance_id);
  await consumeRateLimit(admin, context.tenantId, connector.id, "connector-jobs.retry");
  const decision = retryDecision(job.retry_count + 1, connector.retry_profile as RetryProfile, { status: 500 });
  if (decision.state === "DEAD_LETTER") throw new ApiError(409, "CONNECTOR_DEAD_LETTER", "The retry limit has been reached.");
  const { data, error } = await admin.from("connector_job").update({ status: "QUEUED", retry_count: job.retry_count + 1, next_attempt_at: new Date(Date.now() + decision.delayMs).toISOString(), finished_at: null }).eq("id", id).eq("tenant_id", context.tenantId).select().single();
  if (error) phase5Error(error, "CONNECTOR_JOB_RETRY_FAILED");
  await audit(admin, context, job.status === "DEAD_LETTER" ? "dead-letter.requeue" : "connector.retry", { connector_instance_id: job.connector_instance_id, connector_job_id: id });
  return data;
}

export async function cancelJob(admin: AdminClient, context: VerifiedV2PolicyContext, id: string) {
  const job = await getConnectorJob(admin, context, id);
  await consumeRateLimit(admin, context.tenantId, job.connector_instance_id, "connector-jobs.cancel");
  if (!canCancelJob(job.status)) throw new ApiError(409, "CONNECTOR_JOB_CONFLICT", "Only queued or retry-wait jobs may be cancelled.");
  const { data, error } = await admin.from("connector_job").update({ status: "CANCELLED", local_cancelled: true, external_state_unknown: Boolean(job.started_at), finished_at: new Date().toISOString() }).eq("id", id).eq("tenant_id", context.tenantId).select().single();
  if (error) phase5Error(error, "CONNECTOR_JOB_CANCEL_FAILED");
  await audit(admin, context, "connector.cancel", { connector_instance_id: job.connector_instance_id, connector_job_id: id });
  return data;
}

export async function getReceipt(admin: AdminClient, context: VerifiedV2PolicyContext, id: string) {
  assertVerifiedPolicyContext(context);
  const { data, error } = await admin.from("connector_receipt").select("id,tenant_id,job_id,external_system,external_request_id,external_object_id,external_status,received_at,payload_hash,safe_result_json,adapter_version").eq("tenant_id", context.tenantId).eq("id", id).maybeSingle();
  if (error) phase5Error(error, "CONNECTOR_RECEIPT_LOAD_FAILED");
  if (!data) throw new ApiError(404, "CONNECTOR_NOT_FOUND", "The Connector Receipt was not found.");
  return data;
}

export async function submitRegistry(admin: AdminClient, context: VerifiedV2PolicyContext, input: Record<string, unknown>, idempotencyKey: string) {
  const connector = await getConnector(admin, context, String(input.connector_instance_id || ""));
  if (connector.definition.code !== "REGISTRY_TEST" || !["MOCK","TEST","SANDBOX","DEVELOPMENT"].includes(connector.environment)) throw new ApiError(409, "CONNECTOR_CONFIG_INVALID", "Only the TEST Registry adapter may run in Phase 5.");
  await consumeRateLimit(admin, context.tenantId, connector.id, "registry-submissions.submit");
  const { data: version, error: versionError } = await admin.from("dpp_version").select("id,tenant_id,passport_id,publication_state,payload_hash,canonical_payload,registry_state").eq("tenant_id", context.tenantId).eq("id", String(input.version_id || "")).maybeSingle();
  if (versionError) phase5Error(versionError, "REGISTRY_VERSION_LOAD_FAILED");
  if (!version || version.publication_state !== "PUBLISHED") throw new ApiError(409, "REGISTRY_VERSION_NOT_PUBLISHED", "Registry submission requires a published immutable DPP Version.");
  const prepared = prepareRegistrySubmission(version, String(input.registry_profile || "TEST_GENERIC_V1"));
  const validation = validateRegistrySubmission(prepared);
  if (!validation.valid) throw new ApiError(422, "REGISTRY_EXTERNAL_REJECTED", "Registry preflight failed.", validation);
  const job = await createConnectorJob(admin, context, connector.id, {
    job_type: "REGISTRY_SUBMIT", direction: "OUTBOUND", passport_id: version.passport_id, version_id: version.id,
    operation_snapshot: { passportId: version.passport_id, versionId: version.id, payloadHash: version.payload_hash, registryProfile: prepared.registryProfile, adapterVersion: prepared.adapterVersion, submissionPayloadHash: prepared.submissionPayloadHash },
  }, idempotencyKey);
  const { data: submission, error: submissionError } = await admin.from("registry_submission_v2").insert({
    tenant_id: context.tenantId, connector_instance_id: connector.id, connector_job_id: job.id,
    passport_id: version.passport_id, version_id: version.id, state: "READY", payload_hash: version.payload_hash,
    registry_profile: prepared.registryProfile, adapter_version: prepared.adapterVersion, submission_payload_hash: prepared.submissionPayloadHash,
  }).select().single();
  if (submissionError) phase5Error(submissionError, "REGISTRY_SUBMISSION_FAILED");
  const mode = String(input.fixture_mode || "ACCEPTED").toUpperCase() as RegistryFixtureMode;
  const fixture = registryTestResult(mode, submission.id);
  const { data: attempt, error: attemptError } = await admin.from("connector_attempt").insert({
    tenant_id: context.tenantId, job_id: job.id, attempt_number: 1, status: fixture.retryable ? "FAILED" : "SUCCEEDED",
    finished_at: new Date().toISOString(), request_fingerprint: prepared.submissionPayloadHash,
    response_fingerprint: safeFingerprint(JSON.stringify(fixture)), http_status: fixture.httpStatus,
    error_code: fixture.status === "REJECTED" ? "REGISTRY_EXTERNAL_REJECTED" : null, retryable: fixture.retryable,
  }).select().single();
  if (attemptError) phase5Error(attemptError, "REGISTRY_ATTEMPT_FAILED");
  const receiptPayload = redactExternalResult(fixture);
  const { data: receipt, error: receiptError } = await admin.from("connector_receipt").insert({
    tenant_id: context.tenantId, job_id: job.id, external_system: "REGISTRY_TEST",
    external_request_id: fixture.externalRequestId, external_object_id: (fixture as any).externalObjectId || null,
    external_status: fixture.status, payload_hash: safeFingerprint(JSON.stringify(receiptPayload)), safe_result_json: receiptPayload,
    adapter_version: prepared.adapterVersion,
  }).select().single();
  if (receiptError) phase5Error(receiptError, "REGISTRY_RECEIPT_FAILED");
  let mapping = null;
  if ((fixture as any).externalObjectId) {
    const { data, error } = await admin.from("external_identifier_mapping").insert({
      tenant_id: context.tenantId, connector_instance_id: connector.id, subject_type: "PASSPORT", subject_id: version.passport_id,
      external_system: "REGISTRY_TEST", external_identifier_type: "REGISTRY_ID", external_identifier: (fixture as any).externalObjectId,
      issuer: "GREANLEAN_TEST_REGISTRY", scheme: "TEST_REGISTRY_ID",
    }).select().single();
    if (error) phase5Error(error, "REGISTRY_IDENTIFIER_MAPPING_FAILED");
    mapping = data;
  }
  const terminal = fixture.status === "ACCEPTED" || fixture.status === "REJECTED" || fixture.status === "FAILED";
  const storedState = fixture.status === "PENDING" ? "SUBMITTED" : fixture.status;
  await admin.from("registry_submission_v2").update({ state: storedState, external_request_id: fixture.externalRequestId, external_identifier_mapping_id: mapping?.id || null, submitted_at: new Date().toISOString(), completed_at: terminal ? new Date().toISOString() : null }).eq("id", submission.id);
  await admin.from("connector_job").update({ status: fixture.retryable ? "RETRY_WAIT" : "SUCCEEDED", started_at: new Date().toISOString(), finished_at: fixture.retryable ? null : new Date().toISOString(), next_attempt_at: fixture.retryable ? new Date(Date.now() + 1000).toISOString() : null }).eq("id", job.id);
  await admin.from("dpp_version").update({ registry_state: fixture.status === "PENDING" ? "SUBMITTED" : fixture.status }).eq("id", version.id);
  await audit(admin, context, "registry.submit", { connector_instance_id: connector.id, connector_job_id: job.id, safe_metadata: { versionId: version.id, result: fixture.status } });
  return { submission: { ...submission, state: storedState, externalStatus: fixture.status }, job, receipt, externalIdentifierMapping: mapping, attempt };
}

export async function getRegistrySubmission(admin: AdminClient, context: VerifiedV2PolicyContext, id: string) {
  assertVerifiedPolicyContext(context);
  const { data, error } = await admin.from("registry_submission_v2").select("*,job:connector_job(*),externalIdentifier:external_identifier_mapping(*)").eq("tenant_id", context.tenantId).eq("id", id).maybeSingle();
  if (error) phase5Error(error, "REGISTRY_SUBMISSION_LOAD_FAILED");
  if (!data) throw new ApiError(404, "CONNECTOR_NOT_FOUND", "The Registry Submission was not found.");
  return data;
}

export async function pollRegistrySubmission(admin: AdminClient, context: VerifiedV2PolicyContext, id: string, input: Record<string, unknown>) {
  const submission = await getRegistrySubmission(admin, context, id);
  if (!["SUBMITTED","VALIDATING"].includes(submission.state)) throw new ApiError(409, "REGISTRY_SUBMISSION_CONFLICT", "Only a pending Registry Submission may be polled.");
  await consumeRateLimit(admin, context.tenantId, submission.connector_instance_id, "registry-submissions.poll");
  const mode = String(input.fixture_mode || "PENDING").toUpperCase() as RegistryFixtureMode;
  const result = registryTestResult(mode, submission.external_request_id || submission.id);
  const storedState = result.status === "PENDING" ? "SUBMITTED" : result.status;
  const terminal = ["ACCEPTED","REJECTED","FAILED"].includes(storedState);
  const { data: receipt, error: receiptError } = await admin.from("connector_receipt").insert({
    tenant_id: context.tenantId, job_id: submission.connector_job_id, external_system: "REGISTRY_TEST",
    external_request_id: result.externalRequestId, external_object_id: (result as any).externalObjectId || null,
    external_status: result.status, payload_hash: safeFingerprint(JSON.stringify(result)), safe_result_json: redactExternalResult(result),
    adapter_version: submission.adapter_version,
  }).select().single();
  if (receiptError) phase5Error(receiptError, "REGISTRY_RECEIPT_FAILED");
  const { data, error } = await admin.from("registry_submission_v2").update({
    state: storedState, completed_at: terminal ? new Date().toISOString() : null,
  }).eq("tenant_id", context.tenantId).eq("id", id).select().single();
  if (error) phase5Error(error, "REGISTRY_POLL_FAILED");
  await admin.from("dpp_version").update({ registry_state: storedState }).eq("id", submission.version_id);
  await admin.from("connector_job").update({ status: terminal ? (storedState === "FAILED" ? "FAILED" : "SUCCEEDED") : "RETRY_WAIT", next_attempt_at: terminal ? null : new Date(Date.now() + 5000).toISOString(), finished_at: terminal ? new Date().toISOString() : null }).eq("id", submission.connector_job_id);
  await audit(admin, context, "registry.status-change", { connector_instance_id: submission.connector_instance_id, connector_job_id: submission.connector_job_id, safe_metadata: { from: submission.state, to: storedState } });
  return { submission: data, receipt, externalStatus: result.status };
}

export async function processWebhook(admin: AdminClient, connectorCode: string, request: Request, rawBody: string) {
  if (rawBody.length > 262_144) throw new ApiError(413, "CONNECTOR_EXTERNAL_ERROR", "The webhook body is too large.");
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) throw new ApiError(415, "CONNECTOR_CONFIG_INVALID", "Webhook content type must be application/json.");
  const { data: definition } = await admin.from("connector_definition").select("id").eq("code", connectorCode.toUpperCase()).maybeSingle();
  if (!definition) throw new ApiError(404, "CONNECTOR_NOT_FOUND", "The webhook Connector was not found.");
  const { data: instances, error: instanceError } = await admin.from("connector_instance").select("id,tenant_id,config_json,status,environment").eq("connector_definition_id", definition.id).eq("status", "ACTIVE");
  if (instanceError) phase5Error(instanceError, "WEBHOOK_CONNECTOR_LOAD_FAILED");
  const webhookKey = request.headers.get("x-webhook-key") || "";
  const instance = (instances || []).find((row: any) => row.config_json?.webhookKey === webhookKey);
  if (!instance) throw new ApiError(403, "WEBHOOK_SIGNATURE_INVALID", "The webhook binding is invalid.");
  const { data: credential } = await admin.from("connector_credential_reference").select("id,secret_reference,status").eq("tenant_id", instance.tenant_id).eq("connector_instance_id", instance.id).eq("credential_type", "HMAC").eq("status", "VERIFIED").maybeSingle();
  const envName = String(credential?.secret_reference || "").replace(/^env:\/\//, "");
  const secret = envName ? process.env[envName] : undefined;
  if (!secret) throw new ApiError(401, "CONNECTOR_CREDENTIAL_MISSING", "Webhook verification is not configured.");
  await consumeRateLimit(admin, instance.tenant_id, instance.id, `webhooks:${connectorCode.toUpperCase()}`, credential.id);
  let payloadHash: string;
  try {
    payloadHash = verifyWebhookSignature({ rawBody, signature: request.headers.get("x-signature") || "", timestamp: request.headers.get("x-timestamp") || "", secret });
  } catch (error) {
    const code = String((error as Error).message) === "WEBHOOK_REPLAY_DETECTED" ? "WEBHOOK_REPLAY_DETECTED" : "WEBHOOK_SIGNATURE_INVALID";
    await admin.from("connector_audit_event").insert({
      tenant_id: instance.tenant_id, connector_instance_id: instance.id,
      event_type: "webhook.reject", correlation_id: request.headers.get("x-correlation-id") || crypto.randomUUID(),
      safe_metadata: { code },
    });
    throw new ApiError(401, code, "Webhook verification failed.");
  }
  const body = JSON.parse(rawBody) as Record<string, unknown>;
  const externalEventId = String(request.headers.get("x-event-id") || body.eventId || "");
  if (!externalEventId) throw new ApiError(400, "CONNECTOR_CONFIG_INVALID", "A stable external event ID is required.");
  const { data, error } = await admin.from("connector_webhook_event").insert({
    tenant_id: instance.tenant_id, connector_instance_id: instance.id, external_event_id: externalEventId,
    event_timestamp: new Date(Number(request.headers.get("x-timestamp")) * 1000).toISOString(), payload_hash: payloadHash,
    signature_verified: true, processing_status: "PROCESSED", correlation_id: request.headers.get("x-correlation-id") || crypto.randomUUID(),
  }).select().single();
  if (error?.code === "23505") return { duplicate: true, accepted: true };
  if (error) phase5Error(error, "WEBHOOK_STORE_FAILED");
  return { duplicate: false, accepted: true, eventId: data.id };
}

export async function runImport(admin: AdminClient, context: VerifiedV2PolicyContext, input: Record<string, unknown>) {
  const connector = await getConnector(admin, context, String(input.connector_instance_id || ""));
  if (!["FILE_IMPORT","ERP","MES","PLM"].includes(connector.definition.connector_type)) throw new ApiError(400, "CONNECTOR_CONFIG_INVALID", "The selected Connector is not an inbound record adapter.");
  await consumeRateLimit(admin, context.tenantId, connector.id, `imports:${String(input.action || "PREFLIGHT").toUpperCase()}`);
  const mappingVersionId = String(input.mapping_version_id || "");
  const { data: mapping, error: mappingError } = await admin.from("mapping_version").select("id,tenant_id,status,mapping_profile_id").eq("tenant_id", context.tenantId).eq("id", mappingVersionId).maybeSingle();
  if (mappingError) phase5Error(mappingError, "IMPORT_MAPPING_LOAD_FAILED");
  if (!mapping || mapping.status !== "ACTIVE") throw new ApiError(409, "IMPORT_MAPPING_REQUIRED", "An active Mapping Version must be pinned.");
  const content = String(input.content || "");
  const format = String(input.file_format || "JSON").toUpperCase() as "CSV" | "JSON";
  const rows = parseImportFile(format, content);
  const { data: dbRules, error: ruleError } = await admin.from("mapping_rule").select("source_pointer,target_field_definition_id,field:field_definition(field_code)").eq("tenant_id", context.tenantId).eq("mapping_version_id", mappingVersionId).order("sort_order");
  if (ruleError) phase5Error(ruleError, "IMPORT_MAPPING_LOAD_FAILED");
  const rules: ImportMappingRule[] = (dbRules || []).map((row: any) => ({ source: row.source_pointer, targetFieldCode: row.field?.field_code }));
  const dryRun = mappingDryRun(rows, rules);
  const action = String(input.action || "PREFLIGHT").toUpperCase();
  if (action === "COMMIT" && dryRun.unmappedFields.length && input.allow_unmapped !== true) throw new ApiError(422, "IMPORT_UNMAPPED_FIELDS", "Unmapped external fields require an explicit Mapping decision.", { fields: dryRun.unmappedFields });
  const fileHash = safeFingerprint(content);
  const { data: session, error: sessionError } = await admin.from("connector_import_session").insert({
    tenant_id: context.tenantId, connector_instance_id: connector.id, mapping_version_id: mappingVersionId,
    file_format: format, file_hash: fileHash, status: action === "COMMIT" ? "READY" : action === "DRY_RUN" ? "DRY_RUN" : "PREFLIGHT",
    unmapped_fields: dryRun.unmappedFields, created_by: context.user.id,
  }).select().single();
  if (sessionError) phase5Error(sessionError, "IMPORT_SESSION_CREATE_FAILED");
  if (action !== "COMMIT") return { session, rowCount: rows.length, dryRun };
  const subjectType = String(input.subject_type || "").toUpperCase();
  const subjectId = String(input.subject_id || "");
  if (!subjectType || !subjectId || !connector.data_source_id) throw new ApiError(400, "CONNECTOR_CONFIG_INVALID", "Commit requires a bound Data Source and target subject.");
  const claims: any[] = [];
  for (let index = 0; index < rows.length; index += 1) {
    const record = rows[index];
    const recordHash = safeFingerprint(JSON.stringify(record));
    const externalId = String(record.externalId || record.id || `row-${index + 1}`);
    const { data: previous } = await admin.from("source_record").select("payload_hash").eq("tenant_id", context.tenantId).eq("data_source_id", connector.data_source_id).eq("external_record_id", externalId).order("received_at", { ascending: false }).limit(1).maybeSingle();
    const reconciliation = reconcileExternalRecord(previous?.payload_hash || null, { kind: connector.definition.connector_type === "FILE_IMPORT" ? "ERP" : connector.definition.connector_type, externalId, updatedAt: new Date().toISOString(), subjectType: subjectType as any, subjectId, payload: record });
    if (reconciliation.state === "UNCHANGED") continue;
    const { data: source, error: sourceError } = await admin.from("source_record").insert({ tenant_id: context.tenantId, data_source_id: connector.data_source_id, external_record_id: externalId, subject_type: subjectType, subject_id: subjectId, payload_json: record, payload_hash: recordHash, created_by: context.user.id, status: "PROCESSED" }).select().single();
    if (sourceError) phase5Error(sourceError, "IMPORT_SOURCE_RECORD_FAILED");
    const output = dryRun.outputs[index];
    const { hash: outputHash } = canonicalHash(output);
    const { data: transformation, error: transformError } = await admin.from("transformation_result").insert({ tenant_id: context.tenantId, source_record_id: source.id, mapping_version_id: mappingVersionId, status: "SUCCESS", input_hash: recordHash, output_hash: outputHash, output_json: output, finished_at: new Date().toISOString(), correlation_id: context.correlationId, created_by: context.user.id }).select().single();
    if (transformError) phase5Error(transformError, "IMPORT_TRANSFORMATION_FAILED");
    for (const dbRule of dbRules || []) {
      const fieldCode = (dbRule as any).field?.field_code;
      if (!(fieldCode in output)) continue;
      const { data: field } = await admin.from("field_definition").select("id,schema_version_id").eq("id", dbRule.target_field_definition_id).single();
      const { data: existing } = await admin.from("canonical_claim").select("id,provenance_record_id").eq("tenant_id", context.tenantId).eq("subject_type", subjectType).eq("subject_id", subjectId).eq("field_definition_id", field.id).is("effective_to", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (existing) continue; // Manual/existing truth is never silently overwritten.
      const { data: provenance, error: provenanceError } = await admin.from("provenance_record").insert({ tenant_id: context.tenantId, subject_type: subjectType, subject_id: subjectId, field_definition_id: field.id, data_source_id: connector.data_source_id, source_record_id: source.id, raw_value_reference: { value: record }, normalized_value_reference: { value: output[fieldCode] }, mapping_version_id: mappingVersionId, transformation_result_id: transformation.id, verification_status: "SYSTEM_VERIFIED", verification_method: `CONNECTOR:${connector.definition.code}:${connector.definition.version}`, entered_by: context.user.id }).select().single();
      if (provenanceError) phase5Error(provenanceError, "IMPORT_PROVENANCE_FAILED");
      const { data: claim, error: claimError } = await admin.from("canonical_claim").insert({ tenant_id: context.tenantId, subject_type: subjectType, subject_id: subjectId, field_definition_id: field.id, schema_version_id: field.schema_version_id, resolution_state: "OVERRIDE", value_json: output[fieldCode], verification_status: "SYSTEM_VERIFIED", provenance_record_id: provenance.id, created_by: context.user.id }).select().single();
      if (claimError) phase5Error(claimError, "IMPORT_CLAIM_FAILED");
      claims.push(claim);
    }
  }
  await admin.from("connector_import_session").update({ status: "COMMITTED", committed_at: new Date().toISOString(), reconciliation_summary: { NEW: claims.length, UNCHANGED: rows.length - claims.length, CHANGED: 0, CONFLICT: 0, REJECTED: 0 } }).eq("id", session.id);
  return { session: { ...session, status: "COMMITTED" }, rowCount: rows.length, dryRun, canonicalClaimsCreated: claims.length };
}

export async function aggregateBms(admin: AdminClient, context: VerifiedV2PolicyContext, input: Record<string, unknown>) {
  const connector = await getConnector(admin, context, String(input.connector_instance_id || ""));
  if (connector.definition.connector_type !== "BMS") throw new ApiError(400, "CONNECTOR_CONFIG_INVALID", "The selected Connector is not a BMS adapter.");
  await consumeRateLimit(admin, context.tenantId, connector.id, "bms.aggregate");
  const samples = input.samples as BmsSample[];
  let snapshot: ReturnType<typeof aggregateBmsSamples>;
  try {
    snapshot = aggregateBmsSamples(samples, { expectedDeviceId: String(input.device_id || ""), expectedItemId: String(input.item_id || ""), thresholds: input.thresholds as any });
  } catch (error) {
    const code = String((error as Error).message);
    if (code === "BMS_DEVICE_BINDING_INVALID") throw new ApiError(409, code, "The BMS device is not bound to the requested Item.");
    if (code === "WEBHOOK_REPLAY_DETECTED") {
      await audit(admin, context, "bms.replay-reject", { connector_instance_id: connector.id, safe_metadata: { itemId: input.item_id } });
      throw new ApiError(409, code, "The BMS event was duplicated or outside the permitted timestamp window.");
    }
    throw new ApiError(400, "CONNECTOR_CONFIG_INVALID", "The BMS sample window is invalid.");
  }
  const { data, error } = await admin.from("bms_aggregation_snapshot").insert({ tenant_id: context.tenantId, connector_instance_id: connector.id, item_id: input.item_id, device_external_id: input.device_id, window_start: snapshot.windowStart, window_end: snapshot.windowEnd, algorithm_version: snapshot.algorithmVersion, sample_count: snapshot.sampleCount, aggregate_json: snapshot.aggregate, source_payload_hash: snapshot.sourcePayloadHash, threshold_events: snapshot.thresholdEvents }).select().single();
  if (error?.code === "23505") return { idempotent: true, snapshot };
  if (error) phase5Error(error, "BMS_AGGREGATION_FAILED");
  const claimCandidate = input.claim_rule ? bmsClaimCandidate(snapshot, input.claim_rule as any) : null;
  return { idempotent: false, snapshot: data, claimCandidate, claimCreated: false, reason: claimCandidate ? "Claim candidate requires authorized commit." : "Aggregation retained without DPP claim." };
}
