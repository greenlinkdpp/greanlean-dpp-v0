# Phase 7 — Backoffice-Inclusive Production Application Deployment

Deployment created: `2026-09-28T12:24:09.859Z`  
Production-safe verification completed: `2026-09-28T12:38:02Z`

## Result

```text
BACKOFFICE_PRODUCTION_APPLICATION_DEPLOYMENT = PASS
DEPLOYED_RC_MATCH = TRUE
PRODUCTION_MIGRATION_HEAD_BEFORE = 0035
PRODUCTION_MIGRATION_HEAD_AFTER = 0035
V1_AFTER_DEPLOYMENT = PASS
ROLLBACK_EXECUTED = NO
```

The exact application/runtime source archived from `codex/phase7-v2-backoffice-rc` was deployed to the existing `greanlean-dpp-v0` Vercel Production project. No migration, Production database write, business-data seed, feature-flag change, Registry submission or connector activation was performed.

| Field | Value |
|---|---|
| RC reference | `codex/phase7-v2-backoffice-rc` |
| RC commit | `4c0aa4a306fc7f62a57e374d07f57f55e84fbda0` |
| RC tree | `cc17d8ceeb012774ce6435b68baf5dbcb79aea38` |
| RC tracked files | 897 |
| Previous Production deployment | `dpl_3pVpitoxedeeEUy9DWHe76igZcwp` |
| New Production deployment | `dpl_2n7VMa4Bgs4pxtiXtzJVHQdYApgA` |
| New immutable URL | `https://greanlean-dpp-v0-2a9r0sxrp-songweinie-1175s-projects.vercel.app` |
| State | READY / Production |
| Aliases | `www.greanlean.com`, `greanlean.com`, `greanlean-dpp-v0.vercel.app` |

The deployment source was a `.git`-free archive created directly from the RC reference. Before Vercel linking it contained all 897 tracked files and its `package.json` SHA-256 matched the RC. Linking added only ignored local `.vercel` metadata and an ephemeral `.env.local`; the CLI also appended `.env*` to the deployment-copy `.gitignore`. Those deployment-tool files were not part of application runtime source. All application, runtime, configuration, migration and test files remained byte-identical to the accepted RC.

## Before and after controls

| Gate | Before | After |
|---|---:|---:|
| Migration head | `0035` | `0035` |
| Global V2 Primary | FALSE | FALSE |
| SOODOO V2 Primary | FALSE | FALSE |
| Other-Tenant V2 Primary | FALSE | FALSE |
| V1 organisations / projects / products / versions / aliases | 3 / 0 / 9 / 12 / 6 | 3 / 0 / 9 / 12 / 6 |
| SOODOO Organisation / Model / Item / Passport / identifier | 0 / 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 / 0 |
| Connector instances | 0 | 0 |
| Registry V2 submissions | 0 | 0 |

Production continues to have no `FEATURE_V2_*`, Registry or connector environment variable enabled. The representative V2 Resolver still returns the expected feature-disabled 404. No Tenant is routed to V2 Primary.

## Immediate V1 and alias verification

| Check | Result |
|---|---|
| `www.greanlean.com` | 200 |
| `greanlean.com` | expected 307 canonical redirect; alias belongs to new deployment |
| `greanlean-dpp-v0.vercel.app` | 200 |
| Homepage | 200 |
| Representative V1 public DPP | 200; DPP identifier present |
| Representative V1 public API | 200; exact pre/post payload SHA-256 match |
| Login | 200 |
| Auth settings | 200 |
| Storage inventory | 200; 3 buckets |
| Positive legacy alias | 200 |
| Established negative GS1 route | expected 404 |
| Approved QR | 200 PNG |
| Arbitrary external QR | 400 `QR_TARGET_NOT_APPROVED` |

The raw homepage and public-page hashes changed because the new build and per-request CSP nonce change rendered HTML. Semantic content checks passed, and the canonical public API fingerprint remained exactly `e93ee7d183176c0d4b2b5487fe7c53e2af3ce04736b505ec8a452f73cce097f7` before and after.

