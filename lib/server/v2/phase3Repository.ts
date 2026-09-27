import { canonicalHash } from "../dppCanonicalization";
import { ApiError } from "../apiRoute";
import { dryRunMapping, type MappingRuleInput } from "../../v2/mappingEngine";
import { buildResolvedCandidate, type ProductHierarchy, type ResolutionClaim, type ResolutionField, type SubjectLevel } from "../../v2/resolutionEngine";
import { assertVerifiedPolicyContext, type VerifiedV2PolicyContext } from "./security";

type AdminClient = any;

function phase3DatabaseError(error: any, fallback: string): never {
  const message = String(error?.message || "");
  for (const code of [
    "SCHEMA_VERSION_IMMUTABLE", "FIELD_NOT_APPLICABLE", "FIELD_VALUE_INVALID",
    "UNIT_NOT_COMPATIBLE", "MAPPING_VERSION_IMMUTABLE", "CLAIM_CONFLICT",
    "PROVENANCE_INCOMPLETE", "TENANT_RELATIONSHIP_MISMATCH",
  ]) {
    if (message.includes(code)) throw new ApiError(409, code, "The requested Phase 3 operation violates a protected contract.");
  }
  if (error?.code === "23505") throw new ApiError(409, "CLAIM_CONFLICT", "The requested Phase 3 record conflicts with an existing record.");
  if (error?.code === "23503") throw new ApiError(409, "TENANT_RELATIONSHIP_MISMATCH", "A referenced resource is outside the permitted Tenant relationship.");
  throw new ApiError(500, fallback, "The Phase 3 data operation could not be completed.", { database_code: error?.code || null });
}

export async function listSchemas(admin: AdminClient, context: VerifiedV2PolicyContext) {
  assertVerifiedPolicyContext(context);
  const { data, error } = await admin
    .from("schema_definition")
    .select("*")
    .or(`owner_type.eq.GLOBAL,tenant_id.eq.${context.tenantId}`);
  if (error) phase3DatabaseError(error, "SCHEMA_LIST_FAILED");
  return data || [];
}

export async function createTenantSchema(admin: AdminClient, context: VerifiedV2PolicyContext, input: Record<string, unknown>) {
  assertVerifiedPolicyContext(context);
  const { data, error } = await admin.from("schema_definition").insert({
    ...input,
    owner_type: "TENANT_EXTENSION",
    tenant_id: context.tenantId,
    created_by: context.user.id,
  }).select().single();
  if (error) phase3DatabaseError(error, "SCHEMA_CREATE_FAILED");
  return data;
}

async function allowedSchemaIds(admin: AdminClient, context: VerifiedV2PolicyContext) {
  return (await listSchemas(admin, context)).map((row: any) => row.id);
}

async function assertTenantSchema(admin: AdminClient, context: VerifiedV2PolicyContext, schemaDefinitionId: string) {
  const { data, error } = await admin.from("schema_definition")
    .select("id").eq("id", schemaDefinitionId).eq("owner_type", "TENANT_EXTENSION")
    .eq("tenant_id", context.tenantId).maybeSingle();
  if (error) phase3DatabaseError(error, "SCHEMA_LOAD_FAILED");
  if (!data) throw new ApiError(404, "SCHEMA_NOT_FOUND", "The requested Schema was not found.");
}

export async function listSchemaVersions(admin: AdminClient, context: VerifiedV2PolicyContext) {
  assertVerifiedPolicyContext(context);
  const ids = await allowedSchemaIds(admin, context);
  if (!ids.length) return [];
  const { data, error } = await admin.from("schema_version").select("*").in("schema_definition_id", ids);
  if (error) phase3DatabaseError(error, "SCHEMA_VERSION_LIST_FAILED");
  return data || [];
}

export async function createSchemaVersion(admin: AdminClient, context: VerifiedV2PolicyContext, input: Record<string, unknown>) {
  assertVerifiedPolicyContext(context);
  const schemaDefinitionId = String(input.schema_definition_id || "");
  await assertTenantSchema(admin, context, schemaDefinitionId);
  const { data, error } = await admin.from("schema_version").insert({ ...input, created_by: context.user.id }).select().single();
  if (error) phase3DatabaseError(error, "SCHEMA_VERSION_CREATE_FAILED");
  return data;
}

