# Performance and load results

## Result classification

The evidence file [`evidence/development-performance.json`](evidence/development-performance.json) contains a bounded Development-only public Resolver sample. It runs against a local Next development server backed by the Development database; it is diagnostic and cannot establish Production capacity or an SLO.

Observed workload: 1 warm-up plus 18 requests at concurrency 6. All 18 returned 200 (0 error rate); latency was p50 5472.61 ms, p95/p99 7268.70 ms, min 3929.69 ms, max 7268.70 ms. The high local-development latency is a warning signal, not a Production forecast.

The formal Pre-Production matrix remains unexecuted for public Resolver burst, public DPP JSON/HTML, authenticated Passport/Product lists, resolved Candidate, publication, batch import, connector polling, throughput, and resource utilization.

## Acceptance rule

The Pre-Production test must capture p50/p95/p99, throughput, error rate, database/compute/memory saturation, cache behavior, cold starts, concurrency, dataset size, and test commit. Targets must be approved by Product and Operations owners before the run. Production must never be load-tested by this procedure.

```text
PERFORMANCE_GATE = BLOCKED
```

Reason: no isolated Pre-Production environment and no approved SLO/capacity threshold. Development measurements are retained solely as a reproducible baseline.
