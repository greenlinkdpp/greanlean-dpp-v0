# Phase 7 — Confirmed Write PreProd Verification

Generated: `2026-09-28`

## Result

```text
PREPROD_CONFIRMED_WRITE_VERIFICATION = PASS
PARTIAL_RESUME = PASS
CONFIRMED_WRITE_IDEMPOTENCY = PASS
COLLISION_FAIL_CLOSED = PASS
```

Verification used the isolated Tenant `GreanLean Reference Write Verification` in PreProd at migration head `0035`. Its codes and identifiers use the `GLW` / `DPP-GLW-WRITE-*` namespace, so the accepted Reference demo and SOODOO records were not modified. The verification Tenant is classified `INTERNAL_SYNTHETIC_WRITE_VERIFICATION` and is not a default demo.

## Partial resume

The first run deliberately stopped after hierarchy completion with exit code `75`. At the checkpoint, the workflow had created exactly 1 family, 8 models, 22 SKUs, 8 batches, 22 batch-SKU links, and 22 individuals, with no passport/publication data.

The next dry-run reported zero remaining hierarchy writes and exactly the remaining source, mapping, claim, review, publication, resolver, and synthetic BMS work. Resuming completed without duplicating hierarchy records.

## Completed publication chain

| Resource | Count |
| --- | ---: |
| Family | 1 |
| Models | 8 |
| SKUs | 22 |
| Batches | 8 |
| Batch-SKU links | 22 |
| Individuals | 22 |
| Source records / transformations | 22 / 22 |
| Provenance records / canonical claims | 374 / 374 |
| Passports / reviews | 22 / 22 |
| Immutable versions / current pointers | 22 / 22 |
| Resolver mappings / BMS snapshots | 22 / 22 |
| Registry submissions | 0 |

All 22 public resolver checks returned HTTP 200 and immutable Version 1. The workflow actors were distinct for author, reviewer, and publisher. Backoffice snapshot counts matched the database counts; productized UI and QR checks passed.

## Idempotency and collision evidence

After the completed run, the planner returned zero proposed mutations for every resource. A second confirmed-write execution completed with the same counts. Before/after sorted record-ID manifests had the same SHA-256:

```text
c8d9f2e288f38d61c743ee63d28e97cc506369d4550385294fb8518ec9afbd66
```

The collision test detected all existing verification identifiers (`22` DPP IDs, `22` serials, `22` SKUs, and `8` model codes) and proved that a foreign-owner collision is rejected before a write. Own-Tenant matches are treated only as resumable records and must still pass state checks.

## Audience safety

| Check | Result |
| --- | --- |
| Resolver HTTP 200 | 22/22 |
| Version 1 | 22/22 |
| Required warnings | 22/22 |
| Public data leakage | NONE |
| Source vendor / `TL-*` leakage | NONE |
| Public BMS leakage | NONE |
| Unverified data presented as verified | NONE |

Every public passport retains `SYNTHETIC DEMO DATA`, `NOT CUSTOMER VERIFIED`, and `NOT FOR REGULATORY DECLARATION` warnings.

## Regression suite

```text
LINT = PASS
TYPECHECK = PASS
UNIT_AND_INTEGRATION_TESTS = 235 / 235 PASS
MIGRATION_TESTS = 56 / 56 PASS
PRODUCTION_BUILD = PASS
CREDENTIAL_SCAN = PASS
LOCAL_ABSOLUTE_PATH_SCAN = PASS
ENVIRONMENT_FILE_EXCLUSION = PASS
GENERATED_ARTIFACT_EXCLUSION = PASS
DEBUG_TEMPORARY_MARKER_SCAN = PASS
```

The isolated verification data is retained as immutable test evidence; it is not selected for Production onboarding and it does not activate a public default or Production feature flag.