export async function listFieldDefinitions(admin: AdminClient, context: VerifiedV2PolicyContext) {
  assertVerifiedPolicyContext(context);
  const versions = await listSchemaVersions(admin, context);
  if (!versions.length) return [];
  const { data, error } = await admin.from("field_definition").select("*").in("schema_version_id", versions.map((row: any) => row.id));
  if (error) phase3DatabaseError(error, "FIELD_LIST_FAILED");
  return data || [];
}

export async function createFieldDefinition(admin: AdminClient, context: VerifiedV2PolicyContext, input: Record<string, unknown>) {
  assertVerifiedPolicyContext(context);
  const { data: version, error: versionError } = await admin.from("schema_version")
    .select("id,schema_definition_id,status").eq("id", String(input.schema_version_id || "")).maybeSingle();
  if (versionError) phase3DatabaseError(versionError, "SCHEMA_VERSION_LOAD_FAILED");
  if (!version) throw new ApiError(404, "SCHEMA_NOT_FOUND", "The requested Schema version was not found.");
  await assertTenantSchema(admin, context, version.schema_definition_id);
  if (version.status !== "draft") throw new ApiError(409, "SCHEMA_VERSION_IMMUTABLE", "Published Schema versions are immutable.");
  const { data, error } = await admin.from("field_definition").insert(input).select().single();
  if (error) phase3DatabaseError(error, "FIELD_CREATE_FAILED");
  return data;
}

export async function listPhase3TenantRows(admin: AdminClient, context: VerifiedV2PolicyContext, table: string) {
  assertVerifiedPolicyContext(context);
  const { data, error } = await admin.from(table).select("*").eq("tenant_id", context.tenantId);
  if (error) phase3DatabaseError(error, "PHASE3_LIST_FAILED");
  return data || [];
}

export async function createPhase3TenantRow(admin: AdminClient, context: VerifiedV2PolicyContext, table: string, input: Record<string, unknown>) {
  assertVerifiedPolicyContext(context);
  const createdByTables = new Set(["data_source", "source_record", "mapping_profile", "mapping_version"]);
  const values = {
    ...input,
    tenant_id: context.tenantId,
    ...(createdByTables.has(table) ? { created_by: context.user.id } : {}),
  };
  const { data, error } = await admin.from(table).insert(values).select().single();
  if (error) phase3DatabaseError(error, "PHASE3_CREATE_FAILED");
  return data;
}

export async function createMappingVersionWithRules(admin: AdminClient, context: VerifiedV2PolicyContext, input: Record<string, unknown>) {
  assertVerifiedPolicyContext(context);
  const rules = Array.isArray(input.rules) ? input.rules as Array<Record<string, unknown>> : [];
  if (!rules.length) throw new ApiError(400, "MAPPING_UNMAPPED_FIELD", "A Mapping version requires at least one explicit rule.");
  const requestedStatus = input.status === "ACTIVE" ? "ACTIVE" : "DRAFT";
  const versionInput = {
    mapping_profile_id: input.mapping_profile_id,
    version: input.version,
    status: "DRAFT",
    content_hash: contentHash({ mapping_profile_id: input.mapping_profile_id, version: input.version, rules }),
  };
  const { data: version, error: versionError } = await admin.from("mapping_version").insert({
    ...versionInput,
    tenant_id: context.tenantId,
    created_by: context.user.id,
  }).select().single();
  if (versionError) phase3DatabaseError(versionError, "MAPPING_VERSION_CREATE_FAILED");
  const { data: createdRules, error: rulesError } = await admin.from("mapping_rule").insert(rules.map((rule, index) => ({
    ...rule,
    tenant_id: context.tenantId,
    mapping_version_id: version.id,
    sort_order: rule.sort_order ?? (index + 1) * 10,
  }))).select();
  if (rulesError) {
    await admin.from("mapping_version").delete().eq("id", version.id).eq("tenant_id", context.tenantId);
    phase3DatabaseError(rulesError, "MAPPING_RULE_CREATE_FAILED");
  }
  if (requestedStatus === "ACTIVE") {
    const { data: active, error: activateError } = await admin.from("mapping_version")
      .update({ status: "ACTIVE" }).eq("id", version.id).eq("tenant_id", context.tenantId).select().single();
    if (activateError) phase3DatabaseError(activateError, "MAPPING_VERSION_ACTIVATE_FAILED");
    return { ...active, rules: createdRules || [] };
  }
  return { ...version, rules: createdRules || [] };
}

