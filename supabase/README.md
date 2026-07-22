# Supabase Database Files

- `schema.sql` is the legacy full bootstrap snapshot.
- Root-level `*.sql` files are historical/manual demo scripts and are not the
  forward migration system.
- `migrations/` contains new numbered up migrations.
- `rollbacks/` contains matching down migrations.
- `bundles/battery_dpp_preview_install.sql` combines the Phase 3/4 dependency
  sequence for Supabase SQL Editor.
- `bundles/battery_dpp_preview_verify.sql` performs read-only post-install checks.
- `bundles/battery_dpp_preview_rollback.sql` is destructive and is limited to a
  disposable database with no accepted business data.

Apply new migrations in ascending order and rollbacks in descending order.
Never test them first on production. See
`docs/engineering/database-migrations.md` for the required rehearsal and data
preservation rules.

Regenerate the battery bundles after changing a source migration:

```bash
npm run bundle:battery-sql
```
