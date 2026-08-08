begin;

do $$
begin
  if to_regclass('public.products') is null then
    raise exception '0015 requires public.products';
  end if;
  if to_regclass('public.dpp_category_profiles') is null then
    raise exception '0015 requires public.dpp_category_profiles';
  end if;
  if to_regclass('public.dpp_audit_logs') is null then
    raise exception '0015 requires public.dpp_audit_logs';
  end if;
  if to_regprocedure('public.greanlean_is_platform_admin(uuid)') is null then
    raise exception '0015 requires migration 0013 identity and access';
  end if;
end;
$$;

create table if not exists public.dpp_publication (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  version_number integer not null,
  status text not null default 'PUBLISHED',
  schema_version text not null,
  profile_key text not null,
  profile_version text not null,
  snapshot jsonb not null,
  canonical_payload text not null,
  snapshot_hash text not null,
  hash_algorithm text not null default 'SHA-256',
  canonicalization text not null default 'JCS',
  published_by uuid references auth.users(id) on delete set null,
  published_at timestamptz not null default now(),
  supersedes_id uuid,
  withdrawn_at timestamptz,
  withdrawal_reason text,
  created_at timestamptz not null default now(),
  constraint dpp_publication_version_positive_check
    check (version_number > 0),
  constraint dpp_publication_status_check
    check (status in ('PUBLISHED', 'SUPERSEDED', 'WITHDRAWN')),
  constraint dpp_publication_schema_version_check
    check (length(trim(schema_version)) between 1 and 40),
  constraint dpp_publication_profile_key_check
    check (length(trim(profile_key)) between 1 and 160),
  constraint dpp_publication_profile_version_check
    check (length(trim(profile_version)) between 1 and 80),
  constraint dpp_publication_snapshot_object_check
    check (jsonb_typeof(snapshot) = 'object'),
  constraint dpp_publication_hash_check
    check (snapshot_hash ~ '^[a-f0-9]{64}$'),
  constraint dpp_publication_hash_algorithm_check
    check (hash_algorithm = 'SHA-256'),
  constraint dpp_publication_canonicalization_check
    check (canonicalization = 'JCS'),
  constraint dpp_publication_supersedes_self_check
    check (supersedes_id is null or supersedes_id <> id),
  constraint dpp_publication_withdrawal_check
    check (
      (
        status = 'WITHDRAWN'
        and withdrawn_at is not null
        and length(trim(coalesce(withdrawal_reason, ''))) >= 10
      )
      or (
        status <> 'WITHDRAWN'
        and withdrawn_at is null
        and withdrawal_reason is null
      )
    ),
  constraint dpp_publication_product_version_key
    unique (product_id, version_number),
  constraint dpp_publication_id_product_key
    unique (id, product_id),
  constraint dpp_publication_supersedes_product_fk
    foreign key (supersedes_id, product_id)
    references public.dpp_publication(id, product_id)
    on delete restrict
);

create unique index if not exists dpp_publication_one_current_idx
  on public.dpp_publication (product_id)
  where status = 'PUBLISHED';

create index if not exists dpp_publication_product_history_idx
  on public.dpp_publication (product_id, version_number desc);

create index if not exists dpp_publication_hash_idx
  on public.dpp_publication (snapshot_hash);

create table if not exists public.dpp_product_publication_pointer (
  product_id uuid primary key references public.products(id) on delete restrict,
  publication_id uuid not null unique,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint dpp_publication_pointer_product_fk
    foreign key (publication_id, product_id)
    references public.dpp_publication(id, product_id)
    on delete restrict
);

comment on table public.dpp_publication is
  'Immutable complete DPP publication snapshots. Audience projections, PDF, JSON and Registry mappings must reference this version.';
comment on column public.dpp_publication.canonical_payload is
  'Exact RFC 8785 JSON Canonicalization Scheme payload for snapshot content excluding the integrity object.';
comment on table public.dpp_product_publication_pointer is
  'The single current published-version pointer for each product. Draft saves never update this table.';

