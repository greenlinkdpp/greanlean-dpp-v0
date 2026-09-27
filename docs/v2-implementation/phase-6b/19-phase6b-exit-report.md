# Phase 6B Final Exit Report

```text
PHASE 6 COMPLETE = NO
PHASE 6B RESULT = BLOCKED

PRODUCTION_READINESS = NO
PILOT_READINESS = NOT_READY

PRODUCTION_PRO_UPGRADE_VERIFIED = TRUE
PRODUCTION_MANAGED_BACKUP_EVIDENCE = PASS
RESTORE_DRILL = PASS
PITR_DECISION = NOT_REQUIRED_FOR_PILOT
PILOT_CAPACITY = BLOCKED

PRODUCTION_EVIDENCE_GATE = PASS
BACKUP_RESTORE_GATE = PASS
SECURITY_GATE = BLOCKED
MIGRATION_GATE = BLOCKED
COMPATIBILITY_GATE = BLOCKED
PERFORMANCE_GATE = BLOCKED
ROLLBACK_GATE = PASS
OBSERVABILITY_GATE = BLOCKED
PILOT_RUNBOOK_GATE = PASS

UNACCEPTED_CRITICAL_RISK = 0
UNACCEPTED_HIGH_RISK = 3

PRODUCTION_V2_MIGRATION_PERFORMED = NO
PRODUCTION_WRITE_PERFORMED = NO
PRODUCTION_TRAFFIC_SWITCHED = NO
PRODUCTION_REGISTRY_ENABLED = NO
PRODUCTION_CONNECTORS_ACTIVATED = NO
PRODUCTION_QR_BEHAVIOUR_CHANGED = NO

NEXT ACTION =
STOP AND WAIT FOR PHASE 6B ACCEPTANCE
```

## Final decision

The four former Supabase Pro-dependent assessments have been completed. Managed backup and isolated restore now pass, the invited-Pilot PITR decision is recorded, and the Production-plan capacity assessment is evidenced. Phase 6B nevertheless remains blocked because capacity/SLO, legacy mapping, Internet-facing enforcement, operational ownership, and QR-policy decisions are unresolved. Phase 7 is not authorised.

## Pro upgrade and Production safety

- Production organisation plan: Pro.
- Production project: actual dashboard name `greanlen-dpp`, ref `lpxdbysgmdsjhxrjzhly`.
- Region: Singapore (`ap-southeast-1`).
- State after all work: `ACTIVE_HEALTHY`.
- Migration head: `0026`.
- Post-upgrade and post-cleanup V1 smoke: homepage 200, public DPP 200, public API 200, legacy `/01/06900000014336` unchanged at 404, login 200.
- Representative Production counts and fingerprints remained stable.
- Development remained paused and PreProd remained isolated at migration head `0033`.

The authorised restore-to-new-project operation did not mutate Production. No V2 Production migration, data migration, traffic switch, Registry enablement, connector activation, or QR behavior change occurred.

## Backup, restore, RPO, and RTO

- Seven completed daily physical backups were present with seven-day retention.
- Latest completed backup: ID `1792315823`, timestamp `2026-09-26T16:54:44.205Z`.
- Restore target: isolated temporary project `greanlean-dpp-restore-drill-20260927`.
- Restore start: `2026-09-27T11:19:14Z`.
- Target `ACTIVE_HEALTHY`: `2026-09-27T11:23:28Z`.
- Measured database restore duration: `4m14s`.
- Migration ledger, public schema fingerprint, 97 public tables, representative row counts, 255 foreign keys, zero sampled relationship orphans, V1 data fingerprint, and database-resident Auth baseline matched Production.
- The temporary project was permanently deleted after PASS, and its absence was verified.
- `RPO_PROPOSED = UP TO 24 HOURS`.
- `RTO_PROPOSED = 60 MINUTES`; this is not an accepted long-term Production SLA and includes operational margin above the measured database-only restore.

The restore proves PostgreSQL database recovery only. It does not prove restoration of Storage binary objects, Edge Functions, Auth settings/API keys, Realtime settings, project settings, read replicas, external secrets, or third-party integrations. Database-resident Storage metadata and Auth rows matching the source do not expand that boundary.

