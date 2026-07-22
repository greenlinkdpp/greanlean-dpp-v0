begin;

create table if not exists public.greanlean_migration_ledger (
  migration_number text primary key,
  migration_name text not null,
  checksum_sha256 text,
  environment text not null default 'unknown',
  applied_by text,
  applied_at timestamptz not null default now(),
  execution_ms integer,
  result text not null default 'applied',
  notes text,
  constraint greanlean_migration_number_format check (migration_number ~ '^[0-9]{4}$'),
  constraint greanlean_migration_checksum_format check (
    checksum_sha256 is null or checksum_sha256 ~ '^[a-f0-9]{64}$'
  ),
  constraint greanlean_migration_result_check check (result in ('applied', 'rolled_back', 'failed'))
);

comment on table public.greanlean_migration_ledger is
  'Application-visible record of approved Greanlean migrations. Supabase internal migration history remains authoritative for CLI execution.';

alter table public.greanlean_migration_ledger enable row level security;

drop policy if exists "Authenticated can read migration ledger" on public.greanlean_migration_ledger;
create policy "Authenticated can read migration ledger"
  on public.greanlean_migration_ledger for select to authenticated using (true);

commit;
