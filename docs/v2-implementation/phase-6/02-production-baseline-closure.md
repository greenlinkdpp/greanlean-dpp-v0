# Production baseline closure

## Identity and environment

| Item | Evidence | Result |
|---|---|---|
| Supabase Production identity | Safe fingerprint `3ce843a277e6`; region `ap-southeast-1` | VERIFIED |
| Development isolation | Safe fingerprint `7b8e1c72db01`; differs from Production | PASS |
| Pre-Production isolation | No third isolated project/deployment | BLOCKED |
| Production Vercel project | Public default deployment and custom domains respond | PARTIAL |
| Deployed commit SHA / deployment identifier | Not available from safe evidence | BLOCKED |

The public baseline responds as follows: apex redirects to `www`, `www` returns 200, `dpp` redirects to `/login`, and the default Vercel domain returns 200. HSTS is present. CSP, `X-Content-Type-Options`, and `X-Frame-Options` were absent on all four probes.

## Database baseline

- Production OpenAPI inventory: 99 definitions, 45 RPC paths, safe definition fingerprint `d06f7ad612d5f096`.
- Migration ledger: one recorded entry; highest migration `0026`.
- Repository V2 expectation: 51 tables from migrations `0027`–`0032`; Production presence: 0; status: **MISSING**.
- Selected row counts: `products=9`, `product_versions=12`, `battery_model_profile=3`, `battery_batch=0`, `battery_item=2`, `dpp_identifier_alias=6`.

## Secret placement evidence

Only `.env.example` is tracked. The Production service-role value was not found in tracked files or the generated `.next` build, and the Development and Production service-role fingerprints differ. This validates placement for the inspected repository/build, but rotation age and provider-side access history remain unverified.

## Baseline decision

The evidence gap is narrowed but not closed. The Production identity is known and isolated from Development, while deployed commit identity, full catalog/RLS policy evidence, backup/restore, and Pre-Production remain unavailable. `PRODUCTION_EVIDENCE_GATE = FAIL` and `PRODUCTION_READINESS = NO`.

Machine-readable evidence: [`evidence/readiness-evidence.json`](evidence/readiness-evidence.json).
