# 08 Production Drift Report

## Status definitions

- `MATCH`: Production evidence directly matches repository expectation.
- `DRIFT`: Production evidence directly differs.
- `UNKNOWN`: Production evidence is insufficient.
- `CRITICAL`: confirmed or unknown state blocks safe migration/cutover.

## Drift matrix

| Area | Repository expected | Production actual | Status | Action required |
|---|---|---|---|---|
| Deployment commit | `796a0b…` audit baseline | commit/branch/build unknown | UNKNOWN | Vercel read-only deployment export |
| Next.js | 14.2.15 | public runtime version not disclosed | UNKNOWN | deployment build metadata |
| Vercel project | `greanlean-dpp-v0` | linked metadata and public Vercel runtime | MATCH (partial) | confirm Production alias ownership |
| Supabase target | configured `lpxd….supabase.co` | REST surface reachable | MATCH (target only) | confirm project/environment/region |
| Migration ledger | 21 repository migrations | relation exists; entries hidden | CRITICAL | export ledger/checksums |
| Tables | hybrid legacy + migrations 0006–0026 | most key relation names respond | UNKNOWN | full catalog diff |
| Membership name | `dpp_user_membership` | exists; requested `dpp_organisation_membership` is 404 | MATCH to repo | document canonical naming |
| Battery profile name | `battery_model_profile` | exists; `battery_passport_profile` is 404 | MATCH to repo | document canonical naming |
| Columns/types | migration-defined | unavailable | CRITICAL | read-only metadata export |
| FK/check/unique/index | migration-defined | unavailable | CRITICAL | catalog diff |
| Functions/triggers | immutable publication, hierarchy, append-only | unavailable | CRITICAL | function/trigger export |
| RLS/policies | enabled across critical tables | anonymous behavior only | CRITICAL | `pg_policy`/grant export + tests |
| Public publication | canonical-first with fallback | rendered pages; chosen source unknown | CRITICAL | trace-safe source marker/shadow check |
| Storage bucket | private `dpp-evidence` | zero anon-visible buckets | UNKNOWN | bucket/policy metadata |
| Storage recovery | required | unavailable | CRITICAL | backup and restore evidence |
| DB backup/PITR | required | unavailable | CRITICAL | provider backup evidence |
| Restore | rehearsed recovery required | no evidence | CRITICAL | isolated restore exercise |
| Secrets | server-only high privilege | sampled home JS did not expose local service key/name | UNKNOWN | Vercel env/secret inventory and full bundle scan |
| Registry | TEST-only adapter | repository enforces TEST; deployed flag/commit unknown | UNKNOWN | deployment config evidence |
| BMS | hashed, rotated, scoped credentials | code/table surface exists; operational state unknown | UNKNOWN | aggregate credential/ingestion audit |
| Marketing domain | `www.greanlean.com` | reachable with valid TLS/HSTS | MATCH |
| DPP domain | `dpp.greanlean.com` | reachable, redirects to login | MATCH |
| `app`/`api` subdomains | no repository requirement | no verified service | MATCH/NOT CONFIGURED |
| Public URL | `/p/{identifier}` plus aliases and GS1 | sample DPP pages reachable; GS1 unknown mapping 404 | MATCH (partial) |
| QR | arbitrary URL PNG endpoint | deployed behavior intentionally not invoked | UNKNOWN/HIGH |
| API | 35 route files/46 methods | exact deployed contract unknown | UNKNOWN | contract snapshot |
| Feature flags | example defaults false; Registry server guard | Production values/owners unknown | UNKNOWN | read-only env inventory |
| Structured logs | JSON logger + correlation IDs on wrapped routes | Vercel log sink/coverage unknown | UNKNOWN | log/alert evidence |
| Metrics/alerts | no full stack in repo | unavailable | UNKNOWN/HIGH |

## Confirmed drift

No material repository-vs-Production schema drift can be confirmed with the available privilege. The two 404 names are terminology mismatches in the verification request, not evidence that repository migrations are missing.

## Unknowns that must not be treated as matches

- table presence does not establish migration checksum equality;
- HTTP 200 with zero rows does not establish RLS correctness;
- a working page does not establish canonical snapshot provenance;
- a private-looking bucket response does not establish storage backup;
- absence of a secret in sampled chunks does not establish complete secret safety;
- repository tests do not establish Production installation.

**Overall drift status: UNKNOWN with multiple CRITICAL evidence gaps.**
