import { randomUUID } from "node:crypto";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  compareLegacyAndCanonicalPublicDpp,
} from "../dpp/publicationComparison";
import {
  loadLegacyPublicDppData,
} from "../dpp/publicDppRepository";
import {
  batteryPublicationReadinessChecks,
  evidenceExpiryReadinessCheck,
  sectorTemplateReadinessChecks,
  type PublicationValidationCheck,
  type SectorTemplateReadiness,
} from "../dpp/publicationReadiness";
import {
  buildDppPublicationCandidate,
  finalizeDppPublicationCandidate,
  projectionContainsRestrictedFields,
  projectionForAudience,
} from "./dppPublicationCandidate";
import { ApiError } from "./apiRoute";
import { loadBatteryWorkspace } from "./batteryRepository";

type AdminClient = SupabaseClient<any, "public", any>;
type AuthClient = SupabaseClient<any, "public", any>;

function databaseError(
  operation: string,
  error: { message?: string; code?: string } | null,
) {
  if (!error) return;
  throw new ApiError(
    500,
    "DPP_PUBLICATION_DATABASE_ERROR",
    `The publication ${operation} could not be completed.`,
  );
}

type PublicationSubject = {
  batteryItemId?: string | null;
  changeReason?: string | null;
};

function validationResults(
  candidate: Awaited<ReturnType<typeof buildDppPublicationCandidate>>,
  comparison: ReturnType<typeof compareLegacyAndCanonicalPublicDpp> | null,
  readinessChecks: PublicationValidationCheck[],
) {
  const publicProjection = projectionForAudience(candidate, "PUBLIC");
  const identity = publicProjection.modules.identity.fields;
  const value = (code: string) => identity.find((field) => field.code === code)?.value;
  const checks = [
    {
      ruleCode: "PUBLICATION_DPP_ID_REQUIRED",
      severity: "BLOCKER",
      moduleCode: "identity",
      fieldCode: "identity.dpp_id",
      passed: Boolean(value("identity.dpp_id")),
      messageZh: "DPP ID 已填写。",
      messageEn: "The DPP identifier is present.",
    },
    {
      ruleCode: "PUBLICATION_PRODUCT_NAME_REQUIRED",
      severity: "BLOCKER",
      moduleCode: "identity",
      fieldCode: "identity.product_name",
      passed: Boolean(value("identity.product_name")),
      messageZh: "产品名称已填写。",
      messageEn: "The product name is present.",
    },
    {
      ruleCode: "PUBLICATION_PROFILE_REQUIRED",
      severity: "BLOCKER",
      moduleCode: "sector",
      fieldCode: "classification.profileKey",
      passed: Boolean(candidate.snapshot.classification.profileKey),
      messageZh: "行业字段模板已绑定。",
      messageEn: "A sector profile is assigned.",
    },
    {
      ruleCode: "PUBLICATION_PUBLIC_PROJECTION_ISOLATED",
      severity: "BLOCKER",
      moduleCode: null,
      fieldCode: null,
      passed: !projectionContainsRestrictedFields(publicProjection, "PUBLIC"),
      messageZh: "公众投影未包含受限字段。",
      messageEn: "The public projection contains no restricted fields.",
    },
    {
      ruleCode: "PUBLICATION_LEGACY_IDENTITY_MATCH",
      severity: "BLOCKER",
      moduleCode: "identity",
      fieldCode: null,
      passed: comparison?.passed !== false,
      messageZh: "规范发布与旧页面的核心身份字段一致。",
      messageEn: "Canonical and legacy identity facts match.",
    },
    {
      ruleCode: "PUBLICATION_BILINGUAL_COVERAGE",
      severity: "WARNING",
      moduleCode: "identity",
      fieldCode: null,
      passed: candidate.snapshot.publication.languageCoverage.includes("zh")
        && candidate.snapshot.publication.languageCoverage.includes("en"),
      messageZh: "产品身份具备中英文内容。",
      messageEn: "Product identity has Chinese and English coverage.",
    },
  ];
  return [...checks.map((check) => ({
    ...check,
    details: check.ruleCode === "PUBLICATION_LEGACY_IDENTITY_MATCH"
      ? { differences: comparison?.differences || [] }
      : {},
  })), ...readinessChecks];
}

function hasSectorValue(row: {
  field_value?: unknown;
  field_value_json?: unknown;
}) {
  if (typeof row.field_value === "string" && row.field_value.trim()) return true;
  if (row.field_value_json === null || row.field_value_json === undefined) return false;
  if (typeof row.field_value_json === "string") return Boolean(row.field_value_json.trim());
  if (Array.isArray(row.field_value_json)) return row.field_value_json.length > 0;
  if (typeof row.field_value_json === "object") {
    return Object.keys(row.field_value_json as Record<string, unknown>).length > 0;
  }
  return true;
}

