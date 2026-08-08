import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  canonicalPublicationToLegacyDpp,
  isCanonicalPublicationSnapshot,
} from "@/lib/dpp/canonicalLegacyProjection";
import { loadPublicDppData } from "@/lib/dpp/publicDppRepository";
import type { DppAudience } from "@/lib/publicDppViewModel";
import { ApiError } from "./apiRoute";
import { loadBatteryOperatingProjection } from "./batteryOperatingData";
import { createSupabaseAdminClient, createSupabasePublicServerClient } from "./supabase";

type AuthClient = SupabaseClient<any, "public", any>;

export type AccessRequestLevel = "LEGITIMATE_INTEREST" | "AUTHORITY_ONLY";
export type AccessRequestRole =
  | "buyer"
  | "service_provider"
  | "recycler"
  | "authority_reviewer";

export type DppAccessDecision = {
  allowed: boolean;
  reasonCode: string;
  productId: string;
  productStatus: string;
  identifier: string;
  requestedLevel: "PUBLIC" | AccessRequestLevel;
  grantedLevel: "PUBLIC" | AccessRequestLevel | "INTERNAL";
  maximumLevel: "PUBLIC" | AccessRequestLevel | "INTERNAL";
  audience: DppAudience;
};

export type DppIdentityContext = {
  userId: string;
  isPlatformAdmin: boolean;
  canUseDashboard: boolean;
  canManageProducts: boolean;
  canCreateProducts: boolean;
  canPublishProducts: boolean;
  canManagePlatform: boolean;
  backofficeRole: "platform_admin" | "partner_editor" | "none";
  migrationRequired?: boolean;
  memberships: Array<{
    membershipId: string;
    organisationId: string;
    organisationName: string;
    organisationType: string;
    verificationStatus: string;
    roleCode: string;
    status: string;
    validUntil?: string | null;
  }>;
};

const PARTNER_EDITOR_ROLES = new Set([
  "organisation_admin",
  "service_provider",
]);

function normalizeIdentityContext(
  value: DppIdentityContext,
): DppIdentityContext {
  const memberships = Array.isArray(value.memberships) ? value.memberships : [];
  const hasPartnerEditorMembership = memberships.some((membership) => (
    PARTNER_EDITOR_ROLES.has(membership.roleCode)
    && membership.status === "active"
    && membership.verificationStatus === "verified"
    && (!membership.validUntil || new Date(membership.validUntil).getTime() > Date.now())
  ));
  const canManageProducts = Boolean(value.isPlatformAdmin || hasPartnerEditorMembership);
  return {
    ...value,
    memberships,
    canUseDashboard: Boolean(value.isPlatformAdmin || hasPartnerEditorMembership),
    canManageProducts,
    canCreateProducts: Boolean(value.isPlatformAdmin),
    canPublishProducts: Boolean(value.isPlatformAdmin),
    canManagePlatform: Boolean(value.isPlatformAdmin),
    backofficeRole: value.isPlatformAdmin
      ? "platform_admin"
      : hasPartnerEditorMembership
        ? "partner_editor"
        : "none",
  };
}

function databaseMessage(error: { message?: string; code?: string } | null) {
  return `${error?.code || ""} ${error?.message || ""}`.trim();
}

function migrationMissing(error: { message?: string; code?: string } | null) {
  const message = databaseMessage(error).toLowerCase();
  return message.includes("greanlean_get_my_identity")
    || message.includes("greanlean_resolve_dpp_access")
    || message.includes("dpp_access_request")
    || message.includes("could not find the function")
    || error?.code === "42P01";
}

export function requestedLevelForAudience(value: string | null) {
  const normalized = String(value || "auto").toLowerCase();
  if (["public", "consumer"].includes(normalized)) return "PUBLIC" as const;
  if (["authority", "audit", "authority_only"].includes(normalized)) {
    return "AUTHORITY_ONLY" as const;
  }
  if (["professional", "detail", "legitimate_interest"].includes(normalized)) {
    return "LEGITIMATE_INTEREST" as const;
  }
  if (normalized === "auto") return "AUTO" as const;
  throw new ApiError(400, "INVALID_DPP_AUDIENCE", "The requested DPP audience is not supported.");
}

