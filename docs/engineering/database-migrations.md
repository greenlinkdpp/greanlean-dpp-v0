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

The current additive sequence is `0001`, `0006`, `0007`, `0009`, `0010`, `0011`.
Intentional gaps remain reserved by `PLAN.md`. Phase 4 creates the battery
reference catalog, domain tables, and append-only operating metrics. It does not
backfill, update, or delete existing product data.

Phase 5 migration `0011` adds the isolated Registry TEST adapter tables,
versioned mapping, validation history, error history, retry chain, and proof
boundary. It does not alter the legacy `dpp_registry_submissions` table.

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