async function sectorTemplateReadiness(
  admin: AdminClient,
  productId: string,
  profileKey: string,
): Promise<SectorTemplateReadiness | null> {
  if (!profileKey) return null;
  const [templateResult, valueResult] = await Promise.all([
    admin
      .from("dpp_field_templates")
      .select("field_key,required,evidence_required")
      .eq("profile_key", profileKey),
    admin
      .from("product_sector_field_values")
      .select("field_key,field_value,field_value_json,evidence_status")
      .eq("product_id", productId)
      .eq("profile_key", profileKey),
  ]);
  databaseError("sector template read", templateResult.error);
  databaseError("sector field value read", valueResult.error);

  const valueByCode = new Map(
    (valueResult.data || []).map((row) => [String(row.field_key), row]),
  );
  const requiredTemplates = (templateResult.data || [])
    .filter((row) => Boolean(row.required));
  const evidenceTemplates = requiredTemplates
    .filter((row) => Boolean(row.evidence_required));
  const missingRequired = requiredTemplates
    .filter((row) => !hasSectorValue(valueByCode.get(String(row.field_key)) || {}))
    .map((row) => String(row.field_key));
  const missingEvidence = evidenceTemplates
    .filter((row) => {
      const value = valueByCode.get(String(row.field_key));
      return !value || !["declared", "verified"].includes(
        String(value.evidence_status || "").toLowerCase(),
      );
    })
    .map((row) => String(row.field_key));

  return {
    required: {
      complete: requiredTemplates.length - missingRequired.length,
      total: requiredTemplates.length,
      missingFieldCodes: missingRequired,
    },
    evidence: {
      complete: evidenceTemplates.length - missingEvidence.length,
      total: evidenceTemplates.length,
      missingFieldCodes: missingEvidence,
    },
  };
}

async function publicationReadinessChecks(
  admin: AdminClient,
  productId: string,
  candidate: Awaited<ReturnType<typeof buildDppPublicationCandidate>>,
) {
  const { sectorCode, profileKey } = candidate.snapshot.classification;
  const expiryCheck = evidenceExpiryReadinessCheck(candidate.snapshot.modules.evidence.records);
  if (sectorCode === "battery") {
    const workspace = await loadBatteryWorkspace(admin, productId);
    return [...batteryPublicationReadinessChecks({
      sectorCode,
      profilePresent: Boolean(workspace.profile),
      applicability: workspace.classification.applicability,
      readiness: workspace.readiness,
    }), expiryCheck];
  }
  const readiness = await sectorTemplateReadiness(admin, productId, profileKey);
  return [...sectorTemplateReadinessChecks(sectorCode, readiness), expiryCheck];
}

async function currentPublication(admin: AdminClient, productId: string, subject: PublicationSubject = {}) {
  const pointerQuery = subject.batteryItemId
    ? admin.from("dpp_item_publication_pointer").select("publication_id,updated_at").eq("battery_item_id", subject.batteryItemId)
    : admin.from("dpp_product_publication_pointer").select("publication_id,updated_at").eq("product_id", productId);
  const { data: pointer, error: pointerError } = await pointerQuery.maybeSingle();
  databaseError("pointer read", pointerError);
  if (!pointer?.publication_id) return null;
  const { data, error } = await admin
    .from("dpp_publication")
    .select("id,version_number,status,snapshot_hash,published_at,supersedes_id")
    .eq("id", pointer.publication_id)
    .maybeSingle();
  databaseError("current version read", error);
  return data;
}

async function latestReview(admin: AdminClient, productId: string, subject: PublicationSubject = {}) {
  let query = admin
    .from("dpp_publication_review")
    .select(`
      id,
      product_id,
      base_publication_id,
      schema_version,
      profile_key,
      profile_version,
      candidate_hash,
      source_fingerprint,
      status,
      latest_validation_run_id,
      submitted_at,
      reviewed_at,
      decision_reason,
      published_publication_id
    `)
    .eq("product_id", productId)
    .order("submitted_at", { ascending: false });
  query = subject.batteryItemId
    ? query.eq("battery_item_id", subject.batteryItemId)
    : query.is("battery_item_id", null);
  const { data, error } = await query
    .limit(1)
    .maybeSingle();
  databaseError("review read", error);
  return data;
}

async function openReview(admin: AdminClient, productId: string, subject: PublicationSubject = {}) {
  let query = admin
    .from("dpp_publication_review")
    .select(`
      id,
      product_id,
      base_publication_id,
      candidate_hash,
      source_fingerprint,
      status,
      submitted_at
    `)
    .eq("product_id", productId)
    .in("status", ["IN_REVIEW", "APPROVED"]);
  query = subject.batteryItemId
    ? query.eq("battery_item_id", subject.batteryItemId)
    : query.is("battery_item_id", null);
  const { data, error } = await query
    .maybeSingle();
  databaseError("open review read", error);
  return data;
}

