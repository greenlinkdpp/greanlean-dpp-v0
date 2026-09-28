import { canonicalHash } from "../dppCanonicalization";
import { ApiError } from "../apiRoute";
import { provenanceSourceStatement, type ImmutableDppPayload, type PublishedField } from "../../v2/audienceProjection";
import { MAX_RESOLVER_REDIRECT_DEPTH, normalizeResolverHost, normalizeResolverPath } from "../../v2/resolver";
import { resolveCandidate } from "./phase3Repository";
import { assertVerifiedPolicyContext, type VerifiedV2PolicyContext } from "./security";
import type { SubjectLevel } from "../../v2/resolutionEngine";

type AdminClient = any;

function phase4DatabaseError(error: any, fallback: string): never {
  const message = String(error?.message || "");
  const known = [
    "PASSPORT_NOT_FOUND", "PASSPORT_PROFILE_CONFLICT", "CANDIDATE_HASH_MISMATCH",
    "VALIDATION_BLOCKING", "REVIEW_NOT_FOUND", "REVIEW_STATE_INVALID",
    "REVIEW_APPROVAL_STALE", "PUBLICATION_NOT_APPROVED", "PUBLICATION_CONFLICT",
    "VERSION_IMMUTABLE", "CURRENT_POINTER_INVALID", "RESOLVER_NOT_FOUND",
    "RESOLVER_AMBIGUOUS", "RESOLVER_MAPPING_EXPIRED", "RESOLVER_ALIAS_CYCLE",
    "RESOLVER_OPEN_REDIRECT", "RESOLVER_PATH_REASSIGNMENT", "WITHDRAWN_PASSPORT",
    "TENANT_RELATIONSHIP_MISMATCH",
  ];
  const code = known.find((candidate) => message.includes(candidate));
  if (code) throw new ApiError(409, code, "The requested Phase 4 operation violates a protected contract.");
  if (error?.code === "23505") throw new ApiError(409, "PUBLICATION_CONFLICT", "The requested Phase 4 resource conflicts with an existing resource.");
  if (error?.code === "23503") throw new ApiError(409, "TENANT_RELATIONSHIP_MISMATCH", "A referenced resource is outside the permitted Tenant relationship.");
  throw new ApiError(500, fallback, "The Phase 4 data operation could not be completed.", { database_code: error?.code || null });
}

async function audit(admin: AdminClient, context: VerifiedV2PolicyContext, eventType: string, values: Record<string, unknown>) {
  const { error } = await admin.from("dpp_publication_audit").insert({
    tenant_id: context.tenantId,
    event_type: eventType,
    actor_user_id: context.user.id,
    correlation_id: context.correlationId,
    ...values,
  });
  if (error) phase4DatabaseError(error, "DPP_AUDIT_FAILED");
}

export async function listPassports(admin: AdminClient, context: VerifiedV2PolicyContext) {
  assertVerifiedPolicyContext(context);
  const { data, error } = await admin.from("dpp_passport").select("*").eq("tenant_id", context.tenantId).order("created_at");
  if (error) phase4DatabaseError(error, "PASSPORT_LIST_FAILED");
  return data || [];
}

export async function getPassport(admin: AdminClient, context: VerifiedV2PolicyContext, id: string) {
  assertVerifiedPolicyContext(context);
  const { data, error } = await admin.from("dpp_passport").select("*").eq("tenant_id", context.tenantId).eq("id", id).maybeSingle();
  if (error) phase4DatabaseError(error, "PASSPORT_LOAD_FAILED");
  if (!data) throw new ApiError(404, "PASSPORT_NOT_FOUND", "The requested Passport was not found.");
  return data;
}

