# Phase 7 — Production Cutover Readiness

Generated: `2026-09-28T05:22:36Z`

## Readiness result

```text
PRODUCTION_READ_ONLY_BASELINE = PASS
ROLLBACK_READY = TRUE
PRODUCTION_APPLICATION_DEPLOYED = NO
PRODUCTION_DATA_WRITE_PERFORMED = NO
PRODUCTION_TRAFFIC_SWITCHED = NO
```

This is the informational change package for a later explicitly approved application deployment. It is not deployment approval and was not executed.

## Production read-only baseline

All live checks used GET or HEAD only against Production project `lpxdbysgmdsjhxrjzhly`.

| Check | Result |
|---|---|
| Migration head | `0035` (`phase6c_resolver_fast_path`) |
| Canonical SOODOO Tenant | one ACTIVE row, `0c2f6dff-560d-4eeb-be47-1e87a2f710fe` |
| SOODOO Organisation / Model / Item / Passport / identifier | 0 / 0 / 0 / 0 / 0 |
| Connector instances | 0 |
| Registry V2 submissions | 0 |
| Auth settings endpoint | HTTP 200 |
| Storage bucket inventory | HTTP 200, 3 buckets |
| V1 organisations / projects / products / versions / identifier aliases | 3 / 0 / 9 / 12 / 6 |
| Homepage | HTTP 200 |
| Public DPP | HTTP 200 |
| Public API | HTTP 200 |
| Established legacy negative route | HTTP 404, unchanged |
| Login | HTTP 200 |

No Production environment key enables a V2-primary feature flag. The currently deployed Production application predates this Productized UI RC, and Production has no connector or Registry activity. Therefore Global V2 Primary, SOODOO V2 Primary and every other Tenant V2 Primary remain false.

## Proposed application-only change request — not approved or executed

| Field | Proposed value |
|---|---|
| Source RC | `codex/phase7-v2-productized-ui-rc` at `0909c9d51205604b7cdf896b7de3d4bc440f4680` |
| Target | current `greanlean-dpp-v0` Production application |
| Database change | none; head remains `0035` |
| Pilot Tenant | SOODOO E-bike / `0c2f6dff-560d-4eeb-be47-1e87a2f710fe` |
| Feature flags before deployment | Global, SOODOO and other-Tenant V2 Primary false |
| Registry / real connectors | remain off |
| Expected scope | application-only deployment |

Required post-deployment smoke checks, if separately approved, are homepage, existing V1 public DPP/API, legacy and QR routes, Auth, Storage, representative V1 counts/fingerprints, V2 routes with primary flags still off, public projection leakage, security headers and error rate/latency.

## Rollback readiness

| Item | Reference |
|---|---|
| Current Production deployment | `dpl_4UWPqEXqygwG6vSzj67Cw8pNFReL` |
| Current Production deployment URL | `https://greanlean-dpp-v0-7g62q6ny5-songweinie-1175s-projects.vercel.app` |
| Application rollback reference | redeploy/alias the current Production deployment above |
| Latest verified managed backup | `1801742967`, completed `2026-09-27T16:53:31.313Z` |
| Database rollback expectation | none required for the proposed application-only change |
| Kill switches | keep Global/SOODOO/all other V2 Primary false; Registry and real connectors off |

Rollback triggers include V1 smoke failure, public-data leakage, Auth/Storage regression, unexpected V2-primary behavior, material error-rate or latency regression, QR/Resolver incompatibility, or any database-head change. The rollback procedure is to stop rollout, keep all V2 flags/Registry/connectors off, restore the current Production application reference and repeat the V1 baseline. Database restore is not part of an application-only rollback and must not be attempted without separate authorization.

The future observation plan starts only after explicit deployment and cutover approval. It must monitor V1/V2 HTTP health, Resolver/QR compatibility, public leakage, error rate, latency, Auth/Storage availability and audit events. This instruction did not start the seven-day observation window.

## Remaining Gate

The application RC is ready for a separately approved deployment, but real SOODOO customer business data remains absent. No Synthetic Demo data may be copied to Production, and the real Pilot cutover cannot be declared complete until deterministic customer data, reconciliation, publication and the remaining Phase 7 Gates are approved and passed.

```text
NEXT ACTION =
WAIT FOR EXPLICIT USER APPROVAL OF THE PRODUCTION APPLICATION DEPLOYMENT
AND THE REMAINING PHASE 7 PILOT CUTOVER CHANGE REQUEST.
```

