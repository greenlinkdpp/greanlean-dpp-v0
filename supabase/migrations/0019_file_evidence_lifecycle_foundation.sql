begin;

do $$
begin
  if to_regclass('public.products') is null then
    raise exception '0019 requires public.products';
  end if;
  if to_regclass('public.access_level') is null then
    raise exception '0019 requires public.access_level';
  end if;
  if to_regprocedure('public.greanlean_product_access_level(uuid,uuid)') is null then
    raise exception '0019 requires migration 0013 identity and access';
  end if;
  if to_regprocedure('public.greanlean_access_rank(text)') is null then
    raise exception '0019 requires public.greanlean_access_rank';
  end if;
end;
$$;

create table if not exists public.dpp_file_asset (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  asset_key text not null,
  title text not null,
  document_type text not null,
  description text,
  access_level_code text not null default 'PUBLIC'
    references public.access_level(code) on delete restrict,
  status text not null default 'ACTIVE',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dpp_file_asset_key_check
    check (asset_key ~ '^[a-z0-9][a-z0-9._-]{1,159}$'),
  constraint dpp_file_asset_title_check
    check (length(trim(title)) between 1 and 240),
  constraint dpp_file_asset_document_type_check
    check (length(trim(document_type)) between 1 and 120),
  constraint dpp_file_asset_status_check
    check (status in ('ACTIVE', 'ARCHIVED')),
  constraint dpp_file_asset_product_key
    unique (product_id, asset_key),
  constraint dpp_file_asset_id_product_key
    unique (id, product_id)
);

