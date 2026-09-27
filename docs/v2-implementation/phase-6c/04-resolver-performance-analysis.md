# Resolver Performance Analysis

## Hosted evidence

The required Hosted PreProd paths were exercised for DPP ID, GTIN, legacy alias, public JSON, and public HTML. The first complete run comprised 60 warm requests with zero HTTP failures.

| Path | Warm p50 | Warm p95 | Cold sample |
|---|---:|---:|---:|
| DPP ID Resolver | 1,026.89 ms | 1,748.90 ms | 3,610.29 ms |
| GTIN Resolver | 1,139.35 ms | 1,838.92 ms | 2,840.62 ms |
| Legacy alias Resolver | 971.09 ms | 1,768.97 ms | 2,966.69 ms |
| Public JSON DPP | 718.30 ms | 1,089.01 ms | 3,328.19 ms |
| Public HTML DPP | 808.78 ms | 2,362.94 ms | 2,429.58 ms |

The final run's worst route warm p95 was 2,362.94 ms. Server-Timing shows multiple sequential Supabase round trips in host allowlist, mapping/identifier, passport, and pointer lookup; projection generation remained 0–0.1 ms. The DPP-ID cold sample reported 2,197.3 ms route time inside 3,610.29 ms end-to-end. This indicates that network/database round trips, the distributed-limiter hop, transport, and cold start dominate; projection/PDF work is not on the hot path.

## Burst and runtime experiment

- Initial edge-middleware burst: 20 shared-key requests at concurrency 10 had p95 3,124.86 ms; 10 unique-cache requests had p95 2,058.44 ms; all returned 200.
- A Node middleware co-location experiment regressed the same profiles to p95 6,486.83 ms and 3,757.26 ms respectively. It was rejected and rolled back before the final deployment.
- The first attempt after that deployment had a client-side connection timeout before an HTTP response; the retry is retained as evidence of network variability.

Database indexes and resolver query correctness were retained. RLS/PDP, tenant isolation, current-pointer correctness, and freshness were not weakened for speed.

## Conclusion

The former ~6.13 s sequential local/PreProd p95 is materially improved and the final normal warm paths fit under the proposed 2,500 ms ceiling, but the worst route does not meet its 2,000 ms safety-margin threshold and concurrency-10 burst lacks margin. No accepted numeric SLO exists. `PERFORMANCE_GATE = BLOCKED`.
