# Pilot cutover runbook

This runbook is preparation only. **Do not execute without a new explicit Phase 7/Pilot authorization.**

## Pilot selection

Choose a cooperative, non-highest-risk customer with controlled volume, few external dependencies, a clear DPP workflow, known legacy quality, and an agreed rollback/support window. Do not name a customer during Phase 6.

## Prerequisites

- Gates A–H PASS; named Database, Security, Migration, Cutover, Rollback, Monitoring, Registry, and Customer Communication owners available.
- Supported application dependencies and security headers deployed.
- Paid backup/PITR evidence and a recent isolated restore drill within accepted RPO/RTO.
- Isolated Pre-Production dry run, shadow compare, load, failure, and rollback exercises PASS.
- Pilot legacy mapping has no unresolved conflict/invalid/unknown critical records.
- Production deploy revision, migration hashes, current public URLs/QR samples, and rollback artifact recorded.

## Pre-Production deployment rehearsal

1. Build from the approved commit; run lint, typecheck, 245+ tests, dependency/security review, and Production build.
2. Apply migrations sequentially to a clean Pre-Production database and verify the ledger/catalog/RLS/grants.
3. Configure safe-off flags and dedicated Pre-Production secrets.
4. Load synthetic Production-like data; run smoke and negative security checks.
5. Rehearse migration twice, compare deterministic hashes/counts, run shadow compare and load matrix.
6. Inject DB, Storage, connector, Registry TEST, webhook, secret, migration, and cache failures.
7. Exercise each kill switch and complete a timed rollback.

## Future Production Pilot sequence

1. Confirm owner quorum/support window and announce change freeze.
2. Verify a fresh backup/PITR checkpoint and restoration path.
3. Re-run read-only Production identity/schema/count/URL checks.
4. Execute the approved migration only under new authority; reconcile before enabling any read.
5. Enable tenant-scoped V2 read for the Pilot; keep V1 authoritative.
6. Validate login, tenant reads, public Resolver formats, legacy URLs, QR samples, audit, and monitoring.
7. Observe for the approved window; only then consider the single-authority write transition.
8. Never enable Production Registry/customer connectors unless separately approved.

## Rollback triggers

Any cross-tenant result, publication integrity mismatch, critical unknown shadow diff, RLS anomaly, sustained SLO breach, migration/count mismatch, broken legacy URL/QR, backup uncertainty, or unavailable owner triggers rollback. Disable execution/publication/tenant/public switches as appropriate, restore V1 routing, preserve V2 evidence, reconcile writes, and communicate status.

Runbook document gate: PASS. Execution/validation gate: BLOCKED.
