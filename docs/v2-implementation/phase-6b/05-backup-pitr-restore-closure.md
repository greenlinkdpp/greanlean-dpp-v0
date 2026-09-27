# Backup, PITR, and Restore Closure

## Final gate state

```text
PRODUCTION_MANAGED_BACKUP_EVIDENCE = PASS
PRODUCTION_MANAGED_BACKUP_RESTORE = PASS
RESTORE_DRILL = PASS
MEASURED_RESTORE_DURATION = 4m14s
PITR_DECISION = NOT_REQUIRED_FOR_PILOT
RPO_PROPOSED = UP TO 24 HOURS
RTO_PROPOSED = 60 MINUTES
```

Production has seven completed daily physical backups with seven-day retention. The latest completed recovery point used by this drill was backup `1792315823`, completed at `2026-09-26T16:54:44.205Z`.

The authorised restore was started at `2026-09-27T11:19:14Z` into isolated project `greanlean-dpp-restore-drill-20260927`. It reached `ACTIVE_HEALTHY` at `11:23:28Z`, an observed database restore duration of 4 minutes 14 seconds. Migration ledger, schema, representative row counts, critical relationships, V1 fingerprints, and database-resident Auth baseline matched Production. The temporary project was then deleted and its absence verified.

PITR remains disabled. For the invited Pilot, managed daily physical backups are the approved recovery baseline and PITR is not required. The proposed RPO is up to 24 hours. The proposed RTO of 60 minutes provides operational margin over the measured database restore, but neither value is asserted as a long-term Production SLA.

## Recovery boundary

The restore proves PostgreSQL database recovery. It does not prove restoration of Storage binary objects, Edge Functions, Auth settings/API keys, Realtime settings, project settings, read replicas, external secrets, or third-party integrations. Database-resident Storage metadata and Auth users were compared successfully, but those results must not be interpreted as recovery of the corresponding non-database services.

Before Phase 7 cutover, operators must still confirm a recent managed backup, record its timestamp and the intended rollback point, and ensure there is no new backup/restore blocker. PITR must be re-evaluated before broader rollout if write frequency, customer volume, business criticality, or SLA requirements increase.

Evidence: `evidence/production-pro-managed-backup-evidence.json`, `evidence/production-managed-restore-drill.json`.
