# Phase 7 — Internal Reference Production Onboarding Dry Run

Generated: `2026-09-28`

## Result

```text
PRODUCTION_READ_ONLY_BASELINE = PASS
PRODUCTION_REFERENCE_DATA_DRY_RUN = PASS
DRY_RUN_ONLY = TRUE
PRODUCTION_WRITE_ALLOWED = FALSE
PRODUCTION_DATA_WRITE_PERFORMED = NO
```

The independent Production planner is `scripts/phase7/build-internal-reference-production-pilot.mjs`. It hard-checks the Production environment and exact project, approved fixture hash, migration head `0035`, disabled global V2 state, Registry OFF, and real Production connectors OFF. Production write intent requires the explicit argument `--confirm-internal-reference-production-pilot`; that argument was not executed in this stage.

## Refreshed Production baseline

| Gate | Result |
| --- | --- |
| Production project | `lpxdbysgmdsjhxrjzhly`; database/Auth/Storage responsive and healthy |
| Migration head | `0035` |
| Reference Tenant / Models / Passports | `0 / 0 / 0` |
| V1 organisations / projects / products / versions / aliases | `3 / 0 / 9 / 12 / 6` |
| Global V2 Primary | FALSE |
| SOODOO V2 Primary | FALSE |
| Other-Tenant V2 Primary | FALSE |
| Registry | OFF; 0 V2 submissions |
| Active real Production connectors | OFF; 0 |
| Homepage | HTTP 200 |
| Representative V1 DPP | HTTP 200 |
| Representative V1 API | HTTP 200 |
| Login | HTTP 200 |
| Auth settings | HTTP 200 |
| Storage inventory | HTTP 200; 3 buckets |
| Dormant V2 Reference Resolver | HTTP 404, expected |

Refreshed response SHA-256 fingerprints:

| Surface | SHA-256 |
| --- | --- |
| Homepage | `8c7a7fca9dd1e90df834d98b88383a580222073366f97df070593d881586af2b` |
| V1 DPP | `7d8f483904f7344d04759e375c336d1e5a5cc39f2ade1a6b4c502b810220d936` |
| V1 API | `1d2e8ba98527e70d9762c8dc03d5edffb979be8ddba221fae62ead511163fdcd` |
| Login | `3ffa21d1979dcfe331c5408a06a8440025cc17e7bb39607df48619a21b506de0` |
| Auth | `338a059ffe5e5b0b888072e63fe10a0ef7f72ac95b14eceeddc3cc755c2aba4e` |
| Storage | `53872c8797dc9903d3bb13199f3f9b34c8766a21ebd5daa7d01c31a985067933` |

## Collision and idempotency checks

```text
DPP_ID_COLLISIONS = 0
SERIAL_COLLISIONS = 0
SKU_COLLISIONS = 0
MODEL_CODE_COLLISIONS = 0
```

The future onboarding plan uses Production-local UUID generation. No PreProd UUID is copied. Idempotency keys are tenant code, Organisation legal name, family/model/SKU codes, batch number, serial number, passport identifier, fixture/source hash, mapping profile/version, and schema code/version.

## Proposed mutation plan — not executed

| Resource | Planned addition |
| --- | ---: |
| Tenant / Organisation / Family | 1 / 1 / 1 |
| Models / SKUs | 8 / 22 |
| Batches / Batch-SKU links / Individuals | 8 / 22 / 22 |
| Data Source / Source Records / Transformations | 1 / 22 / 22 |
| Canonical Claims / Provenance Records | 374 / 374 |
| Passports / Reviews / Immutable Versions / Current Pointers | 22 / 22 / 22 / 22 |
| Resolver Mappings / BMS Snapshots | 22 / 22 |

All 22 proposed mappings use the approved Production host `www.greanlean.com` and normalized paths `/p/DPP-GLR-EBIKE-000001` through `/p/DPP-GLR-EBIKE-000022`. No mapping was created.

## Security and warning contract

The future audience set remains `PUBLIC`, `REPAIRER`, `RECYCLER`, `MANUFACTURER`, and `AUTHORITY`. PUBLIC must not expose source vendor identity, `TL-*` internal source codes, raw source records, internal policy, restricted BMS snapshots, or credentials.

Every future Reference Passport must visibly retain:

```text
SYNTHETIC DEMO DATA
NOT CUSTOMER VERIFIED
NOT FOR REGULATORY DECLARATION
```

```text
SOURCE_VENDOR_PUBLIC_LEAKAGE_EXPECTED = NONE
PUBLIC_BMS_LEAKAGE_EXPECTED = NONE
```

## Rollback and monitoring references

| Item | Reference |
| --- | --- |
| Current Production application deployment | `dpl_2n7VMa4Bgs4pxtiXtzJVHQdYApgA` |
| Primary application rollback | restore aliases to the current Production deployment if a later RC deployment fails |
| Secondary prior deployment | `dpl_3pVpitoxedeeEUy9DWHe76igZcwp` |
| Latest verified managed backup | `1801742967`, completed `2026-09-27T16:53:31.313Z` |
| V1 latency observation | `OPEN_FOR_PILOT_MONITORING` |

## Stop boundary

No Reference data was written, no V2 Primary state was enabled, no Registry/real connector was activated, no Production traffic was switched, the seven-day observation did not start, and Phase 8 was not entered.

```text
NEXT ACTION =
WAIT FOR EXPLICIT USER APPROVAL TO RUN
INTERNAL REFERENCE PRODUCTION DATA ONBOARDING.
```
