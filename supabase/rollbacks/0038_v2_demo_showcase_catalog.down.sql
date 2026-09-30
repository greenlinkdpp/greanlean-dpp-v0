begin;

drop trigger if exists demo_showcase_entry_touch_updated_at on public.demo_showcase_entry;
drop policy if exists demo_showcase_entry_public_read on public.demo_showcase_entry;
drop table if exists public.demo_showcase_entry;

delete from public.role_capability
where capability_id in (select id from public.capability where code in ('platform.demo.view', 'platform.demo.manage'));
delete from public.capability where code in ('platform.demo.view', 'platform.demo.manage');
delete from public.greanlean_migration_ledger where migration_number = '0038';

commit;