PITR remains disabled and is not required for the invited Pilot. It must be re-evaluated before broader Production rollout if write frequency, customer volume, business criticality, or SLA requirements increase. Immediately before any later Pilot cutover, the operator must confirm a recent managed backup, record its timestamp and the rollback point, and confirm there is no new backup/restore blocker.

## Production-plan capacity assessment

| Evidence | Result |
|---|---|
| Organisation plan | Pro |
| Production compute | Nano; upgrade did not automatically resize it |
| Database disk | 2 GB `gp3`, 3,000 IOPS, 125 MiB/s |
| Database size | 23,358,611 bytes |
| Connection sample | 10 active / 60 maximum |
| Estimated live rows | 3,262 |
| PreProd workload | 60/60 success, concurrency 10, no errors |
| PreProd latency | p50 4,721.09 ms; p95 6,126.85 ms; p99/max 7,100.99 ms |
| Pilot scope/SLO | Tenant count, target concurrency, accepted latency SLO, and safety margin undefined |

The assessment was safe and non-destructive, but cannot support a Pilot capacity PASS. No Enterprise-scale capacity claim is made.

## Gate recalculation

| Gate | Result | Basis |
|---|---|---|
| Production evidence | PASS | Pro, identity, region, head `0026`, V1 data, storage/auth availability, and public smoke verified read-only |
| Backup / restore | PASS | Managed backup evidence plus timed isolated restore and cleanup |
| Security | BLOCKED | Distributed/edge rate limiting, hosted proxy behavior, chunked-body enforcement, and operational ownership remain unresolved |
| Migration | BLOCKED | Five legacy rows remain quarantined without an approved mapping or Pilot exclusion decision |
| Compatibility | BLOCKED | Tested paths pass, but quarantined mappings and arbitrary-target QR policy remain unresolved |
| Performance | BLOCKED | p95 6.13 s; Pilot load target, SLO, and safety margin are undefined |
| Rollback | PASS | PreProd rollback/reapply, failure injection, kill switches, and V1 continuity passed |
| Observability | BLOCKED | Local rehearsal passed; external on-call, retention, backup-freshness delivery, and owner acknowledgment are absent |
| Pilot runbook | PASS | Written runbook/checklist exists; its blocking prerequisites are surfaced by the other gates |

## Retained operational-item classification

| Item | Classification | Closure condition |
|---|---|---|
| Five legacy rows quarantined | BLOCKING | Business owner maps or explicitly excludes every row without guessing |
| Resolver local PreProd p95 6.13 s | BLOCKING | Define/accept Pilot SLO and scope, then measure the hosted path with adequate margin |
| Hosted PreProd, distributed limiting, chunked-body enforcement, external on-call | BLOCKING | Deploy/verify the controls and assign acknowledged owners |
| Legacy arbitrary-target QR policy | BLOCKING | Approve deprecation or enforce a strict destination allowlist |

None of these four retained operational items is silently accepted or deferred to Phase 7.

## Unaccepted risk count

The previously Critical recovery risk is closed. Three unique High risks remain unaccepted:

1. `R-07` — public Resolver rate/capacity and hosted enforcement.
2. `R-08` — legacy SKU/data semantics for the five quarantined rows.
3. `R-10` — external monitoring/on-call ownership.

`R-11`, the arbitrary-target QR policy, remains a Medium blocking decision. Production V2 schema deployment (`R-03`) is an explicitly prohibited and sequenced Phase 7 activity, not a risk accepted by this report.

## Evidence index

- `evidence/production-post-pro-upgrade-smoke.json`
- `evidence/production-pro-managed-backup-evidence.json`
- `evidence/production-managed-restore-drill.json`
- `evidence/production-plan-capacity-evidence.json`
- `evidence/preproduction-migration-replay.json`
- `evidence/preproduction-seed-and-reconciliation.json`
- `evidence/preproduction-shadow-compatibility.json`
- `evidence/preproduction-http-controls.json`
- `evidence/preproduction-performance.json`
- `evidence/preproduction-failure-injection.json`
- `evidence/preproduction-kill-switch-rehearsal.json`
- `evidence/preproduction-rollback-rehearsal.json`
- `evidence/preproduction-observability-rehearsal.json`

## Stop boundary

Phase 6B is stopped at this report. Do not enter Phase 7 without a separate user instruction.
