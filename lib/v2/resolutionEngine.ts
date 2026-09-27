import { canonicalHash } from "../server/dppCanonicalization.ts";

export type SubjectLevel = "FAMILY" | "MODEL" | "SKU" | "BATCH" | "ITEM";
export type ResolutionState = "INHERIT" | "OVERRIDE" | "CLEAR" | "NOT_APPLICABLE" | "UNKNOWN";
export type ResolutionPolicy = "MODEL_ONLY" | "SKU_PREFERRED" | "BATCH_PREFERRED" | "ITEM_PREFERRED" | "MOST_SPECIFIC" | "NO_AMBIGUITY_ALLOWED";

export type ResolutionField = {
  id: string;
  fieldCode: string;
  subjectLevels: SubjectLevel[];
  required: boolean;
  canonicalUnit?: string | null;
  resolutionPolicy: ResolutionPolicy;
};

export type ResolutionClaim = {
  id: string;
  subjectType: SubjectLevel;
  subjectId: string;
  fieldDefinitionId: string;
  schemaVersionId: string;
  resolutionState: ResolutionState;
  value: unknown;
  canonicalUnit?: string | null;
  provenanceId?: string | null;
  verificationStatus: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  supersedesClaimId?: string | null;
  applicabilityReason?: string | null;
  evidence?: unknown[];
};

export type ProductHierarchy = {
  FAMILY?: string | null;
  MODEL: string;
  SKU?: string | null;
  BATCH?: string | null;
  ITEM?: string | null;
};

function equalValue(left: unknown, right: unknown) {
  return canonicalHash(left).hash === canonicalHash(right).hash;
}

function currentClaims(claims: ResolutionClaim[], generatedAt: string) {
  const superseded = new Set(claims.map((claim) => claim.supersedesClaimId).filter(Boolean));
  const at = Date.parse(generatedAt);
  return claims.filter((claim) =>
    !superseded.has(claim.id)
    && Date.parse(claim.effectiveFrom) <= at
    && (!claim.effectiveTo || Date.parse(claim.effectiveTo) > at));
}

function newest(claims: ResolutionClaim[]) {
  return [...claims].sort((a, b) => Date.parse(b.effectiveFrom) - Date.parse(a.effectiveFrom))[0];
}

function outputFor(field: ResolutionField, claim: ResolutionClaim, warnings: unknown[] = []) {
  return {
    fieldCode: field.fieldCode,
    value: claim.value,
    unit: claim.canonicalUnit || field.canonicalUnit || null,
    resolutionState: claim.resolutionState,
    originLevel: claim.subjectType,
    originSubjectId: claim.subjectId,
    schemaVersionId: claim.schemaVersionId,
    claimId: claim.id,
    provenanceId: claim.provenanceId || null,
    verificationStatus: claim.verificationStatus,
    effectiveFrom: claim.effectiveFrom,
    effectiveTo: claim.effectiveTo || null,
    evidence: claim.evidence || [],
    warnings,
  };
}

export function resolveField(options: {
  field: ResolutionField;
  hierarchy: ProductHierarchy;
  claims: ResolutionClaim[];
  generatedAt: string;
}) {
  const { field, hierarchy, generatedAt } = options;
  const claims = currentClaims(options.claims, generatedAt).filter((claim) =>
    claim.fieldDefinitionId === field.id
    && field.subjectLevels.includes(claim.subjectType)
    && hierarchy[claim.subjectType] === claim.subjectId);
  const atLevel = (level: SubjectLevel) => newest(claims.filter((claim) => claim.subjectType === level));
  const item = atLevel("ITEM");
  if (item && item.resolutionState !== "INHERIT") return { resolved: outputFor(field, item), conflict: null };

  const sku = atLevel("SKU");
  const batch = atLevel("BATCH");
  if (sku && batch && sku.resolutionState !== "INHERIT" && batch.resolutionState !== "INHERIT") {
    if (sku.resolutionState === "OVERRIDE" && batch.resolutionState === "OVERRIDE" && equalValue(sku.value, batch.value)) {
      return { resolved: outputFor(field, batch, [{ code: "EQUIVALENT_SKU_BATCH_VALUES" }]), conflict: null };
    }
    if (field.resolutionPolicy === "SKU_PREFERRED") {
      return { resolved: outputFor(field, sku, [{ code: "SKU_BATCH_CONFLICT_RESOLVED", policy: field.resolutionPolicy, ignoredClaimId: batch.id }]), conflict: null };
    }
    if (field.resolutionPolicy === "BATCH_PREFERRED") {
      return { resolved: outputFor(field, batch, [{ code: "SKU_BATCH_CONFLICT_RESOLVED", policy: field.resolutionPolicy, ignoredClaimId: sku.id }]), conflict: null };
    }
    return { resolved: null, conflict: { code: "RESOLUTION_CONFLICT", fieldCode: field.fieldCode, claimIds: [sku.id, batch.id] } };
  }
  const skuBranch = sku && sku.resolutionState !== "INHERIT" ? sku : null;
  const batchBranch = batch && batch.resolutionState !== "INHERIT" ? batch : null;
  const branch = skuBranch || batchBranch;
  if (branch) return { resolved: outputFor(field, branch), conflict: null };
  const model = atLevel("MODEL");
  if (model && model.resolutionState !== "INHERIT") return { resolved: outputFor(field, model), conflict: null };
  const family = atLevel("FAMILY");
  if (family && family.resolutionState !== "INHERIT") return { resolved: outputFor(field, family), conflict: null };
  return { resolved: null, conflict: null };
}