export async function createPassport(admin: AdminClient, context: VerifiedV2PolicyContext, input: Record<string, unknown>) {
  assertVerifiedPolicyContext(context);
  const passportIdentifier = String(input.passport_identifier || "").trim();
  if (!passportIdentifier) throw new ApiError(400, "INVALID_IDENTIFIER", "A Passport identifier is required.");
  const { data, error } = await admin.from("dpp_passport").insert({
    tenant_id: context.tenantId,
    subject_type: String(input.subject_type || "").toUpperCase(),
    subject_id: input.subject_id,
    passport_profile_code: String(input.passport_profile_code || "PRIMARY").toUpperCase(),
    passport_identifier: passportIdentifier,
    schema_definition_id: input.schema_definition_id,
    publication_source: input.publication_source === "V1" ? "V1" : "V2",
    created_by: context.user.id,
  }).select().single();
  if (error) phase4DatabaseError(error, "PASSPORT_CREATE_FAILED");
  const { error: identifierError } = await admin.from("product_subject_identifier").insert({
    tenant_id: context.tenantId,
    subject_type: "PASSPORT",
    subject_id: data.id,
    identifier_type: "DPP_ID",
    value: passportIdentifier,
    normalized_value: passportIdentifier,
    issuer: String(input.issuer || "GreanLean"),
    scheme: String(input.scheme || "GREANLEAN_DPP_ID"),
    is_primary: true,
    created_by: context.user.id,
  });
  if (identifierError) {
    await admin.from("dpp_passport").delete().eq("id", data.id);
    phase4DatabaseError(identifierError, "PASSPORT_IDENTIFIER_CREATE_FAILED");
  }
  await audit(admin, context, "passport.create", { passport_id: data.id });
  return data;
}

export async function updatePassport(admin: AdminClient, context: VerifiedV2PolicyContext, id: string, input: Record<string, unknown>) {
  assertVerifiedPolicyContext(context);
  const { data, error } = await admin.from("dpp_passport").update(input)
    .eq("tenant_id", context.tenantId).eq("id", id).select().maybeSingle();
  if (error) phase4DatabaseError(error, "PASSPORT_UPDATE_FAILED");
  if (!data) throw new ApiError(404, "PASSPORT_NOT_FOUND", "The requested Passport was not found.");
  await audit(admin, context, "passport.update", { passport_id: id, metadata: { fields: Object.keys(input).sort() } });
  return data;
}

async function enrichCandidate(admin: AdminClient, candidate: any): Promise<any> {
  const ids = candidate.resolvedFields.map((field: any) => field.fieldCode);
  const { data, error } = await admin.from("field_definition")
    .select("field_code,access_level_code,semantic_uri,vocabulary_reference")
    .eq("schema_version_id", candidate.schemaVersionId).in("field_code", ids.length ? ids : ["__none__"]);
  if (error) phase4DatabaseError(error, "CANDIDATE_METADATA_FAILED");
  const metadata = new Map((data || []).map((field: any) => [field.field_code, field]));
  return {
    ...candidate,
    resolvedFields: candidate.resolvedFields.map((field: any) => {
      const definition: any = metadata.get(field.fieldCode) || {};
      return {
        ...field,
        accessLevel: definition.access_level_code || "INTERNAL",
        semanticUri: definition.semantic_uri || null,
        vocabularyReference: definition.vocabulary_reference || null,
      };
    }),
  };
}

export async function submitReview(admin: AdminClient, context: VerifiedV2PolicyContext, input: Record<string, unknown>) {
  assertVerifiedPolicyContext(context);
  const passport = await getPassport(admin, context, String(input.passport_id || ""));
  const schemaVersionId = String(input.schema_version_id || "");
  const { data: schemaVersion, error: schemaError } = await admin.from("schema_version")
    .select("id,schema_definition_id").eq("id", schemaVersionId).maybeSingle();
  if (schemaError) phase4DatabaseError(schemaError, "SCHEMA_VERSION_LOAD_FAILED");
  if (!schemaVersion || schemaVersion.schema_definition_id !== passport.schema_definition_id) {
    throw new ApiError(409, "CANDIDATE_HASH_MISMATCH", "The candidate Schema does not belong to the Passport Schema definition.");
  }
  const candidate = await resolveCandidate(admin, context, {
    subjectType: passport.subject_type as SubjectLevel,
    subjectId: passport.subject_id,
    schemaVersionId,
  });
  if (input.candidate_hash && input.candidate_hash !== candidate.candidateHash) {
    throw new ApiError(409, "CANDIDATE_HASH_MISMATCH", "The supplied candidate hash is not current.");
  }
  if (candidate.validationSummary.status !== "PASS") {
    throw new ApiError(422, "VALIDATION_BLOCKING", "A candidate with blocking validation issues cannot enter review.", candidate.validationSummary);
  }
  const frozenCandidate = await enrichCandidate(admin, candidate);
  const { data, error } = await admin.from("dpp_review_task").insert({
    tenant_id: context.tenantId,
    passport_id: passport.id,
    subject_type: passport.subject_type,
    subject_id: passport.subject_id,
    candidate_hash: candidate.candidateHash,
    schema_version_id: schemaVersionId,
    candidate_payload: frozenCandidate,
    resolution_algorithm_version: candidate.resolutionAlgorithmVersion,
    validation_summary: candidate.validationSummary,
    generated_at: candidate.generatedAt,
    submitted_by: context.user.id,
    correlation_id: context.correlationId,
  }).select().single();
  if (error) phase4DatabaseError(error, "REVIEW_CREATE_FAILED");
  await audit(admin, context, "review.submit", { passport_id: passport.id, review_task_id: data.id, candidate_hash: candidate.candidateHash, schema_version_id: schemaVersionId });
  return data;
}

