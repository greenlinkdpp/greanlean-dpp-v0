# Phase 7 — Internal Reference Production Onboarding Resume

Generated: `2026-09-28`

## Result

```text
PARTIAL_STATE_RECONCILIATION = PASS
INTERNAL_REFERENCE_PRODUCTION_DATA_ONBOARDING = FAIL
FAILURE_MODE = FAIL_CLOSED_AT_FIRST_RESOLVER_MAPPING
```

The existing checkpoint was matched exactly, backup `1811221013` was revalidated at age 12.37 hours, and the exact confirmed-write workflow was resumed once. All remaining mapping, transformation, provenance, and canonical-claim work completed. The first Passport then passed candidate validation, review, approval and immutable Version 1 publication. Resolver mapping creation failed closed with:

```text
POST /api/v2/resolver-mappings
HTTP 409
code = RESOLVER_OPEN_REDIRECT
```

No second resume, manual Resolver insert, allowlist mutation, destructive cleanup, immutable-version deletion, database restore, or V2 Primary change was performed.

## Checkpoint after failure

Reference Tenant: `632943cf-520b-47ac-83af-88ca866d4fa5` (`GreanLean Reference Mobility`).

| Resource | Current | Required final | Remaining |
| --- | ---: | ---: | ---: |
| Tenant / Organisation / Family | 1 / 1 / 1 | 1 / 1 / 1 | 0 / 0 / 0 |
| Models / SKUs | 8 / 22 | 8 / 22 | 0 / 0 |
| Batches / Batch-SKU links / Individuals | 8 / 22 / 22 | 8 / 22 / 22 | 0 / 0 / 0 |
| Data Source / Source Records | 1 / 22 | 1 / 22 | 0 / 0 |
| Transformations | 22 | 22 | 0 |
| Canonical Claims / Provenance | 374 / 374 | 374 / 374 | 0 / 0 |
| Passports / Reviews | 1 / 1 | 22 / 22 | 21 / 21 |
| Immutable Versions / Current Pointers | 1 / 1 | 22 / 22 | 21 / 21 |
| Resolver Mappings / BMS Snapshots | 0 / 0 | 22 / 22 | 22 / 22 |
| Registry Submissions | 0 | 0 | 0 |

The published record is `DPP-GLR-EBIKE-000001`, review state `PUBLISHED`, immutable Version `1`, payload hash `37018545c5390f27895b08738d30be73e812c66390243fa440d0c94c5fd89d28`, Registry state `NOT_REQUIRED`, with a current pointer to that exact immutable version.

## Root cause

The Production `resolver_host_allowlist` contains only:

- `127.0.0.1`
- `localhost`
- `dev.dpp.greanlean.test`
- `greanlean-dpp-preprod.vercel.app`

It does not contain the authorized Production host `www.greanlean.com`. The database trigger therefore rejected the mapping as an open-redirect defense. Adding a Production host allowlist row is a separate database configuration write and the failure boundary required stopping rather than performing it implicitly.

## Safety and continuity

The public Reference Resolver remains feature-disabled. Therefore the single internally published Reference version is dormant and not publicly routed. Registry and real customer connectors remain off.

The post-failure V1 sample contained 25 requests with zero 5xx and zero unexpected 4xx:

| Surface | Success | p50 | p95 |
| --- | ---: | ---: | ---: |
| Homepage | 5/5 | 751 ms | 1,157 ms |
| V1 DPP | 5/5 | 1,851 ms | 2,911 ms |
| V1 API | 5/5 | 3,333 ms | 4,128 ms |
| Auth | 5/5 | 564 ms | 2,125 ms |
| Storage | 5/5 | 1,020 ms | 1,230 ms |

```text
PUBLIC_DATA_LEAKAGE = NONE
SOURCE_VENDOR_PUBLIC_LEAKAGE = NONE
PUBLIC_BMS_LEAKAGE = NONE
IDEMPOTENCY_RECONCILIATION = FAIL
DUPLICATE_OBJECTS_CREATED = 0
V1_AFTER_REFERENCE_DATA_ONBOARDING = PASS
V1_DPP_LATENCY_OBSERVATION = OPEN_FOR_PILOT_MONITORING
GLOBAL_V2_PRIMARY = FALSE
REFERENCE_TENANT_V2_PRIMARY = FALSE
FORMAL_OBSERVATION_WINDOW_STARTED = NO
```

Idempotency reconciliation cannot pass until the authorized topology is complete. The planner proposes only the remaining 21 Passport chains, 22 Resolver mappings and 22 BMS snapshots; it proposes no duplicate hierarchy, mapping, claim or provenance objects.

## Required next authorization

Completion now requires explicit authorization to add exactly one active `www.greanlean.com` row to the Production Resolver host allowlist, refresh the backup/checkpoint gates, and resume the same exact RC idempotently. No public V2 Primary flag needs to change.