export function buildResolvedCandidate(options: {
  tenantId: string;
  subjectType: SubjectLevel;
  subjectId: string;
  schemaVersionId: string;
  hierarchy: ProductHierarchy;
  fields: ResolutionField[];
  claims: ResolutionClaim[];
  mappingVersionIds?: string[];
  algorithmVersion?: string;
  generatedAt?: string;
}) {
  const generatedAt = options.generatedAt || new Date().toISOString();
  const resolvedFields: unknown[] = [];
  const issues: Array<Record<string, unknown>> = [];
  for (const field of options.fields) {
    const result = resolveField({ field, hierarchy: options.hierarchy, claims: options.claims, generatedAt });
    if (result.conflict) issues.push({ ...result.conflict, severity: "BLOCKING" });
    if (result.resolved) {
      resolvedFields.push(result.resolved);
      if (field.required && ["UNKNOWN", "CLEAR"].includes(result.resolved.resolutionState)) {
        issues.push({ code: "REQUIRED_VALUE_UNKNOWN", fieldCode: field.fieldCode, severity: "BLOCKING" });
      }
    } else if (!result.conflict && field.required) {
      issues.push({ code: "REQUIRED_VALUE_UNKNOWN", fieldCode: field.fieldCode, severity: "BLOCKING" });
    }
  }
  const total = options.fields.length;
  const resolvedCount = resolvedFields.length;
  const provenanceCount = resolvedFields.filter((field: any) => field.provenanceId).length;
  const verifiedCount = resolvedFields.filter((field: any) => !["UNVERIFIED", "REJECTED"].includes(field.verificationStatus)).length;
  const payload = {
    tenantId: options.tenantId,
    subjectType: options.subjectType,
    subjectId: options.subjectId,
    schemaVersionId: options.schemaVersionId,
    resolvedFields,
    validationSummary: {
      status: issues.some((issue) => issue.severity === "BLOCKING") ? "BLOCKING" : "PASS",
      issues,
    },
    dataQualitySummary: {
      completeness: { count: resolvedCount, total, percentage: total ? Math.round(resolvedCount / total * 10000) / 100 : 100 },
      provenanceCoverage: { count: provenanceCount, total: resolvedCount, percentage: resolvedCount ? Math.round(provenanceCount / resolvedCount * 10000) / 100 : 100 },
      verificationCoverage: { count: verifiedCount, total: resolvedCount, percentage: resolvedCount ? Math.round(verifiedCount / resolvedCount * 10000) / 100 : 100 },
      mappingErrors: issues.filter((issue) => String(issue.code).startsWith("MAPPING_")),
      resolutionConflicts: issues.filter((issue) => issue.code === "RESOLUTION_CONFLICT"),
      blockingIssues: issues.filter((issue) => issue.severity === "BLOCKING").length,
    },
    sourceSummary: {
      claimCount: options.claims.length,
      mappingVersionIds: Array.from(new Set(options.mappingVersionIds || [])).sort(),
    },
    resolutionAlgorithmVersion: options.algorithmVersion || "phase3-resolution-v1",
    generatedAt,
  };
  const stableInput = { ...payload, generatedAt: undefined };
  return { ...payload, candidateHash: canonicalHash(stableInput).hash, artifactType: "RESOLVED_PRODUCT_CANDIDATE" as const };
}