function reviewResponse(review: NonNullable<Awaited<ReturnType<typeof openReview>>>) {
  return {
    reviewId: review.id,
    productId: review.product_id,
    basePublicationId: review.base_publication_id,
    candidateHash: review.candidate_hash,
    status: review.status,
    submittedAt: review.submitted_at,
  };
}

async function latestValidation(
  admin: AdminClient,
  review: Awaited<ReturnType<typeof latestReview>>,
) {
  if (!review?.latest_validation_run_id) return null;
  const [runResult, resultResult] = await Promise.all([
    admin
      .from("dpp_publication_validation_run")
      .select(`
        id,
        status,
        rule_set_version,
        passed_count,
        failed_count,
        blocker_count,
        warning_count,
        executed_at
      `)
      .eq("id", review.latest_validation_run_id)
      .maybeSingle(),
    admin
      .from("dpp_publication_validation_result")
      .select(`
        rule_code,
        severity,
        module_code,
        field_code,
        message_zh,
        message_en,
        details
      `)
      .eq("validation_run_id", review.latest_validation_run_id)
      .eq("passed", false)
      .order("severity")
      .order("created_at"),
  ]);
  databaseError("validation run read", runResult.error);
  databaseError("validation result read", resultResult.error);
  if (!runResult.data) return null;
  return {
    ...runResult.data,
    failedResults: resultResult.data || [],
  };
}

export async function publicationWorkspace(
  admin: AdminClient,
  productId: string,
  subject: PublicationSubject = {},
) {
  const [candidate, current, review] = await Promise.all([
    buildDppPublicationCandidate(admin, productId, subject),
    currentPublication(admin, productId, subject),
    latestReview(admin, productId, subject),
  ]);
  const legacy = await loadLegacyPublicDppData(
    admin,
    candidate.snapshot.publication.dppId,
    true,
  );
  const comparison = legacy && !subject.batteryItemId
    ? compareLegacyAndCanonicalPublicDpp(
      legacy,
      projectionForAudience(candidate, "PUBLIC"),
    )
    : null;
  const validation = await latestValidation(admin, review);
  return {
    productId,
    batteryItemId: subject.batteryItemId || null,
    dppId: candidate.snapshot.publication.dppId,
    sourceFingerprint: candidate.sourceFingerprint,
    snapshotHash: candidate.snapshotHash,
    audienceManifest: candidate.snapshot.audienceManifest,
    comparison,
    currentPublication: current,
    latestReview: review,
    latestValidation: validation,
  };
}

export async function submitPublicationReview(
  admin: AdminClient,
  productId: string,
  user: User,
  subject: PublicationSubject = {},
) {
  const candidate = await buildDppPublicationCandidate(admin, productId, subject);
  const legacy = await loadLegacyPublicDppData(
    admin,
    candidate.snapshot.publication.dppId,
    true,
  );
  const comparison = legacy && !subject.batteryItemId
    ? compareLegacyAndCanonicalPublicDpp(
      legacy,
      projectionForAudience(candidate, "PUBLIC"),
    )
    : null;
  const readinessChecks = await publicationReadinessChecks(
    admin,
    productId,
    candidate,
  );

  let existing = await openReview(admin, productId, subject);
  if (
    existing
    && existing.source_fingerprint !== candidate.sourceFingerprint
  ) {
    throw new ApiError(
      409,
      "OPEN_PUBLICATION_REVIEW_SOURCE_CHANGED",
      "An open review exists for older product data. Request changes or finish that review before resubmitting.",
    );
  }
  if (existing?.status === "APPROVED") {
    throw new ApiError(
      409,
      "APPROVED_PUBLICATION_REVIEW_ALREADY_EXISTS",
      "The current candidate is already approved and ready to publish.",
    );
  }

  let review: Record<string, unknown> | null = existing
    ? reviewResponse(existing)
    : null;
  if (!review) {
    const reviewResult = subject.batteryItemId
      ? await admin.rpc("greanlean_p0_create_item_publication_review", {
        target_product_id: productId,
        target_battery_item_id: subject.batteryItemId,
        target_schema_version: candidate.snapshot.schemaVersion,
        target_profile_key: candidate.snapshot.classification.profileKey,
        target_profile_version: candidate.snapshot.classification.profileVersion,
        target_candidate_snapshot: candidate.snapshot,
        target_canonical_payload: candidate.canonicalPayload,
        target_source_fingerprint: candidate.sourceFingerprint,
        change_reason_value: subject.changeReason || null,
        submitting_user_id: user.id,
      })
      : await admin.rpc("greanlean_create_publication_review", {
        target_product_id: productId,
        target_schema_version: candidate.snapshot.schemaVersion,
        target_profile_key: candidate.snapshot.classification.profileKey,
        target_profile_version: candidate.snapshot.classification.profileVersion,
        target_candidate_snapshot: candidate.snapshot,
        target_canonical_payload: candidate.canonicalPayload,
        target_source_fingerprint: candidate.sourceFingerprint,
        submitting_user_id: user.id,
      });
    if (reviewResult.error?.code === "23505") {
      existing = await openReview(admin, productId, subject);
      if (
        existing?.status === "IN_REVIEW"
        && existing.source_fingerprint === candidate.sourceFingerprint
      ) {
        review = reviewResponse(existing);
      } else {
        databaseError("review submission", reviewResult.error);
      }
    } else {
      databaseError("review submission", reviewResult.error);
      review = reviewResult.data;
    }
  }
  const reviewId = String(review?.reviewId || "");
  if (!reviewId) {
    throw new ApiError(
      500,
      "DPP_PUBLICATION_REVIEW_NOT_CREATED",
      "The publication review returned no identifier.",
    );
  }

  const { data: validation, error: validationError } = await admin.rpc(
    "greanlean_record_publication_validation",
    {
      target_review_id: reviewId,
      target_rule_set_version: "greanlean-publication-m6.2",
      validation_results: validationResults(
        candidate,
        comparison,
        readinessChecks,
      ),
      executing_user_id: user.id,
    },
  );
  databaseError("validation", validationError);
  return { review, validation, comparison };
}

