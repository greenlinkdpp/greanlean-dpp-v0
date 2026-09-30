begin;

-- This rollback is intentionally limited to the relationship table introduced
-- by 0037. It must be applied before rolling back its 0028/0027 dependencies.
drop policy if exists product_organisation_relation_delete on public.product_organisation_relation;
drop policy if exists product_organisation_relation_update on public.product_organisation_relation;
drop policy if exists product_organisation_relation_insert on public.product_organisation_relation;
drop policy if exists product_organisation_relation_select on public.product_organisation_relation;
drop trigger if exists product_organisation_relation_tenant_immutable on public.product_organisation_relation;
drop trigger if exists product_organisation_relation_touch_updated_at on public.product_organisation_relation;
drop table if exists public.product_organisation_relation;

delete from public.greanlean_migration_ledger where migration_number = '0037';

commit;
