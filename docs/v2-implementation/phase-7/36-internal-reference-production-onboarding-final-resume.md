# Phase 7 — Internal Reference Production Onboarding Final Resume

Generated: `2026-09-29`

## Result

```text
FRESH_BACKUP_GATE = PASS
PARTIAL_STATE_RECONCILIATION = PASS
RESOLVER_ALLOWLIST_GATE = PASS
INTERNAL_REFERENCE_PRODUCTION_DATA_ONBOARDING = PASS
IDEMPOTENCY_RECONCILIATION = PASS
DUPLICATE_OBJECTS_CREATED = 0
V1_AFTER_REFERENCE_DATA_ONBOARDING = PASS
V1_DPP_LATENCY_OBSERVATION = OPEN_FOR_PILOT_MONITORING
```

The exact accepted RC was checked out cleanly and the confirmed-write workflow was resumed exactly once. It reused the existing first Passport and completed the remaining topology. No cleanup, immutable-version deletion, manual Resolver insertion, database migration, deployment or traffic switch was performed.

## Resume gates

| Gate | Evidence |
| --- | --- |
| RC | commit `b4412f0a32f0e91c3b16f6bc7017f8ee7a9de773`; tree `166c65c46bdadf9ba4a31759dfd21a2d22d2c1f7` |
| Deployment | `dpl_6poWp5p95At2hq4jbUAn1hZkQo3y`, READY, still serving `www.greanlean.com` |
| Migration head | `0035` before and after |
| Managed backup | physical backup `1811221013`, COMPLETED `2026-09-28T16:53:51.066Z`; age 12.90 hours at refresh |
| Fixture | SHA-256 `018c60c9db81d621aa439d5f801d5aad2756d29be4762bb85d106b2735425222` |
| Tenant | `GreanLean Reference Mobility` / `632943cf-520b-47ac-83af-88ca866d4fa5` |

The reconciled pre-resume state was exactly 1 Tenant, 1 Organisation, 1 Family, 8 Models, 22 SKUs, 8 Batches, 22 Batch-SKU links, 22 Individuals, 1 Data Source, 22 Source Records, 22 Transformations, 374 Claims, 374 Provenance records, and `1 / 1 / 1 / 1 / 0 / 0` Passport / Review / Version / Pointer / Resolver / BMS. The first immutable payload hash remained `37018545c5390f27895b08738d30be73e812c66390243fa440d0c94c5fd89d28`.

The resumed write began after `2026-09-29T05:49:27Z`. The final Resolver mapping was created at `2026-09-29T06:02:04.995308Z`; the final BMS snapshot at `2026-09-29T06:02:37.063796Z`.

## Final topology

| Resource | Count |
| --- | ---: |
| Family / Models / SKUs | 1 / 8 / 22 |
| Batches / Batch-SKU links / Individuals | 8 / 22 / 22 |
| Data Sources / Source Records / Transformations | 1 / 22 / 22 |
| Canonical Claims / Provenance Records | 374 / 374 |
| Passports / Reviews / immutable Versions / current Pointers | 22 / 22 / 22 / 22 |
| Resolver mappings / BMS snapshots | 22 / 22 |
| Registry submissions | 0 |

All 22 Reviews are PUBLISHED. Every Passport has exactly one immutable Version 1, every pointer targets that published version, and every version has Registry state `NOT_REQUIRED`. All 22 Resolver mappings use `www.greanlean.com` and the exact path range `/p/DPP-GLR-EBIKE-000001` through `/p/DPP-GLR-EBIKE-000022`. Other-host mappings, unexpected paths and duplicate host/path pairs are all zero.

## Audience and warning safety

All 22 immutable payloads were projected server-side for PUBLIC, REPAIRER, RECYCLER, MANUFACTURER and AUTHORITY using the RC audience mapping. PUBLIC produced 13 fields per Passport; REPAIRER and RECYCLER 16, AUTHORITY 16, and MANUFACTURER 17. Publication identity and payload hash were unchanged across projections.

