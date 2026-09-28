# Phase 7 Production Change Request

```text
CHANGE_REQUEST_STATUS = APPROVED_AND_EXECUTED_THROUGH_0035
PRODUCTION_SCHEMA_MIGRATION_AUTHORISED = 0027_THROUGH_0035
PRODUCTION_SCHEMA_MIGRATION_COMPLETED = 0027_THROUGH_0035
SOODOO_TENANT_PROVISIONING_AUTHORISED = YES
SOODOO_TENANT_PROVISIONING_COMPLETED = YES
PILOT_CUTOVER_AUTHORISED = CONDITIONAL
PILOT_CUTOVER_COMPLETED = NO
```

## Executed scope

The first approval applied the verified Phase 1 foundation migration `0027`, proved V1 continuity and created exactly one canonical `SOODOO E-bike` Tenant boundary. A subsequent approval authorised the exact frozen RC migrations `0028` through `0035`, followed by V1 verification and a conditional SOODOO-only cutover. The schema portion completed; the data/cutover portion stopped at its first unmet Gate because the exact included Models, Passports and identifiers were not locked and no deterministic SOODOO source rows exist.

| Item | Recorded value |
|---|---|
| Production project | `greanlen-dpp` / `lpxdbysgmdsjhxrjzhly` |
| Region/state | `ap-southeast-1` / `ACTIVE_HEALTHY` |
| Latest completed backup | physical backup `1801742967`, `2026-09-27T16:53:31.313Z` |
| Rollback reference | managed backup above plus verified isolated restore runbook |
| RC commit | `907f86f1c57cc5957af974048e4539cf54877284` |
| Migration | `0027_v2_phase1_tenant_access_foundation.sql` |
| SHA-256 | `15a2984852d2c94517876102f673f563fdb19060df37cf569753235e6504ecc0` |
| Head before/after | `0026` → `0035` |
| Migration execution | `2026-09-27T23:57:11.628Z`–`2026-09-27T23:57:14.793Z` |
| Pilot Tenant | `SOODOO E-bike` |
| Canonical Tenant ID | `0c2f6dff-560d-4eeb-be47-1e87a2f710fe` |
| Business/technical owner | `GreanLean Platform Owner / 聂松伟` |

All nine exact RC migrations were executed without modification. Ledger rows `0027`–`0032` retain the source SQL's `environment = development` value and `0033`–`0035` retain `preproduction`; these hard-coded metadata values were disclosed and not silently rewritten.

## Verification outcome

- Phase 6 final result, Production readiness and Pilot readiness remained PASS/READY.
- Pre-change Production baseline and managed backup check passed.
- Migration `0027` and the remaining exact RC range `0028`–`0035` passed preflight and execution.
- Immediate V1 regression after head `0035` passed with identical representative counts and fingerprints.
- Fifteen Phase 1 tables exist, all fifteen have RLS enabled, and 23 policies exist.
- One canonical SOODOO Tenant exists, with five seeded Tenant roles and 74 role-capability bindings.
- Anonymous Tenant read returns no row.
- One provisioning audit row exists.
- No Organisation, membership, Partner, legacy mapping, product or Passport data was created.

## Conditional scope not performed

Pilot data migration, publication, feature flags, V2 Primary, traffic switching, Registry activation, real connectors, QR changes, V1 mutation and any other Tenant migration were not performed. Their conditional prerequisites were not met.

## Next change boundary

The Production schema is at `0035`. Continuation requires an explicit, deterministic SOODOO Pilot data scope identifying the included source Models, Passports and identifiers; providing that scope does not waive any remaining reconciliation, publication, shadow, security or rollback Gate.
