# 03 Phase 1 RLS Design

## Status

INSTALLED AND LIVE-TESTED IN DEVELOPMENT

RLS is enabled on all 15 Phase 1 tables. Anonymous access is denied by default. Authenticated policies delegate Tenant authority to active membership and Partner authority to an active authorization plus capability plus matching resource scope.

## Key policy behavior

- tenant: read through v2_policy_allows; update requires tenant.manage.
- organisation_v2: Tenant membership can read/edit by capability; Partner reads require v2_user_has_partner_resource_capability and a matching resource grant.
- tenant_membership: self-read or membership.view; writes require membership.manage.
- partner: Partner-linked users see their Partner; Tenant users require a related authorization plus partner.view.
- partner_tenant_authorization: Tenant capability or linked Partner identity controls reads; propose/approve/revoke capabilities control writes.
- scope_grant: visibility follows authorization-view policy; writes require approval capability.
- policy_decision_audit: Tenant Admin read only; direct anonymous/authenticated table grants are revoked and mutations are trigger-rejected.
- v2_idempotency_record: no anonymous/authenticated table grant; server only.

## Defense in depth

The API uses a service-role client only after authentication and PDP evaluation. Repositories require a branded VerifiedV2PolicyContext; missing context is rejected before a database call. Client x-tenant-id is requested scope, never authority.

## Live negative results

| Attempt | Result |
|---|---|
| Tenant A reads Tenant B Organisation | DENY |
| forged x-tenant-id changes authority | DENY |
| Membership references Tenant B Role | DB REJECT |
| Membership references platform Partner Role | DB REJECT |
| Partner reads unbound/expired/revoked Tenant | DENY |
| Partner reads Organisation outside resource grant | DENY |
| anonymous Tenant access | DENY |
| audit update/delete | DB REJECT |

All live checks used synthetic Development identities and data.