export async function loadIdentityContext(
  client: AuthClient,
  user: User,
): Promise<DppIdentityContext> {
  const { data, error } = await client.rpc("greanlean_get_my_identity");
  if (!error && data) return normalizeIdentityContext(data as DppIdentityContext);

  if (migrationMissing(error)) {
    const legacyInternal = String(user.app_metadata?.dpp_access_level || "").toUpperCase() === "INTERNAL";
    return normalizeIdentityContext({
      userId: user.id,
      isPlatformAdmin: legacyInternal,
      canUseDashboard: legacyInternal,
      canManageProducts: legacyInternal,
      canCreateProducts: legacyInternal,
      canPublishProducts: legacyInternal,
      canManagePlatform: legacyInternal,
      backofficeRole: legacyInternal ? "platform_admin" : "none",
      migrationRequired: true,
      memberships: [],
    });
  }
  throw new ApiError(500, "ACCESS_CONTEXT_FAILED", "The user access context could not be loaded.");
}

export async function requireProductEditorAccess(
  client: AuthClient,
  user: User,
  productId: string,
) {
  const identity = await loadIdentityContext(client, user);
  if (!identity.canManageProducts) {
    throw new ApiError(
      403,
      "PRODUCT_EDITOR_ACCESS_REQUIRED",
      "Product editor access is required for this operation.",
    );
  }
  if (identity.isPlatformAdmin) return identity;
  if (!productId) {
    throw new ApiError(400, "PRODUCT_SCOPE_REQUIRED", "A product identifier is required.");
  }
  const { data, error } = await client.rpc("greanlean_product_access_level", {
    target_product_id: productId,
    check_user_id: user.id,
  });
  if (error) {
    throw new ApiError(
      500,
      "PRODUCT_ACCESS_CHECK_FAILED",
      "The product permission could not be checked.",
    );
  }
  if (String(data || "PUBLIC").toUpperCase() !== "INTERNAL") {
    throw new ApiError(
      403,
      "PRODUCT_SCOPE_NOT_GRANTED",
      "This account is not authorised to edit the requested product.",
    );
  }
  return identity;
}

export async function requireDppInternalUser(
  client: AuthClient,
  user: User,
) {
  const identity = await loadIdentityContext(client, user);
  if (!identity.isPlatformAdmin) {
    throw new ApiError(403, "DPP_INTERNAL_ACCESS_REQUIRED", "Internal DPP platform access is required for this operation.");
  }
  return identity;
}

export async function resolveDppAccess(
  client: AuthClient,
  identifier: string,
  requestedAudience: string | null,
  context: {
    purpose?: string | null;
    requestPath?: string | null;
    correlationId?: string | null;
    userAgent?: string | null;
  } = {},
) {
  const requestedLevel = requestedLevelForAudience(requestedAudience);
  const rpcArguments = {
    target_identifier: identifier,
    requested_level: requestedLevel,
    access_purpose: context.purpose || null,
    request_path_value: context.requestPath || null,
    correlation_id_value: context.correlationId || null,
    user_agent_value: context.userAgent || null,
  };
  const canonicalResult = await client.rpc(
    "greanlean_authorized_canonical_dpp_snapshot",
    rpcArguments,
  );
  const canonicalHandled = !canonicalResult.error
    && Boolean(canonicalResult.data?.access);
  const legacyResult = canonicalHandled
    ? null
    : await client.rpc("greanlean_authorized_dpp_snapshot", rpcArguments);
  const projection = canonicalHandled
    ? canonicalResult.data
    : legacyResult?.data;
  const error = canonicalHandled
    ? canonicalResult.error
    : legacyResult?.error;
  if (error) {
    if (migrationMissing(error)) {
      throw new ApiError(
        503,
        "ACCESS_MIGRATION_REQUIRED",
        "The identity and access migration has not been applied.",
      );
    }
    if (error.code === "P0002" || databaseMessage(error).includes("DPP_NOT_FOUND")) {
      throw new ApiError(404, "DPP_NOT_FOUND", "The published DPP was not found.");
    }
    throw new ApiError(500, "ACCESS_RESOLUTION_FAILED", "DPP access could not be resolved.");
  }

  const access = projection?.access as DppAccessDecision;
  if (!access) {
    throw new ApiError(500, "ACCESS_RESOLUTION_FAILED", "DPP access returned no decision.");
  }
  if (!access.allowed) {
    throw new ApiError(403, "DPP_ACCESS_NOT_GRANTED", "This account has no active grant for the requested DPP information.", {
      reasonCode: access.reasonCode,
      requestedLevel: access.requestedLevel,
      maximumLevel: access.maximumLevel,
    });
  }

  const includeDraft = access.maximumLevel === "INTERNAL"
    && !["published", "updated", "expired"].includes(access.productStatus);
  let projectedData = projection?.data;
  if (isCanonicalPublicationSnapshot(projectedData)) {
    const { data: liveProduct, error: productError } = await client
      .from("products")
      .select(`
        id,
        name,
        name_zh,
        brand,
        description,
        description_zh,
        sku,
        category,
        subcategory,
        season,
        main_image,
        care_instructions,
        care_instructions_zh,
        repair_instructions,
        repair_instructions_zh,
        end_of_life_instructions,
        end_of_life_instructions_zh,
        dpp_id,
        public_slug,
        unique_product_identifier,
        sector_code,
        dpp_profile_key,
        granularity_level,
        status,
        current_version,
        created_at,
        updated_at
      `)
      .eq("id", access.productId)
      .maybeSingle();
    if (productError || !liveProduct) {
      throw new ApiError(
        500,
        "DPP_PRESENTATION_PRODUCT_FAILED",
        "The product presentation record could not be loaded.",
      );
    }
    projectedData = canonicalPublicationToLegacyDpp(projectedData, liveProduct);
  }

  let data = projectedData || await loadPublicDppData(
    includeDraft ? createSupabaseAdminClient() : createSupabasePublicServerClient(),
    identifier,
    includeDraft,
  );
  if (!data) throw new ApiError(404, "DPP_NOT_FOUND", "The published DPP was not found.");
  if (
    access.audience !== "PUBLIC"
    && (
      data?.product?.sector_code === "battery"
      || String(data?.product?.dpp_profile_key || "").startsWith("battery.")
    )
  ) {
    const batteryOperating = await loadBatteryOperatingProjection(
      createSupabaseAdminClient(),
      access.productId,
      { range: "30d" },
    );
    data = {
      ...data,
      ...(batteryOperating ? { batteryOperating } : {}),
    };
  }
  return { data, access };
}

