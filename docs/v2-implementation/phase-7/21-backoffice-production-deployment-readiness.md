# Phase 7 — Backoffice Production Deployment Readiness

Generated: `2026-09-28T11:56:18Z`

## Readiness result

```text
PRODUCTION_READ_ONLY_BASELINE = PASS
PRODUCTION_MIGRATION_HEAD = 0035
ROLLBACK_READY = TRUE

PRODUCTION_APPLICATION_DEPLOYED = NO
PRODUCTION_DATA_WRITE_PERFORMED = NO
PRODUCTION_TRAFFIC_SWITCHED = NO
SYNTHETIC_DEMO_COPIED_TO_PRODUCTION = NO
REGISTRY_SUBMISSION_PERFORMED = NO
REAL_CUSTOMER_CONNECTORS_ACTIVATED = NO
```

This document is the refreshed informational change package for a later, explicitly approved Backoffice-inclusive application deployment. It is not deployment authorization, and no change was executed against Production.

## Production read-only baseline

Production project `lpxdbysgmdsjhxrjzhly` (`greanlen-dpp` in the Supabase project record) reported `ACTIVE_HEALTHY`. Database inspection used read-only queries; application smoke used GET requests.

| Check | Result |
|---|---|
| Migration head | `0035` |
| Canonical SOODOO Tenant | one ACTIVE Tenant, `0c2f6dff-560d-4eeb-be47-1e87a2f710fe` |
| SOODOO Organisation / Model / Item / Passport / identifier | 0 / 0 / 0 / 0 / 0 |
| Connector instances | 0 |
| Registry V2 submissions | 0 |
| V1 organisations / projects / products / versions / identifier aliases | 3 / 0 / 9 / 12 / 6 |
| Homepage | HTTP 200 |
| Representative V1 public DPP | HTTP 200 |
| Representative V1 public API | HTTP 200 |
| Login | HTTP 200 |
| Dormant representative V2 Resolver request | HTTP 404 |
| V1 continuity | PASS |

No Production environment variable enables any `FEATURE_V2_*`, Registry or connector feature. Feature defaults are false. With no SOODOO business rows, no connector instance and no Registry submission, the refreshed state is:

```text
GLOBAL_V2_PRIMARY = FALSE
SOODOO_V2_PRIMARY = FALSE
OTHER_TENANT_V2_PRIMARY = FALSE
REGISTRY = OFF
REAL_CUSTOMER_CONNECTORS = OFF
```

Representative response fingerprints captured during the baseline were:

| Surface | SHA-256 |
|---|---|
| Production homepage | `958da80ef044449e5848eee5261335745fceaf72928f44e203cdbf66764f3708` |
| Production V1 DPP | `6240586186aa24290bff32a8c70175d97b1542c344870c08cf7d605295426fce` |
| Production V1 API | `8a0d1cc4f05eab8c5dd88eb92062ea3e6e65c42eb5f7fa42a1fecece3ab17c9a` |

## Proposed application-only change — not approved or executed

| Field | Proposed value |
|---|---|
| Source RC | `codex/phase7-v2-backoffice-rc` |
| RC commit | `4c0aa4a306fc7f62a57e374d07f57f55e84fbda0` |
| Target Vercel project | `greanlean-dpp-v0` |
| Database change | none; migration head must remain `0035` |
| Pilot Tenant | SOODOO E-bike / `0c2f6dff-560d-4eeb-be47-1e87a2f710fe` |
| V2 Primary flags | keep Global, SOODOO and every other Tenant false |
| Registry / real connectors | keep off |
| Synthetic Demo transfer | prohibited |

If separately approved, post-deployment verification must cover the Production homepage, V1 public DPP/API, legacy and QR routes, login/Auth, Storage, representative V1 counts/fingerprints, dormant V2 behavior, Backoffice authorization, CSP nonce propagation, public projection leakage, security headers, errors and latency. Any code change after this freeze invalidates the RC and requires PreProd verification again.

## Rollback readiness

| Item | Reference |
|---|---|
| Current Production deployment | `dpl_3pVpitoxedeeEUy9DWHe76igZcwp` |
| Current Production URL | `https://greanlean-dpp-v0-4ywjf50zl-songweinie-1175s-projects.vercel.app` |
| Production aliases | `https://www.greanlean.com`, `https://greanlean.com`, `https://greanlean-dpp-v0.vercel.app` |
| Primary future rollback | restore the aliases to `dpl_3pVpitoxedeeEUy9DWHe76igZcwp` |
| Secondary prior deployment reference | `dpl_4UWPqEXqygwG6vSzj67Cw8pNFReL` |
| Latest verified managed backup | `1801742967` |
| Backup completed | `2026-09-27T16:53:31.313Z` |
| Database rollback expectation | none for an application-only deployment |

Rollback triggers include any V1 smoke or fingerprint regression, public-data leakage, unexpected V2-primary behavior, Auth/Storage regression, QR/Resolver incompatibility, material error/latency regression or database-head change. The approved pattern for a future application-only rollout is to stop rollout, keep V2 flags, Registry and real connectors off, restore the current application alias, and repeat the baseline. Database restore is outside this application-only rollback and requires separate authorization.

## Remaining boundary

Real SOODOO customer business data is still absent from Production. The Synthetic Demo must not be copied. No seven-day Pilot observation window starts from this RC freeze, and Phase 7 is not complete.

```text
NEXT ACTION =
WAIT FOR EXPLICIT USER APPROVAL TO DEPLOY THE
BACKOFFICE-INCLUSIVE RELEASE CANDIDATE TO PRODUCTION.
```
