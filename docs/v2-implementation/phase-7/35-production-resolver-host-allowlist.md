# Phase 7 — Production Resolver Host Allowlist

Generated: `2026-09-29`

## Result

```text
PRODUCTION_RESOLVER_HOST_ALLOWLIST = PASS
WWW_GREANLEAN_COM_ALLOWLISTED = TRUE
ALLOWLIST_NEW_ROWS = 1
ALLOWLIST_UNEXPECTED_ROWS = 0
CODE_CHANGE_PERFORMED = NO
NEW_RC_REQUIRED = NO
DEPLOYED_RC_MATCH = TRUE
```

The approved database-configuration change added exactly one row to Production `resolver_host_allowlist`:

```text
host = www.greanlean.com
status = ACTIVE
created_at = 2026-09-29T05:48:33.781812Z
```

No existing row was changed. No apex host, wildcard, port-qualified host, alternate subdomain or external host was added.

## Pre-change controls

| Gate | Result |
| --- | --- |
| Production project | `greanlen-dpp` / `lpxdbysgmdsjhxrjzhly` |
| Project state | `ACTIVE_HEALTHY` |
| Migration head | `0035` |
| RC commit / tree | `b4412f0a32f0e91c3b16f6bc7017f8ee7a9de773` / `166c65c46bdadf9ba4a31759dfd21a2d22d2c1f7` |
| Production deployment | `dpl_6poWp5p95At2hq4jbUAn1hZkQo3y`, READY |
| Required host before | absent |
| Existing allowlist rows | 4, all ACTIVE |
| Fresh backup | `1811221013`, COMPLETED `2026-09-28T16:53:51.066Z` |

Before the change, the allowlist contained only `127.0.0.1`, `localhost`, `dev.dpp.greanlean.test`, and `greanlean-dpp-preprod.vercel.app`.

## Host normalization

Application normalization in `lib/v2/resolver.ts` trims, lowercases and removes a port. `createResolverMapping` applies that normalization before insert. The database trigger `public.v2_guard_resolver_mapping()` also applies `lower(btrim(new.host))` and then requires an exact ACTIVE allowlist match. The approved input therefore canonicalizes deterministically to `www.greanlean.com` on both sides.

```text
HOST_NORMALIZATION = PASS
RESOLVER_ALLOWLIST_GATE = PASS
```

## Post-change verification

| Check | Result |
| --- | ---: |
| Total allowlist rows | 5 |
| Exact ACTIVE `www.greanlean.com` rows | 1 |
| Unexpected related/apex/wildcard/port rows | 0 |
| Migration head after | `0035` |
| Reference Passports immediately after allowlist write | 1 |
| Reference Resolver mappings immediately after allowlist write | 0 |
| Registry submissions | 0 |

The service-role Resolver fast-path resolved `DPP-GLR-EBIKE-000001` on `www.greanlean.com` as PUBLISHED Version 1 after onboarding. The same function rejected `evil.example` with `RESOLVER_NOT_FOUND`. The public V2 Resolver remained gated with HTTP 404 `V2_FEATURE_DISABLED`.

No application deployment, migration, public read/projection enablement, V2 Primary switch, Registry submission, real connector activation or observation-window start occurred.

