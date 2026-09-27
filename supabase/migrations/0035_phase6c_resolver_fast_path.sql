begin;

do $$
begin
  if to_regclass('public.resolver_mapping') is null
     or to_regclass('public.dpp_current_pointer') is null
     or to_regclass('public.v2_public_rate_limit_counter') is null then
    raise exception '0035 requires migrations 0030 and 0034';
  end if;
end;
$$;

create index if not exists product_identifier_normalized_active_idx
  on public.product_subject_identifier(normalized_value)
  where status = 'ACTIVE';

create or replace function public.v2_phase6c_resolve_public_passport(
  p_host text,
  p_identifier text,
  p_candidate_paths text[]
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_seed_count integer;
  v_resolved_count integer;
  v_passport_count integer;
  v_root_mapping_id uuid;
  v_passport_id uuid;
  v_mapping public.resolver_mapping%rowtype;
  v_passport public.dpp_passport%rowtype;
  v_version public.dpp_version%rowtype;
begin
  if p_host is null or p_host = '' or p_host <> lower(p_host)
     or p_host ~ '[/\\\s]' or length(p_host) > 253
     or p_identifier is null or btrim(p_identifier) = '' or length(p_identifier) > 512
     or p_candidate_paths is null or cardinality(p_candidate_paths) < 1 or cardinality(p_candidate_paths) > 8
     or exists (select 1 from unnest(p_candidate_paths) candidate where candidate !~ '^/[A-Za-z0-9._~!$&''()*+,;=:@%/-]+$') then
    raise exception 'RESOLVER_NOT_FOUND';
  end if;

  if not exists (
    select 1 from public.resolver_host_allowlist
    where host = p_host and status = 'ACTIVE'
  ) then
    raise exception 'RESOLVER_NOT_FOUND';
  end if;

  with recursive seeds as (
    select mapping.*, mapping.id as root_mapping_id, array[mapping.id] as visited, 0 as depth
    from public.resolver_mapping mapping
    where mapping.host = p_host
      and mapping.is_public
      and mapping.status = 'ACTIVE'
      and (
        mapping.normalized_path = any(p_candidate_paths)
        or mapping.identifier_id in (
          select identifier.id
          from public.product_subject_identifier identifier
          where identifier.status = 'ACTIVE'
            and identifier.normalized_value in (p_identifier, upper(p_identifier))
        )
      )
  ), chain as (
    select * from seeds
    union all
    select target.*, chain.root_mapping_id, chain.visited || target.id, chain.depth + 1
    from chain
    join public.resolver_mapping target
      on target.id = chain.target_mapping_id
     and target.tenant_id = chain.tenant_id
    where chain.target_mapping_id is not null
      and chain.depth < 8
      and not target.id = any(chain.visited)
      and target.status = 'ACTIVE'
  ), resolved as (
    select * from chain
    where target_mapping_id is null
      and (valid_until is null or valid_until > clock_timestamp())
  )
  select
    (select count(*) from seeds),
    count(*),
    count(distinct resolved.passport_id),
    min(resolved.root_mapping_id::text)::uuid,
    min(resolved.passport_id::text)::uuid
  into v_seed_count, v_resolved_count, v_passport_count, v_root_mapping_id, v_passport_id
  from resolved;

  if v_seed_count = 0 then raise exception 'RESOLVER_NOT_FOUND'; end if;
  if v_resolved_count = 0 then raise exception 'RESOLVER_MAPPING_EXPIRED'; end if;
  if v_resolved_count < v_seed_count then raise exception 'RESOLVER_ALIAS_CYCLE'; end if;
  if v_passport_count <> 1 then raise exception 'RESOLVER_AMBIGUOUS'; end if;

  select * into v_mapping from public.resolver_mapping where id = v_root_mapping_id;
  select * into v_passport from public.dpp_passport
    where id = v_passport_id and status = 'ACTIVE';
  if not found then raise exception 'RESOLVER_NOT_FOUND'; end if;

  select version.* into v_version
  from public.dpp_current_pointer pointer
  join public.dpp_version version
    on version.id = pointer.current_version_id
   and version.passport_id = pointer.passport_id
   and version.tenant_id = pointer.tenant_id
  where pointer.passport_id = v_passport.id;

  if found then
    if v_version.publication_state <> 'PUBLISHED' then
      raise exception 'CURRENT_POINTER_INVALID';
    end if;
    return jsonb_build_object(
      'kind', 'PUBLISHED',
      'mapping', to_jsonb(v_mapping),
      'passport', to_jsonb(v_passport),
      'version', to_jsonb(v_version)
    );
  end if;

  select version.* into v_version
  from public.dpp_version version
  where version.passport_id = v_passport.id
    and version.publication_state = 'WITHDRAWN'
  order by version.version_number desc
  limit 1;
  if found then
    return jsonb_build_object(
      'kind', 'WITHDRAWN',
      'mapping', to_jsonb(v_mapping),
      'passport', to_jsonb(v_passport),
      'version', to_jsonb(v_version)
    );
  end if;

  raise exception 'RESOLVER_NOT_FOUND';
end;
$$;

revoke all on function public.v2_phase6c_resolve_public_passport(text,text,text[]) from public, anon, authenticated;
grant execute on function public.v2_phase6c_resolve_public_passport(text,text,text[]) to service_role;

insert into public.greanlean_migration_ledger(
  migration_number, migration_name, checksum_sha256, environment,
  applied_by, result, notes
)
values (
  '0035', 'phase6c_resolver_fast_path', null,
  'preproduction', 'codex', 'applied',
  'Collapse the public Resolver mapping, Passport, current pointer and immutable version reads into one service-role-only database round trip; add normalized identifier lookup index.'
)
on conflict (migration_number) do update set
  migration_name = excluded.migration_name,
  environment = excluded.environment,
  applied_by = excluded.applied_by,
  applied_at = now(),
  result = excluded.result,
  notes = excluded.notes;

commit;