create or replace function public.greanlean_publication_snapshot_is_well_formed(
  source_snapshot jsonb
)
returns boolean
language sql
immutable
set search_path = public
as $$
  select
    jsonb_typeof(source_snapshot) = 'object'
    and jsonb_typeof(source_snapshot -> 'publication') = 'object'
    and jsonb_typeof(source_snapshot -> 'classification') = 'object'
    and jsonb_typeof(source_snapshot -> 'modules') = 'object'
    and jsonb_typeof(source_snapshot -> 'evidenceIndex') = 'array'
    and jsonb_typeof(source_snapshot -> 'audienceManifest') = 'object'
    and jsonb_typeof(source_snapshot -> 'governance') = 'object'
    and (source_snapshot -> 'modules') ?& array[
      'identity',
      'materials',
      'environment',
      'performance',
      'sector',
      'traceability',
      'evidence',
      'circularity',
      'lifecycle'
    ];
$$;

create or replace function public.greanlean_prepare_publication_record()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parsed_canonical_payload jsonb;
  computed_hash text;
begin
  if not public.greanlean_publication_snapshot_is_well_formed(new.snapshot) then
    raise exception 'PUBLICATION_SNAPSHOT_MALFORMED' using errcode = '22023';
  end if;

  begin
    parsed_canonical_payload := new.canonical_payload::jsonb;
  exception
    when others then
      raise exception 'PUBLICATION_CANONICAL_PAYLOAD_INVALID_JSON' using errcode = '22023';
  end;

  if parsed_canonical_payload is distinct from (new.snapshot - 'integrity') then
    raise exception 'PUBLICATION_CANONICAL_PAYLOAD_MISMATCH' using errcode = '22023';
  end if;

  computed_hash := encode(extensions.digest(convert_to(new.canonical_payload, 'UTF8'), 'sha256'), 'hex');
  new.snapshot_hash := computed_hash;
  new.hash_algorithm := 'SHA-256';
  new.canonicalization := 'JCS';
  new.snapshot := jsonb_set(
    new.snapshot,
    '{integrity}',
    jsonb_build_object(
      'algorithm', 'SHA-256',
      'canonicalization', 'JCS',
      'digest', computed_hash,
      'generatedAt', new.published_at,
      'anchorStatus', 'NOT_CONFIGURED'
    ),
    true
  );

  return new;
end;
$$;

create or replace function public.greanlean_prevent_publication_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'DPP_PUBLICATION_DELETE_FORBIDDEN' using errcode = '55000';
  end if;

  if new.id is distinct from old.id
    or new.product_id is distinct from old.product_id
    or new.version_number is distinct from old.version_number
    or new.schema_version is distinct from old.schema_version
    or new.profile_key is distinct from old.profile_key
    or new.profile_version is distinct from old.profile_version
    or new.snapshot is distinct from old.snapshot
    or new.canonical_payload is distinct from old.canonical_payload
    or new.snapshot_hash is distinct from old.snapshot_hash
    or new.hash_algorithm is distinct from old.hash_algorithm
    or new.canonicalization is distinct from old.canonicalization
    or new.published_by is distinct from old.published_by
    or new.published_at is distinct from old.published_at
    or new.supersedes_id is distinct from old.supersedes_id
    or new.created_at is distinct from old.created_at
  then
    raise exception 'DPP_PUBLICATION_CONTENT_IMMUTABLE' using errcode = '55000';
  end if;

  if new.status is distinct from old.status then
    if old.status <> 'PUBLISHED' or new.status not in ('SUPERSEDED', 'WITHDRAWN') then
      raise exception 'DPP_PUBLICATION_STATUS_TRANSITION_FORBIDDEN' using errcode = '55000';
    end if;
  end if;

  if new.status = 'WITHDRAWN' then
    if new.withdrawn_at is null
      or length(trim(coalesce(new.withdrawal_reason, ''))) < 10
    then
      raise exception 'DPP_PUBLICATION_WITHDRAWAL_REASON_REQUIRED' using errcode = '22023';
    end if;
  elsif new.withdrawn_at is not null or new.withdrawal_reason is not null then
    raise exception 'DPP_PUBLICATION_WITHDRAWAL_METADATA_FORBIDDEN' using errcode = '22023';
  end if;

  return new;
end;
$$;

create or replace function public.greanlean_validate_publication_pointer()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target_status text;
begin
  select publication.status
  into target_status
  from public.dpp_publication publication
  where publication.id = new.publication_id
    and publication.product_id = new.product_id;

  if target_status is distinct from 'PUBLISHED' then
    raise exception 'PUBLICATION_POINTER_REQUIRES_PUBLISHED_VERSION' using errcode = '23514';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists dpp_publication_prepare_record on public.dpp_publication;
create trigger dpp_publication_prepare_record
  before insert on public.dpp_publication
  for each row execute function public.greanlean_prepare_publication_record();