export async function decidePublicationReview(
  authClient: AuthClient,
  reviewId: string,
  decision: "APPROVED" | "CHANGES_REQUESTED" | "REJECTED",
  reason: string | null,
) {
  const { data, error } = await authClient.rpc(
    "greanlean_decide_publication_review",
    {
      target_review_id: reviewId,
      decision_value: decision,
      decision_reason_value: reason,
    },
  );
  if (error) {
    throw new ApiError(
      error.code === "42501" ? 403 : 409,
      "DPP_PUBLICATION_REVIEW_DECISION_REJECTED",
      "The publication review decision was rejected.",
    );
  }
  return data;
}

export async function publishApprovedReview(
  admin: AdminClient,
  productId: string,
  reviewId: string,
  user: User,
  subject: PublicationSubject = {},
) {
  let reviewQuery = admin
    .from("dpp_publication_review")
    .select("id,product_id,base_publication_id,status,source_fingerprint,battery_item_id,subject_type")
    .eq("id", reviewId)
    .eq("product_id", productId);
  reviewQuery = subject.batteryItemId
    ? reviewQuery.eq("battery_item_id", subject.batteryItemId)
    : reviewQuery.is("battery_item_id", null);
  const { data: review, error: reviewError } = await reviewQuery
    .maybeSingle();
  databaseError("approved review read", reviewError);
  if (!review || review.status !== "APPROVED") {
    throw new ApiError(
      409,
      "APPROVED_PUBLICATION_REVIEW_REQUIRED",
      "An approved review is required before publication.",
    );
  }

  const candidate = await buildDppPublicationCandidate(admin, productId, subject);
  if (candidate.sourceFingerprint !== review.source_fingerprint) {
    throw new ApiError(
      409,
      "PUBLICATION_SOURCE_CHANGED_AFTER_REVIEW",
      "Product data changed after review. Submit a new candidate.",
    );
  }

  let versionQuery = admin
    .from("dpp_publication")
    .select("version_number")
    .eq("product_id", productId);
  versionQuery = subject.batteryItemId
    ? versionQuery.eq("battery_item_id", subject.batteryItemId)
    : versionQuery.is("battery_item_id", null);
  const { data: latest, error: latestError } = await versionQuery
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  databaseError("version allocation", latestError);
  const finalCandidate = finalizeDppPublicationCandidate(candidate, {
    publicationId: randomUUID(),
    version: Number(latest?.version_number || 0) + 1,
    publishedAt: new Date().toISOString(),
    publishedBy: user.id,
    supersedesPublicationId: review.base_publication_id,
  });

  const { data, error } = subject.batteryItemId
    ? await admin.rpc("greanlean_p0_publish_final_item_review", {
      target_review_id: reviewId,
      current_source_fingerprint: candidate.sourceFingerprint,
      final_snapshot: finalCandidate.snapshot,
      final_canonical_payload: finalCandidate.canonicalPayload,
      publishing_user_id: user.id,
    })
    : await admin.rpc("greanlean_publish_final_approved_review", {
      target_review_id: reviewId,
      current_source_fingerprint: candidate.sourceFingerprint,
      final_snapshot: finalCandidate.snapshot,
      final_canonical_payload: finalCandidate.canonicalPayload,
      publishing_user_id: user.id,
    });
  databaseError("final publication", error);
  return data;
}
