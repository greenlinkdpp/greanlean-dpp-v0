# 02 Phase 1 Database Model

## Status

IMPLEMENTED IN DEVELOPMENT / ADDITIVE / REVERSIBLE

Migration: supabase/migrations/0027_v2_phase1_tenant_access_foundation.sql  
Rollback: supabase/rollbacks/0027_v2_phase1_tenant_access_foundation.down.sql

## Objects

| Object | Boundary | Purpose |
|---|---|---|
| tenant | platform | SaaS isolation/configuration root |
| organisation_v2 | Tenant | Tenant-owned legal/operating actor |
| partner | platform | independent Partner; no tenant_id and no Organisation FK |
| partner_tenant_authorization | Tenant relationship | explicit request/approval/status/validity/profile binding |
| tenant_membership | Tenant | user-to-Tenant Role assignment |
| role, capability, role_capability | catalogue/Tenant | finite capability enforcement model |
| permission_profile, permission_profile_capability | platform catalogue | Partner capability templates |
| partner_user_link | Partner identity | user-to-Partner link |
| scope_grant | Tenant | resource/purpose allow or deny scope |
| policy_decision_audit | security | append-only decision evidence |
| legacy_entity_mapping | migration control | reviewed V1-to-V2 mapping |
| v2_idempotency_record | Tenant/user/request | persistent write replay/conflict record |

## Enforced invariants

1. Tenant-owned rows have non-null Tenant ownership; tenant changes are trigger-rejected.
2. Organisation parent and child are bound by composite (id, tenant_id) foreign key.
3. Membership carries generated role_class = TENANT and uses a composite FK to (role_id, tenant_id, role_class).
4. Cross-Tenant and PLATFORM/PARTNER/INTEGRATION Role membership is database-rejected.
5. Partner is platform-level; customer access exists only through an active partner_tenant_authorization.
6. Scope grants must reference a grantee belonging to the same Tenant; explicit DENY wins.
7. Policy audit rows cannot be updated or deleted.
8. V1 objects are not altered by migration 0027.

## Seed catalogue

- 30 finite capabilities.
- Tenant templates: Tenant Admin, DPP Manager, Reviewer, Publisher, Read Only.
- Platform templates: Partner Consultant and Integration User.
- Partner profiles: Partner Consultant and Partner Read Only.

The live Development rollback removed every 0027 object and ledger row while ten representative V1 tables remained available; the final UP reinstalled the model successfully.

