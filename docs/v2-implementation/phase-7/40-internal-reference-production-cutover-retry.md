# Phase 7 Internal Reference Production Cutover Retry

Generated: `2026-09-29`

## Result

```text
INTERNAL_REFERENCE_PRODUCTION_CUTOVER_RETRY = PASS
PUBLIC_CAPABILITY_ENABLEMENT = PASS
REFERENCE_TENANT_V2_PRIMARY = TRUE
GLOBAL_V2_PRIMARY = FALSE
SOODOO_V2_PRIMARY = FALSE
OTHER_TENANT_V2_PRIMARY = FALSE
TECHNICAL_GO_LIVE = TRUE
TECHNICAL_GO_LIVE_AT = 2026-09-29T09:58:07.210Z
```

Only `FEATURE_V2_PUBLIC_READ=true` and `FEATURE_V2_PUBLIC_PROJECTION=true` were added for the public cutover. Registry TEST, external connectors, connector execution, file import and BMS adapter flags remain absent/off. No code, migration or Production database row was changed during this retry.

The backup gate passed immediately before cutover: Production project `lpxdbysgmdsjhxrjzhly` was `ACTIVE_HEALTHY`, migration head was `0035`, and managed physical backup `1811221013` was `COMPLETED` at `2026-09-28T16:53:51.066Z`, approximately 16.8 hours old when checked at `2026-09-29T09:41:06Z`.

## Public verification

| Gate | Result |
| --- | --- |
| First Resolver/page/QR probe (`000001`) | PASS |
| Public DPP pages | `22/22 PASS` |
| Resolver JSON | `22/22 PASS` |
| QR PNG and approved target | `22/22 PASS` |
| Version/current publication state | all Version 1 / PUBLISHED |
| Publication payload hashes | `22/22` match accepted ledger |
| Representative QR decode | `000001`, `000010`, `000022` decoded to their exact `www` Resolver URLs |
| Unknown DPP | `409 RESOLVER_NOT_FOUND` |
| SOODOO non-primary DPP | `409 RESOLVER_NOT_FOUND` |
| Unapproved Resolver host | rejected with `RESOLVER_NOT_FOUND` |
| Arbitrary QR target | `400 QR_TARGET_NOT_APPROVED` |

The Reference Tenant (`632943cf-520b-47ac-83af-88ca866d4fa5`) owns all 22 `publication_source=V2` Production passports. SOODOO owns zero, every other Tenant owns zero, and no global fallback exists.

## UI, audience and Backoffice

Real-browser validation passed on a desktop English page and a mobile Chinese page across different models/SKUs. The productized UI, Version 1, PUBLISHED state, brand, QR and the three required warnings were visible. Raw JSON was not the primary UI. Chinese mobile rendering had no console error; English desktop recorded only a non-blocking missing `favicon.ico`.

All 22 PUBLIC payloads expose exactly 13 approved fields. No restricted raw source record, source-vendor identity, BMS payload, access policy, credential or source `TL-*` model code was exposed. All fields remained `UNVERIFIED`; `source_vendor_public=false`. Anonymous requests for REPAIRER, RECYCLER, MANUFACTURER and AUTHORITY projections were denied with `403 PUBLIC_PROJECTION_DENIED`. Previously accepted offline projection evidence remains 13/16/16/17/16 fields for PUBLIC/REPAIRER/RECYCLER/MANUFACTURER/AUTHORITY respectively.

Authenticated Backoffice context and snapshot returned HTTP 200 with Models 8, SKUs 22, Individuals 22, Claims 374, Passports 22, Versions 22, Current Pointers 22, Resolver Mappings 22 and BMS Snapshots 22. A Reference author requesting the SOODOO snapshot received `403 TENANT_RELATIONSHIP_REQUIRED`. The ephemeral password was rotated solely for the check and was not recorded.

## Continuity and performance

Post-cutover V1 smoke passed for homepage, representative V1 DPP/API, login/Auth, Storage, legacy aliases and legacy QR. Database counts remained Products 9, Product Versions 12, Battery Model Profiles 3, Battery Batches 0, Battery Items 2 and Identifier Aliases 6. Migration head remained `0035`.

The 45-request snapshot recorded no HTTP 5xx and no unexpected 4xx. Observed p95 values were: homepage 1,131 ms; V1 DPP 2,700 ms; V1 API 3,879 ms; Auth 1,452 ms; Storage 1,390 ms; V2 Resolver 720 ms; V2 page 1,641 ms; V2 QR 1,022 ms. `V1_DPP_LATENCY_OBSERVATION` remains open for Pilot monitoring.

Registry submissions remain 0 and active real Production connectors remain 0.

No rollback trigger fired. The accepted rollback deployment remains `dpl_6poWp5p95At2hq4jbUAn1hZkQo3y`; rollback was not executed and no database restore was used.
