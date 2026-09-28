# SOODOO Tenant Provisioning Evidence

```text
SOODOO_TENANT_PROVISIONING = PASS
PILOT_TENANT_SELECTED = TRUE
PILOT_TENANT_NAME = SOODOO E-bike
PILOT_TENANT_ID = 0c2f6dff-560d-4eeb-be47-1e87a2f710fe

MIGRATIONS_0028_TO_0035_PERFORMED = NO
PILOT_DATA_MIGRATION_PERFORMED = NO
PRODUCTION_TRAFFIC_SWITCHED = NO
PRODUCTION_REGISTRY_ENABLED = NO
PRODUCTION_CONNECTORS_ACTIVATED = NO
```

## Canonical record

| Field | Value |
|---|---|
| Tenant ID | `0c2f6dff-560d-4eeb-be47-1e87a2f710fe` |
| Code | `soodoo-e-bike` |
| Name | `SOODOO E-bike` |
| Status | `ACTIVE` |
| Created at | `2026-09-27T23:58:55.70031Z` |
| ID generation | database default `gen_random_uuid()`; no ID supplied or reused |
| Organisation relationship | none; zero SOODOO Organisation matches existed and no duplicate was created |
| Membership | none; no user identity was guessed |
| Production migration head | `0027` before and after provisioning |

## Collision and isolation checks

Before INSERT, canonical Tenant count was zero, normalized SOODOO Tenant matches were zero, and SOODOO legacy Organisation matches were zero. After INSERT:

- total canonical Tenants: 1;
- normalized/code SOODOO matches: 1;
- Tenant table RLS: enabled;
- Organisation table RLS: enabled;
- anonymous SOODOO Tenant query: HTTP 200 with zero visible rows;
- seeded Tenant roles: 5;
- role-capability bindings: 74;
- Organisation rows: 0;
- memberships: 0;
- Partners: 0;
- legacy mappings: 0.

No unrelated Tenant existed or was modified. No legacy customer was remapped.

## Audit evidence

Exactly one immutable `policy_decision_audit` row records the action:

| Field | Value |
|---|---|
| Correlation ID | `phase7-soodoo-provisioning-1790553533090` |
| Actor type | `PLATFORM` |
| Capability | `tenant.manage` |
| Resource | the canonical SOODOO Tenant ID |
| Decision/reason | `ALLOW` / `PHASE7_EXPLICIT_USER_AUTHORIZATION` |
| Policy version | `phase7-provisioning-v1` |

The audit scope records the authorised owners, Tenant-boundary-only scope, and confirms no Organisation or product data was created. No secret is recorded.

## Post-provision invariance

The representative V1 counts, fingerprints and public HTTP statuses remained identical to the post-`0027` baseline. Migration head remained `0027`; ledger rows `0028`–`0035` remained zero. No deployment, traffic switch, Registry, connector, QR, Pilot product or Passport action occurred.

```text
NEXT ACTION =
STOP AND WAIT FOR EXPLICIT APPROVAL OF THE REMAINING PHASE 7
PRODUCTION MIGRATION / CUTOVER CHANGE REQUEST.
```
