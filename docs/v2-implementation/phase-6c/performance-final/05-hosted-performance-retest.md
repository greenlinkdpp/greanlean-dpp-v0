# Hosted Performance Retest

## Formal accepted-Pilot profiles

Each profile contains 30 measured Hosted PreProd requests. All were cache `MISS`, so the result does not rely on a permanently warm response cache.

| Profile | Success | HTTP errors | p50 | p95 | p99 | Max | Error rate | Throughput | Headroom | Result |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Concurrency 1 | 30/30 | 0 | 1,277.91 ms | 2,259.25 ms | 2,311.30 ms | 2,311.30 ms | 0% | 0.73 rps | +240.75 ms | PASS |
| Concurrency 3 | 30/30 | 0 | 1,650.54 ms | 2,379.21 ms | 2,379.60 ms | 2,379.60 ms | 0% | 1.63 rps | +120.79 ms | PASS |
| Burst 5 | 30/30 | 0 | 1,398.61 ms | 2,017.69 ms | 2,696.98 ms | 2,696.98 ms | 0% | 2.50 rps | +482.31 ms | PASS |

The accepted Gate is p95 <=2,500 ms and error rate <1%; p99 is recorded but is not the accepted threshold.

## Required public-path profile

| Path | Cold | Warm median | Warm p95 | DB p95 | Payload / encoding |
|---|---:|---:|---:|---:|---|
| DPP ID | 2,210.55 ms | 1,059.54 ms | 1,664.54 ms | 323.30 ms | 848 B / br |
| GTIN | 1,229.77 ms | 1,470.36 ms | 1,624.58 ms | 290.70 ms | 848 B / br |
| Legacy alias | 1,749.80 ms | 1,460.03 ms | 2,089.73 ms | 806.40 ms | 848 B / br |
| Public JSON | 889.85 ms | 1,489.72 ms | 2,078.80 ms | 290.00 ms | 848 B / br |
| Public HTML | 1,229.22 ms | 949.51 ms | 1,516.93 ms | 284.20 ms | 730 B / br |

Warm path profiling used five samples per path plus one cold/unique request. Detailed min, median, p95, max and counts for client, edge/proxy residual, rate admission, DB fast path, projection and route timing are retained in `evidence/hosted-timing-profile.json`.

## Regression

- DPP ID, GTIN, legacy alias, public JSON and public HTML: PASS and same immutable payload hash.
- Current pointer: PASS; query count 1.
- Withdrawn/tombstone: 410 PASS; the isolated PreProd pointer was restored and reverified.
- Cross-tenant: own tenant 200, forged tenant 403.
- Distributed limiter: hosted backend active, atomic request 31 denied, retry interval present.
- Unsafe QR: 400.

```text
FUNCTIONAL_REGRESSION = PASS
SECURITY_REGRESSION = PASS
```