## Backoffice, CSP and security verification

The Backoffice route is now present in Production but remains protected. An unauthenticated context request returned 401. A real Chrome navigation to `/dashboard/v2` ended at the login page without exposing Backoffice data. Production anonymous REST reads returned zero rows for Organisation, Model, Item, Passport and identifier tables.

Tenant isolation and foreign-Tenant denial remain enforced by the same byte-identical RC and migration head that returned 403 for a foreign Tenant during accepted Hosted PreProd verification. No Production account or test data was created merely to repeat that destructive-risk-free proof. The V1 and V2 dashboard gates remain separate under the passing frozen contract suite.

Real Chrome loaded the login document to `readyState=complete`, rendered the password form and reported no page error. The response carried a CSP nonce, and all five loaded framework scripts used the same nonce. A second resource capture found no failed response.

Eleven client bundles totalling 811,166 bytes were scanned. No service-role or deployment credential value was found. Restricted Synthetic supplier/internal markers were absent from public HTML, JSON, hydration content and client bundles. The false phrase `retained and verified` was absent. An unsigned `audience=MANUFACTURER` page remained public, while the authenticated audience API rejected escalation with 401.

```text
BACKOFFICE_AUTH_BOUNDARY = PASS
TENANT_ISOLATION = PASS
CSP_NONCE = PASS
PUBLIC_DATA_LEAKAGE = NONE
UNVERIFIED_FALSE_VERIFIED_TEXT = NONE
CLIENT_BUNDLE_SECRET_MATCHES = 0
PUBLIC_ROLE_SPOOF = BLOCKED / NO ELEVATION
ARBITRARY_QR_TARGET = DISALLOWED
SECURITY_HEADERS = PASS
```

## Immediate performance and error snapshot

The Production-safe sample made 25 sequential requests: five each for homepage, V1 public DPP, V1 public API, Auth and Storage.

| Route | Result | p50 | p95 |
|---|---|---:|---:|
| Homepage | 5/5 HTTP 200 | 1,643 ms | 2,638 ms |
| V1 public DPP | 5/5 HTTP 200 | 5,508 ms | 6,538 ms |
| V1 public API | 5/5 HTTP 200 | 2,167 ms | 2,188 ms |
| Auth | 5/5 HTTP 200 | 1,408 ms | 2,327 ms |
| Storage | 5/5 HTTP 200 | 1,527 ms | 2,998 ms |

HTTP 5xx rate and unexpected 4xx rate were both 0%. A second five-request V1 DPP sample remained error-free at p50 5,021 ms and p95 6,112 ms. This short client-side sample is elevated relative to the preceding application deployment's immediate DPP sample, while the public API sample improved materially and the other network services varied in both directions. No application-specific or sustained 15-minute breach was established, so this was recorded as a latency observation rather than a rollback trigger. The formal seven-day observation window was not started.

Vercel reported zero HTTP 500 logs. Four error-level records were the expected verification probes: feature-disabled V2 404, unauthenticated Backoffice 401, audience escalation 401 and disallowed QR 400. Unexpected deployment errors were zero.

## Rollback and stop boundary

Primary application rollback remains ready by restoring Production aliases to `dpl_3pVpitoxedeeEUy9DWHe76igZcwp`; the secondary prior reference is `dpl_4UWPqEXqygwG6vSzj67Cw8pNFReL`. The latest verified managed backup remains `1801742967`, completed `2026-09-27T16:53:31.313Z`. Database restore was neither expected nor authorized. No rollback trigger fired.

The complete V2 application is present but remains non-primary. Production contains no SOODOO business objects, no Synthetic Demo was copied, no Registry or real connector was activated, no Pilot observation window was started, Phase 7 is not complete and Phase 8 was not entered.

```text
NEXT ACTION =
THE COMPLETE V2 APPLICATION IS NOW PRESENT IN PRODUCTION
BUT REMAINS NON-PRIMARY.
WAIT FOR USER DECISION ON THE REAL CUSTOMER DATA GATE
BEFORE ANY PILOT CUTOVER OR OBSERVATION WINDOW.
```
