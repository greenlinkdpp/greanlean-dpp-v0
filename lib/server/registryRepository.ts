import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  buildBatteryRegistryArtifact,
  isReadyForManualTest,
  normalizeRegistryGranularity,
  parseRegistryError,
  registryPayloadHash,
  validateBatteryRegistrySource,
  type BatteryRegistrySource,
} from "../registry/adapter.ts";
import { ApiError } from "./apiRoute";
import { requireBatteryProduct } from "./batteryRepository";

type AdminClient = SupabaseClient<any, "public", any>;

function databaseError(error: { message?: string; code?: string } | null) {
  if (!error) return;
  if (error.code === "42P01") throw new ApiError(503, "REGISTRY_ADAPTER_NOT_INSTALLED", "The Registry adapter database migration has not been applied.");
  throw new ApiError(500, "REGISTRY_DATABASE_ERROR", "Registry data could not be processed.");
}

export function registryAdapterEnabled() {
  const value = process.env.FEATURE_REGISTRY_ADAPTER;
  if (value == null) return process.env.NODE_ENV !== "production";
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function requireRegistryAdapter() {
  if (!registryAdapterEnabled()) throw new ApiError(503, "REGISTRY_ADAPTER_DISABLED", "The Registry test adapter is disabled in this environment.");
}

async function registryMapping(admin: AdminClient) {
  const { data, error } = await admin
    .from("registry_mapping")
    .select("*")
    .eq("product_group_code", "battery")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  databaseError(error);
  if (!data) throw new ApiError(503, "REGISTRY_MAPPING_NOT_PUBLISHED", "No published battery Registry mapping is installed.");
  return data;
}

async function latestPublishedVersion(admin: AdminClient, productId: string) {
  const { data, error } = await admin
    .from("product_versions")
    .select("id,version,lifecycle_status,data_hash,hash_algorithm,created_at")
    .eq("product_id", productId)
    .in("lifecycle_status", ["published", "updated", "expired"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  databaseError(error);
  return data;
}

async function currentPublication(admin: AdminClient, productId: string) {
  const { data: pointer, error: pointerError } = await admin
    .from("dpp_product_publication_pointer")
    .select("publication_id")
    .eq("product_id", productId)
    .maybeSingle();
  if (pointerError) {
    const message = String(pointerError.message || "").toLowerCase();
    if (
      pointerError.code === "42P01"
      || pointerError.code === "PGRST205"
      || message.includes("does not exist")
      || message.includes("could not find the table")
    ) return null;
    databaseError(pointerError);
  }
  if (!pointer?.publication_id) return null;
  const { data, error } = await admin
    .from("dpp_publication")
    .select("id,version_number,status,snapshot_hash,hash_algorithm,published_at")
    .eq("id", pointer.publication_id)
    .eq("product_id", productId)
    .eq("status", "PUBLISHED")
    .maybeSingle();
  databaseError(error);
  return data;
}

async function sourceForProduct(
  admin: AdminClient,
  productId: string,
): Promise<
  BatteryRegistrySource & {
    productVersionId: string | null;
    publicationId: string | null;
  }
> {
  const product = await requireBatteryProduct(admin, productId);
  const [
    mapping,
    publicationResult,
    versionResult,
    profileResult,
    batchResult,
    itemResult,
    enrolmentResult,
  ] = await Promise.all([
    registryMapping(admin),
    currentPublication(admin, productId),
    latestPublishedVersion(admin, productId),
    admin.from("battery_model_profile").select("id,battery_model_identifier").eq("product_id", productId).maybeSingle(),
    admin.from("battery_batch").select("id,batch_identifier").eq("product_id", productId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    admin.from("battery_item").select("id,serial_identifier,unique_product_identifier,battery_batch_id").eq("product_id", productId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    admin.from("registry_organisation_enrolment").select("id,verification_status,declaration_document_reference").eq("environment", "TEST").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  [profileResult, batchResult, itemResult, enrolmentResult].forEach((result) => databaseError(result.error));
  const granularity = normalizeRegistryGranularity((product as any).granularity_level);
  const publicIdentifier = product.public_slug || product.dpp_id;
  const baseUrl = String(process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const dppUri = baseUrl && publicIdentifier ? `${baseUrl}/p/${encodeURIComponent(publicIdentifier)}` : null;
  const upi = granularity === "ITEM"
    ? itemResult.data?.unique_product_identifier || product.unique_product_identifier
    : product.unique_product_identifier;
  return {
    productVersionId: publicationResult ? null : versionResult?.id || null,
    publicationId: publicationResult?.id || null,
    environment: "TEST",
    mappingVersion: mapping.mapping_version,
    operationalRuleVersion: mapping.operational_rule_version,
    registrySchemaVersion: mapping.registry_schema_version,
    mappingStatus: mapping.status,
    productStatus: product.status,
    passportId: product.dpp_id,
    upi,
    granularity,
    modelIdentifier: profileResult.data?.battery_model_identifier || null,
    batchIdentifier: batchResult.data?.batch_identifier || null,
    itemIdentifier: itemResult.data?.serial_identifier || null,
    commodityCode: product.commodity_code,
    dppUri,
    backupReference: null,
    dppVersion: publicationResult
      ? `v${publicationResult.version_number}`
      : versionResult?.version || null,
    dppVersionHash: publicationResult?.snapshot_hash
      || versionResult?.data_hash
      || null,
    enrolmentVerified: enrolmentResult.data?.verification_status === "VERIFIED",
    declarationPresent: Boolean(enrolmentResult.data?.declaration_document_reference),
  };
}

export async function loadRegistryWorkspace(admin: AdminClient, productId: string) {
  requireRegistryAdapter();
  await requireBatteryProduct(admin, productId);
  const mapping = await registryMapping(admin);
  const { data: submissions, error: submissionError } = await admin
    .from("registry_submission")
    .select("id,environment,granularity,passport_id,upi,mapping_version,submission_method,request_hash,submission_status,error_code,error_message,registry_correlation_id,submitted_at,completed_at,retry_of_submission_id,created_at")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(20);
  databaseError(submissionError);
  const ids = (submissions || []).map((row) => row.id);
  const [validationResult, errorResult] = ids.length
    ? await Promise.all([
        admin.from("registry_validation_result").select("*").in("submission_id", ids).order("created_at"),
        admin.from("registry_error_log").select("*").in("submission_id", ids).order("created_at", { ascending: false }),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  databaseError(validationResult.error);
  databaseError(errorResult.error);
  return {
    enabled: true,
    environment: "TEST",
    productionEnabled: false,
    mapping: {
      version: mapping.mapping_version,
      operationalRuleVersion: mapping.operational_rule_version,
      registrySchemaVersion: mapping.registry_schema_version,
      officialBatterySemanticCatalogueAvailable: Boolean(mapping.registry_schema_version),
    },
    submissions: (submissions || []).map((submission) => ({
      ...submission,
      validationResults: (validationResult.data || []).filter((row) => row.submission_id === submission.id),
      errors: (errorResult.data || []).filter((row) => row.submission_id === submission.id),
    })),
  };
}

export async function generateRegistryMapping(admin: AdminClient, productId: string, user: User, retryOfSubmissionId?: string | null) {
  requireRegistryAdapter();
  const product = await requireBatteryProduct(admin, productId);
  const source = await sourceForProduct(admin, productId);
  if (!source.productVersionId && !source.publicationId) {
    throw new ApiError(
      409,
      "PUBLISHED_DPP_VERSION_REQUIRED",
      "Publish a hashed DPP version before generating a Registry mapping.",
    );
  }
  if (retryOfSubmissionId) {
    const { data: prior, error } = await admin.from("registry_submission").select("id,product_id,environment").eq("id", retryOfSubmissionId).maybeSingle();
    databaseError(error);
    if (!prior || prior.product_id !== productId || prior.environment !== "TEST") throw new ApiError(400, "INVALID_REGISTRY_RETRY", "The selected TEST submission cannot be retried for this product.");
  }
  const artifact = buildBatteryRegistryArtifact(source);
  const validations = validateBatteryRegistrySource(source);
  const ready = isReadyForManualTest(validations);
  const requestHash = registryPayloadHash(artifact);
  const { data: submission, error: submissionError } = await admin.from("registry_submission").insert({
    product_id: productId,
    product_version_id: source.productVersionId,
    publication_id: source.publicationId,
    environment: "TEST",
    product_group: "battery",
    granularity: source.granularity,
    passport_id: source.passportId,
    upi: source.upi,
    model_identifier: source.modelIdentifier,
    batch_identifier: source.batchIdentifier,
    commodity_code: source.commodityCode,
    registry_uri: source.dppUri,
    backup_reference: source.backupReference,
    mapping_version: source.mappingVersion,
    registry_schema_version: source.registrySchemaVersion,
    submission_method: "MANUAL_FILE",
    request_payload: artifact,
    request_hash: requestHash,
    submission_status: ready ? "READY" : "FAILED",
    error_code: ready ? null : "LOCAL_VALIDATION_FAILED",
    error_message: ready ? null : "One or more local pre-submission checks failed.",
    retry_of_submission_id: retryOfSubmissionId || null,
    created_by: user.id,
  }).select("id,submission_status,request_hash").single();
  databaseError(submissionError);
  if (!submission) throw new ApiError(500, "REGISTRY_SUBMISSION_NOT_CREATED", "The Registry preparation record was not created.");
  const rows = validations.map((result) => ({
    submission_id: submission.id,
    validation_stage: result.validationStage,
    rule_code: result.ruleCode,
    field_code: result.fieldCode,
    severity: result.severity,
    json_pointer: result.jsonPointer,
    error_code: result.errorCode,
    message_en: result.messageEn,
    message_zh: result.messageZh,
    source: result.source,
    passed: result.passed,
  }));
  const { error: validationError } = await admin.from("registry_validation_result").insert(rows);
  databaseError(validationError);
  return { submission, filename: `registry-test-${String(product.dpp_id || productId).replace(/[^a-z0-9._-]/gi, "_")}-${submission.id.slice(0, 8)}.json` };
}

export async function recordRegistryTestResult(admin: AdminClient, productId: string, input: Record<string, unknown>) {
  requireRegistryAdapter();
  const submissionId = String(input.submissionId || "");
  const outcome = String(input.outcome || "").toUpperCase();
  if (!submissionId || !["SUBMITTED", "REJECTED", "FAILED"].includes(outcome)) {
    throw new ApiError(400, "INVALID_REGISTRY_TEST_RESULT", "A TEST submission and supported outcome are required.");
  }
  const { data: submission, error } = await admin.from("registry_submission").select("id,environment,product_id,submission_status").eq("id", submissionId).eq("product_id", productId).maybeSingle();
  databaseError(error);
  if (!submission || submission.environment !== "TEST") throw new ApiError(404, "REGISTRY_TEST_SUBMISSION_NOT_FOUND", "The TEST submission was not found.");
  if (["REJECTED", "FAILED", "ACCEPTED"].includes(submission.submission_status)) {
    throw new ApiError(409, "REGISTRY_TEST_RESULT_FINAL", "This Registry TEST record already has a final result. Create a retry instead.");
  }
  if (outcome === "SUBMITTED" && submission.submission_status !== "READY") {
    throw new ApiError(409, "REGISTRY_TEST_FILE_NOT_READY", "Only a locally ready TEST file can be recorded as submitted.");
  }
  const responsePayload = input.responsePayload && typeof input.responsePayload === "object"
    ? input.responsePayload
    : { message: String(input.responsePayload || input.message || "") };
  const parsed = outcome === "SUBMITTED" ? null : parseRegistryError(responsePayload);
  const now = new Date().toISOString();
  const { error: updateError } = await admin.from("registry_submission").update({
    submission_status: outcome,
    response_payload: responsePayload,
    error_code: parsed?.errorCode || null,
    error_message: parsed?.redactedMessage || null,
    registry_correlation_id: parsed?.correlationId || input.correlationId || null,
    submitted_at: now,
    completed_at: outcome === "SUBMITTED" ? null : now,
  }).eq("id", submissionId);
  databaseError(updateError);
  const { error: resultError } = await admin.from("registry_validation_result").insert({
    submission_id: submissionId,
    validation_stage: "REGISTRY_RESPONSE",
    rule_code: `REGISTRY_TEST_${outcome}`,
    field_code: null,
    severity: outcome === "SUBMITTED" ? "INFO" : "ERROR",
    json_pointer: null,
    error_code: parsed?.errorCode || null,
    message_en: outcome === "SUBMITTED" ? "The file was manually submitted to the TEST environment; acceptance is not confirmed." : parsed?.redactedMessage,
    message_zh: outcome === "SUBMITTED" ? "文件已人工提交到测试环境，尚未确认被接受。" : parsed?.redactedMessage,
    source: "REGISTRY",
    passed: outcome === "SUBMITTED",
  });
  databaseError(resultError);
  if (parsed) {
    const { error: logError } = await admin.from("registry_error_log").insert({
      submission_id: submissionId,
      error_category: parsed.errorCategory,
      retryable: parsed.retryable,
      http_status: parsed.httpStatus,
      error_code: parsed.errorCode,
      redacted_message: parsed.redactedMessage,
      registry_correlation_id: parsed.correlationId,
      attempt: Number(input.attempt) > 0 ? Number(input.attempt) : 1,
      raw_error_excerpt: parsed.rawExcerpt,
    });
    databaseError(logError);
  }
  return loadRegistryWorkspace(admin, productId);
}

export async function registryMappingDownload(admin: AdminClient, productId: string, submissionId: string) {
  requireRegistryAdapter();
  const product = await requireBatteryProduct(admin, productId);
  const { data, error } = await admin
    .from("registry_submission")
    .select("id,environment,request_payload,submission_status")
    .eq("id", submissionId)
    .eq("product_id", productId)
    .maybeSingle();
  databaseError(error);
  if (!data || data.environment !== "TEST") throw new ApiError(404, "REGISTRY_MAPPING_NOT_FOUND", "The TEST mapping file was not found.");
  const filename = `registry-test-${String(product.dpp_id || productId).replace(/[^a-z0-9._-]/gi, "_")}-${data.id.slice(0, 8)}.json`;
  return { payload: data.request_payload, filename };
}
