# Phase 6 Final Exit Report — Supersedes Report 14

```text
PHASE 6 COMPLETE = YES
PHASE 6 FINAL RESULT = PASS

PRODUCTION_READINESS = YES
PILOT_READINESS = READY

PILOT_SCOPE_ACCEPTED = TRUE
PILOT_TENANT_COUNT = 1
PILOT_MODEL_LIMIT = 30
PILOT_PASSPORT_LIMIT = 5000
NORMAL_CONCURRENCY = 1-3
BURST_CONCURRENCY = 5
RESOLVER_P95_SLO_MS = 2500
ERROR_RATE_SLO = <1%
OBSERVATION_WINDOW = 7 DAYS

OPERATIONAL_OWNERSHIP = PASS
PILOT_CAPACITY = PASS

PRODUCTION_EVIDENCE_GATE = PASS
BACKUP_RESTORE_GATE = PASS
SECURITY_GATE = PASS
MIGRATION_GATE = PASS
COMPATIBILITY_GATE = PASS
PERFORMANCE_GATE = PASS
ROLLBACK_GATE = PASS
OBSERVABILITY_GATE = PASS
PILOT_RUNBOOK_GATE = PASS

UNACCEPTED_CRITICAL_RISK = 0
UNACCEPTED_HIGH_RISK = 0

PRODUCTION_V2_MIGRATION_PERFORMED = NO
PRODUCTION_DATA_WRITE = NO
PRODUCTION_TRAFFIC_SWITCHED = NO
PRODUCTION_REGISTRY_ENABLED = NO
PRODUCTION_CONNECTORS_ACTIVATED = NO
PRODUCTION_QR_BEHAVIOUR_CHANGED = NO

NEXT ACTION =
STOP AND WAIT FOR PHASE 7 INSTRUCTION
```

## Superseding decision

This report supersedes the blocked performance conclusion in `14-phase6-final-human-acceptance-report.md` while preserving that historical failure and its evidence. Phase 6 is complete because every Gate passes and no unaccepted Critical or High risk remains. Readiness does not itself authorise Phase 7 or any Production change.

## Previous failure and root cause

The accepted-concurrency baseline had p95 of 4,348.88 ms, 4,353.18 ms and 4,018.78 ms. EXPLAIN ANALYZE showed the individual SQL operations completed in about 0.1–2.7 ms, while the application performed 6–7 sequential Supabase HTTP calls, each commonly costing hundreds of milliseconds.

```text
ROOT_CAUSE = NETWORK_ROUND_TRIP + EVIDENCED_MULTI_ROUND_TRIP
```

## Implemented remediation

PreProd-only migration `0035` adds a service-role-only Resolver fast-path RPC and an active normalized-identifier index. The RPC preserves host allowlisting, tenant relationships, bounded alias/cycle rules, current immutable version semantics and withdrawn tombstones. Database round trips fell from 6–7 to 1. No response cache, RLS bypass, stale pointer shortcut, or Production change was used.

## New hosted measurements

| Profile | Samples | p50 | p95 | p99 | Error | Headroom |
|---|---:|---:|---:|---:|---:|---:|
| Concurrency 1 | 30 | 1,277.91 ms | 2,259.25 ms | 2,311.30 ms | 0% | +240.75 ms |
| Concurrency 3 | 30 | 1,650.54 ms | 2,379.21 ms | 2,379.60 ms | 0% | +120.79 ms |
| Burst 5 | 30 | 1,398.61 ms | 2,017.69 ms | 2,696.98 ms | 0% | +482.31 ms |

All accepted profiles satisfy p95 <=2,500 ms and error rate <1%. DPP ID, GTIN, legacy alias, public JSON/HTML, current pointer, withdrawn tombstone, cross-tenant rejection, rate limiting and unsafe QR regression all pass. Consequently `R-07 = CLOSED`.

## Evidence index

- `performance-final/evidence/resolver-query-analysis.json`
- `performance-final/evidence/resolver-fast-path-application.json`
- `performance-final/evidence/resolver-regression.json`
- `performance-final/evidence/hosted-performance-retest.json`
- `performance-final/evidence/hosted-timing-profile.json`
- `performance-final/evidence/production-post-remediation-readonly.json`
- `performance-final/01-resolver-timing-baseline.md` through `06-phase6-final-performance-gate.md`

## Production safety and STOP

Production remains `ACTIVE_HEALTHY` at migration head `0026`, with the established public smoke baseline unchanged. Phase 7 is not entered. STOP and wait for a new explicit Phase 7 instruction.