export async function submitDppAccessRequest(
  client: AuthClient,
  user: User,
  input: {
    identifier: string;
    requestedLevel: AccessRequestLevel;
    requestedRole: AccessRequestRole;
    organisationName: string;
    organisationRegistrationId?: string;
    organisationCountryCode?: string;
    purpose: string;
  },
) {
  const { data, error } = await client.rpc("greanlean_submit_access_request", {
    target_identifier: input.identifier,
    requested_level: input.requestedLevel,
    requested_role: input.requestedRole,
    organisation_name: input.organisationName,
    organisation_registration_id: input.organisationRegistrationId || null,
    organisation_country_code: input.organisationCountryCode || null,
    access_purpose: input.purpose,
    requester_email_value: user.email || null,
  });
  if (error) {
    if (migrationMissing(error)) {
      throw new ApiError(503, "ACCESS_MIGRATION_REQUIRED", "The identity and access migration has not been applied.");
    }
    throw new ApiError(400, "ACCESS_REQUEST_REJECTED", "The access request could not be submitted.");
  }
  return data;
}

export async function listDppAccessRequests(client: AuthClient) {
  const { data, error } = await client
    .from("dpp_access_request")
    .select(`
      id,
      requester_email,
      requested_role_code,
      requested_access_level,
      purpose,
      status,
      decision_reason,
      decided_at,
      created_at,
      organisation:dpp_organisation(legal_name,registration_id,country_code,verification_status),
      product:products(name,name_zh,dpp_id,public_slug)
    `)
    .order("created_at", { ascending: false });
  if (error) {
    if (migrationMissing(error)) {
      throw new ApiError(503, "ACCESS_MIGRATION_REQUIRED", "The identity and access migration has not been applied.");
    }
    throw new ApiError(500, "ACCESS_REQUEST_LIST_FAILED", "Access requests could not be loaded.");
  }
  return data || [];
}

export async function decideDppAccessRequest(
  client: AuthClient,
  requestId: string,
  decision: "approved" | "rejected",
  reason?: string,
  validUntil?: string | null,
) {
  const { data, error } = await client.rpc("greanlean_decide_access_request", {
    target_request_id: requestId,
    decision_value: decision,
    decision_reason_value: reason || null,
    valid_until_value: validUntil || null,
  });
  if (error) {
    if (error.code === "42501" || databaseMessage(error).includes("PLATFORM_ADMIN_REQUIRED")) {
      throw new ApiError(403, "PLATFORM_ADMIN_REQUIRED", "Platform administrator access is required.");
    }
    throw new ApiError(400, "ACCESS_DECISION_FAILED", "The access request decision could not be saved.");
  }
  return data;
}
