import type { User } from "@supabase/supabase-js";
import { ApiError } from "../apiRoute";
import type { RequestContext } from "../requestContext";
import { createSupabaseAdminClient } from "../supabase";
import {
  evaluateV2Policy,
  type V2AuthorityGrant,
  type V2PolicyDecision,
  type V2ScopeGrant,
} from "../../v2/policy";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

export type V2PolicyRequest = {
  tenantId: string;
  capability: string;
  resourceType: string;
  resourceId?: string | null;
  purpose?: string | null;
};

function capabilityCodes(rows: any[] | null) {
  return (rows || [])
    .map((row) => row.capability?.code)
    .filter((value): value is string => typeof value === "string");
}

function scopeRows(rows: any[] | null): V2ScopeGrant[] {
  return (rows || []).map((row) => ({
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    purpose: row.purpose,
    effect: row.effect,
    status: row.status,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
  }));
}

async function loadTenantGrant(admin: AdminClient, user: User, tenantId: string): Promise<V2AuthorityGrant | null> {
  const { data: membership, error } = await admin
    .from("tenant_membership")
    .select("id,tenant_id,role_id,status,valid_from,valid_until")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new ApiError(500, "PDP_MEMBERSHIP_LOOKUP_FAILED", "The policy decision could not be completed.");
  if (!membership) return null;
  const { data: capabilities, error: capabilityError } = await admin
    .from("role_capability")
    .select("capability:capability(code,status)")
    .eq("role_id", membership.role_id);
  if (capabilityError) throw new ApiError(500, "PDP_CAPABILITY_LOOKUP_FAILED", "The policy decision could not be completed.");
  return {
    source: "TENANT_MEMBERSHIP",
    id: membership.id,
    tenantId: membership.tenant_id,
    status: membership.status,
    validFrom: membership.valid_from,
    validUntil: membership.valid_until,
    capabilities: capabilityCodes(capabilities as any[]),
    scopes: [],
  };
}

async function loadPartnerGrants(admin: AdminClient, user: User, tenantId: string): Promise<V2AuthorityGrant[]> {
  const { data: links, error: linkError } = await admin
    .from("partner_user_link")
    .select("partner_id,status")
    .eq("user_id", user.id);
  if (linkError) throw new ApiError(500, "PDP_PARTNER_IDENTITY_LOOKUP_FAILED", "The policy decision could not be completed.");
  const activePartnerIds = (links || []).filter((link) => link.status === "ACTIVE").map((link) => link.partner_id);
  if (activePartnerIds.length === 0) return [];

  const { data: authorizations, error: authorizationError } = await admin
    .from("partner_tenant_authorization")
    .select("id,partner_id,tenant_id,permission_profile_id,status,valid_from,valid_until")
    .eq("tenant_id", tenantId)
    .in("partner_id", activePartnerIds);
  if (authorizationError) throw new ApiError(500, "PDP_PARTNER_AUTHORIZATION_LOOKUP_FAILED", "The policy decision could not be completed.");

  return Promise.all((authorizations || []).map(async (authorization) => {
    const [{ data: capabilities, error: capabilityError }, { data: scopes, error: scopeError }] = await Promise.all([
      admin
        .from("permission_profile_capability")
        .select("capability:capability(code,status)")
        .eq("permission_profile_id", authorization.permission_profile_id),
      admin
        .from("scope_grant")
        .select("resource_type,resource_id,purpose,effect,status,valid_from,valid_until")
        .eq("tenant_id", tenantId)
        .eq("grantee_type", "PARTNER_AUTHORIZATION")
        .eq("grantee_id", authorization.id),
    ]);
    if (capabilityError || scopeError) throw new ApiError(500, "PDP_PARTNER_SCOPE_LOOKUP_FAILED", "The policy decision could not be completed.");
    return {
      source: "PARTNER_AUTHORIZATION" as const,
      id: authorization.id,
      tenantId: authorization.tenant_id,
      partnerId: authorization.partner_id,
      status: authorization.status,
      validFrom: authorization.valid_from,
      validUntil: authorization.valid_until,
      capabilities: capabilityCodes(capabilities as any[]),
      scopes: scopeRows(scopes),
    };
  }));
}

async function recordDecision(
  admin: AdminClient,
  user: User,
  requestContext: RequestContext,
  request: V2PolicyRequest,
  decision: V2PolicyDecision,
) {
  const { error } = await admin.from("policy_decision_audit").insert({
    tenant_id: decision.tenantId,
    actor_user_id: user.id,
    actor_type: decision.actorType,
    partner_id: decision.partnerId,
    capability_code: request.capability,
    resource_type: request.resourceType,
    resource_id: request.resourceId || null,
    purpose: request.purpose || null,
    decision: decision.decision,
    reason_code: decision.reasonCode,
    effective_scope: decision.effectiveScope,
    policy_version: decision.policyVersion,
    correlation_id: requestContext.correlationId,
    request_path: requestContext.path,
  });
  if (error) throw new ApiError(500, "PDP_AUDIT_WRITE_FAILED", "The policy decision could not be audited.");
}

export async function evaluatePolicyDecisionPoint(
  user: User,
  requestContext: RequestContext,
  request: V2PolicyRequest,
) {
  const admin = createSupabaseAdminClient();
  const [membership, partnerGrants] = await Promise.all([
    loadTenantGrant(admin, user, request.tenantId),
    loadPartnerGrants(admin, user, request.tenantId),
  ]);
  const authorityGrants = [...(membership ? [membership] : []), ...partnerGrants];
  const decision = evaluateV2Policy({
    authenticated: true,
    requestedTenantId: request.tenantId,
    capability: request.capability,
    resourceType: request.resourceType,
    resourceId: request.resourceId,
    purpose: request.purpose,
    authorityGrants,
  });
  await recordDecision(admin, user, requestContext, request, decision);
  return { decision, admin };
}
