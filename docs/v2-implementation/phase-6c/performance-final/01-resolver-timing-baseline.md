# Resolver Timing Baseline

## Accepted failure baseline

| Profile | p50 | p95 | p99 | Error rate |
|---|---:|---:|---:|---:|
| Concurrency 1 | 2,999.10 ms | 4,348.88 ms | 5,782.66 ms | 0% |
| Concurrency 3 | 3,029.11 ms | 4,353.18 ms | 4,690.72 ms | 0% |
| Burst 5 | 2,839.16 ms | 4,018.78 ms | 4,399.94 ms | 0% |

All profiles failed the accepted 2,500 ms p95 SLO despite zero errors. Similar p95 at concurrency 1, 3 and 5 indicated a fixed request-path cost rather than concurrency saturation.

## Pre-remediation Server-Timing

The public Resolver performed six normal database HTTP requests and seven when identifier mapping existed: host allowlist, path mapping, identifier lookup, identifier mapping, Passport, and pointer/version; alias hops and withdrawn fallback added more. Individual hosted segments were commonly 250–850 ms while projection was 0–0.1 ms.

The previous required-path warm p95 ranged from about 1,089 to 2,363 ms in a small sample, but the formal accepted-concurrency sample was consistently 4.02–4.35 s. Cold samples were about 2.43–3.61 s. This variability and the segment sum made a formal PASS impossible.

## Environment and payload

- Vercel build/edge ingress observed in `iad1`; Resolver function declares `sin1`.
- Supabase PreProd is in Singapore (`ap-southeast-1`).
- JSON response is 848 bytes and HTML response is 730 bytes after read; Brotli is active.
- Projection/serialization is negligible and no PDF, BMS, Registry, connector, candidate rebuild or schema compilation runs on the hot path.
