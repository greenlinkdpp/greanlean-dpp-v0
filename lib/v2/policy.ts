export type V2ActorType = "TENANT" | "PARTNER" | "PLATFORM" | "INTEGRATION" | "ANONYMOUS";

export type V2ScopeGrant = {
  resourceType: string;
  resourceId?: string | null;
  purpose?: string | null;
  effect: "ALLOW" | "DENY";
  status: string;
  validFrom: string;
  validUntil?: string | null;
};

export type V2AuthorityGrant = {
  source: "TENANT_MEMBERSHIP" | "PARTNER_AUTHORIZATION" | "PLATFORM_ASSIGNMENT";
  id: string;
  tenantId: string | null;
  partnerId?: string | null;
  roleCode?: string | null;
  status: string;
  validFrom: string;
  validUntil?: string | null;
  capabilities: string[];
  scopes: V2ScopeGrant[];
};

export type V2PolicyInput = {
  authenticated: boolean;
  requestedTenantId?: string | null;
  capability: string;
  platformCapability?: string | null;
  resourceType: string;
  resourceId?: string | null;
  purpose?: string | null;
  authorityGrants: V2AuthorityGrant[];
  hasPlatformRole?: boolean;
  now?: Date;
};

export type V2PolicyDecision = {
  allowed: boolean;
  decision: "ALLOW" | "DENY";
  reasonCode: string;
  actorType: V2ActorType;
  tenantId: string | null;
  partnerId: string | null;
  authorityId: string | null;
  effectiveScope: Record<string, unknown>;
  policyVersion: "v2.1-platform-context";
};

function activeAt(status: string, validFrom: string, validUntil: string | null | undefined, now: Date) {
  return status === "ACTIVE"
    && new Date(validFrom).getTime() <= now.getTime()
    && (!validUntil || new Date(validUntil).getTime() > now.getTime());
}

function scopeMatches(scope: V2ScopeGrant, input: V2PolicyInput, now: Date) {
  if (!activeAt(scope.status, scope.validFrom, scope.validUntil, now)) return false;
  if (scope.resourceType !== "*" && scope.resourceType !== input.resourceType) return false;
  if (scope.resourceId && scope.resourceId !== input.resourceId) return false;
  if (scope.purpose && scope.purpose !== input.purpose) return false;
  return true;
}

function deny(
  reasonCode: string,
  tenantId: string | null,
  actorType: V2ActorType = "ANONYMOUS",
): V2PolicyDecision {
  return {
    allowed: false,
    decision: "DENY",
    reasonCode,
    actorType,
    tenantId,
    partnerId: null,
    authorityId: null,
    effectiveScope: {},
    policyVersion: "v2.1-platform-context",
  };
}

export function evaluateV2Policy(input: V2PolicyInput): V2PolicyDecision {
  const tenantId = input.requestedTenantId || null;
  if (!input.authenticated) return deny("AUTH_REQUIRED", tenantId);
  if (!tenantId) return deny("TENANT_CONTEXT_REQUIRED", null, "TENANT");

  const now = input.now || new Date();
  const activePlatformGrants = input.authorityGrants.filter((grant) =>
    grant.source === "PLATFORM_ASSIGNMENT"
    && activeAt(grant.status, grant.validFrom, grant.validUntil, now)
  );
  if (activePlatformGrants.length > 0 && input.platformCapability) {
    const capable = activePlatformGrants.find((grant) => grant.capabilities.includes(input.platformCapability!));
    if (capable) {
      return {
        allowed: true,
        decision: "ALLOW",
        reasonCode: "PLATFORM_CAPABILITY_ACTIVE_TENANT",
        actorType: "PLATFORM",
        tenantId,
        partnerId: null,
        authorityId: capable.id,
        effectiveScope: {
          tenantId,
          resourceType: input.resourceType,
          resourceId: input.resourceId || null,
          platformCapability: input.platformCapability,
        },
        policyVersion: "v2.1-platform-context",
      };
    }
  }

  const tenantGrants = input.authorityGrants.filter((grant) => grant.tenantId === tenantId);
  if (tenantGrants.length === 0) {
    return deny(input.hasPlatformRole ? "PLATFORM_CAPABILITY_DENIED" : "TENANT_RELATIONSHIP_REQUIRED", tenantId, input.hasPlatformRole ? "PLATFORM" : "TENANT");
  }

  const activeGrants = tenantGrants.filter((grant) => activeAt(grant.status, grant.validFrom, grant.validUntil, now));
  if (activeGrants.length === 0) {
    const revoked = tenantGrants.some((grant) => grant.status === "REVOKED");
    const expired = tenantGrants.some((grant) => grant.status === "EXPIRED" || (grant.validUntil && new Date(grant.validUntil) <= now));
    return deny(revoked ? "AUTHORIZATION_REVOKED" : expired ? "AUTHORIZATION_EXPIRED" : "AUTHORIZATION_INACTIVE", tenantId, "TENANT");
  }

  const capableGrants = activeGrants.filter((grant) => grant.capabilities.includes(input.capability));
  if (capableGrants.length === 0) return deny("CAPABILITY_DENIED", tenantId, "TENANT");

  for (const grant of capableGrants) {
    if (grant.source === "TENANT_MEMBERSHIP") {
      return {
        allowed: true,
        decision: "ALLOW",
        reasonCode: "TENANT_MEMBERSHIP_CAPABILITY",
        actorType: "TENANT",
        tenantId,
        partnerId: null,
        authorityId: grant.id,
        effectiveScope: { resourceType: input.resourceType, resourceId: input.resourceId || null },
        policyVersion: "v2.1-platform-context",
      };
    }

    const matchingScopes = grant.scopes.filter((scope) => scopeMatches(scope, input, now));
    if (matchingScopes.some((scope) => scope.effect === "DENY")) continue;
    const allowedScope = matchingScopes.find((scope) => scope.effect === "ALLOW");
    if (!allowedScope) continue;
    return {
      allowed: true,
      decision: "ALLOW",
      reasonCode: "PARTNER_AUTHORIZATION_CAPABILITY_SCOPE",
      actorType: "PARTNER",
      tenantId,
      partnerId: grant.partnerId || null,
      authorityId: grant.id,
      effectiveScope: {
        resourceType: allowedScope.resourceType,
        resourceId: allowedScope.resourceId || null,
        purpose: allowedScope.purpose || null,
      },
      policyVersion: "v2.1-platform-context",
    };
  }

  return deny("RESOURCE_OUT_OF_SCOPE", tenantId, "PARTNER");
}
