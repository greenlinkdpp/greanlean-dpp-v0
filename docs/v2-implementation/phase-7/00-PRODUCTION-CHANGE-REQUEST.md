# Phase 7 Production Change Request

```text
CHANGE_REQUEST_STATUS = APPROVED_AND_EXECUTED_FOR_0027_AND_TENANT_PROVISIONING_ONLY
PRODUCTION_SCHEMA_MIGRATION_AUTHORISED = 0027_ONLY
PRODUCTION_SCHEMA_MIGRATION_COMPLETED = 0027_ONLY
SOODOO_TENANT_PROVISIONING_AUTHORISED = YES
SOODOO_TENANT_PROVISIONING_COMPLETED = YES
PILOT_CUTOVER_AUTHORISED = NO
```

## Executed scope

The user approved a narrowly scoped Production change: apply only the verified Phase 1 foundation migration `0027`, prove V1 continuity, then create exactly one canonical `SOODOO E-bike` Tenant boundary and stop.

| Item | Recorded value |
|---|---|
| Production project | `greanlen-dpp` / `lpxdbysgmdsjhxrjzhly` |
| Region/state | `ap-southeast-1` / `ACTIVE_HEALTHY` |
| Latest completed backup | physical backup `1801742967`, `2026-09-27T16:53:31.313Z` |
| Rollback reference | managed backup above plus verified isolated restore runbook |
| RC commit | `907f86f1c57cc5957af974048e4539cf54877284` |
| Migration | `0027_v2_phase1_tenant_access_foundation.sql` |
| SHA-256 | `15a2984852d2c94517876102f673f563fdb19060df37cf569753235e6504ecc0` |
| Head before/after | `0026` → `0027` |
| Migration execution | `2026-09-27T23:57:11.628Z`–`2026-09-27T23:57:14.793Z` |
| Pilot Tenant | `SOODOO E-bike` |
| Canonical Tenant ID | `0c2f6dff-560d-4eeb-be47-1e87a2f710fe` |
| Business/technical owner | `GreanLean Platform Owner / 聂松伟` |

The exact RC migration was executed without modification. Its ledger row retains the source SQL's `environment = development` value; this metadata mismatch is recorded for the next change request and was not silently rewritten.

## Verification outcome

- Phase 6 final result, Production readiness and Pilot readiness remained PASS/READY.
- Pre-change Production baseline and managed backup check passed.
- Migration `0027` preflight passed; it is additive and V1-compatible.
- Immediate V1 regression passed with identical representative counts and fingerprints.
- Fifteen Phase 1 tables exist, all fifteen have RLS enabled, and 23 policies exist.
- One canonical SOODOO Tenant exists, with five seeded Tenant roles and 74 role-capability bindings.
- Anonymous Tenant read returns no row.
- One provisioning audit row exists.
- No Organisation, membership, Partner, legacy mapping, product or Passport data was created.

## Unauthorised and not performed

Migrations `0028`–`0035`, Pilot data migration, publication, feature flags, V2 Primary, traffic switching, Registry, connectors, QR changes, V1 mutation and any other Tenant migration remain unauthorised and were not performed.

## Next change boundary

This completed request does not approve the remaining Phase 7 Production migrations or Pilot cutover. A new explicit Production Change Request approval is required.