drop trigger if exists dpp_publication_content_immutable on public.dpp_publication;
create trigger dpp_publication_content_immutable
  before update or delete on public.dpp_publication
  for each row execute function public.greanlean_prevent_publication_mutation();

drop trigger if exists dpp_publication_pointer_validate on public.dpp_product_publication_pointer;
create trigger dpp_publication_pointer_validate
  before insert or update on public.dpp_product_publication_pointer
  for each row execute function public.greanlean_validate_publication_pointer();

alter table public.dpp_publication enable row level security;
alter table public.dpp_product_publication_pointer enable row level security;

drop policy if exists "Platform administrators read DPP publications" on public.dpp_publication;
create policy "Platform administrators read DPP publications"
  on public.dpp_publication for select to authenticated
  using (public.greanlean_is_platform_admin(auth.uid()));

drop policy if exists "Platform administrators read publication pointers" on public.dpp_product_publication_pointer;
create policy "Platform administrators read publication pointers"
  on public.dpp_product_publication_pointer for select to authenticated
  using (public.greanlean_is_platform_admin(auth.uid()));

revoke all on public.dpp_publication from public, anon, authenticated;
revoke all on public.dpp_product_publication_pointer from public, anon, authenticated;
grant select on public.dpp_publication to authenticated;
grant select on public.dpp_product_publication_pointer to authenticated;
grant select, insert, update, delete on public.dpp_publication to service_role;
grant select, insert, update, delete on public.dpp_product_publication_pointer to service_role;