export async function loadMappingDryRun(admin: AdminClient, context: VerifiedV2PolicyContext, mappingVersionId: string, sourceRecordId: string) {
  assertVerifiedPolicyContext(context);
  const [{ data: mappingVersion, error: mappingError }, { data: sourceRecord, error: sourceError }] = await Promise.all([
    admin.from("mapping_version").select("*").eq("tenant_id", context.tenantId).eq("id", mappingVersionId).maybeSingle(),
    admin.from("source_record").select("*").eq("tenant_id", context.tenantId).eq("id", sourceRecordId).maybeSingle(),
  ]);
  if (mappingError || sourceError) phase3DatabaseError(mappingError || sourceError, "MAPPING_LOAD_FAILED");
  if (!mappingVersion || !sourceRecord) throw new ApiError(404, "MAPPING_NOT_FOUND", "The requested Mapping input was not found.");
  if (sourceRecord.payload_mode !== "RAW_STORED" || !sourceRecord.payload_json) {
    throw new ApiError(400, "TRANSFORMATION_FAILED", "A reference-only Source Record cannot be transformed without its external payload.");
  }
  const { data: rules, error: rulesError } = await admin.from("mapping_rule")
    .select("*,field_definition!inner(field_code,unit_code)")
    .eq("tenant_id", context.tenantId).eq("mapping_version_id", mappingVersionId).order("sort_order");
  if (rulesError) phase3DatabaseError(rulesError, "MAPPING_RULE_LOAD_FAILED");
  const mappedRules: MappingRuleInput[] = (rules || []).map((rule: any) => ({
    ...rule,
    field_definition_id: rule.target_field_definition_id,
    field_code: Array.isArray(rule.field_definition) ? rule.field_definition[0]?.field_code : rule.field_definition?.field_code,
    canonical_unit: Array.isArray(rule.field_definition) ? rule.field_definition[0]?.unit_code : rule.field_definition?.unit_code,
  }));
  return {
    mappingVersion,
    sourceRecord,
    rules: mappedRules,
    dryRun: dryRunMapping(sourceRecord.payload_json, mappedRules),
  };
}

