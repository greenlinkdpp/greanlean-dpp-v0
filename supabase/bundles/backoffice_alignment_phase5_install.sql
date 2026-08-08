-- GREANLEAN BACKOFFICE ALIGNMENT M6 FOUNDATION INSTALL
-- Generated file. Requires migrations 0013 through 0020.
-- Adds canonical-read projection, migration tracking, and Registry publication links.
-- Read mode remains LEGACY until four canonical publications pass cutover gates.

-- ============================================================================
-- SOURCE: supabase/migrations/0021_publication_backfill_and_read_cutover.sql
-- SHA256: 1ad4dcc431d4dce41a662c5c120231afb702bb15f1f40e33ec11d02f504ea6f7
-- ============================================================================
begin;

do $$
begin
  if to_regclass('public.dpp_publication') is null
    or to_regclass('public.dpp_product_publication_pointer') is null
    or to_regprocedure('public.greanlean_resolve_dpp_access(text,text,text,text,text,text)') is null
  then
    raise exception '0021 requires publication and identity migrations 0013 through 0018';
  end if;
end;
$$;

create table if not exists public.dpp_publication_read_control (
  singleton boolean primary key default true check (singleton),
  read_mode text not null default 'LEGACY',
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint dpp_publication_read_mode_check
    check (read_mode in ('LEGACY', 'CANONICAL'))
);

insert into public.dpp_publication_read_control (singleton, read_mode)
values (true, 'LEGACY')
on conflict (singleton) do nothing;

create table if not exists public.dpp_migration_batch (
  id uuid primary key default gen_random_uuid(),
  batch_code text not null unique,
  migration_type text not null,
  status text not null default 'PREPARING',
  target_product_ids uuid[] not null default '{}'::uuid[],
  source_system text not null,
  notes text,
  started_by uuid references auth.users(id) on delete set null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint dpp_migration_batch_code_check
    check (batch_code ~ '^[A-Z0-9][A-Z0-9._-]{2,79}$'),
  constraint dpp_migration_batch_type_check
    check (migration_type in ('CANONICAL_BACKFILL', 'READ_CUTOVER', 'ROLLBACK')),
  constraint dpp_migration_batch_status_check
    check (status in ('PREPARING', 'RUNNING', 'BLOCKED', 'COMPLETED', 'ROLLED_BACK')),
  constraint dpp_migration_batch_completion_check
    check (
      (status in ('COMPLETED', 'ROLLED_BACK') and completed_at is not null)
      or (status not in ('COMPLETED', 'ROLLED_BACK') and completed_at is null)
    )
);