```text
PUBLIC_DATA_LEAKAGE = NONE
SOURCE_VENDOR_PUBLIC_LEAKAGE = NONE
PUBLIC_BMS_LEAKAGE = NONE
UNVERIFIED_FALSE_VERIFIED_TEXT = NONE
WARNING_CONTRACT_FAILURES = 0
```

Every Passport retains `SYNTHETIC DEMO DATA`, `NOT CUSTOMER VERIFIED`, and `NOT FOR REGULATORY DECLARATION`. PUBLIC contained no restricted BMS, internal access policy, raw source record, source-vendor identity, credential or `TL-*` source model code.

## Backoffice and isolation

The authenticated Production Backoffice context and snapshot returned HTTP 200 for the reference Tenant with the exact final counts above. A reference-tenant author requesting the SOODOO tenant snapshot received HTTP 403 `TENANT_RELATIONSHIP_REQUIRED`.

```text
TENANT_ISOLATION = PASS
FOREIGN_TENANT_ACCESS = DENIED
```

The synthetic technical author's ephemeral password was rotated solely to obtain the short-lived verification token; no credential was recorded.

## Idempotency

The planner was rerun without the confirmation argument after completion. Every managed resource reported `proposedMutations = 0`; existing natural-key collision counts matched the 22 DPP IDs, 22 serials, 22 SKUs and 8 model codes owned by this same Tenant.

```text
NET_NEW_MUTATIONS = 0
IDEMPOTENCY_RECONCILIATION = PASS
DUPLICATE_OBJECTS_CREATED = 0
```

## V1 continuity and latency observation

The unchanged V1 database counts remain Products 9, Product Versions 12, Battery Model Profiles 3, legacy Battery Batches 0, Battery Items 2 and Identifier Aliases 6. The representative V1 API SHA-256 remains the established baseline `8a0d1cc4f05eab8c5dd88eb92062ea3e6e65c42eb5f7fa42a1fecece3ab17c9a`.

| Surface | Success | p50 | p95 | 5xx | unexpected 4xx |
| --- | ---: | ---: | ---: | ---: | ---: |
| Homepage | 5/5 | 808 ms | 2,102 ms | 0 | 0 |
| V1 DPP | 5/5 | 2,449 ms | 2,671 ms | 0 | 0 |
| V1 API | 5/5 | 2,152 ms | 2,667 ms | 0 | 0 |
| Auth | 5/5 | 591 ms | 1,009 ms | 0 | 0 |
| Storage | 5/5 | 1,051 ms | 1,201 ms | 0 | 0 |

The login and positive legacy alias returned 200; the established negative GS1 route remained 404; an approved QR returned 200 PNG; an external QR target remained 400 `QR_TARGET_NOT_APPROVED`. This short sample does not close the Pilot observation.

## Stop boundary

Production authoring gates remain enabled only for the confirmed workflow. `FEATURE_V2_PUBLIC_READ` and `FEATURE_V2_PUBLIC_PROJECTION` remain absent/false. Global, Reference, SOODOO and every other Tenant remain non-primary. Registry submissions and active real Production connectors are zero.

```text
GLOBAL_V2_PRIMARY = FALSE
REFERENCE_TENANT_V2_PRIMARY = FALSE
SOODOO_V2_PRIMARY = FALSE
OTHER_TENANT_V2_PRIMARY = FALSE
REGISTRY_SUBMISSION_PERFORMED = NO
REAL_CUSTOMER_CONNECTORS_ACTIVATED = NO
FORMAL_OBSERVATION_WINDOW_STARTED = NO
TECHNICAL_REFERENCE_PILOT = READY_FOR_CUTOVER
REAL_CUSTOMER_PILOT = NOT_STARTED
PHASE_7_COMPLETE = NO
PHASE_8_ENTERED = NO
```

The workflow stops here. Public Reference Tenant cutover and the formal seven-day technical observation require separate explicit authorization.

