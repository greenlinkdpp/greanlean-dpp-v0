# Rate-Limit and Capacity Controls

## Verified

- Public QR endpoint: requests 1–30 returned 200; request 31 returned 429 with `Retry-After`.
- Declared JSON body of 1,048,577 bytes returned 413.
- Connector SSRF, webhook signature/replay, and Registry timeout/rejection controls passed the Phase 5 verifier.
- Production is on a Pro organisation but retained Nano compute, with a 2 GB `gp3` disk, 3,000 IOPS, and 125 MiB/s throughput.
- Safe read-only Production sampling measured a 23,358,611-byte database, 10 active connections at the sample, a 60-connection maximum, 3,262 estimated live rows, and 136 user tables across all non-system schemas.

## Capacity decision

```text
PILOT_CAPACITY = BLOCKED
```

The isolated PreProd baseline completed 60/60 requests at concurrency 10 with no errors, but p95 was 6,126.85 ms. This was a local production-mode frontend against isolated PreProd, not hosted Production-plan infrastructure. The invited Pilot tenant count, concurrency target, accepted latency SLO, and measurable safety margin remain undefined. A destructive or high-pressure Production load test was not performed.

The Production-plan assessment is complete, but the evidence cannot support a Pilot capacity PASS until scope and SLO are defined and the hosted path is measured. No Enterprise-scale capacity claim is made.

## Retained enforcement boundaries

- Current public limiter is per process/instance, not distributed globally.
- Chunked or undeclared oversized payload enforcement still depends on streaming/platform controls.
- Hosted edge/proxy behavior remains untested because there is no hosted PreProd frontend.

Evidence: `evidence/production-plan-capacity-evidence.json`, `evidence/preproduction-http-controls.json`, `evidence/preproduction-performance.json`, `evidence/preproduction-phase1-phase5-verification.json`.