create table if not exists public.dpp_migration_issue (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.dpp_migration_batch(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  field_code text,
  issue_type text not null,
  severity text not null,
  source_details jsonb not null default '{}'::jsonb,
  status text not null default 'OPEN',
  resolution_notes text,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint dpp_migration_issue_type_check
    check (
      issue_type in (
        'EXPECTED_MODEL_CHANGE',
        'SOURCE_DATA_MISSING',
        'LEGACY_HARDCODED_VALUE',
        'ACCESS_POLICY_CHANGE',
        'MAPPING_DEFECT',
        'TRANSLATION_GAP'
      )
    ),
  constraint dpp_migration_issue_severity_check
    check (severity in ('BLOCKER', 'WARNING', 'INFO')),
  constraint dpp_migration_issue_status_check
    check (status in ('OPEN', 'RESOLVED', 'ACCEPTED')),
  constraint dpp_migration_issue_source_check
    check (jsonb_typeof(source_details) = 'object'),
  constraint dpp_migration_issue_resolution_check
    check (
      (status = 'OPEN' and resolved_at is null)
      or (status in ('RESOLVED', 'ACCEPTED') and resolved_at is not null)
    )
);

create table if not exists public.dpp_publication_comparison (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.dpp_migration_batch(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  publication_id uuid references public.dpp_publication(id) on delete restrict,
  source_fingerprint text not null,
  compared_facts integer not null,
  matched_facts integer not null,
  mapping_defect_count integer not null default 0,
  restricted_field_leak boolean not null default false,
  comparison_result jsonb not null,
  passed boolean not null,
  compared_at timestamptz not null default now(),
  constraint dpp_publication_comparison_hash_check
    check (source_fingerprint ~ '^[a-f0-9]{64}$'),
  constraint dpp_publication_comparison_counts_check
    check (
      compared_facts >= 0
      and matched_facts between 0 and compared_facts
      and mapping_defect_count >= 0
    ),
  constraint dpp_publication_comparison_result_check
    check (jsonb_typeof(comparison_result) = 'object')
);

create index if not exists dpp_migration_issue_batch_product_idx
  on public.dpp_migration_issue (batch_id, product_id, status, severity);
create index if not exists dpp_publication_comparison_batch_product_idx
  on public.dpp_publication_comparison (batch_id, product_id, compared_at desc);

create or replace function public.greanlean_project_canonical_field_array(
  source_fields jsonb,
  requested_level text
)
returns jsonb
language sql
stable
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      case
        when public.greanlean_access_rank(requested_level) < 2
          then field_value - 'sourceRecord'
        else field_value
      end
      order by field_ordinality
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(coalesce(source_fields, '[]'::jsonb))
    with ordinality as fields(field_value, field_ordinality)
  where public.greanlean_access_rank(requested_level)
    >= public.greanlean_access_rank(coalesce(field_value ->> 'accessLevel', 'PUBLIC'));
$$;

create or replace function public.greanlean_project_canonical_snapshot(
  source_snapshot jsonb,
  requested_level text
)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  normalized_level text := upper(coalesce(requested_level, 'PUBLIC'));
  projected_snapshot jsonb := source_snapshot;
  projected_modules jsonb := '{}'::jsonb;
  projected_module jsonb;
  projected_records jsonb;
  projected_record jsonb;
  module_key text;
  module_value jsonb;
  record_value jsonb;
  evidence_value jsonb;
  projected_evidence jsonb := '[]'::jsonb;
begin
  if source_snapshot is null
    or coalesce(source_snapshot ->> 'schema', '') not in (
      'https://greanlean.com/schemas/dpp-publication/1.0',
      'greanlean.dpp.publication'
    )
  then
    return null;
  end if;
  if normalized_level not in (
    'PUBLIC',
    'LEGITIMATE_INTEREST',
    'AUTHORITY_ONLY',
    'INTERNAL'
  ) then
    raise exception 'INVALID_CANONICAL_PROJECTION_LEVEL' using errcode = '22023';
  end if;

  for module_key, module_value in
    select key, value
    from jsonb_each(coalesce(source_snapshot -> 'modules', '{}'::jsonb))
  loop
    projected_records := '[]'::jsonb;
    for record_value in
      select value
      from jsonb_array_elements(coalesce(module_value -> 'records', '[]'::jsonb))
    loop
      if public.greanlean_access_rank(normalized_level)
        < public.greanlean_access_rank(coalesce(record_value ->> 'accessLevel', 'PUBLIC'))
      then
        continue;
      end if;
      projected_record := jsonb_set(
        record_value,
        '{fields}',
        public.greanlean_project_canonical_field_array(
          record_value -> 'fields',
          normalized_level
        ),
        true
      );
      if jsonb_array_length(projected_record -> 'fields') > 0 then
        projected_records := projected_records || jsonb_build_array(projected_record);
      end if;
    end loop;

    projected_module := jsonb_set(
      jsonb_set(
        module_value,
        '{fields}',
        public.greanlean_project_canonical_field_array(
          module_value -> 'fields',
          normalized_level
        ),
        true
      ),
      '{records}',
      projected_records,
      true
    );
    projected_modules := projected_modules || jsonb_build_object(
      module_key,
      projected_module
    );
  end loop;

  for evidence_value in
    select value
    from jsonb_array_elements(coalesce(source_snapshot -> 'evidenceIndex', '[]'::jsonb))
  loop
    if public.greanlean_access_rank(normalized_level)
      < public.greanlean_access_rank(coalesce(evidence_value ->> 'accessLevel', 'PUBLIC'))
    then
      continue;
    end if;
    projected_evidence := projected_evidence || jsonb_build_array(
      case
        when public.greanlean_access_rank(normalized_level) < 2
          then evidence_value - 'sourceRecord'
        else evidence_value
      end
    );
  end loop;

  projected_snapshot := jsonb_set(
    projected_snapshot,
    '{modules}',
    projected_modules,
    true
  );
  projected_snapshot := jsonb_set(
    projected_snapshot,
    '{evidenceIndex}',
    projected_evidence,
    true
  );
  projected_snapshot := jsonb_set(
    projected_snapshot,
    '{audienceManifest}',
    jsonb_build_object(
      normalized_level,
      coalesce(
        source_snapshot #> array['audienceManifest', normalized_level],
        '{}'::jsonb
      )
    ),
    true
  );

  if public.greanlean_access_rank(normalized_level) < 3 then
    projected_snapshot := jsonb_set(
      projected_snapshot,
      '{governance}',
      coalesce(projected_snapshot -> 'governance', '{}'::jsonb)
        - 'generatedBy'
        - 'sourceTables',
      true
    );
  end if;
  return projected_snapshot;
end;
$$;

create or replace function public.greanlean_public_canonical_dpp_snapshot(
  target_identifier text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  active_mode text;
  target_snapshot jsonb;
begin
  select read_mode into active_mode
  from public.dpp_publication_read_control
  where singleton = true;
  if active_mode is distinct from 'CANONICAL' then
    return null;
  end if;

  select publication.snapshot
  into target_snapshot
  from public.products product
  join public.dpp_product_publication_pointer pointer
    on pointer.product_id = product.id
  join public.dpp_publication publication
    on publication.id = pointer.publication_id
    and publication.product_id = product.id
    and publication.status = 'PUBLISHED'
  where (
    product.dpp_id = target_identifier
    or product.public_slug = target_identifier
    or product.id = (
      select alias.product_id
      from public.dpp_identifier_alias alias
      where alias.alias = target_identifier
        and alias.is_active = true
      limit 1
    )
  )
    and product.status in ('published', 'updated', 'expired')
  limit 1;

  return public.greanlean_project_canonical_snapshot(target_snapshot, 'PUBLIC');
end;
$$;

create or replace function public.greanlean_authorized_canonical_dpp_snapshot(
  target_identifier text,
  requested_level text default 'AUTO',
  access_purpose text default null,
  request_path_value text default null,
  correlation_id_value text default null,
  user_agent_value text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  active_mode text;
  decision jsonb;
  target_snapshot jsonb;
begin
  select read_mode into active_mode
  from public.dpp_publication_read_control
  where singleton = true;
  if active_mode is distinct from 'CANONICAL' then
    return jsonb_build_object('access', null, 'data', null, 'readMode', active_mode);
  end if;

  decision := public.greanlean_resolve_dpp_access(
    target_identifier,
    requested_level,
    access_purpose,
    request_path_value,
    correlation_id_value,
    user_agent_value
  );
  if not coalesce((decision ->> 'allowed')::boolean, false) then
    return jsonb_build_object('access', decision, 'data', null);
  end if;

  select publication.snapshot
  into target_snapshot
  from public.dpp_product_publication_pointer pointer
  join public.dpp_publication publication
    on publication.id = pointer.publication_id
    and publication.product_id = pointer.product_id
    and publication.status = 'PUBLISHED'
  where pointer.product_id = (decision ->> 'productId')::uuid;

  return jsonb_build_object(
    'access',
    decision,
    'data',
    public.greanlean_project_canonical_snapshot(
      target_snapshot,
      decision ->> 'requestedLevel'
    )
  );
end;
$$;

create or replace function public.greanlean_set_publication_read_mode(
  target_mode text,
  acting_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_mode text := upper(trim(target_mode));
  prior_mode text;
begin
  if normalized_mode not in ('LEGACY', 'CANONICAL') then
    raise exception 'INVALID_PUBLICATION_READ_MODE' using errcode = '22023';
  end if;
  if normalized_mode = 'CANONICAL' and (
    select count(*) <> 4
    from public.products product
    join public.dpp_product_publication_pointer pointer
      on pointer.product_id = product.id
    join public.dpp_publication publication
      on publication.id = pointer.publication_id
      and publication.status = 'PUBLISHED'
    where product.dpp_id in (
      'DPP-LMT-BAT-48V15AH',
      'DPP-GV-ESS-14K3-000001',
      'DPP-SFJK-31-1-REC',
      'DPP-CE-EARBUDS-001'
    )
  ) then
    raise exception 'CANONICAL_CUTOVER_REQUIRES_FOUR_CURRENT_PUBLICATIONS'
      using errcode = '55000';
  end if;

  select read_mode into prior_mode
  from public.dpp_publication_read_control
  where singleton = true
  for update;

  update public.dpp_publication_read_control
  set
    read_mode = normalized_mode,
    updated_by = acting_user_id,
    updated_at = now()
  where singleton = true;

  insert into public.dpp_audit_logs (
    actor_name,
    actor_role,
    action_type,
    target_table,
    notes,
    visibility_level
  ) values (
    coalesce(acting_user_id::text, 'service_role'),
    'platform_operator',
    'DPP_PUBLICATION_READ_MODE_CHANGED',
    'dpp_publication_read_control',
    format('Read mode changed from %s to %s', prior_mode, normalized_mode),
    'internal'
  );

  return jsonb_build_object(
    'previousMode', prior_mode,
    'readMode', normalized_mode,
    'changedAt', now()
  );
end;
$$;

alter table public.dpp_publication_read_control enable row level security;
alter table public.dpp_migration_batch enable row level security;
alter table public.dpp_migration_issue enable row level security;
alter table public.dpp_publication_comparison enable row level security;

drop policy if exists "Platform administrators read publication cutover control"
  on public.dpp_publication_read_control;
create policy "Platform administrators read publication cutover control"
  on public.dpp_publication_read_control for select to authenticated
  using (public.greanlean_is_platform_admin(auth.uid()));

drop policy if exists "Platform administrators read migration batches"
  on public.dpp_migration_batch;
create policy "Platform administrators read migration batches"
  on public.dpp_migration_batch for select to authenticated
  using (public.greanlean_is_platform_admin(auth.uid()));

drop policy if exists "Platform administrators read migration issues"
  on public.dpp_migration_issue;
create policy "Platform administrators read migration issues"
  on public.dpp_migration_issue for select to authenticated
  using (public.greanlean_is_platform_admin(auth.uid()));

drop policy if exists "Platform administrators read publication comparisons"
  on public.dpp_publication_comparison;
create policy "Platform administrators read publication comparisons"
  on public.dpp_publication_comparison for select to authenticated
  using (public.greanlean_is_platform_admin(auth.uid()));

revoke all on public.dpp_publication_read_control from public, anon, authenticated;
revoke all on public.dpp_migration_batch from public, anon, authenticated;
revoke all on public.dpp_migration_issue from public, anon, authenticated;
revoke all on public.dpp_publication_comparison from public, anon, authenticated;
grant select on public.dpp_publication_read_control to authenticated;
grant select on public.dpp_migration_batch to authenticated;
grant select on public.dpp_migration_issue to authenticated;
grant select on public.dpp_publication_comparison to authenticated;
grant select, insert, update on public.dpp_publication_read_control to service_role;
grant select, insert, update on public.dpp_migration_batch to service_role;
grant select, insert, update on public.dpp_migration_issue to service_role;
grant select, insert on public.dpp_publication_comparison to service_role;

revoke all on function public.greanlean_project_canonical_field_array(jsonb,text)
  from public, anon, authenticated;
revoke all on function public.greanlean_project_canonical_snapshot(jsonb,text)
  from public, anon, authenticated;
revoke all on function public.greanlean_public_canonical_dpp_snapshot(text)
  from public, anon, authenticated;
revoke all on function public.greanlean_authorized_canonical_dpp_snapshot(
  text,text,text,text,text,text
) from public, anon, authenticated;
revoke all on function public.greanlean_set_publication_read_mode(text,uuid)
  from public, anon, authenticated;

grant execute on function public.greanlean_public_canonical_dpp_snapshot(text)
  to anon, authenticated;
grant execute on function public.greanlean_authorized_canonical_dpp_snapshot(
  text,text,text,text,text,text
) to authenticated;
grant execute on function public.greanlean_project_canonical_field_array(jsonb,text)
  to service_role;
grant execute on function public.greanlean_project_canonical_snapshot(jsonb,text)
  to service_role;
grant execute on function public.greanlean_set_publication_read_mode(text,uuid)
  to service_role;

do $$
begin
  if to_regclass('public.registry_submission') is not null then
    alter table public.registry_submission
      add column if not exists publication_id uuid
      references public.dpp_publication(id) on delete restrict;
    alter table public.registry_submission
      alter column product_version_id drop not null;
    alter table public.registry_submission
      drop constraint if exists registry_submission_publication_source_check;
    alter table public.registry_submission
      add constraint registry_submission_publication_source_check
      check (num_nonnulls(product_version_id, publication_id) = 1);
    create index if not exists registry_submission_publication_idx
      on public.registry_submission (publication_id)
      where publication_id is not null;
  end if;
end;
$$;

commit;
