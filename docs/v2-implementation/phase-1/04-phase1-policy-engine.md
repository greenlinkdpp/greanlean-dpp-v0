# 04 Phase 1 Policy Engine

## Status

IMPLEMENTED / DENY BY DEFAULT / POLICY VERSION v2-phase1.1

Implementation is split between the pure evaluator in lib/v2/policy.ts, the database-backed PDP in lib/server/v2/policyDecisionPoint.ts, and the mandatory context boundary in lib/server/v2/security.ts.

## Evaluation order

    authenticated identity
    → requested Tenant context
    → Tenant Membership / Partner User Link + Authorization
    → active status and validity window
    → capability
    → explicit DENY scope
    → matching ALLOW resource/purpose scope
    → ALLOW or DENY
    → append-only decision audit

Tenant membership capabilities are Tenant-scoped. Platform roles do not grant Tenant access. Partner capabilities are the intersection of active Partner authorization, permission profile, and matching scope grant.

## Stable reasons exercised

- AUTH_REQUIRED
- TENANT_CONTEXT_REQUIRED
- TENANT_RELATIONSHIP_REQUIRED
- PLATFORM_ROLE_TENANT_DENIED
- AUTHORIZATION_INACTIVE, AUTHORIZATION_EXPIRED, AUTHORIZATION_REVOKED
- CAPABILITY_DENIED
- RESOURCE_OUT_OF_SCOPE
- TENANT_MEMBERSHIP_CAPABILITY
- PARTNER_AUTHORIZATION_CAPABILITY_SCOPE

## Audit

Every API PDP decision records actor, Tenant, Partner when applicable, capability, resource, purpose, ALLOW/DENY, reason code, effective scope, policy version, correlation ID, and request path. Credentials and request payloads are excluded.

Unit tests cover Tenant allow, platform-role denial, missing/expired/revoked Partner relationships, resource scope, and explicit deny precedence. Live Dev tests confirmed the same boundaries through RLS and API requests.