export async function listReviews(admin: AdminClient, context: VerifiedV2PolicyContext) {
  assertVerifiedPolicyContext(context);
  const { data, error } = await admin.from("dpp_review_task").select("*").eq("tenant_id", context.tenantId).order("submitted_at", { ascending: false });
  if (error) phase4DatabaseError(error, "REVIEW_LIST_FAILED");
  return data || [];
}

export async function getReview(admin: AdminClient, context: VerifiedV2PolicyContext, id: string) {
  assertVerifiedPolicyContext(context);
  const { data, error } = await admin.from("dpp_review_task").select("*").eq("tenant_id", context.tenantId).eq("id", id).maybeSingle();
  if (error) phase4DatabaseError(error, "REVIEW_LOAD_FAILED");
  if (!data) throw new ApiError(404, "REVIEW_NOT_FOUND", "The requested Review was not found.");
  return data;
}

export async function decideReview(admin: AdminClient, context: VerifiedV2PolicyContext, id: string, action: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED", reason?: string) {
  assertVerifiedPolicyContext(context);
  const review = await getReview(admin, context, id);
  if (review.status !== "IN_REVIEW") throw new ApiError(409, "REVIEW_STATE_INVALID", "The Review is not awaiting a decision.");
  if (review.submitted_by === context.user.id) throw new ApiError(409, "REVIEW_STATE_INVALID", "A submitter cannot decide the same Review.");
  if (action !== "APPROVED" && (!reason || reason.trim().length < 3)) {
    throw new ApiError(400, "REVIEW_STATE_INVALID", "A decision reason is required.");
  }
  const { data, error } = await admin.from("dpp_review_task").update({
    status: action,
    reviewed_by: context.user.id,
    reviewed_at: new Date().toISOString(),
    decision_reason: reason?.trim() || null,
  }).eq("tenant_id", context.tenantId).eq("id", id).eq("status", "IN_REVIEW").select().maybeSingle();
  if (error) phase4DatabaseError(error, "REVIEW_DECISION_FAILED");
  if (!data) throw new ApiError(409, "REVIEW_STATE_INVALID", "The Review state changed before the decision was applied.");
  await audit(admin, context, action === "APPROVED" ? "review.approve" : action === "REJECTED" ? "review.reject" : "review.request_changes", {
    passport_id: review.passport_id, review_task_id: id, candidate_hash: review.candidate_hash,
  });
  return data;
}

function publicationPayload(passport: any, review: any, publishedAt: string): Omit<ImmutableDppPayload, "payloadHash"> {
  const candidate = review.candidate_payload;
  const fields: PublishedField[] = (candidate.resolvedFields || []).map((field: any) => ({
    fieldCode: field.fieldCode,
    value: field.value,
    unit: field.unit || null,
    accessLevel: field.accessLevel || "INTERNAL",
    semanticUri: field.semanticUri || null,
    vocabularyReference: field.vocabularyReference || null,
    verificationStatus: field.verificationStatus || null,
    provenance: {
      sourceStatement: field.provenanceId ? provenanceSourceStatement(field.verificationStatus) : null,
      publicEvidenceReference: Array.isArray(field.evidence) ? field.evidence.find((item: unknown) => typeof item === "string" && String(item).startsWith("https://")) || null : null,
    },
  }));
  return {
    passportId: passport.id,
    passportIdentifier: passport.passport_identifier,
    versionNumber: 0,
    schemaVersionId: review.schema_version_id,
    candidateHash: review.candidate_hash,
    publishedAt,
    publicationStatus: "PUBLISHED",
    subject: { type: passport.subject_type, id: passport.subject_id },
    fields,
  };
}

