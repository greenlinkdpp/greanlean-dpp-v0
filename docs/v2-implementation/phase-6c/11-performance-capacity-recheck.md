# Performance and Capacity Recheck

## Resource and workload facts

- Production remains Supabase Pro on Nano compute, 2 GB gp3, 3,000 IOPS and 125 MiB/s; Phase 6B observed about 23.4 MB database size, 3,262 live rows and 10/60 connections.
- Final Hosted PreProd required-path sample: 60 warm requests, 0 HTTP failures, worst route p95 2,362.94 ms.
- Initial edge burst: concurrency 10, 20/20 shared-key successes at p95 3,124.86 ms; 10/10 unique-key successes at p95 2,058.44 ms.
- Node middleware experiment was worse and was rolled back.

## Assessment

Functional capacity for a very small workload is demonstrated and the final normal warm run fits the proposed 2,500 ms ceiling. It does not meet the 20% safety-margin threshold of 2,000 ms on every route, and the concurrency-10 burst exceeds the ceiling. The numeric Pilot envelope and SLO also lack owner acceptance. Client/network variability was independently observed through connection timeouts.

```text
PILOT_CAPACITY = BLOCKED
PERFORMANCE_GATE = BLOCKED
```

No Enterprise-scale, broad Production-rollout, or long-term SLA claim is made.
