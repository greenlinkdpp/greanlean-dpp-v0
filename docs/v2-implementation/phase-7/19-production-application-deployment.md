# Phase 7 — Production Application-Only Deployment

Deployment created: `2026-09-28T06:07:32.144Z`  
Post-deployment verification completed: `2026-09-28T06:12:59.436Z`

## Result

```text
PRODUCTION_APPLICATION_DEPLOYMENT = PASS
DEPLOYED_RC_MATCH = TRUE
PRODUCTION_MIGRATION_HEAD_BEFORE = 0035
PRODUCTION_MIGRATION_HEAD_AFTER = 0035
V1_AFTER_APPLICATION_DEPLOYMENT = PASS
ROLLBACK_EXECUTED = NO
```

The exact source snapshot from RC `codex/phase7-v2-productized-ui-rc` was deployed to the existing `greanlean-dpp-v0` Vercel Production project. No repository HEAD, migration, Production database row, feature flag, connector or Registry state was changed.

| Field | Value |
|---|---|
| RC commit | `0909c9d51205604b7cdf896b7de3d4bc440f4680` |
| RC tree | `bee3bb947ba84668a4b079adcf171026329aa81c` |
| Approved build ID | `Jh7WCWCCbbIdoCGFC9C7D` |
| Previous Production deployment | `dpl_4UWPqEXqygwG6vSzj67Cw8pNFReL` |
| New Production deployment | `dpl_3pVpitoxedeeEUy9DWHe76igZcwp` |
| New immutable URL | `https://greanlean-dpp-v0-4ywjf50zl-songweinie-1175s-projects.vercel.app` |
| Production aliases | `www.greanlean.com`, `greanlean.com`, `greanlean-dpp-v0.vercel.app` |
| Deployment status | READY / Production |

The first CLI attempt, `dpl_EDJcuQZcURenBvSfENaWNttYpiiT`, was blocked before build because the RC commit author was not a Vercel project member. It received no Production aliases and changed no Production state. The successful deployment used a `.git`-free `git archive` of the exact approved commit: 867 tracked source files from the same tree, with only the ignored local Vercel project-link metadata added for targeting. This removed unrelated author metadata without changing the approved source.

## Before and after controls

| Gate | Before | After |
|---|---:|---:|
| Migration head | `0035` | `0035` |
| Global V2 Primary | FALSE | FALSE |
| SOODOO V2 Primary | FALSE | FALSE |
| Other-Tenant V2 Primary | FALSE | FALSE |
| SOODOO Organisation / Model / Item / Passport / identifier | 0 / 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 / 0 |
| Connector instances | 0 | 0 |
| Registry V2 submissions | 0 | 0 |
| V1 organisations / projects / products / versions / aliases | 3 / 0 / 9 / 12 / 6 | 3 / 0 / 9 / 12 / 6 |

Production has no `FEATURE_V2_*` application variables. The V2 Resolver and Tenant endpoints return the dormant `404` feature-disabled response. No Tenant is routed to V2 Primary.

## Immediate Production verification

| Check | Result |
|---|---|
| Homepage | 200 |
| Existing V1 public DPP | 200 |
| Existing V1 public API | 200; `accessLevel=PUBLIC` |
| Login | 200 |
| Auth settings | 200 |
| Storage inventory | 200; 3 buckets |
| Positive public-slug and DPP-ID aliases | four representative aliases returned 200 |
| Established negative GS1 route | expected 404, unchanged |
| Approved official QR target | 200 PNG |
| Arbitrary external QR target | 400 `QR_TARGET_NOT_APPROVED` |
| V2 Resolver / Tenant routes | present but dormant, 404 |

The normal public page and an unsigned `audience=MANUFACTURER` page both remained public and exposed none of the restricted test markers. The corresponding API escalation attempt was rejected with `401 AUTH_REQUIRED`; it did not elevate the caller.

## Security and compatibility

Twelve Production client bundles totalling 852,790 bytes were compared against the available service-role and deployment credentials; matches were zero. Restricted Internal/Authority-only fixture markers were absent from public HTML and JSON. No false verified text was observed. CSP, HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` and the referrer policy remained present.

```text
PUBLIC_DATA_LEAKAGE = NONE
UNVERIFIED_FALSE_VERIFIED_TEXT = NONE
CLIENT_BUNDLE_SECRET_MATCHES = 0
PUBLIC_ROLE_SPOOF = BLOCKED / NO ELEVATION
ARBITRARY_QR_TARGET = DISALLOWED
RESOLVER_COMPATIBILITY = PASS
QR_COMPATIBILITY = PASS
```

Stable V1 Passport IDs, public JSON/HTML, active aliases and QR behavior passed. The withdraw/tombstone contract remains covered by the frozen RC's passing integration suite; no live Production record was mutated to test withdrawal.

## Immediate performance/error snapshot

The corrected post-deployment sample contained 25 requests: five each for homepage, V1 public page, V1 public API, Auth and Storage.

| Route | Result | p50 | p95 |
|---|---|---:|---:|
| Homepage | 5/5 HTTP 200 | 1,412 ms | 1,741 ms |
| V1 public page | 5/5 HTTP 200 | 3,003 ms | 4,840 ms |
| V1 public API | 5/5 HTTP 200 | 3,882 ms | 5,422 ms |
| Auth | 5/5 HTTP 200 | 1,067 ms | 1,812 ms |
| Storage | 5/5 HTTP 200 | 1,451 ms | 2,140 ms |

Sampled HTTP 5xx rate was 0%; unexpected 4xx rate was 0%. The V1 page/API values were not materially worse than the immediate pre-deployment single-request baseline of approximately 4.7 seconds. Vercel returned no 500 log records for the new deployment during the verification interval.

## Rollback and stop boundary

Application rollback remains ready through `dpl_4UWPqEXqygwG6vSzj67Cw8pNFReL`. The latest verified managed database backup remains `1801742967`, completed `2026-09-27T16:53:31.313Z`; a database restore was neither needed nor authorized. No rollback trigger fired.

The real SOODOO data Gate remains pending. Synthetic Demo data was not copied to Production, no V2 Primary state was enabled, the seven-day observation window was not started, and Phase 8 was not entered.