export async function publishReview(admin: AdminClient, context: VerifiedV2PolicyContext, input: Record<string, unknown>) {
  assertVerifiedPolicyContext(context);
  const review = await getReview(admin, context, String(input.review_task_id || ""));
  if (!['APPROVED', 'PUBLISHED'].includes(review.status)) throw new ApiError(409, "PUBLICATION_NOT_APPROVED", "The Review is not approved for publication.");
  const passport = await getPassport(admin, context, review.passport_id);
  if (passport.publication_source !== "V2") throw new ApiError(409, "PUBLICATION_CONFLICT", "A V1-primary Passport cannot be published by the V2 workflow.");
  if (review.status === "APPROVED") {
    const current = await resolveCandidate(admin, context, {
      subjectType: passport.subject_type as SubjectLevel,
      subjectId: passport.subject_id,
      schemaVersionId: review.schema_version_id,
    });
    if (current.candidateHash !== review.candidate_hash) {
      throw new ApiError(409, "REVIEW_APPROVAL_STALE", "The approved Candidate is no longer current.");
    }
  }
  const publishedAt = new Date().toISOString();
  const { data: latestVersion, error: latestError } = await admin.from("dpp_version")
    .select("version_number").eq("tenant_id", context.tenantId).eq("passport_id", passport.id)
    .order("version_number", { ascending: false }).limit(1).maybeSingle();
  if (latestError) phase4DatabaseError(latestError, "PUBLICATION_FAILED");
  const basePayload = {
    ...publicationPayload(passport, review, publishedAt),
    versionNumber: Number(latestVersion?.version_number || 0) + 1,
  };
  const canonical = canonicalHash(basePayload);
  const { data, error } = await admin.rpc("v2_publish_approved_review", {
    p_tenant_id: context.tenantId,
    p_review_task_id: review.id,
    p_candidate_hash: review.candidate_hash,
    p_canonical_payload: basePayload,
    p_canonical_payload_text: canonical.payload,
    p_payload_hash: canonical.hash,
    p_actor_user_id: context.user.id,
    p_correlation_id: context.correlationId,
  });
  if (error) phase4DatabaseError(error, "PUBLICATION_FAILED");
  return data;
}

export async function withdrawVersion(admin: AdminClient, context: VerifiedV2PolicyContext, versionId: string, reasonCategory: string) {
  assertVerifiedPolicyContext(context);
  const { data, error } = await admin.rpc("v2_withdraw_current_version", {
    p_tenant_id: context.tenantId,
    p_version_id: versionId,
    p_reason_category: reasonCategory,
    p_actor_user_id: context.user.id,
    p_correlation_id: context.correlationId,
  });
  if (error) phase4DatabaseError(error, "WITHDRAW_FAILED");
  return data;
}

export async function listVersions(admin: AdminClient, context: VerifiedV2PolicyContext, passportId: string) {
  await getPassport(admin, context, passportId);
  const { data, error } = await admin.from("dpp_version").select("id,passport_id,version_number,schema_version_id,candidate_hash,payload_hash,canonicalization_version,content_workflow_state,publication_state,registry_state,published_at,published_by,supersedes_version_id,withdraw_reason_category,withdrawn_at,created_at")
    .eq("tenant_id", context.tenantId).eq("passport_id", passportId).order("version_number", { ascending: false });
  if (error) phase4DatabaseError(error, "VERSION_LIST_FAILED");
  return data || [];
}

export async function getVersion(admin: AdminClient, context: VerifiedV2PolicyContext, passportId: string, versionNumber: number) {
  await getPassport(admin, context, passportId);
  const { data, error } = await admin.from("dpp_version").select("*").eq("tenant_id", context.tenantId)
    .eq("passport_id", passportId).eq("version_number", versionNumber).maybeSingle();
  if (error) phase4DatabaseError(error, "VERSION_LOAD_FAILED");
  if (!data) throw new ApiError(404, "PASSPORT_NOT_FOUND", "The requested Passport version was not found.");
  return data;
}

export async function getIntegrity(admin: AdminClient, context: VerifiedV2PolicyContext, passportId: string) {
  await getPassport(admin, context, passportId);
  const { data, error } = await admin.from("dpp_current_pointer")
    .select("current_version_id,dpp_version!inner(version_number,payload_hash,schema_version_id,published_at,canonical_payload_text)")
    .eq("tenant_id", context.tenantId).eq("passport_id", passportId).maybeSingle();
  if (error) phase4DatabaseError(error, "INTEGRITY_LOAD_FAILED");
  if (!data) return { passportId, currentVersion: null, payloadHash: null, schemaVersion: null, publishedAt: null, integrityStatus: "UNPUBLISHED" };
  const version: any = Array.isArray(data.dpp_version) ? data.dpp_version[0] : data.dpp_version;
  const recomputed = canonicalHash(JSON.parse(version.canonical_payload_text)).hash;
  return {
    passportId,
    currentVersion: version.version_number,
    payloadHash: version.payload_hash,
    schemaVersion: version.schema_version_id,
    publishedAt: version.published_at,
    integrityStatus: recomputed === version.payload_hash ? "VALID" : "INVALID",
  };
}

