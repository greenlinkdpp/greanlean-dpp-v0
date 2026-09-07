-- Generated bundle. Do not edit directly.
-- Non-destructive rollback for migration 0026.
-- The catalog is deactivated, while captured values and audit-relevant metadata are retained.
begin;
update public.battery_regulatory_catalog set is_active = false where version = '2.0.0';
update public.greanlean_migration_ledger set result = 'rolled_back', applied_at = now(), notes = 'Soft rollback: v2.0 catalog deactivated; data retained.' where migration_number = '0026';
commit;
