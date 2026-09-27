# Cutover write strategy

Status: **DESIGNED, NOT EXECUTED**.

## Authority model

Naive dual-write is prohibited. Before cutover, V1 is the sole authoritative write path. During a future Pilot transition, the approved authoritative path must remain singular:

```text
client write
→ authoritative service/database transaction
→ durable outbox or replayable adapter event
→ non-authoritative V2 projection
→ reconciliation and promotion gate
```

V2 may become authoritative only after migration reconciliation, shadow compare, security, performance, recovery, and owner gates pass. A feature flag is a routing control, not an authorization decision.

## Future Pilot sequence

1. Freeze schema/mapping versions and record deploy/migration hashes.
2. Take a verified backup/PITR checkpoint.
3. Complete final read-only dry run and resolve all Pilot `REVIEW_REQUIRED` rows.
4. Pause Pilot writes for a bounded reconciliation window, or use a durable outbox from the single V1 writer.
5. Migrate and reconcile counts/hashes in the isolated rehearsal, then repeat under approved Production authority.
6. Enable tenant-scoped V2 reads, observe, then authorize the single V2 write path.
7. Keep V1 readable and preserve post-checkpoint write evidence.

## Rollback

Rollback means disable V2 primary, restore V1 routing, stop external execution, preserve V2 evidence, and reconcile post-checkpoint writes. It does not mean dropping V2 tables or mutating immutable versions. If V2 accepted any authoritative writes, rollback requires an owner-approved reverse adapter/reconciliation plan before cutover begins.

Unresolved: chosen outbox technology, maximum write-freeze window, reverse reconciliation owner, and Pilot-specific data volume. `ROLLBACK_GATE = BLOCKED` until this strategy is exercised in Pre-Production.