export async function createResolverMapping(admin: AdminClient, context: VerifiedV2PolicyContext, input: Record<string, unknown>) {
  assertVerifiedPolicyContext(context);
  const host = normalizeResolverHost(String(input.host || ""));
  const path = normalizeResolverPath(String(input.normalized_path || ""));
  const { data, error } = await admin.from("resolver_mapping").insert({
    tenant_id: context.tenantId,
    identifier_id: input.identifier_id || null,
    host,
    normalized_path: path,
    passport_id: input.passport_id || null,
    target_mapping_id: input.target_mapping_id || null,
    mapping_type: input.mapping_type,
    status: input.status || "ACTIVE",
    is_public: input.is_public !== false,
    valid_from: input.valid_from || new Date().toISOString(),
    valid_until: input.valid_until || null,
    redirect_http_status: input.redirect_http_status || 302,
    created_by: context.user.id,
  }).select().single();
  if (error) phase4DatabaseError(error, "RESOLVER_MAPPING_CREATE_FAILED");
  await audit(admin, context, "resolver_mapping.create", { passport_id: data.passport_id, resolver_mapping_id: data.id });
  return data;
}

async function publicMapping(admin: AdminClient, requestHost: string, identifier: string) {
  const startedAt = performance.now();
  const host = normalizeResolverHost(requestHost);
  const hostStartedAt = performance.now();
  const { data: allowed, error: allowlistError } = await admin.from("resolver_host_allowlist").select("host").eq("host", host).eq("status", "ACTIVE").maybeSingle();
  const hostAllowlistMs = performance.now() - hostStartedAt;
  if (allowlistError) phase4DatabaseError(allowlistError, "RESOLVER_LOOKUP_FAILED");
  if (!allowed) throw new ApiError(404, "RESOLVER_NOT_FOUND", "The requested Passport was not found.");
  const decoded = decodeURIComponent(identifier).trim();
  const candidatePaths = Array.from(new Set([
    normalizeResolverPath(`/p/${decoded}`),
    normalizeResolverPath(`/01/${decoded}`),
    normalizeResolverPath(`/${decoded}`),
    normalizeResolverPath(`/api/v2/resolver/${decoded}`),
  ]));
  const pathStartedAt = performance.now();
  const { data: pathRows, error: pathError } = await admin.from("resolver_mapping").select("*")
    .eq("host", host).eq("is_public", true).eq("status", "ACTIVE").in("normalized_path", candidatePaths);
  const pathLookupMs = performance.now() - pathStartedAt;
  if (pathError) phase4DatabaseError(pathError, "RESOLVER_LOOKUP_FAILED");
  const normalized = decoded.toUpperCase();
  const identifierStartedAt = performance.now();
  const { data: identifiers, error: identifierError } = await admin.from("product_subject_identifier")
    .select("id").eq("status", "ACTIVE").in("normalized_value", Array.from(new Set([decoded, normalized])));
  const identifierLookupMs = performance.now() - identifierStartedAt;
  if (identifierError) phase4DatabaseError(identifierError, "RESOLVER_LOOKUP_FAILED");
  let identifierRows: any[] = [];
  const identifierMappingStartedAt = performance.now();
  if (identifiers?.length) {
    const { data, error } = await admin.from("resolver_mapping").select("*")
      .eq("host", host).eq("is_public", true).eq("status", "ACTIVE").in("identifier_id", identifiers.map((row: any) => row.id));
    if (error) phase4DatabaseError(error, "RESOLVER_LOOKUP_FAILED");
    identifierRows = data || [];
  }
  const identifierMappingLookupMs = performance.now() - identifierMappingStartedAt;
  const rows = [...(pathRows || []), ...identifierRows].filter((row, index, all) => all.findIndex((candidate) => candidate.id === row.id) === index);
  if (!rows.length) throw new ApiError(404, "RESOLVER_NOT_FOUND", "The requested Passport was not found.");
  const resolved = [];
  const aliasStartedAt = performance.now();
  for (const start of rows) {
    let row = start;
    const seen = new Set<string>();
    for (let depth = 0; row.target_mapping_id; depth += 1) {
      if (depth >= MAX_RESOLVER_REDIRECT_DEPTH || seen.has(row.id)) throw new ApiError(409, "RESOLVER_ALIAS_CYCLE", "The Resolver alias chain is invalid.");
      seen.add(row.id);
      const { data: next } = await admin.from("resolver_mapping").select("*").eq("id", row.target_mapping_id).eq("tenant_id", row.tenant_id).maybeSingle();
      if (!next || next.status !== "ACTIVE") throw new ApiError(410, "RESOLVER_MAPPING_EXPIRED", "The Resolver mapping is no longer active.");
      row = next;
    }
    if (row.valid_until && Date.parse(row.valid_until) <= Date.now()) throw new ApiError(410, "RESOLVER_MAPPING_EXPIRED", "The Resolver mapping has expired.");
    resolved.push(row);
  }
  const aliasTraversalMs = performance.now() - aliasStartedAt;
  const passportIds = Array.from(new Set(resolved.map((row) => row.passport_id).filter(Boolean)));
  if (passportIds.length !== 1) throw new ApiError(409, "RESOLVER_AMBIGUOUS", "The identifier cannot be resolved unambiguously.");
  return {
    mapping: rows[0],
    passportId: passportIds[0],
    timings: {
      hostAllowlistMs,
      pathLookupMs,
      identifierLookupMs,
      identifierMappingLookupMs,
      aliasTraversalMs,
      mappingTotalMs: performance.now() - startedAt,
    },
  };
}

