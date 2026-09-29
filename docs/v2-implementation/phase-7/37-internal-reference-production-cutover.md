# Phase 7 — Internal Reference Production Cutover Attempt

Generated: `2026-09-29`

## Result

```text
INTERNAL_REFERENCE_PRODUCTION_CUTOVER = FAIL
TECHNICAL_GO_LIVE = FALSE
ROLLBACK_EXECUTED = YES
FORMAL_OBSERVATION_WINDOW_STARTED = NO
```

The authorized cutover was attempted with the exact accepted application source. The two minimum public flags were enabled and the existing deployment `dpl_6poWp5p95At2hq4jbUAn1hZkQo3y` was redeployed from its own immutable source. The resulting Production deployment was `dpl_2t12LUAwViT4FdMg3KcVeDziMcSv`.

The first Resolver API probe passed, but the corresponding productized `/p/` page returned HTTP 404. Because `PUBLIC_DPP_ROUTES = 22/22 PASS` could no longer be achieved, verification stopped at the first Passport and the configuration rollback was executed immediately.

## Pre-cutover baseline

| Gate | Result |
| --- | --- |
| Production project | `greanlen-dpp` / `lpxdbysgmdsjhxrjzhly`, ACTIVE_HEALTHY |
| Migration head | `0035` |
| Accepted RC | `b4412f0a32f0e91c3b16f6bc7017f8ee7a9de773`; tree `166c65c46bdadf9ba4a31759dfd21a2d22d2c1f7` |
| Baseline deployment | `dpl_6poWp5p95At2hq4jbUAn1hZkQo3y`, READY |
| Fresh backup | `1811221013`, COMPLETED `2026-09-28T16:53:51.066Z`, age about 16.1 hours |
| Reference topology | 22 Passports / Versions / Pointers / Resolver mappings / BMS snapshots |
| Registry / active real connectors | 0 / 0 |
| Resolver allowlist | exact ACTIVE `www.greanlean.com` row present |
| V1 pre-cutover | PASS |

Reference Mobility owns all 22 Production `publication_source=V2` Passports and all 22 V2 Resolver mappings. SOODOO owns zero Passports and zero mappings. Public feature flags and V2 Passport selection are separable from the unchanged V1 paths; no Global or non-Reference fallback was introduced.

## Cutover attempt

The following Production flags were added as Config values and compiled into the immutable-source redeploy:

```text
FEATURE_V2_PUBLIC_READ = true
FEATURE_V2_PUBLIC_PROJECTION = true
```

No application code, migration or database row was changed. Registry, external connector, connector execution, file import and BMS adapter flags remained off.

| First-pass probe | Result |
| --- | --- |
| `/api/v2/resolver/DPP-GLR-EBIKE-000001?format=json` | HTTP 200; identifier correct; Version 1; payload hash `37018545c5390f27895b08738d30be73e812c66390243fa440d0c94c5fd89d28`; warnings and Reference brand present |
| `/p/DPP-GLR-EBIKE-000001?lang=en` | HTTP 404 — blocking failure |
| unknown Reference DPP | HTTP 409 `RESOLVER_NOT_FOUND` |
| representative SOODOO synthetic path | HTTP 404; no non-primary exposure |

## Root cause boundary

The Resolver API uses the incoming request hostname and therefore matched `www.greanlean.com`. The productized page uses the hostname derived from `NEXT_PUBLIC_SITE_URL` for its internal Resolver lookup. That configured host does not match the only approved Production mapping/allowlist host, `www.greanlean.com`, so the page fails closed and returns not found.

The earlier allowlist authorization expressly prohibited adding `greanlean.com`, a wildcard, port variant or alternate host. This cutover authorization allowed only the two public feature flags and did not authorize changing `NEXT_PUBLIC_SITE_URL` or modifying application code. No unapproved workaround was applied.

```text
PUBLIC_GATE_SEPARATION = PARTIAL
PUBLIC_RESOLVER_API_GATE = PASS
PRODUCTIZED_PAGE_GATE = FAIL
PRODUCTIZED_UI = FAIL
```

## Rollback

Vercel aliases were rolled back to `dpl_6poWp5p95At2hq4jbUAn1hZkQo3y`. Both newly added public flags were removed from the Production environment.

Post-rollback verification passed:

- homepage, V1 DPP, V1 API, login, Auth, Storage and positive legacy alias: HTTP 200;
- legacy QR: HTTP 200 PNG;
- Reference V2 Resolver: HTTP 404 `V2_FEATURE_DISABLED`;
- Reference product page: HTTP 404;
- migration head: `0035`;
- Reference topology remained `22 / 22 / 22 / 22 / 22`;
- Registry submissions and active real Production connectors remained zero.

No immutable data was deleted or changed. No database restore was required.

## Required continuation

Continuation requires explicit authorization for one of these reviewed fixes:

1. correct the existing Production `NEXT_PUBLIC_SITE_URL` configuration to `https://www.greanlean.com` and redeploy the same RC; or
2. create and verify a new RC whose server-side product page derives a verified request host consistently with the Resolver API.

Do not restart the observation window until all 22 productized pages, Resolver calls and QR carriers pass.

