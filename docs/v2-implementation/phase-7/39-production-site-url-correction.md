# Phase 7 Production SITE_URL Correction

Generated: `2026-09-29`

## Result

```text
SITE_URL_USAGE_REVIEW = PASS
SITE_URL_CORRECTION = PASS
V1_AFTER_SITE_URL_CORRECTION = PASS
SITE_URL_RESOLVER_HOST_ALIGNMENT = PASS
CODE_CHANGE_PERFORMED = NO
MIGRATION_PERFORMED = NO
```

Production `NEXT_PUBLIC_SITE_URL` was corrected to `https://www.greanlean.com`. The previous value was stored as a hidden Vercel secret; its non-`www` behavior and rendered canonical URLs identified the effective prior origin as `https://greanlean.com`. No secret value was retrieved or recorded.

The runtime review found these uses:

| Use | Classification | Safety conclusion |
| --- | --- | --- |
| `app/p/[slug]/page.tsx` Resolver hostname | server-side Resolver lookup | aligns the product page with the approved `www.greanlean.com` host |
| `app/p/[slug]/page.tsx` audience preview/canonical URL | public/canonical URL generation | produces the approved Production origin |
| `lib/server/registryRepository.ts` | TEST Registry DPP URI metadata | no submission or endpoint activation; Registry remains off |
| `lib/server/batteryRepository.ts` | public DPP dynamic values | canonical URL only |
| BatteryPass export route | authenticated public URL generation | canonical URL only |

Supabase, Auth, database, Storage, Registry endpoints, connector endpoints and credentials use separate configuration and were unchanged.

## Immutable-source deployments

| Stage | Deployment | Immutable URL | Created |
| --- | --- | --- | --- |
| SITE_URL verification, public flags off | `dpl_6cSagM9k5G4Kde6b75Kj5bLB7vua` | `greanlean-dpp-v0-3emyc0dt7-songweinie-1175s-projects.vercel.app` | `2026-09-29T09:35:13.274Z` |
| final public retry | `dpl_5QLGhryX2wyQ2MDcqYzgfbu5fuV3` | `greanlean-dpp-v0-i36sma6x7-songweinie-1175s-projects.vercel.app` | `2026-09-29T09:41:31.132Z` |

Both deployments were rebuilt from accepted deployment `dpl_6poWp5p95At2hq4jbUAn1hZkQo3y`, whose approved source is commit `b4412f0a32f0e91c3b16f6bc7017f8ee7a9de773`, tree `166c65c46bdadf9ba4a31759dfd21a2d22d2c1f7`. The final deployment owns the Production aliases, including `www.greanlean.com`.

## V1 and host alignment evidence

With public V2 flags off, homepage, four representative V1 DPP pages, two V1 export APIs, login, Auth, Storage, legacy routes and legacy QR returned the expected successful responses. CSP nonce/hydration passed. The dormant Reference Resolver returned `404 V2_FEATURE_DISABLED`.

The aligned chain is:

```text
NEXT_PUBLIC_SITE_URL origin = https://www.greanlean.com
derived hostname = www.greanlean.com
Resolver mapping host = www.greanlean.com
Resolver allowlist host = www.greanlean.com
```

No apex, wildcard, alternate alias or port-qualified Resolver allowlist row was added.