create table if not exists public.dpp_file_version (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.dpp_file_asset(id) on delete restrict,
  version_number integer not null,
  storage_bucket text not null,
  object_path text not null,
  original_filename text not null,
  mime_type text not null,
  byte_size bigint not null,
  access_level_code text not null
    references public.access_level(code) on delete restrict,
  checksum_sha256 text not null,
  hash_algorithm text not null default 'SHA-256',
  source_document_id uuid references public.product_documents(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint dpp_file_version_positive_check
    check (version_number > 0),
  constraint dpp_file_version_bucket_check
    check (storage_bucket ~ '^[a-z0-9][a-z0-9._-]{1,62}$'),
  constraint dpp_file_version_object_path_check
    check (
      length(trim(object_path)) between 3 and 1024
      and object_path !~ '(^|/)\.\.?(/|$)'
    ),
  constraint dpp_file_version_filename_check
    check (length(trim(original_filename)) between 1 and 255),
  constraint dpp_file_version_mime_check
    check (mime_type ~ '^[a-z0-9.+-]+/[a-z0-9.+-]+$'),
  constraint dpp_file_version_size_check
    check (byte_size > 0 and byte_size <= 104857600),
  constraint dpp_file_version_checksum_check
    check (checksum_sha256 ~ '^[a-f0-9]{64}$'),
  constraint dpp_file_version_hash_algorithm_check
    check (hash_algorithm = 'SHA-256'),
  constraint dpp_file_version_asset_number_key
    unique (asset_id, version_number),
  constraint dpp_file_version_object_key
    unique (storage_bucket, object_path)
);

create table if not exists public.dpp_field_evidence_link (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  file_version_id uuid not null references public.dpp_file_version(id) on delete restrict,
  module_code text not null,
  field_code text not null,
  claim_value jsonb,
  access_level_code text not null default 'PUBLIC'
    references public.access_level(code) on delete restrict,
  verification_status text not null default 'UNVERIFIED',
  supersedes_link_id uuid references public.dpp_field_evidence_link(id) on delete restrict,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint dpp_field_evidence_module_check
    check (
      module_code in (
        'identity',
        'materials',
        'environment',
        'performance',
        'sector',
        'traceability',
        'evidence',
        'circularity',
        'lifecycle'
      )
    ),
  constraint dpp_field_evidence_field_code_check
    check (field_code ~ '^[a-z0-9][a-z0-9._-]{1,199}$'),
  constraint dpp_field_evidence_verification_check
    check (
      verification_status in (
        'UNVERIFIED',
        'PENDING',
        'VERIFIED',
        'REJECTED',
        'MANUALLY_VERIFIED'
      )
    ),
  constraint dpp_field_evidence_supersedes_self_check
    check (supersedes_link_id is null or supersedes_link_id <> id)
);

create table if not exists public.dpp_lifecycle_event (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  scope_type text not null default 'MODEL',
  scope_identifier text,
  event_type text not null,
  event_time timestamptz not null,
  recorded_at timestamptz not null default now(),
  location jsonb not null default '{}'::jsonb,
  responsible_party text,
  event_data jsonb not null default '{}'::jsonb,
  data_source text not null,
  verification_status text not null default 'UNVERIFIED',
  access_level_code text not null default 'PUBLIC'
    references public.access_level(code) on delete restrict,
  file_version_id uuid references public.dpp_file_version(id) on delete restrict,
  supersedes_event_id uuid references public.dpp_lifecycle_event(id) on delete restrict,
  previous_event_hash text,
  event_hash text not null,
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint dpp_lifecycle_scope_check
    check (scope_type in ('MODEL', 'BATCH', 'ITEM')),
  constraint dpp_lifecycle_scope_identifier_check
    check (
      (scope_type = 'MODEL' and scope_identifier is null)
      or (scope_type in ('BATCH', 'ITEM') and length(trim(coalesce(scope_identifier, ''))) >= 1)
    ),
  constraint dpp_lifecycle_event_type_check
    check (event_type ~ '^[A-Z0-9][A-Z0-9._-]{1,119}$'),
  constraint dpp_lifecycle_location_check
    check (jsonb_typeof(location) = 'object'),
  constraint dpp_lifecycle_event_data_check
    check (jsonb_typeof(event_data) = 'object'),
  constraint dpp_lifecycle_data_source_check
    check (length(trim(data_source)) between 1 and 120),
  constraint dpp_lifecycle_verification_check
    check (
      verification_status in (
        'UNVERIFIED',
        'PENDING',
        'VERIFIED',
        'REJECTED',
        'DEVICE_REPORTED',
        'MANUALLY_VERIFIED'
      )
    ),
  constraint dpp_lifecycle_previous_hash_check
    check (previous_event_hash is null or previous_event_hash ~ '^[a-f0-9]{64}$'),
  constraint dpp_lifecycle_event_hash_check
    check (event_hash ~ '^[a-f0-9]{64}$'),
  constraint dpp_lifecycle_supersedes_self_check
    check (supersedes_event_id is null or supersedes_event_id <> id)
);

create index if not exists dpp_file_asset_product_idx
  on public.dpp_file_asset (product_id, status, created_at desc);
create index if not exists dpp_file_version_asset_idx
  on public.dpp_file_version (asset_id, version_number desc);
create index if not exists dpp_field_evidence_product_field_idx
  on public.dpp_field_evidence_link (product_id, module_code, field_code, created_at desc);
create index if not exists dpp_field_evidence_version_idx
  on public.dpp_field_evidence_link (file_version_id);
create index if not exists dpp_lifecycle_product_time_idx
  on public.dpp_lifecycle_event (product_id, event_time desc);
create index if not exists dpp_lifecycle_scope_time_idx
  on public.dpp_lifecycle_event (
    product_id,
    scope_type,
    coalesce(scope_identifier, ''),
    recorded_at desc
  );

comment on table public.dpp_file_asset is
  'Logical evidence file identity. Replacing a file creates a new dpp_file_version and never overwrites an existing version.';
comment on table public.dpp_file_version is
  'Immutable file bytes metadata. Published snapshots reference the fixed version id and checksum.';
comment on table public.dpp_field_evidence_link is
  'Immutable canonical field-to-file-version evidence relationship.';
comment on table public.dpp_lifecycle_event is
  'Append-only cross-sector lifecycle history. Battery lifecycle history remains in battery_lifecycle_event and is projected compatibly.';

create or replace function public.greanlean_touch_dpp_file_asset()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.id is distinct from old.id
    or new.product_id is distinct from old.product_id
    or new.asset_key is distinct from old.asset_key
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at
  then
    raise exception 'DPP_FILE_ASSET_IDENTITY_IMMUTABLE' using errcode = '55000';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.greanlean_prevent_m4_history_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'DPP_HISTORY_APPEND_ONLY:%', tg_table_name using errcode = '55000';
end;
$$;

create or replace function public.greanlean_validate_file_evidence_link()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  asset_product_id uuid;
  version_access_level text;
  superseded_product_id uuid;
begin
  select asset.product_id, version.access_level_code
  into asset_product_id, version_access_level
  from public.dpp_file_version version
  join public.dpp_file_asset asset on asset.id = version.asset_id
  where version.id = new.file_version_id;

  if asset_product_id is null or asset_product_id <> new.product_id then
    raise exception 'DPP_EVIDENCE_FILE_PRODUCT_MISMATCH' using errcode = '23514';
  end if;
  if public.greanlean_access_rank(version_access_level)
    < public.greanlean_access_rank(new.access_level_code)
  then
    raise exception 'DPP_EVIDENCE_FILE_ACCESS_TOO_LOW' using errcode = '23514';
  end if;

  if new.supersedes_link_id is not null then
    select product_id into superseded_product_id
    from public.dpp_field_evidence_link
    where id = new.supersedes_link_id;
    if superseded_product_id is null or superseded_product_id <> new.product_id then
      raise exception 'DPP_EVIDENCE_SUPERSEDED_PRODUCT_MISMATCH' using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.greanlean_prepare_lifecycle_event()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  latest_hash text;
  evidence_product_id uuid;
  evidence_access_level text;
  superseded_product_id uuid;
begin
  perform pg_advisory_xact_lock(
    hashtextextended(
      concat_ws(
        ':',
        new.product_id::text,
        new.scope_type,
        coalesce(new.scope_identifier, '')
      ),
      0
    )
  );

  if new.file_version_id is not null then
    select asset.product_id, version.access_level_code
    into evidence_product_id, evidence_access_level
    from public.dpp_file_version version
    join public.dpp_file_asset asset on asset.id = version.asset_id
    where version.id = new.file_version_id;

    if evidence_product_id is null or evidence_product_id <> new.product_id then
      raise exception 'DPP_LIFECYCLE_FILE_PRODUCT_MISMATCH' using errcode = '23514';
    end if;
    if public.greanlean_access_rank(evidence_access_level)
      < public.greanlean_access_rank(new.access_level_code)
    then
      raise exception 'DPP_LIFECYCLE_FILE_ACCESS_TOO_LOW' using errcode = '23514';
    end if;
  end if;

  if new.supersedes_event_id is not null then
    select product_id into superseded_product_id
    from public.dpp_lifecycle_event
    where id = new.supersedes_event_id;
    if superseded_product_id is null or superseded_product_id <> new.product_id then
      raise exception 'DPP_LIFECYCLE_SUPERSEDED_PRODUCT_MISMATCH' using errcode = '23514';
    end if;
  end if;

  select event.event_hash
  into latest_hash
  from public.dpp_lifecycle_event event
  where event.product_id = new.product_id
    and event.scope_type = new.scope_type
    and coalesce(event.scope_identifier, '') = coalesce(new.scope_identifier, '')
  order by event.recorded_at desc, event.id desc
  limit 1;

  if new.previous_event_hash is not null
    and new.previous_event_hash is distinct from latest_hash
  then
    raise exception 'DPP_LIFECYCLE_PREVIOUS_HASH_CONFLICT' using errcode = '40001';
  end if;

  new.previous_event_hash := latest_hash;
  new.event_hash := encode(
    extensions.digest(
      convert_to(
        concat_ws(
          '|',
          new.product_id::text,
          new.scope_type,
          coalesce(new.scope_identifier, ''),
          new.event_type,
          to_char(new.event_time at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US'),
          new.location::text,
          coalesce(new.responsible_party, ''),
          new.event_data::text,
          new.data_source,
          new.verification_status,
          new.access_level_code,
          coalesce(new.file_version_id::text, ''),
          coalesce(new.supersedes_event_id::text, ''),
          coalesce(latest_hash, '')
        ),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );
  return new;
end;
$$;

drop trigger if exists dpp_file_asset_touch on public.dpp_file_asset;
create trigger dpp_file_asset_touch
  before update on public.dpp_file_asset
  for each row execute function public.greanlean_touch_dpp_file_asset();

drop trigger if exists dpp_file_version_append_only on public.dpp_file_version;
create trigger dpp_file_version_append_only
  before update or delete on public.dpp_file_version
  for each row execute function public.greanlean_prevent_m4_history_mutation();

drop trigger if exists dpp_field_evidence_validate on public.dpp_field_evidence_link;
create trigger dpp_field_evidence_validate
  before insert on public.dpp_field_evidence_link
  for each row execute function public.greanlean_validate_file_evidence_link();

drop trigger if exists dpp_field_evidence_append_only on public.dpp_field_evidence_link;
create trigger dpp_field_evidence_append_only
  before update or delete on public.dpp_field_evidence_link
  for each row execute function public.greanlean_prevent_m4_history_mutation();

drop trigger if exists dpp_lifecycle_prepare on public.dpp_lifecycle_event;
create trigger dpp_lifecycle_prepare
  before insert on public.dpp_lifecycle_event
  for each row execute function public.greanlean_prepare_lifecycle_event();

drop trigger if exists dpp_lifecycle_append_only on public.dpp_lifecycle_event;
create trigger dpp_lifecycle_append_only
  before update or delete on public.dpp_lifecycle_event
  for each row execute function public.greanlean_prevent_m4_history_mutation();

create or replace function public.greanlean_create_file_asset(
  target_product_id uuid,
  asset_key_value text,
  title_value text,
  document_type_value text,
  description_value text,
  access_level_value text,
  actor_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  result_id uuid;
begin
  if upper(access_level_value) not in (
    'PUBLIC',
    'LEGITIMATE_INTEREST',
    'AUTHORITY_ONLY',
    'INTERNAL'
  ) then
    raise exception 'DPP_FILE_ACCESS_LEVEL_INVALID' using errcode = '22023';
  end if;

  insert into public.dpp_file_asset (
    product_id,
    asset_key,
    title,
    document_type,
    description,
    access_level_code,
    created_by
  ) values (
    target_product_id,
    lower(trim(asset_key_value)),
    trim(title_value),
    trim(document_type_value),
    nullif(trim(description_value), ''),
    upper(access_level_value),
    actor_user_id
  )
  on conflict (product_id, asset_key) do nothing
  returning id into result_id;

  if result_id is null then
    select id into result_id
    from public.dpp_file_asset
    where product_id = target_product_id
      and asset_key = lower(trim(asset_key_value));
  end if;
  return result_id;
end;
$$;

create or replace function public.greanlean_append_file_version(
  target_asset_id uuid,
  version_number_value integer,
  storage_bucket_value text,
  object_path_value text,
  original_filename_value text,
  mime_type_value text,
  byte_size_value bigint,
  checksum_sha256_value text,
  source_document_id_value uuid,
  actor_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  expected_version integer;
  result_id uuid;
  version_access_level text;
begin
  perform pg_advisory_xact_lock(hashtextextended(target_asset_id::text, 0));
  select access_level_code
  into version_access_level
  from public.dpp_file_asset
  where id = target_asset_id and status = 'ACTIVE';
  if version_access_level is null then
    raise exception 'DPP_FILE_ASSET_NOT_ACTIVE' using errcode = 'P0002';
  end if;

  select coalesce(max(version_number), 0) + 1
  into expected_version
  from public.dpp_file_version
  where asset_id = target_asset_id;

  if version_number_value <> expected_version then
    raise exception 'DPP_FILE_VERSION_CONFLICT: expected %', expected_version
      using errcode = '40001';
  end if;

  insert into public.dpp_file_version (
    asset_id,
    version_number,
    storage_bucket,
    object_path,
    original_filename,
    mime_type,
    byte_size,
    access_level_code,
    checksum_sha256,
    source_document_id,
    created_by
  ) values (
    target_asset_id,
    version_number_value,
    lower(trim(storage_bucket_value)),
    trim(object_path_value),
    trim(original_filename_value),
    lower(trim(mime_type_value)),
    byte_size_value,
    version_access_level,
    lower(trim(checksum_sha256_value)),
    source_document_id_value,
    actor_user_id
  )
  returning id into result_id;

  return result_id;
end;
$$;

create or replace function public.greanlean_link_file_evidence(
  target_product_id uuid,
  target_file_version_id uuid,
  module_code_value text,
  field_code_value text,
  claim_value_value jsonb,
  access_level_value text,
  verification_status_value text,
  supersedes_link_id_value uuid,
  actor_user_id uuid
)
returns uuid
language sql
security definer
set search_path = public
as $$
  insert into public.dpp_field_evidence_link (
    product_id,
    file_version_id,
    module_code,
    field_code,
    claim_value,
    access_level_code,
    verification_status,
    supersedes_link_id,
    created_by
  ) values (
    target_product_id,
    target_file_version_id,
    lower(trim(module_code_value)),
    lower(trim(field_code_value)),
    claim_value_value,
    upper(access_level_value),
    upper(verification_status_value),
    supersedes_link_id_value,
    actor_user_id
  )
  returning id;
$$;

create or replace function public.greanlean_append_lifecycle_event(
  target_product_id uuid,
  scope_type_value text,
  scope_identifier_value text,
  event_type_value text,
  event_time_value timestamptz,
  location_value jsonb,
  responsible_party_value text,
  event_data_value jsonb,
  data_source_value text,
  verification_status_value text,
  access_level_value text,
  file_version_id_value uuid,
  supersedes_event_id_value uuid,
  previous_event_hash_value text,
  actor_user_id uuid
)
returns uuid
language sql
security definer
set search_path = public
as $$
  insert into public.dpp_lifecycle_event (
    product_id,
    scope_type,
    scope_identifier,
    event_type,
    event_time,
    location,
    responsible_party,
    event_data,
    data_source,
    verification_status,
    access_level_code,
    file_version_id,
    supersedes_event_id,
    previous_event_hash,
    recorded_by
  ) values (
    target_product_id,
    upper(scope_type_value),
    nullif(trim(scope_identifier_value), ''),
    upper(trim(event_type_value)),
    event_time_value,
    coalesce(location_value, '{}'::jsonb),
    nullif(trim(responsible_party_value), ''),
    coalesce(event_data_value, '{}'::jsonb),
    trim(data_source_value),
    upper(verification_status_value),
    upper(access_level_value),
    file_version_id_value,
    supersedes_event_id_value,
    nullif(lower(trim(previous_event_hash_value)), ''),
    actor_user_id
  )
  returning id;
$$;

alter table public.dpp_file_asset enable row level security;
alter table public.dpp_file_version enable row level security;
alter table public.dpp_field_evidence_link enable row level security;
alter table public.dpp_lifecycle_event enable row level security;

drop policy if exists "Public reads public DPP file assets" on public.dpp_file_asset;
create policy "Public reads public DPP file assets"
  on public.dpp_file_asset for select to anon
  using (
    access_level_code = 'PUBLIC'
    and exists (
      select 1 from public.products product
      where product.id = product_id
        and product.status in ('published', 'updated', 'expired')
    )
  );

drop policy if exists "Authenticated reads authorised DPP file assets" on public.dpp_file_asset;
create policy "Authenticated reads authorised DPP file assets"
  on public.dpp_file_asset for select to authenticated
  using (
    public.greanlean_access_rank(
      public.greanlean_product_access_level(product_id, auth.uid())
    ) >= public.greanlean_access_rank(access_level_code)
  );

drop policy if exists "Public reads public DPP file versions" on public.dpp_file_version;
create policy "Public reads public DPP file versions"
  on public.dpp_file_version for select to anon
  using (
    exists (
      select 1
      from public.dpp_file_asset asset
      where asset.id = dpp_file_version.asset_id
        and dpp_file_version.access_level_code = 'PUBLIC'
        and exists (
          select 1 from public.products product
          where product.id = asset.product_id
            and product.status in ('published', 'updated', 'expired')
        )
    )
  );

drop policy if exists "Authenticated reads authorised DPP file versions" on public.dpp_file_version;
create policy "Authenticated reads authorised DPP file versions"
  on public.dpp_file_version for select to authenticated
  using (
    exists (
      select 1
      from public.dpp_file_asset asset
      where asset.id = dpp_file_version.asset_id
        and public.greanlean_access_rank(
          public.greanlean_product_access_level(asset.product_id, auth.uid())
        ) >= public.greanlean_access_rank(dpp_file_version.access_level_code)
    )
  );

drop policy if exists "Public reads public DPP field evidence" on public.dpp_field_evidence_link;
create policy "Public reads public DPP field evidence"
  on public.dpp_field_evidence_link for select to anon
  using (
    access_level_code = 'PUBLIC'
    and exists (
      select 1 from public.products product
      where product.id = product_id
        and product.status in ('published', 'updated', 'expired')
    )
  );

drop policy if exists "Authenticated reads authorised DPP field evidence" on public.dpp_field_evidence_link;
create policy "Authenticated reads authorised DPP field evidence"
  on public.dpp_field_evidence_link for select to authenticated
  using (
    public.greanlean_access_rank(
      public.greanlean_product_access_level(product_id, auth.uid())
    ) >= public.greanlean_access_rank(access_level_code)
  );

drop policy if exists "Public reads public DPP lifecycle" on public.dpp_lifecycle_event;
create policy "Public reads public DPP lifecycle"
  on public.dpp_lifecycle_event for select to anon
  using (
    access_level_code = 'PUBLIC'
    and exists (
      select 1 from public.products product
      where product.id = product_id
        and product.status in ('published', 'updated', 'expired')
    )
  );

drop policy if exists "Authenticated reads authorised DPP lifecycle" on public.dpp_lifecycle_event;
create policy "Authenticated reads authorised DPP lifecycle"
  on public.dpp_lifecycle_event for select to authenticated
  using (
    public.greanlean_access_rank(
      public.greanlean_product_access_level(product_id, auth.uid())
    ) >= public.greanlean_access_rank(access_level_code)
  );

revoke all on public.dpp_file_asset from anon, authenticated;
revoke all on public.dpp_file_version from anon, authenticated;
revoke all on public.dpp_field_evidence_link from anon, authenticated;
revoke all on public.dpp_lifecycle_event from anon, authenticated;
grant select on public.dpp_file_asset to anon, authenticated;
grant select on public.dpp_file_version to anon, authenticated;
grant select on public.dpp_field_evidence_link to anon, authenticated;
grant select on public.dpp_lifecycle_event to anon, authenticated;
grant select, insert, update on public.dpp_file_asset to service_role;
grant select, insert on public.dpp_file_version to service_role;
grant select, insert on public.dpp_field_evidence_link to service_role;
grant select, insert on public.dpp_lifecycle_event to service_role;
grant execute on function public.greanlean_access_rank(text) to service_role;

revoke all on function public.greanlean_create_file_asset(
  uuid,
  text,
  text,
  text,
  text,
  text,
  uuid
) from public, anon, authenticated;
revoke all on function public.greanlean_append_file_version(
  uuid,
  integer,
  text,
  text,
  text,
  text,
  bigint,
  text,
  uuid,
  uuid
) from public, anon, authenticated;
revoke all on function public.greanlean_link_file_evidence(
  uuid,
  uuid,
  text,
  text,
  jsonb,
  text,
  text,
  uuid,
  uuid
) from public, anon, authenticated;
revoke all on function public.greanlean_append_lifecycle_event(
  uuid,
  text,
  text,
  text,
  timestamptz,
  jsonb,
  text,
  jsonb,
  text,
  text,
  text,
  uuid,
  uuid,
  text,
  uuid
) from public, anon, authenticated;

grant execute on function public.greanlean_create_file_asset(
  uuid,
  text,
  text,
  text,
  text,
  text,
  uuid
) to service_role;
grant execute on function public.greanlean_append_file_version(
  uuid,
  integer,
  text,
  text,
  text,
  text,
  bigint,
  text,
  uuid,
  uuid
) to service_role;
grant execute on function public.greanlean_link_file_evidence(
  uuid,
  uuid,
  text,
  text,
  jsonb,
  text,
  text,
  uuid,
  uuid
) to service_role;
grant execute on function public.greanlean_append_lifecycle_event(
  uuid,
  text,
  text,
  text,
  timestamptz,
  jsonb,
  text,
  jsonb,
  text,
  text,
  text,
  uuid,
  uuid,
  text,
  uuid
) to service_role;

do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (
      id,
      name,
      public,
      file_size_limit,
      allowed_mime_types
    ) values (
      'dpp-evidence',
      'dpp-evidence',
      false,
      104857600,
      array[
        'application/pdf',
        'application/json',
        'image/jpeg',
        'image/png',
        'text/csv',
        'text/plain',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ]
    )
    on conflict (id) do nothing;
  end if;
end;
$$;

commit;
