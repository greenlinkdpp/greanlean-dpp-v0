# 05 Phase 1 API Contract

## Status

IMPLEMENTED AND BUILD-VERIFIED

OpenAPI: docs/v2-implementation/phase-1/openapi-v2.yaml

| Route | Methods | Access | Capability |
|---|---|---|---|
| /api/v2/tenants | GET, PATCH | TENANT | tenant.view, tenant.manage |
| /api/v2/organisations | GET, POST | TENANT | organisation.view, organisation.edit |
| /api/v2/partners | GET, POST | TENANT | partner.view, partner.manage |
| /api/v2/partner-authorizations | GET, POST | TENANT/PARTNER | view/propose authorization |
| /api/v2/partner-authorizations/{id}/approve | POST | TENANT | partner_authorization.approve |
| /api/v2/partner-authorizations/{id}/revoke | POST | TENANT | partner_authorization.revoke |
| /api/v2/memberships | GET, POST | TENANT | membership.view, membership.manage |
| /api/v2/roles | GET, POST | TENANT | membership.view, membership.manage |
| /api/v2/capabilities | GET | TENANT | membership.view |

## Common security shell

    Bearer authentication
    → feature flags
    → validated x-tenant-id requested scope
    → membership/Partner relationship
    → capability
    → PDP + append-only audit
    → verified policy context
    → service repository
    → database/RLS

All writes require a validated Idempotency-Key. Same key and same canonical payload replays the recorded response; the same key with a different payload returns 409 IDEMPOTENCY_KEY_REUSED. Responses include x-correlation-id, safe structured errors, and private, no-store caching.

Development flags are enabled in .env.development.local; no Production flag was changed.

