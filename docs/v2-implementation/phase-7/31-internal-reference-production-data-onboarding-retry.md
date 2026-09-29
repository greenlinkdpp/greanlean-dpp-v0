# Phase 7 — Internal Reference Production Data Onboarding Retry

Generated: `2026-09-28`

## Result

```text
INTERNAL_REFERENCE_PRODUCTION_DATA_ONBOARDING = FAIL
CONFIRMED_WRITE_RC_PRODUCTION_DEPLOYMENT = PASS
FRESH_BACKUP_GATE = PASS
FAILURE_MODE = FAIL_CLOSED_AT_FIRST_MAPPING_DRY_RUN
```

The exact approved confirmed-write RC was deployed successfully, but the guarded Production workflow stopped at the first application API call because the Production server-side V2 API feature set is disabled. No second write attempt, feature-flag change, cleanup, migration, Registry action, connector activation, V2 Primary change, or rollback was performed.

## Approved inputs and deployment

| Field | Value |
| --- | --- |
| RC reference | `codex/phase7-internal-reference-confirmed-write-rc` |
| RC commit | `b4412f0a32f0e91c3b16f6bc7017f8ee7a9de773` |
| RC tree | `166c65c46bdadf9ba4a31759dfd21a2d22d2c1f7` |
| RC tracked files / untracked files | `919 / 0` |
| Fixture SHA-256 | `018c60c9db81d621aa439d5f801d5aad2756d29be4762bb85d106b2735425222` |
| Previous Production deployment | `dpl_2n7VMa4Bgs4pxtiXtzJVHQdYApgA` |
| New Production deployment | `dpl_E6SqW2kKTseE1jYajt5k6uutE56p` |
| Immutable URL | `https://greanlean-dpp-v0-4avqi95po-songweinie-1175s-projects.vercel.app` |
| Deployment state | `READY`, Production, aliased to `www.greanlean.com` |

The post-deployment application smoke passed before the data write: homepage, representative V1 DPP, representative V1 API, login, Auth, Storage, approved QR, CSP nonce/hydration, and the unauthenticated Backoffice boundary behaved as expected. Migration head remained `0035` and V1 counts were unchanged.

## Fresh backup gate

The latest completed managed physical Production backup was re-read immediately before the first write:

```text
FRESH_BACKUP_REFERENCE = 1811221013
BACKUP_PROJECT_REF = lpxdbysgmdsjhxrjzhly
BACKUP_STATUS = COMPLETED
BACKUP_COMPLETED_AT = 2026-09-28T16:53:51.066Z
BACKUP_CHECKED_AT = 2026-09-29T03:51:28.225Z
BACKUP_AGE_HOURS = 10.96
```

The project, status, chronology, age, and non-empty reference gates all passed.

## Confirmed-write attempt

The only authorized Production write invocation was used with the exact RC commit/tree and backup evidence. It created the resumable foundation checkpoint, then attempted the first mapping dry run through:

```text
POST /api/v2/mapping-versions/<id>/dry-run
```

Production returned:

```text
HTTP 404
code = V2_FEATURE_DISABLED
message = The V2 API is not enabled in this environment.
```

No transformation, claim, passport, review, immutable version, current pointer, resolver mapping, BMS snapshot, or Registry submission was created. The failure occurred before any publication API call.

## Root cause and authorization boundary

The confirmed-write implementation correctly uses the tenant-scoped application APIs for mapping and publication. Those APIs require the server-side Phase 1–4 feature flags, while the current Production Vercel environment contains no `FEATURE_SERVER_API_V2` or `FEATURE_V2_*` server flags. The current instruction explicitly prohibited feature-flag changes, so enabling them was outside this execution's authorization.

The new application deployment remains active because V1 smoke passed and the failure is configuration-gated rather than an application regression. The partial Reference state remains dormant and resumable; destructive cleanup and database restore are not appropriate.

```text
GLOBAL_V2_PRIMARY = FALSE
REFERENCE_TENANT_V2_PRIMARY = FALSE
SOODOO_V2_PRIMARY = FALSE
OTHER_TENANT_V2_PRIMARY = FALSE
REGISTRY = OFF
REAL_CUSTOMER_CONNECTORS = OFF
FORMAL_OBSERVATION_WINDOW_STARTED = NO
PHASE_8_ENTERED = NO
```
