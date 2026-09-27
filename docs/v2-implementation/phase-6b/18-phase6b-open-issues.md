# Phase 6B Open Issues

All four former Supabase Pro-dependent items are resolved:

1. Production managed-backup evidence — `PASS`.
2. Isolated restore from Production managed backup — `PASS`, 4m14s, target deleted.
3. PITR decision — `NOT_REQUIRED_FOR_PILOT`; remains disabled.
4. Production-plan capacity assessment — completed, with `PILOT_CAPACITY = BLOCKED` because Pilot scope/SLO are undefined.

## Retained operational items

| Item | Classification | Reason |
|---|---|---|
| Five quarantined legacy rows | BLOCKING | No safe business mapping or explicit Pilot exclusion decision exists |
| Resolver p95 6.13 seconds | BLOCKING | No accepted SLO, target concurrency, or safety margin exists |
| Hosted PreProd / distributed rate limiting / chunked-body enforcement / external on-call ownership | BLOCKING | Required hosted and operational evidence/ownership is absent |
| Legacy arbitrary-target QR policy | BLOCKING | No deprecation or strict destination allowlist decision exists |

Phase 7 remains prohibited until a separate instruction is issued and the applicable blockers are closed or accepted by accountable owners.