create or replace function public.greanlean_store_dpp_publication(
  target_product_id uuid,
  target_schema_version text,
  target_profile_key text,
  target_profile_version text,
  target_snapshot jsonb,
  target_canonical_payload text,
  expected_current_publication_id uuid default null,
  publishing_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  product_record public.products%rowtype;
  current_publication_id uuid;
  next_version_number integer;
  inserted_publication public.dpp_publication%rowtype;
  effective_publisher uuid := coalesce(publishing_user_id, auth.uid());
begin
  select *
  into product_record
  from public.products
  where id = target_product_id
  for update;

  if product_record.id is null then
    raise exception 'PRODUCT_NOT_FOUND' using errcode = 'P0002';
  end if;

  if nullif(trim(product_record.dpp_id), '') is null then
    raise exception 'PUBLICATION_DPP_ID_REQUIRED' using errcode = '22023';
  end if;

  if target_profile_key is distinct from product_record.dpp_profile_key then
    raise exception 'PUBLICATION_PROFILE_MISMATCH' using errcode = '22023';
  end if;

  if target_snapshot #>> '{publication,productId}' is distinct from target_product_id::text then
    raise exception 'PUBLICATION_PRODUCT_ID_MISMATCH' using errcode = '22023';
  end if;

  if nullif(target_snapshot #>> '{publication,dppId}', '') is distinct from product_record.dpp_id then
    raise exception 'PUBLICATION_DPP_ID_MISMATCH' using errcode = '22023';
  end if;

  if target_snapshot #>> '{classification,profileKey}' is distinct from target_profile_key then
    raise exception 'PUBLICATION_CLASSIFICATION_PROFILE_MISMATCH' using errcode = '22023';
  end if;

  select pointer.publication_id
  into current_publication_id
  from public.dpp_product_publication_pointer pointer
  where pointer.product_id = target_product_id
  for update;

  if current_publication_id is distinct from expected_current_publication_id then
    raise exception 'PUBLICATION_VERSION_CONFLICT' using errcode = '40001';
  end if;

  select coalesce(max(publication.version_number), 0) + 1
  into next_version_number
  from public.dpp_publication publication
  where publication.product_id = target_product_id;

  if current_publication_id is not null then
    update public.dpp_publication
    set status = 'SUPERSEDED'
    where id = current_publication_id;
  end if;

  insert into public.dpp_publication (
    product_id,
    version_number,
    status,
    schema_version,
    profile_key,
    profile_version,
    snapshot,
    canonical_payload,
    snapshot_hash,
    published_by,
    published_at,
    supersedes_id
  ) values (
    target_product_id,
    next_version_number,
    'PUBLISHED',
    trim(target_schema_version),
    trim(target_profile_key),
    trim(target_profile_version),
    target_snapshot,
    target_canonical_payload,
    repeat('0', 64),
    effective_publisher,
    now(),
    current_publication_id
  )
  returning * into inserted_publication;

  insert into public.dpp_product_publication_pointer (
    product_id,
    publication_id,
    updated_by,
    updated_at
  ) values (
    target_product_id,
    inserted_publication.id,
    effective_publisher,
    now()
  )
  on conflict (product_id) do update set
    publication_id = excluded.publication_id,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at;

  insert into public.dpp_audit_logs (
    product_id,
    actor_name,
    actor_role,
    action_type,
    target_table,
    target_id,
    previous_hash,
    new_hash,
    notes,
    visibility_level
  ) values (
    target_product_id,
    coalesce(effective_publisher::text, 'service_role'),
    case
      when effective_publisher is null then 'service_role'
      else 'authenticated_server_actor'
    end,
    'DPP_PUBLICATION_CREATED',
    'dpp_publication',
    inserted_publication.id,
    (
      select previous_publication.snapshot_hash
      from public.dpp_publication previous_publication
      where previous_publication.id = current_publication_id
    ),
    inserted_publication.snapshot_hash,
    format('Published immutable DPP version %s', next_version_number),
    'internal'
  );

  return jsonb_build_object(
    'publicationId', inserted_publication.id,
    'productId', inserted_publication.product_id,
    'versionNumber', inserted_publication.version_number,
    'snapshotHash', inserted_publication.snapshot_hash,
    'status', inserted_publication.status,
    'publishedAt', inserted_publication.published_at
  );
end;
$$;

create or replace function public.greanlean_withdraw_current_dpp_publication(
  target_product_id uuid,
  expected_publication_id uuid,
  withdrawal_reason_value text,
  withdrawing_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_publication public.dpp_publication%rowtype;
  effective_actor uuid := coalesce(withdrawing_user_id, auth.uid());
begin
  if length(trim(coalesce(withdrawal_reason_value, ''))) < 10 then
    raise exception 'PUBLICATION_WITHDRAWAL_REASON_REQUIRED' using errcode = '22023';
  end if;

  select publication.*
  into current_publication
  from public.dpp_product_publication_pointer pointer
  join public.dpp_publication publication
    on publication.id = pointer.publication_id
  where pointer.product_id = target_product_id
  for update of pointer, publication;

  if current_publication.id is null then
    raise exception 'CURRENT_PUBLICATION_NOT_FOUND' using errcode = 'P0002';
  end if;

  if current_publication.id is distinct from expected_publication_id then
    raise exception 'PUBLICATION_VERSION_CONFLICT' using errcode = '40001';
  end if;

  delete from public.dpp_product_publication_pointer
  where product_id = target_product_id;

  update public.dpp_publication
  set
    status = 'WITHDRAWN',
    withdrawn_at = now(),
    withdrawal_reason = trim(withdrawal_reason_value)
  where id = current_publication.id;

  insert into public.dpp_audit_logs (
    product_id,
    actor_name,
    actor_role,
    action_type,
    target_table,
    target_id,
    previous_hash,
    new_hash,
    notes,
    visibility_level
  ) values (
    target_product_id,
    coalesce(effective_actor::text, 'service_role'),
    case
      when effective_actor is null then 'service_role'
      else 'authenticated_server_actor'
    end,
    'DPP_PUBLICATION_WITHDRAWN',
    'dpp_publication',
    current_publication.id,
    current_publication.snapshot_hash,
    current_publication.snapshot_hash,
    trim(withdrawal_reason_value),
    'internal'
  );

  return jsonb_build_object(
    'publicationId', current_publication.id,
    'productId', target_product_id,
    'status', 'WITHDRAWN'
  );
end;
$$;

revoke all on function public.greanlean_publication_snapshot_is_well_formed(jsonb) from public;
revoke all on function public.greanlean_store_dpp_publication(
  uuid,
  text,
  text,
  text,
  jsonb,
  text,
  uuid,
  uuid
) from public, anon, authenticated;
revoke all on function public.greanlean_withdraw_current_dpp_publication(
  uuid,
  uuid,
  text,
  uuid
) from public, anon, authenticated;

grant execute on function public.greanlean_publication_snapshot_is_well_formed(jsonb) to service_role;
grant execute on function public.greanlean_store_dpp_publication(
  uuid,
  text,
  text,
  text,
  jsonb,
  text,
  uuid,
  uuid
) to service_role;
grant execute on function public.greanlean_withdraw_current_dpp_publication(
  uuid,
  uuid,
  text,
  uuid
) to service_role;

commit;
