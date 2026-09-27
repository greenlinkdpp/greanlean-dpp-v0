# Performance and Load Results

The isolated PreProd workload ran 60 requests at concurrency 10 after one warm-up request.

- Successful: 60/60
- Error rate: 0%
- Minimum: 3,499.32 ms
- p50: 4,721.09 ms
- p95: 6,126.85 ms
- p99 / maximum: 7,100.99 ms

The Production-plan assessment confirmed Pro organisation metadata, Nano compute, a 2 GB `gp3` disk, 23,358,611-byte database, 10 active connections at the read-only sample, and a 60-connection maximum. No destructive or high-pressure Production load test was performed.

```text
PILOT_CAPACITY = BLOCKED
PERFORMANCE_GATE = BLOCKED
```

The run proves functional load behavior without errors, but not SLO compliance or hosted capacity. Pilot tenant count, target concurrency, accepted latency SLO, and safety margin are undefined; the 6.13-second p95 remains a visible release risk. No Enterprise-scale capacity claim is made.

Evidence: `evidence/preproduction-performance.json`, `evidence/production-plan-capacity-evidence.json`.