export async function commitMapping(admin: AdminClient, context: VerifiedV2PolicyContext, input: Record<string, unknown>, correlationId: string) {
  assertVerifiedPolicyContext(context);
  const mappingVersionId = String(input.mapping_version_id || "");
  const sourceRecordId = String(input.source_record_id || "");
  const subjectType = String(input.subject_type || "") as SubjectLevel;
  const subjectId = String(input.subject_id || "");
  const schemaVersionId = String(input.schema_version_id || "");
  const loaded = await loadMappingDryRun(admin, context, mappingVersionId, sourceRecordId);
  if (loaded.mappingVersion.status !== "ACTIVE") throw new ApiError(409, "MAPPING_VERSION_IMMUTABLE", "Only an active Mapping version can be committed.");
  if (loaded.dryRun.errors.length) throw new ApiError(422, "TRANSFORMATION_FAILED", "Mapping Dry Run contains errors.", loaded.dryRun.errors);
  if (loaded.dryRun.warnings.length && input.accept_warnings !== true) {
    throw new ApiError(409, "MAPPING_LOSSY", "Mapping warnings require explicit acceptance before commit.", loaded.dryRun.warnings);
  }
  const finishedAt = new Date().toISOString();
  const { data: transformation, error: transformationError } = await admin.from("transformation_result").insert({
    tenant_id: context.tenantId,
    source_record_id: sourceRecordId,
    mapping_version_id: mappingVersionId,
    status: loaded.dryRun.status,
    input_hash: loaded.dryRun.inputHash,
    output_hash: loaded.dryRun.outputHash,
    warnings: loaded.dryRun.warnings,
    errors: loaded.dryRun.errors,
    output_json: { fields: loaded.dryRun.fields, unmappedFields: loaded.dryRun.unmappedFields },
    finished_at: finishedAt,
    correlation_id: correlationId,
    created_by: context.user.id,
  }).select().single();
  if (transformationError) phase3DatabaseError(transformationError, "TRANSFORMATION_RESULT_CREATE_FAILED");
  const claims = [];
  for (const field of loaded.dryRun.fields) {
    const { data: provenance, error: provenanceError } = await admin.from("provenance_record").insert({
      tenant_id: context.tenantId,
      subject_type: subjectType,
      subject_id: subjectId,
      field_definition_id: field.fieldDefinitionId,
      data_source_id: loaded.sourceRecord.data_source_id,
      source_record_id: sourceRecordId,
      raw_value_reference: { value: field.originalValue, unit: field.sourceUnit },
      normalized_value_reference: { value: field.value, unit: field.canonicalUnit, conversionVersion: field.conversionVersion },
      mapping_version_id: mappingVersionId,
      transformation_result_id: transformation.id,
      observed_at: loaded.sourceRecord.observed_at,
      entered_by: context.user.id,
      verification_status: "UNVERIFIED",
      evidence_references: [],
    }).select().single();
    if (provenanceError) phase3DatabaseError(provenanceError, "PROVENANCE_CREATE_FAILED");
    const { data: claim, error: claimError } = await admin.from("canonical_claim").insert({
      tenant_id: context.tenantId,
      subject_type: subjectType,
      subject_id: subjectId,
      field_definition_id: field.fieldDefinitionId,
      schema_version_id: schemaVersionId,
      resolution_state: field.resolutionState,
      value_json: field.resolutionState === "OVERRIDE" ? field.value : null,
      canonical_unit: field.canonicalUnit,
      verification_status: "UNVERIFIED",
      provenance_record_id: provenance.id,
      created_by: context.user.id,
    }).select().single();
    if (claimError) phase3DatabaseError(claimError, "CLAIM_CREATE_FAILED");
    claims.push(claim);
  }
  return { transformation, claims, warnings: loaded.dryRun.warnings, unmappedFields: loaded.dryRun.unmappedFields };
}

export async function createManualClaim(admin: AdminClient, context: VerifiedV2PolicyContext, input: Record<string, unknown>) {
  assertVerifiedPolicyContext(context);
  const { evidence_references, raw_value_reference, ...claimInput } = input;
  const { data: provenance, error: provenanceError } = await admin.from("provenance_record").insert({
    tenant_id: context.tenantId,
    subject_type: claimInput.subject_type,
    subject_id: claimInput.subject_id,
    field_definition_id: claimInput.field_definition_id,
    raw_value_reference: raw_value_reference ?? claimInput.value_json ?? null,
    normalized_value_reference: claimInput.value_json ?? null,
    entered_by: context.user.id,
    verification_status: "UNVERIFIED",
    verification_method: "MANUAL_ENTRY",
    evidence_references: evidence_references || [],
  }).select().single();
  if (provenanceError) phase3DatabaseError(provenanceError, "PROVENANCE_CREATE_FAILED");
  const { data, error } = await admin.from("canonical_claim").insert({
    ...claimInput,
    tenant_id: context.tenantId,
    verification_status: "UNVERIFIED",
    provenance_record_id: provenance.id,
    created_by: context.user.id,
  }).select().single();
  if (error) phase3DatabaseError(error, "CLAIM_CREATE_FAILED");
  return data;
}

