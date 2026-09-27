# 09 Phase 1 Open Issues

## Blocking

None for Phase 1 exit.

## Operational follow-ups before any Production rollout

- Obtain separate Production change authorization; this Phase 1 execution did not authorize or perform a Production migration.
- Reconfirm Production region/data-residency requirements. Development uses Singapore (ap-southeast-1) only as a non-binding development choice.
- Establish Production backup/restore evidence and an approved rollout/rollback runbook before scheduling 0027 outside Development.
- Replace or lifecycle-manage synthetic Development identities when the shared test environment policy is finalized.
- Decide retention policy for Development PDP audit fixtures and idempotency records.

## Deferred by scope

- Product Core, SKU, Batch, Individual Item, Passport, Canonical Claim, Resolver, VC, UNTP, and Production Registry work.
- Partner membership/platform Organisation Directory and generalized dual approval.
- Impersonation, custom domains, regional Production deployment, and final RPO/RTO.

These items do not invalidate the Phase 1 Development exit. Phase 2 must not start until the owner accepts this package and issues a new instruction.

