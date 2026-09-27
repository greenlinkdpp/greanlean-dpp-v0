# SOODOO Canonical Tenant Provisioning Evidence

```text
SOODOO_TENANT_PROVISIONING = FAIL
PILOT_TENANT_SELECTED = FALSE
PILOT_TENANT_NAME = SOODOO E-bike
PILOT_TENANT_ID = null

PRODUCTION_MIGRATION_PERFORMED = NO
PRODUCTION_V2_DATA_MIGRATION_PERFORMED = NO
PRODUCTION_TRAFFIC_SWITCHED = NO
PRODUCTION_DEPLOYMENT_CHANGED = NO
```

## Decision

The requested canonical Tenant cannot be provisioned within the authorised boundary. Production remains at migration head `0026`; the approved canonical `tenant` and `organisation_v2` tables are introduced by migration `0027` and are absent from Production. The instruction explicitly forbids Production migrations `0027`–`0035` and any V2 schema deployment.

No legacy Organisation was reinterpreted as a Tenant, no alternate storage was invented, no UUID was manually assigned, and no Production write was attempted.

## Pre-provisioning checks

Checked at `2026-09-27T16:56:25.707Z` using read-only service access.

| Check | Result |
|---|---|
| Production project | `greanlean-dpp`, ref `lpxdbysgmdsjhxrjzhly` |
| Production health | `ACTIVE_HEALTHY`; REST 200, Auth 200, Storage 200 |
| Migration head | `0026` |
| Canonical `tenant` table | absent, REST 404 / `PGRST205` |
| Canonical `organisation_v2` table | absent, REST 404 / `PGRST205` |
| Existing canonical SOODOO Tenant | none; canonical table does not exist |
| V1 `dpp_organisation` | 3 rows checked, 0 SOODOO matches |
| V1 `dpp_project` | 0 rows checked, 0 SOODOO matches |
| V1 `products` | 9 rows checked, 0 SOODOO matches |
| Collision normalization | Unicode NFKC, lowercase, remove non-alphanumeric separators |
| SOODOO normalized-name/slug/external-ID collision | none found in available records |
| Other Tenant modified | no |

The search covered `SOODOO E-bike`, `SOODOO EBIKE`, and `SOODOO` normalized variants. No record was treated as a match through guesswork.

## Provisioning result

| Required record | Result |
|---|---|
| Canonical Tenant ID | `null` |
| Tenant name | not created |
| Created timestamp | not applicable |
| Organisation relationship | not created |
| IAM/ownership metadata | not created |
| Provisioning audit record | not created because no authorised write could begin |

The missing schema is a hard prerequisite, not permission to apply migration `0027`. The approved RC and its migration files remain unchanged.

## Production invariance evidence

The database fingerprints before and after the blocked provisioning attempt are identical:

| Resource | Before SHA-256 | After SHA-256 | Result |
|---|---|---|---|
| V1 organisations | `7dd9d1f1875f5bc858b282faa9ea4658820f553bc5e4d89a6241ecf986cf2519` | `7dd9d1f1875f5bc858b282faa9ea4658820f553bc5e4d89a6241ecf986cf2519` | unchanged |
| V1 projects | `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945` | `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945` | unchanged |
| V1 products | `42caab3ea87733874ecd81f889b8435e22bdb2d13edad2ba12970bdb91a1d9c7` | `42caab3ea87733874ecd81f889b8435e22bdb2d13edad2ba12970bdb91a1d9c7` | unchanged |
| Migration ledger | `93ed450187f1a767b59720fe7f5be3102170250c8ee1b5ecef3804b99a4e5c20` | `93ed450187f1a767b59720fe7f5be3102170250c8ee1b5ecef3804b99a4e5c20` | unchanged |

The second read-only verification completed at `2026-09-27T16:57:32.673Z`; migration head remained `0026` and `tenant` remained absent.

## V1 public smoke before and after

| Surface | Before | After | Expected |
|---|---:|---:|---:|
| `https://www.greanlean.com/` | 200 | 200 | 200 |
| Existing public DPP | 200 | 200 | 200 |
| Existing public API | 200 | 200 | 200 |
| Legacy `/01/06900000014336` baseline | 404 | 404 | 404 |
| `https://dpp.greanlean.com/login` | 200 | 200 | 200 |

No V1 URL, API, QR behavior, deployment, Registry, connector, feature flag, or traffic state changed.

## Required next decision

A future instruction must reconcile the conflicting prerequisites: the canonical Tenant requires the Phase 1 schema from migration `0027`, while this authorization prohibits that migration. Until separately authorised, Phase 7 remains stopped before any Production write.
