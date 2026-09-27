# 07 Production Public URL, API, and QR Baseline

## Public hosts

| Host | Observed behavior | Classification |
|---|---|---|
| `https://greanlean.com` | redirects to `https://www.greanlean.com/` | marketing canonical redirect |
| `https://www.greanlean.com` | HTTP 200 | public marketing + DPP routes |
| `https://dpp.greanlean.com` | `/` redirects to `/login` | authenticated application entry |
| `https://greanlean-dpp-v0.vercel.app` | HTTP 200 | Vercel default host |
| `app.greanlean.com` | no verifiable HTTPS service | unavailable/unknown |
| `api.greanlean.com` | no verifiable HTTPS service | unavailable/unknown |

Canonical-host enforcement and whether all aliases intentionally serve the same deployment are **NOT VERIFIED**.

## URL compatibility baseline

| Pattern | Repository behavior | Production sample |
|---|---|---|
| `/p/{identifier}` | main public DPP route | known LMT and industrial showcase identifiers returned HTTP 200 |
| `/passports/{slug}` | compatibility page | deployed status not individually tested |
| `/products/green-vault-ess-14-3` | named compatibility/product page | deployed status not individually tested |
| `/01/{gtin}` | GS1-style lookup/redirect | unknown sample GTIN returned 404 JSON |
| legacy `dpp_id`/`public_slug` | resolved from `products` | code evidence; complete Production alias set UNKNOWN |
| `dpp_identifier_alias` | active alias lookup | relation exists; rows/count UNKNOWN |
| code `PRE_MIGRATION_IDENTIFIERS` | three compatibility groups | deployed commit UNKNOWN |

No redirect was changed and no alias was created.

## Current public read authority

Repository code currently evaluates:

```text
item canonical snapshot RPC
→ product resolution: dpp_id / public_slug / alias / code compatibility map
→ canonical public snapshot RPC
→ legacy projected snapshot RPC
→ product_versions published snapshot
→ live legacy tables
```

Production pages render successfully, but management/database evidence cannot prove which branch supplied their content. The deployed Git commit is unknown.

```text
Published DPP = immutable snapshot: NOT PROVEN IN PRODUCTION
Live-table fallback reachable in repository code: YES
Classification: P0 OPEN RISK
```

## QR baseline

Repository behavior:

- `/api/qr` accepts a URL query value and renders a PNG;
- it does not create a persistent data-carrier record;
- the public page constructs `{site}/p/{identifier}?lang=...`;
- GS1 `/01/{gtin}` and identifier aliases form separate resolution paths;
- input-host allowlisting is not evident in the QR route.

| Question | Result |
|---|---|
| Existing Production QR count | NOT VERIFIED |
| Actual encoded-host distribution | NOT VERIFIED |
| Arbitrary URL accepted by deployed build | repository says yes; endpoint intentionally not invoked |
| DPP ID vs product ID | normally public DPP identifier/URL; historical artifacts UNKNOWN |
| Alias support | code/table present |
| GS1 support | route present; known mapping set UNKNOWN |

No Production QR was generated or replaced.

## API contract baseline

The audited repository contains 35 route files and 46 HTTP method handlers. Production deployment equivalence is unknown.

| API group | Methods | Authentication/tenant observation | Status |
|---|---|---|---|
| access context and requests | GET/POST/PATCH | Supabase user + DB access functions | code baseline |
| public DPP and exports | GET | public or audience-aware; query parameters | public route samples reachable |
| battery DPP workspace/export | GET/PUT/POST | authenticated product/editor/platform gates | code baseline |
| battery metric history/latest | GET | authenticated item/product scope | code baseline |
| BMS credentials/metrics/events | POST | server auth/API key, item/device binding | code baseline; not called |
| files | GET plus internal GET/POST | authorization; download writes audit before signing | not called |
| publication candidate/integrity/lifecycle | GET/POST | internal/platform boundaries | code baseline |
| Registry | GET/POST/export GET | platform-only; TEST adapter | not called |
| `/api/v1/projects` and project routes | GET/POST/PATCH | organisation context | code baseline |
| `/api/v1/product-models/...` | GET/POST | organisation/product editor scope | code baseline |
| `/api/v1/imports` | POST | tenant-scoped preflight/commit | code baseline |
| `/api/v1/organisations/current` | GET/PUT/export GET | current organisation membership | code baseline |
| legacy document/PDF helpers | GET | mixed public/demo inputs | code baseline |

No centralized rate limit was found for general APIs; BMS ingestion has a dedicated per-credential limit. Current clients, traffic, deprecated consumers, API gateway policies, and Production error rates are **NOT VERIFIED**.

## Compatibility requirements

Before V2 implementation, preserve a machine-readable snapshot of:

- every public host and redirect;
- known DPP IDs, slugs, aliases, GTIN paths, and QR targets;
- all 46 method/path contracts and response/error samples;
- caching and security headers;
- authenticated client inventory and deprecation owner.

This snapshot must be created without exposing customer records or tokens.
