# Pilot Operational Ownership

The required responsibilities and alert rules are defined, but no human owner or notification channel has acknowledged them. Values below are explicit handoff placeholders, not invented assignments.

## Required owners

| Responsibility | Owner status |
|---|---|
| Database | `OWNER_CONFIRMATION_REQUIRED` |
| Application | `OWNER_CONFIRMATION_REQUIRED` |
| Security | `OWNER_CONFIRMATION_REQUIRED` |
| Backup / restore | `OWNER_CONFIRMATION_REQUIRED` |
| Cutover | `OWNER_CONFIRMATION_REQUIRED` |
| Rollback | `OWNER_CONFIRMATION_REQUIRED` |
| Monitoring | `OWNER_CONFIRMATION_REQUIRED` |
| Customer communication | `OWNER_CONFIRMATION_REQUIRED` |

## Minimum alert contract

| Signal | Trigger | Required owner | Channel | Response expectation | Rollback trigger |
|---|---|---|---|---|---|
| Public DPP unavailable | 3 consecutive failures / 5 min | Application + Monitoring | `CHANNEL_CONFIRMATION_REQUIRED` | acknowledge <=15 min | sustained outage or failed health recovery |
| Resolver error spike | >1% 5xx / 5 min or p95 >2.5 s / 15 min | Application | pending | acknowledge <=15 min | error budget breach after mitigation |
| Database unavailable | 2 consecutive connection failures | Database | pending | immediate triage | cutover rollback if not recovered within 15 min |
| Backup stale | latest completed backup age >26 h | Backup/restore | pending | resolve before cutover | block cutover; rollback if recovery prerequisite is lost |
| Publication failure | any irreversible or repeated publication failure | Application | pending | triage <=15 min | disable publication/write path |
| Cross-tenant anomaly | any suspected tenant-data disclosure | Security | pending | immediate containment | activate security kill switch and rollback |
| Dead-letter spike | >5 failed jobs in 5 min or monotonic growth for 15 min | Application + Monitoring | pending | acknowledge <=15 min | disable connector processing |

Hosted signals are technically visible through HTTP status, security/rate-limit headers, Server-Timing, Supabase/Vercel logs and database counters. External delivery, retention acceptance, on-call rotation and acknowledgements remain absent.

```text
OPERATIONAL_OWNERSHIP = BLOCKED
OBSERVABILITY_GATE = BLOCKED
```
