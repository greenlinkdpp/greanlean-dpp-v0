# Backup, PITR, and restore drill

## Verified service constraints

The Production project is in a Free organisation. Current Supabase documentation states that Free projects do not receive downloadable daily backups, PITR is a paid add-on, and restore-to-new-project/physical-backup workflows are paid capabilities. Sources: [Database Backups](https://supabase.com/docs/guides/platform/backups), [Billing on Supabase](https://supabase.com/docs/guides/platform/billing-on-supabase), and [Clone a project](https://supabase.com/docs/guides/platform/clone-project).

## Evidence status

| Requirement | Result |
|---|---|
| Backup enabled and retention | BLOCKED — no verified scheduled backup evidence |
| Last successful backup | BLOCKED |
| PITR enabled | UNAVAILABLE/NOT VERIFIED |
| Storage backup strategy | BLOCKED |
| Restore capability | BLOCKED |
| Isolated restore target | BLOCKED — no isolated Pre-Production/temporary project |
| Restore elapsed time | NOT MEASURED |
| Restored schema/count/application checks | NOT EXECUTED |

No restore was attempted over Production or into Development.

## RPO/RTO

```text
RPO = PROPOSED, NOT ACCEPTED
RTO = PROPOSED, NOT ACCEPTED
```

Provisional planning target after paid backup/PITR is enabled: RPO ≤ 24 hours without PITR or the configured PITR interval with PITR; RTO ≤ 4 hours only if an isolated drill demonstrates it. Business Owner, Database Owner, and Operations Owner must accept final values based on measured recovery.

`BACKUP_RESTORE_GATE = BLOCKED`. This gate alone requires `PRODUCTION_READINESS = NO`.