async function loadHierarchy(admin: AdminClient, context: VerifiedV2PolicyContext, subjectType: SubjectLevel, subjectId: string): Promise<ProductHierarchy> {
  const tableByType = { FAMILY: "product_family", MODEL: "product_model", SKU: "sku", BATCH: "product_batch", ITEM: "product_item" } as const;
  const { data: subject, error } = await admin.from(tableByType[subjectType]).select("*")
    .eq("tenant_id", context.tenantId).eq("id", subjectId).maybeSingle();
  if (error) phase3DatabaseError(error, "PRODUCT_HIERARCHY_FAILED");
  if (!subject) throw new ApiError(404, "PRODUCT_MODEL_NOT_FOUND", "The requested Product subject was not found.");
  if (subjectType === "FAMILY") return { FAMILY: subject.id, MODEL: "" };
  const modelId = subjectType === "MODEL" ? subject.id : subject.model_id;
  const { data: model, error: modelError } = await admin.from("product_model").select("id,family_id")
    .eq("tenant_id", context.tenantId).eq("id", modelId).single();
  if (modelError) phase3DatabaseError(modelError, "PRODUCT_HIERARCHY_FAILED");
  return {
    FAMILY: model.family_id || null,
    MODEL: model.id,
    SKU: subjectType === "SKU" ? subject.id : subject.sku_id || null,
    BATCH: subjectType === "BATCH" ? subject.id : subject.batch_id || null,
    ITEM: subjectType === "ITEM" ? subject.id : null,
  };
}

export async function resolveCandidate(admin: AdminClient, context: VerifiedV2PolicyContext, input: {
  subjectType: SubjectLevel;
  subjectId: string;
  schemaVersionId: string;
}) {
  assertVerifiedPolicyContext(context);
  const hierarchy = await loadHierarchy(admin, context, input.subjectType, input.subjectId);
  const subjectIds = Object.values(hierarchy).filter(Boolean) as string[];
  const [{ data: fieldRows, error: fieldError }, { data: claimRows, error: claimError }] = await Promise.all([
    admin.from("field_definition").select("*").eq("schema_version_id", input.schemaVersionId),
    admin.from("canonical_claim").select("*,provenance_record(evidence_references,mapping_version_id)")
      .eq("tenant_id", context.tenantId).eq("schema_version_id", input.schemaVersionId).in("subject_id", subjectIds),
  ]);
  if (fieldError || claimError) phase3DatabaseError(fieldError || claimError, "RESOLUTION_LOAD_FAILED");
  const visibleFields = (fieldRows || []).filter((field: any) => context.actorType === "TENANT" || field.access_level_code !== "INTERNAL");
  const fields: ResolutionField[] = visibleFields.map((field: any) => ({
    id: field.id,
    fieldCode: field.field_code,
    subjectLevels: field.semantic_name
      ? field.subject_levels
      : [field.data_granularity === "BATCH" ? "BATCH" : field.data_granularity === "ITEM" ? "ITEM" : "MODEL"],
    required: String(field.requirement_status).includes("MANDATORY"),
    canonicalUnit: field.unit_code,
    resolutionPolicy: field.resolution_policy,
  }));
  const claims: ResolutionClaim[] = (claimRows || []).map((claim: any) => {
    const provenance = Array.isArray(claim.provenance_record) ? claim.provenance_record[0] : claim.provenance_record;
    return {
      id: claim.id,
      subjectType: claim.subject_type,
      subjectId: claim.subject_id,
      fieldDefinitionId: claim.field_definition_id,
      schemaVersionId: claim.schema_version_id,
      resolutionState: claim.resolution_state,
      value: claim.value_json,
      canonicalUnit: claim.canonical_unit,
      provenanceId: claim.provenance_record_id,
      verificationStatus: claim.verification_status,
      effectiveFrom: claim.effective_from,
      effectiveTo: claim.effective_to,
      supersedesClaimId: claim.supersedes_claim_id,
      applicabilityReason: claim.applicability_reason,
      evidence: provenance?.evidence_references || [],
    };
  });
  const mappingVersionIds = (claimRows || []).flatMap((claim: any) => {
    const provenance = Array.isArray(claim.provenance_record) ? claim.provenance_record[0] : claim.provenance_record;
    return provenance?.mapping_version_id ? [provenance.mapping_version_id] : [];
  });
  return buildResolvedCandidate({
    tenantId: context.tenantId,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    schemaVersionId: input.schemaVersionId,
    hierarchy,
    fields,
    claims,
    mappingVersionIds,
    algorithmVersion: "phase3-resolution-v1",
  });
}

export function contentHash(value: unknown) {
  return canonicalHash(value).hash;
}
