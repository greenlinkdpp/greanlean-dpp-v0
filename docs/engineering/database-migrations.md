# Database Migrations

`supabase/schema.sql` is the legacy bootstrap snapshot. New database work starts
with numbered, additive migrations and never edits production manually.

## Naming

```text
supabase/migrations/0001_project_migration_ledger.sql
supabase/rollbacks/0001_project_migration_ledger.down.sql
tests/migrations/migrations.test.mjs
```

Migration numbers follow `PLAN.md`. Gaps are intentional when later milestones
own the reserved numbers.

## Workflow

1. Back up the target database and record its environment.
2. Run `npm run test:migrations`.
3. Apply the up migration to a disposable copy in ascending order.
4. Verify schema objects, RLS, legacy row counts, and public-page contracts.
5. Run the matching down file in descending order on that disposable copy.
6. Reapply and verify idempotency where the migration declares it.
7. Record migration number, checksum, actor, environment, and result.
8. Promote through preview/test before production approval.

## Rollback Policy

Application flags and the previous Vercel release are the first rollback path.
Run a down migration only when the new tables have not accepted business data.
Once data exists, stop writes and preserve the tables for a forward repair.

The current additive sequence is `0001`, `0006`, `0007`, `0009`, `0010`, `0011`, `0012`, `0013`, `0014`, `0015`, `0016`, `0017`, `0018`, `0019`.
Intentional gaps remain reserved by `PLAN.md`. Phase 4 creates the battery
reference catalog, domain tables, and append-only operating metrics. It does not
backfill, update, or delete existing product data.

Phase 5 migration `0011` adds the isolated Registry TEST adapter tables,
versioned mapping, validation history, error history, retry chain, and proof
boundary. It does not alter the legacy `dpp_registry_submissions` table.

Migration `0012` is an explicitly scoped data publication migration for the
four approved public case products. It creates identifier aliases, corrects
unverified evidence states, adds the missing industrial-battery records, and
captures a reversible `v2.0` publication snapshot. It backs up every modified
legacy row before applying corrections.

Migration `0013` adds organisations, memberships, time-bounded product grants,
access requests, append-only allow/deny audit, database access resolution, and
platform-admin-only legacy write policies. Run
`supabase/bundles/identity_and_access_verify.sql` after applying it. Existing
users with `app_metadata.dpp_access_level=INTERNAL` are migrated to the verified
platform operator organisation as a one-time compatibility bridge.

Migration `0014` completes the battery operating-data integration boundary. It
adds device-to-item bindings, hashed and rotatable integration credentials,
append-only idempotency records, metric quality/freshness metadata, and
service-role-only transactional ingestion functions. Run
`supabase/bundles/battery_operating_data_verify.sql` after applying it. The
optional `supabase/seeds/battery_dynamic_initial_data.sql` seed appends
explicitly unverified initial histories for the approved LMT and industrial
battery cases; it never marks those records as device-reported.

Migration `0015` creates the additive complete-publication foundation:
immutable canonical snapshots, SHA-256 content hashes, one current publication
pointer per product, and service-role-only publication and withdrawal
functions. It does not replace `product_versions` or switch the public reader.

Migration `0016` creates immutable review candidates, append-only validation
runs and results, platform-admin review decisions, source-fingerprint conflict
protection, and a service-role-only approved-review publication function.
Run `supabase/bundles/backoffice_alignment_phase1_verify.sql` after applying
both migrations. Every returned column must be `true`.

Migration `0017` explicitly normalises function privileges after `0016`.
Anonymous users cannot execute review decisions, authenticated users may invoke
the decision RPC but the function still requires a verified platform
administrator, and all publication writes remain restricted to `service_role`.

Migration `0018` requires final publication metadata to be bound after review.
The final snapshot must contain the real publication UUID, consecutive version,
publisher, publication timestamp, and superseded version. The server recalculates
the canonical payload and Hash before calling the new service-only final
publication functions. The legacy draft-as-publication functions are disabled.

Migration `0019` adds logical evidence assets, immutable file versions,
canonical field-to-file evidence links, and append-only cross-sector lifecycle
events. File and event writes are service-role-only. Anonymous reads are
limited to public records of published products, while authenticated reads use
the database product-access decision. Run
`supabase/bundles/backoffice_alignment_phase3_verify.sql` after applying the
generated M4 install bundle.

After applying `0009` and `0010` to a preview database, provide
`SUPABASE_SERVICE_ROLE_KEY` only to the server runtime and enable
`NEXT_PUBLIC_FEATURE_BATTERY_DPP_V2=true` only in that preview deployment. Never
expose the service-role key through a `NEXT_PUBLIC_` variable.

After applying `0011`, enable `FEATURE_REGISTRY_ADAPTER=true` in Preview/Test
only. Production remains disabled until the official battery semantic
catalogue and approved integration contract are available.

For manual Preview installation through Supabase SQL Editor, run
`supabase/bundles/battery_dpp_preview_install.sql` and then the read-only
verification file. Every verification row must report `passed = true`. The
rollback bundle is only for a disposable database that has not accepted battery
business data.
