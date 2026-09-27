# Phase 6 Final Human Acceptance Report

```text
PHASE 6 COMPLETE = NO
PHASE 6 FINAL RESULT = BLOCKED

PRODUCTION_READINESS = NO
PILOT_READINESS = NOT_READY

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
PILOT_CAPACITY = FAIL

PRODUCTION_EVIDENCE_GATE = PASS
BACKUP_RESTORE_GATE = PASS
SECURITY_GATE = PASS
MIGRATION_GATE = PASS
COMPATIBILITY_GATE = PASS
PERFORMANCE_GATE = BLOCKED
ROLLBACK_GATE = PASS
OBSERVABILITY_GATE = PASS
PILOT_RUNBOOK_GATE = PASS

UNACCEPTED_CRITICAL_RISK = 0
UNACCEPTED_HIGH_RISK = 1

PRODUCTION_V2_MIGRATION_PERFORMED = NO
PRODUCTION_TRAFFIC_SWITCHED = NO
PRODUCTION_REGISTRY_ENABLED = NO

NEXT ACTION =
STOP AND WAIT FOR PHASE 6 FINAL ACCEPTANCE
```

## Final decision

The human acceptance closes operational ownership and the Observability Gate. It also fixes the invited-Pilot scope and SLO so that capacity can be judged deterministically. The resulting Hosted PreProd measurement does not meet the accepted Resolver p95 SLO; therefore Pilot capacity fails, the Performance Gate remains blocked, and Phase 6 cannot be declared complete.

No accepted value was relaxed to obtain this result. Concurrency 10 is not used as a Pilot blocker.

## Accepted Pilot boundary

| Dimension | Accepted value |
|---|---|
| Tenant count | 1 |
| Model count | <=30 |
| Passport count | <=5,000 |
| Normal concurrency | 1–3 |
| Burst concurrency | 5 |
| Resolver p95 | <=2,500 ms |
| Error rate | <1% |
| Observation window | 7 days |

This is an invited-Pilot envelope only. It is not an Enterprise-scale capacity statement, general Production SLA, or evidence for ten tenants or 500,000 Passports.

## Hosted capacity result

The final test used the stable Hosted PreProd Resolver and exactly the accepted concurrency boundary.

| Profile | Requests | HTTP 200 | p50 | p95 | p99 | Error rate | p95 headroom | Result |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Normal concurrency 1 | 20 | 20 | 2,999.10 ms | 4,348.88 ms | 5,782.66 ms | 0% | -1,848.88 ms (-73.96%) | FAIL |
| Normal concurrency 3 | 30 | 30 | 3,029.11 ms | 4,353.18 ms | 4,690.72 ms | 0% | -1,853.18 ms (-74.13%) | FAIL |
| Burst concurrency 5 | 25 | 25 | 2,839.16 ms | 4,018.78 ms | 4,399.94 ms | 0% | -1,518.78 ms (-60.75%) | FAIL |

The error-rate SLO passes, but every measured p95 exceeds 2,500 ms. There is negative latency headroom rather than a safety margin. Accordingly:

```text
PILOT_CAPACITY = FAIL
PERFORMANCE_GATE = BLOCKED
```

## Operational ownership acceptance

The following formal role assignments are accepted for the seven-day invited Pilot:

| Responsibility | Owner |
|---|---|
| Application | GreanLean Platform Owner |
| Database | GreanLean Platform Owner |
| Security | GreanLean Platform Owner |
| Backup / restore | GreanLean Platform Owner |
| Cutover | GreanLean Platform Owner |
| Rollback | GreanLean Platform Owner |
| Monitoring | GreanLean Platform Owner |
| Customer communication | GreanLean Platform Owner + Orintent business contact |

Notification routes are:

- Primary: GreanLean Platform Owner direct notification.
- Business escalation: GreanLean Platform Owner + Orintent business contact.
- Technical evidence: platform logs, monitoring, and audit records.
- External automated on-call platform: `NOT YET REQUIRED FOR INVITED PILOT`.

No PagerDuty, Opsgenie, SMS, or enterprise-IM integration is represented as installed.

## Hosted observability evidence

The hosted verification confirmed:

- Resolver HTTP 200 with platform request identifier and detailed `Server-Timing` segments.
- Distributed rate-limit backend and remaining-capacity response signals.
- Readable distributed rate-limit counters.
- Readable publication audit records (44 at the sample time).
- Readable connector dead-letter signal (zero current rows is healthy, and the signal source is available).
- Structured correlation/status logging and synthetic alert delivery/acknowledgement from the earlier controlled rehearsal.
- Managed Production backup evidence remains available from the passed Phase 6B backup gate.

## Minimum alert contract

| Alert | Owner | Notification | Response / rollback trigger |
|---|---|---|---|
| Public DPP unavailable | GreanLean Platform Owner | Direct notification | Investigate immediately; evaluate rollback after repeated or sustained failure |
| Resolver error spike | GreanLean Platform Owner | Direct notification | Inspect hosted status, timing, logs and rate controls; stop progression on SLO/error-budget breach |
| Database unavailable | GreanLean Platform Owner | Direct notification | Verify Supabase health and recovery; rollback cutover if service cannot be restored promptly |
| Backup stale | GreanLean Platform Owner | Direct notification | Stop cutover progression until a current completed backup exists |
| Publication failure | GreanLean Platform Owner | Direct notification | Stop new publication; disable affected write path if repeated |
| Cross-tenant anomaly | GreanLean Platform Owner | Direct notification | Treat as a security incident; stop the affected path and invoke rollback/kill switch |
| Dead-letter spike | GreanLean Platform Owner | Direct notification | Inspect connector failures; disable connector execution if growth continues |
| Customer-visible incident | GreanLean Platform Owner + Orintent business contact | Business escalation route | Notify the Pilot customer and coordinate service/rollback status |

Hosted signals exist, alert conditions and rollback triggers are documented, the responsible role is assigned, and the notification route is accepted. Therefore:

```text
OPERATIONAL_OWNERSHIP = PASS
OBSERVABILITY_GATE = PASS
```

## Retained decisions

- Five ambiguous legacy rows remain `EXCLUDE_FROM_PILOT`.
- Arbitrary-target QR remains `DEPRECATED`.
- Official DPP QR remains restricted to approved Resolver URLs or explicitly approved custom domains.

## Risk recalculation

| Risk | Result |
|---|---|
| `R-07` Resolver Pilot capacity | High / unaccepted — accepted p95 SLO is not met |
| `R-10` Operational ownership | Closed by the human role and notification acceptance plus verified hosted signals |

```text
UNACCEPTED_CRITICAL_RISK = 0
UNACCEPTED_HIGH_RISK = 1
```

## Production safety

The latest read-only check remains authoritative: Production is `ACTIVE_HEALTHY`, migration head is `0026`, and established public smoke behaviour is unchanged. This closure performed no Production V2 migration, Production data migration, V2-primary enablement, traffic switch, Registry enablement, real connector activation, V1 deletion, V1 API removal, or Production QR behaviour change.

## Evidence

- `evidence/human-accepted-pilot-performance.json`
- `evidence/human-accepted-observability.json`
- `evidence/production-final-readonly-check.json`
- `evidence/hosted-preproduction-verification.json`
- `evidence/hosted-preproduction-burst.json` (retained context only; concurrency 10 is not a Pilot blocker)
- Phase 6B managed backup/restore evidence remains authoritative for the inherited PASS gate.

## Stop boundary

STOP. Phase 7 Pilot Tenant Cutover is not authorised. Await a new explicit instruction after the Resolver performance blocker is remediated and re-tested against the accepted Pilot SLO.