export async function resolvePublicPassport(admin: AdminClient, requestHost: string, identifier: string) {
  const startedAt = performance.now();
  const host = normalizeResolverHost(requestHost);
  const decoded = decodeURIComponent(identifier).trim();
  const candidatePaths = Array.from(new Set([
    normalizeResolverPath(`/p/${decoded}`),
    normalizeResolverPath(`/01/${decoded}`),
    normalizeResolverPath(`/${decoded}`),
    normalizeResolverPath(`/api/v2/resolver/${decoded}`),
  ]));
  const databaseStartedAt = performance.now();
  const { data, error } = await admin.rpc("v2_phase6c_resolve_public_passport", {
    p_host: host,
    p_identifier: decoded,
    p_candidate_paths: candidatePaths,
  });
  const databaseTotalMs = performance.now() - databaseStartedAt;
  if (error) phase4DatabaseError(error, "RESOLVER_LOOKUP_FAILED");
  if (!data?.mapping || !data?.passport || !data?.version) {
    throw new ApiError(404, "RESOLVER_NOT_FOUND", "The requested Passport was not found.");
  }
  const timings = {
    hostAllowlistMs: 0,
    pathLookupMs: 0,
    identifierLookupMs: 0,
    identifierMappingLookupMs: 0,
    aliasTraversalMs: 0,
    mappingTotalMs: databaseTotalMs,
    passportLookupMs: 0,
    pointerLookupMs: 0,
    databaseTotalMs,
    databaseQueryCount: 1,
    duplicateQueryCount: 0,
    resolveTotalMs: performance.now() - startedAt,
  };
  if (data.kind === "WITHDRAWN") {
    const withdrawn = data.version;
    return {
      kind: "WITHDRAWN" as const,
      mapping: data.mapping,
      timings,
      tombstone: {
        passportIdentifier: data.passport.passport_identifier,
        status: "WITHDRAWN",
        effectiveDate: withdrawn.withdrawn_at,
        reasonCategory: withdrawn.withdraw_reason_category,
        version: withdrawn.version_number,
        payloadHash: withdrawn.payload_hash,
        schemaVersion: withdrawn.schema_version_id,
        publishedAt: withdrawn.published_at,
      },
    };
  }
  const passport = data.passport;
  const version = data.version;
  if (!version || version.publication_state !== "PUBLISHED") throw new ApiError(409, "CURRENT_POINTER_INVALID", "The current Passport pointer is invalid.");
  const payload: ImmutableDppPayload = {
    ...version.canonical_payload,
    versionNumber: version.version_number,
    payloadHash: version.payload_hash,
    publishedAt: version.published_at,
    publicationStatus: version.publication_state,
  };
  return {
    kind: "PUBLISHED" as const,
    mapping: data.mapping,
    passport,
    version,
    payload,
    timings,
  };
}
