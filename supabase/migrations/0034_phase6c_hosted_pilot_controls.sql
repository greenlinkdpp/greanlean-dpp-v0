begin;

do $$
begin
  if to_regclass('public.resolver_mapping') is null
     or to_regclass('public.dpp_current_pointer') is null then
    raise exception '0034 requires migration 0030';
  end if;
end;
$$;

create table public.v2_public_rate_limit_counter (
  surface text not null,
  client_key_hash text not null check (client_key_hash ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  updated_at timestamptz not null default now(),
  primary key (surface, client_key_hash, window_started_at)
);

alter table public.v2_public_rate_limit_counter enable row level security;
revoke all on public.v2_public_rate_limit_counter from public, anon, authenticated;

create or replace function public.v2_phase6c_consume_public_rate_limit(
  p_surface text,
  p_client_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns table(allowed boolean, remaining integer, retry_after_seconds integer)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window_started_at timestamptz;
  v_count integer;
begin
  if p_surface !~ '^[a-z][a-z0-9-]{1,63}$'
     or p_client_key_hash !~ '^[a-f0-9]{64}$'
     or p_limit < 1 or p_limit > 10000
     or p_window_seconds < 1 or p_window_seconds > 3600 then
    raise exception 'invalid public rate-limit input';
  end if;

  v_window_started_at := to_timestamp(
    floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds
  );

  insert into public.v2_public_rate_limit_counter(
    surface, client_key_hash, window_started_at, request_count, updated_at
  ) values (
    p_surface, p_client_key_hash, v_window_started_at, 1, v_now
  )
  on conflict (surface, client_key_hash, window_started_at)
  do update set
    request_count = public.v2_public_rate_limit_counter.request_count + 1,
    updated_at = excluded.updated_at
  returning request_count into v_count;

  return query select
    v_count <= p_limit,
    greatest(0, p_limit - v_count),
    greatest(1, ceil(extract(epoch from (v_window_started_at + make_interval(secs => p_window_seconds) - v_now)))::integer);
end;
$$;

revoke all on function public.v2_phase6c_consume_public_rate_limit(text,text,integer,integer) from public, anon, authenticated;
grant execute on function public.v2_phase6c_consume_public_rate_limit(text,text,integer,integer) to service_role;

insert into public.resolver_host_allowlist(host, status)
values ('greanlean-dpp-preprod.vercel.app', 'ACTIVE')
on conflict (host) do update set status = excluded.status;

with pilot_passport as (
  select pointer.passport_id
  from public.dpp_current_pointer pointer
  order by pointer.updated_at desc, pointer.passport_id
  limit 1
), source_mapping as (
  select
    mapping.tenant_id,
    mapping.identifier_id,
    mapping.normalized_path,
    coalesce(mapping.passport_id, target.passport_id) as passport_id,
    mapping.mapping_type,
    mapping.is_public,
    mapping.valid_from,
    mapping.valid_until,
    mapping.redirect_http_status,
    mapping.created_by
  from public.resolver_mapping mapping
  left join public.resolver_mapping target on target.id = mapping.target_mapping_id
  join pilot_passport pilot on pilot.passport_id = coalesce(mapping.passport_id, target.passport_id)
  where mapping.host = 'localhost'
    and mapping.status = 'ACTIVE'
)
insert into public.resolver_mapping(
  tenant_id, identifier_id, host, normalized_path, passport_id, target_mapping_id,
  mapping_type, status, is_public, valid_from, valid_until,
  redirect_http_status, created_by
)
select
  source.tenant_id, source.identifier_id, 'greanlean-dpp-preprod.vercel.app',
  source.normalized_path, source.passport_id, null,
  source.mapping_type, 'ACTIVE', source.is_public, source.valid_from,
  source.valid_until, source.redirect_http_status, source.created_by
from source_mapping source
where source.passport_id is not null
  and not exists (
    select 1 from public.resolver_mapping existing
    where existing.host = 'greanlean-dpp-preprod.vercel.app'
      and existing.normalized_path = source.normalized_path
      and existing.status = 'ACTIVE'
  );

insert into public.greanlean_migration_ledger(
  migration_number, migration_name, checksum_sha256, environment,
  applied_by, result, notes
)
values (
  '0034', 'phase6c_hosted_pilot_controls', null,
  'preproduction', 'codex', 'applied',
  'Add atomic distributed public rate limiting and the isolated Hosted PreProd Resolver host/mappings.'
)
on conflict (migration_number) do update set
  migration_name = excluded.migration_name,
  environment = excluded.environment,
  applied_by = excluded.applied_by,
  applied_at = now(),
  result = excluded.result,
  notes = excluded.notes;

commit;
