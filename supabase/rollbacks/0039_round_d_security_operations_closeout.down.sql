begin;

revoke all on function public.v2_delete_empty_archived_tenant(uuid, uuid, text) from public, anon, authenticated, service_role;
drop function if exists public.v2_delete_empty_archived_tenant(uuid, uuid, text);

-- The former table held an already-applied 0012 one-time rollback snapshot.
-- Its historical rows are intentionally not reconstructed by this rollback.
create table if not exists public.greanlean_0012_data_backup (
  table_name text not null,
  row_id uuid not null,
  payload jsonb not null,
  backed_up_at timestamptz not null default now(),
  primary key (table_name, row_id)
);
alter table public.greanlean_0012_data_backup enable row level security;

delete from public.greanlean_migration_ledger where migration_number = '0039';

commit;
