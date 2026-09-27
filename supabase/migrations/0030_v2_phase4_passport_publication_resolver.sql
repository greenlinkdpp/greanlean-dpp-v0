begin;

-- Phase 4 keeps the legacy dpp_publication tables intact as a V1 compatibility
-- source. V2 uses stable Passport identity because the legacy table is bound to
-- public.products and cannot represent Phase 2 subject types or UUID schema versions.

create table public.dpp_passport (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete restrict,
  subject_type text not null check (subject_type in ('MODEL', 'SKU', 'BATCH', 'ITEM')),
  subject_id uuid not null,
  passport_profile_code text not null default 'PRIMARY'
    check (passport_profile_code ~ '^[A-Z][A-Z0-9_]{1,63}$'),
  passport_identifier text not null,
  schema_definition_id uuid not null references public.schema_definition(id) on delete restrict,
  publication_source text not null default 'V2' check (publication_source in ('V1', 'V2')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'SUSPENDED', 'ARCHIVED')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (id, tenant_id),
  unique (tenant_id, passport_identifier)
);

create unique index dpp_passport_one_active_profile_idx
  on public.dpp_passport(tenant_id, subject_type, subject_id, passport_profile_code)
  where status = 'ACTIVE';

create table public.dpp_review_task (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete restrict,
  passport_id uuid not null,
  subject_type text not null check (subject_type in ('MODEL', 'SKU', 'BATCH', 'ITEM')),
  subject_id uuid not null,
  candidate_hash text not null check (candidate_hash ~ '^[a-f0-9]{64}$'),
  schema_version_id uuid not null references public.schema_version(id) on delete restrict,
  candidate_payload jsonb not null check (jsonb_typeof(candidate_payload) = 'object'),
  resolution_algorithm_version text not null,
  validation_summary jsonb not null default '{}'::jsonb check (jsonb_typeof(validation_summary) = 'object'),
  generated_at timestamptz not null,
  status text not null default 'IN_REVIEW' check (status in (
    'IN_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED', 'PUBLISHED'
  )),
  submitted_by uuid references auth.users(id) on delete set null,
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  decision_reason text,
  correlation_id text not null,
  published_version_id uuid,
  created_at timestamptz not null default now(),
  unique (id, tenant_id),
  constraint dpp_review_passport_tenant_fk foreign key (passport_id, tenant_id)
    references public.dpp_passport(id, tenant_id) on delete restrict
);

create table public.dpp_version (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete restrict,
  passport_id uuid not null,
  version_number integer not null check (version_number > 0),
  schema_version_id uuid not null references public.schema_version(id) on delete restrict,
  review_task_id uuid not null,
  candidate_hash text not null check (candidate_hash ~ '^[a-f0-9]{64}$'),
  canonical_payload jsonb not null check (jsonb_typeof(canonical_payload) = 'object'),
  canonical_payload_text text not null,
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  canonicalization_version text not null default 'JCS-RFC8785',
  content_workflow_state text not null default 'APPROVED' check (content_workflow_state in (
    'DRAFT', 'DATA_PENDING', 'VALIDATION_FAILED', 'READY_FOR_REVIEW',
    'CHANGES_REQUESTED', 'APPROVED', 'REJECTED'
  )),
  publication_state text not null default 'PUBLISHED' check (publication_state in (
    'UNPUBLISHED', 'PUBLISHED', 'SUPERSEDED', 'WITHDRAWN'
  )),
  registry_state text not null default 'NOT_REQUIRED' check (registry_state in (
    'NOT_REQUIRED', 'NOT_SUBMITTED', 'PREPARING', 'VALIDATING', 'READY',
    'SUBMITTED', 'ACCEPTED', 'REJECTED', 'FAILED'
  )),
  published_at timestamptz not null default now(),
  published_by uuid references auth.users(id) on delete set null,
  supersedes_version_id uuid,
  legacy_publication_id uuid references public.dpp_publication(id) on delete restrict,
  withdraw_reason_category text,
  withdrawn_at timestamptz,
  withdrawn_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  unique (id, tenant_id),
  unique (id, passport_id, tenant_id),
  unique (passport_id, version_number),
  unique (review_task_id),
  constraint dpp_version_passport_tenant_fk foreign key (passport_id, tenant_id)
    references public.dpp_passport(id, tenant_id) on delete restrict,
  constraint dpp_version_review_tenant_fk foreign key (review_task_id, tenant_id)
    references public.dpp_review_task(id, tenant_id) on delete restrict,
  constraint dpp_version_supersedes_passport_fk foreign key (supersedes_version_id, passport_id, tenant_id)
    references public.dpp_version(id, passport_id, tenant_id) on delete restrict,
  constraint dpp_version_withdrawal_check check (
    (publication_state = 'WITHDRAWN' and withdrawn_at is not null and withdraw_reason_category is not null)
    or (publication_state <> 'WITHDRAWN' and withdrawn_at is null and withdrawn_by is null and withdraw_reason_category is null)
  )
);

alter table public.dpp_review_task
  add constraint dpp_review_published_version_fk
  foreign key (published_version_id, passport_id, tenant_id)
  references public.dpp_version(id, passport_id, tenant_id) on delete restrict;

create unique index dpp_version_one_published_current_idx
  on public.dpp_version(passport_id) where publication_state = 'PUBLISHED';
create index dpp_version_history_idx on public.dpp_version(passport_id, version_number desc);
create index dpp_version_payload_hash_idx on public.dpp_version(payload_hash);

create table public.dpp_current_pointer (
  passport_id uuid primary key,
  tenant_id uuid not null references public.tenant(id) on delete restrict,
  current_version_id uuid not null unique,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  unique (passport_id, tenant_id),
  constraint dpp_current_pointer_passport_tenant_fk foreign key (passport_id, tenant_id)
    references public.dpp_passport(id, tenant_id) on delete restrict,
  constraint dpp_current_pointer_version_fk foreign key (current_version_id, passport_id, tenant_id)
    references public.dpp_version(id, passport_id, tenant_id) on delete restrict
);

create table public.resolver_host_allowlist (
  host text primary key,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'RETIRED')),
  created_at timestamptz not null default now()
);

insert into public.resolver_host_allowlist(host) values
  ('localhost'), ('127.0.0.1'), ('dev.dpp.greanlean.test');

create table public.resolver_mapping (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete restrict,
  identifier_id uuid,
  host text not null,
  normalized_path text not null,
  passport_id uuid,
  target_mapping_id uuid,
  mapping_type text not null check (mapping_type in ('PRIMARY', 'ALIAS', 'LEGACY_REDIRECT')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'EXPIRED', 'REVOKED', 'RETIRED')),
  is_public boolean not null default true,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  redirect_http_status integer not null default 302 check (redirect_http_status in (301, 302, 307, 308)),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (id, tenant_id),
  constraint resolver_mapping_identifier_tenant_fk foreign key (identifier_id, tenant_id)
    references public.product_subject_identifier(id, tenant_id) on delete restrict,
  constraint resolver_mapping_passport_tenant_fk foreign key (passport_id, tenant_id)
    references public.dpp_passport(id, tenant_id) on delete restrict,
  constraint resolver_mapping_target_tenant_fk foreign key (target_mapping_id, tenant_id)
    references public.resolver_mapping(id, tenant_id) on delete restrict,
  constraint resolver_mapping_target_check check (
    (passport_id is not null and target_mapping_id is null)
    or (passport_id is null and target_mapping_id is not null)
  ),
  constraint resolver_mapping_path_check check (normalized_path ~ '^/[A-Za-z0-9._~!$&''()*+,;=:@%/-]+$'),
  constraint resolver_mapping_host_check check (host = lower(host) and host !~ '[/\\\s]'),
  constraint resolver_mapping_window_check check (valid_until is null or valid_until > valid_from)
);

create unique index resolver_mapping_active_path_idx
  on public.resolver_mapping(host, normalized_path) where status = 'ACTIVE';
create index resolver_mapping_identifier_idx on public.resolver_mapping(identifier_id) where status = 'ACTIVE';
create index resolver_mapping_passport_idx on public.resolver_mapping(passport_id, status);

create table public.dpp_publication_audit (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete restrict,
  event_type text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  passport_id uuid references public.dpp_passport(id) on delete restrict,
  version_id uuid references public.dpp_version(id) on delete restrict,
  review_task_id uuid references public.dpp_review_task(id) on delete restrict,
  resolver_mapping_id uuid references public.resolver_mapping(id) on delete restrict,
  candidate_hash text,
  payload_hash text,
  schema_version_id uuid references public.schema_version(id) on delete restrict,
  previous_current_version_id uuid references public.dpp_version(id) on delete restrict,
  new_current_version_id uuid references public.dpp_version(id) on delete restrict,
  correlation_id text not null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index dpp_publication_audit_tenant_time_idx
  on public.dpp_publication_audit(tenant_id, created_at desc);
create index dpp_publication_audit_passport_idx
  on public.dpp_publication_audit(passport_id, created_at desc);

create or replace function public.v2_validate_dpp_passport_subject()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  subject_exists boolean := false;
  schema_allowed boolean := false;
begin
  if new.subject_type = 'MODEL' then
    select exists(select 1 from public.product_model where id = new.subject_id and tenant_id = new.tenant_id) into subject_exists;
  elsif new.subject_type = 'SKU' then
    select exists(select 1 from public.sku where id = new.subject_id and tenant_id = new.tenant_id) into subject_exists;
  elsif new.subject_type = 'BATCH' then
    select exists(select 1 from public.product_batch where id = new.subject_id and tenant_id = new.tenant_id) into subject_exists;
  elsif new.subject_type = 'ITEM' then
    select exists(select 1 from public.product_item where id = new.subject_id and tenant_id = new.tenant_id) into subject_exists;
  end if;
  if not subject_exists then raise exception 'TENANT_RELATIONSHIP_MISMATCH'; end if;
  select exists(
    select 1 from public.schema_definition
    where id = new.schema_definition_id
      and (owner_type = 'GLOBAL' or (owner_type = 'TENANT_EXTENSION' and tenant_id = new.tenant_id))
  ) into schema_allowed;
  if not schema_allowed then raise exception 'TENANT_RELATIONSHIP_MISMATCH'; end if;
  return new;
end;
$$;

create trigger dpp_passport_validate_subject before insert or update
on public.dpp_passport for each row execute function public.v2_validate_dpp_passport_subject();
create trigger dpp_passport_touch_updated_at before update on public.dpp_passport
for each row execute function public.v2_touch_updated_at();
create trigger resolver_mapping_touch_updated_at before update on public.resolver_mapping
for each row execute function public.v2_touch_updated_at();

create or replace function public.v2_guard_dpp_passport_identity()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.tenant_id is distinct from old.tenant_id
    or new.subject_type is distinct from old.subject_type
    or new.subject_id is distinct from old.subject_id
    or new.passport_identifier is distinct from old.passport_identifier
    or new.schema_definition_id is distinct from old.schema_definition_id
    or new.publication_source is distinct from old.publication_source
  then raise exception 'PASSPORT_IDENTITY_IMMUTABLE'; end if;
  return new;
end;
$$;
create trigger dpp_passport_identity_immutable before update on public.dpp_passport
for each row execute function public.v2_guard_dpp_passport_identity();

create or replace function public.v2_guard_dpp_review_task()
returns trigger language plpgsql security definer set search_path = public as $$
declare passport_row public.dpp_passport%rowtype;
begin
  select * into passport_row from public.dpp_passport where id = new.passport_id and tenant_id = new.tenant_id;
  if not found or passport_row.subject_type <> new.subject_type or passport_row.subject_id <> new.subject_id then
    raise exception 'TENANT_RELATIONSHIP_MISMATCH';
  end if;
  if new.candidate_payload ->> 'candidateHash' is distinct from new.candidate_hash
    or new.candidate_payload ->> 'schemaVersionId' is distinct from new.schema_version_id::text
  then raise exception 'CANDIDATE_HASH_MISMATCH'; end if;
  if tg_op = 'UPDATE' then
    if new.tenant_id is distinct from old.tenant_id or new.passport_id is distinct from old.passport_id
      or new.subject_type is distinct from old.subject_type or new.subject_id is distinct from old.subject_id
      or new.candidate_hash is distinct from old.candidate_hash or new.schema_version_id is distinct from old.schema_version_id
      or new.candidate_payload is distinct from old.candidate_payload
      or new.resolution_algorithm_version is distinct from old.resolution_algorithm_version
      or new.validation_summary is distinct from old.validation_summary or new.generated_at is distinct from old.generated_at
      or new.submitted_by is distinct from old.submitted_by or new.submitted_at is distinct from old.submitted_at
    then raise exception 'REVIEW_APPROVAL_STALE'; end if;
    if old.status = 'IN_REVIEW' and new.status not in ('IN_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED') then raise exception 'REVIEW_STATE_INVALID'; end if;
    if old.status = 'APPROVED' and new.status not in ('APPROVED', 'PUBLISHED') then raise exception 'REVIEW_STATE_INVALID'; end if;
    if old.status in ('CHANGES_REQUESTED', 'REJECTED', 'CANCELLED', 'PUBLISHED') and new.status <> old.status then raise exception 'REVIEW_STATE_INVALID'; end if;
  end if;
  return new;
end;
$$;
create trigger dpp_review_task_guard before insert or update on public.dpp_review_task
for each row execute function public.v2_guard_dpp_review_task();

-- Enable Phase 2 identifiers for stable Passport identity without creating a
-- second identifier authority.
alter table public.product_subject_identifier
  drop constraint if exists product_subject_identifier_check;
alter table public.product_subject_identifier
  drop constraint if exists product_subject_identifier_phase2_sensitive_type_check;
alter table public.product_subject_identifier
  drop constraint if exists product_subject_identifier_identifier_type_check1;
alter table public.product_subject_identifier
  add constraint product_subject_identifier_sensitive_type_check check (
    (identifier_type = 'DPP_ID' and subject_type = 'PASSPORT')
    or identifier_type not in ('DPP_ID', 'REGISTRY_ID', 'CREDENTIAL_ID')
  );
drop index public.product_identifier_tenant_active_unique;
drop index public.product_identifier_global_active_unique;
create unique index product_identifier_tenant_active_unique
  on public.product_subject_identifier(tenant_id, identifier_type, scheme, issuer, normalized_value)
  where status = 'ACTIVE' and identifier_type not in ('GTIN', 'UPI', 'DPP_ID');
create unique index product_identifier_global_active_unique
  on public.product_subject_identifier(identifier_type, scheme, issuer, normalized_value)
  where status = 'ACTIVE' and identifier_type in ('GTIN', 'UPI', 'DPP_ID');

create or replace function public.v2_prepare_product_identifier()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.subject_type = 'PASSPORT' and new.identifier_type <> 'DPP_ID' then
    raise exception 'IDENTIFIER_PASSPORT_TYPE_INVALID';
  end if;
  if new.identifier_type = 'DPP_ID' and new.subject_type <> 'PASSPORT' then
    raise exception 'IDENTIFIER_PASSPORT_TYPE_INVALID';
  end if;
  new.normalized_value := public.v2_normalize_product_identifier(new.identifier_type, new.value);
  if new.status = 'RETIRED' then new.is_primary := false; end if;
  return new;
end;
$$;

create or replace function public.v2_validate_product_identifier_subject()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.subject_type = 'PASSPORT' and not exists (
    select 1 from public.dpp_passport where id = new.subject_id and tenant_id = new.tenant_id
  ) then raise exception 'TENANT_RELATIONSHIP_MISMATCH';
  elsif new.subject_type = 'FAMILY' and not exists (select 1 from public.product_family where id = new.subject_id and tenant_id = new.tenant_id) then raise exception 'TENANT_RELATIONSHIP_MISMATCH';
  elsif new.subject_type = 'MODEL' and not exists (select 1 from public.product_model where id = new.subject_id and tenant_id = new.tenant_id) then raise exception 'TENANT_RELATIONSHIP_MISMATCH';
  elsif new.subject_type = 'SKU' and not exists (select 1 from public.sku where id = new.subject_id and tenant_id = new.tenant_id) then raise exception 'TENANT_RELATIONSHIP_MISMATCH';
  elsif new.subject_type = 'BATCH' and not exists (select 1 from public.product_batch where id = new.subject_id and tenant_id = new.tenant_id) then raise exception 'TENANT_RELATIONSHIP_MISMATCH';
  elsif new.subject_type = 'ITEM' and not exists (select 1 from public.product_item where id = new.subject_id and tenant_id = new.tenant_id) then raise exception 'TENANT_RELATIONSHIP_MISMATCH';
  end if;
  return new;
end;
$$;

create or replace function public.v2_guard_dpp_version()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then raise exception 'VERSION_IMMUTABLE'; end if;
  if old.publication_state in ('PUBLISHED', 'SUPERSEDED', 'WITHDRAWN') then
    if new.canonical_payload is distinct from old.canonical_payload
      or new.canonical_payload_text is distinct from old.canonical_payload_text
      or new.schema_version_id is distinct from old.schema_version_id
      or new.candidate_hash is distinct from old.candidate_hash
      or new.payload_hash is distinct from old.payload_hash
      or new.version_number is distinct from old.version_number
      or new.passport_id is distinct from old.passport_id
      or new.tenant_id is distinct from old.tenant_id
    then raise exception 'VERSION_IMMUTABLE'; end if;
  end if;
  if old.publication_state = 'SUPERSEDED' and new.publication_state <> 'SUPERSEDED' then raise exception 'VERSION_IMMUTABLE'; end if;
  if old.publication_state = 'WITHDRAWN' then raise exception 'VERSION_IMMUTABLE'; end if;
  return new;
end;
$$;

create trigger dpp_version_guard before update or delete on public.dpp_version
for each row execute function public.v2_guard_dpp_version();

create or replace function public.v2_validate_current_pointer()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.dpp_version
    where id = new.current_version_id and passport_id = new.passport_id
      and tenant_id = new.tenant_id and publication_state = 'PUBLISHED'
  ) then raise exception 'CURRENT_POINTER_INVALID'; end if;
  return new;
end;
$$;
create constraint trigger dpp_current_pointer_validate
after insert or update on public.dpp_current_pointer deferrable initially deferred
for each row execute function public.v2_validate_current_pointer();

create or replace function public.v2_guard_resolver_mapping()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  cursor_id uuid;
  depth integer := 0;
begin
  new.host := lower(btrim(new.host));
  new.normalized_path := '/' || ltrim(regexp_replace(btrim(new.normalized_path), '/+', '/', 'g'), '/');
  if not exists(select 1 from public.resolver_host_allowlist where host = new.host and status = 'ACTIVE') then
    raise exception 'RESOLVER_OPEN_REDIRECT';
  end if;
  if exists (
    select 1 from public.resolver_mapping history
    where history.host = new.host and history.normalized_path = new.normalized_path
      and history.id <> new.id and history.passport_id is not null and new.passport_id is not null
      and history.passport_id <> new.passport_id
  ) then raise exception 'RESOLVER_PATH_REASSIGNMENT'; end if;
  cursor_id := new.target_mapping_id;
  while cursor_id is not null loop
    depth := depth + 1;
    if cursor_id = new.id or depth > 8 then raise exception 'RESOLVER_ALIAS_CYCLE'; end if;
    select target_mapping_id into cursor_id from public.resolver_mapping
      where id = cursor_id and tenant_id = new.tenant_id;
    if not found then raise exception 'TENANT_RELATIONSHIP_MISMATCH'; end if;
  end loop;
  return new;
end;
$$;
create trigger resolver_mapping_guard before insert or update on public.resolver_mapping
for each row execute function public.v2_guard_resolver_mapping();

create or replace function public.v2_guard_publication_audit()
returns trigger language plpgsql set search_path = public as $$
begin raise exception 'AUDIT_IMMUTABLE'; end;
$$;
create trigger dpp_publication_audit_immutable before update or delete on public.dpp_publication_audit
for each row execute function public.v2_guard_publication_audit();

create or replace function public.v2_publish_approved_review(
  p_tenant_id uuid,
  p_review_task_id uuid,
  p_candidate_hash text,
  p_canonical_payload jsonb,
  p_canonical_payload_text text,
  p_payload_hash text,
  p_actor_user_id uuid,
  p_correlation_id text
)
returns public.dpp_version
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  review_row public.dpp_review_task%rowtype;
  old_version public.dpp_version%rowtype;
  new_version public.dpp_version%rowtype;
  next_number integer;
  computed_hash text;
begin
  select * into review_row from public.dpp_review_task
    where id = p_review_task_id and tenant_id = p_tenant_id for update;
  if not found then raise exception 'REVIEW_NOT_FOUND'; end if;
  if review_row.status = 'PUBLISHED' and review_row.published_version_id is not null then
    select * into new_version from public.dpp_version where id = review_row.published_version_id;
    if new_version.candidate_hash <> p_candidate_hash then raise exception 'PUBLICATION_CONFLICT'; end if;
    return new_version;
  end if;
  if review_row.status <> 'APPROVED' then raise exception 'PUBLICATION_NOT_APPROVED'; end if;
  if review_row.candidate_hash <> p_candidate_hash then raise exception 'REVIEW_APPROVAL_STALE'; end if;
  if p_canonical_payload ->> 'candidateHash' is distinct from p_candidate_hash then raise exception 'CANDIDATE_HASH_MISMATCH'; end if;
  if p_canonical_payload ->> 'schemaVersionId' is distinct from review_row.schema_version_id::text then raise exception 'CANDIDATE_HASH_MISMATCH'; end if;
  begin
    if p_canonical_payload_text::jsonb is distinct from p_canonical_payload then raise exception 'PUBLICATION_CONFLICT'; end if;
  exception when invalid_text_representation then raise exception 'PUBLICATION_CONFLICT'; end;
  computed_hash := encode(digest(convert_to(p_canonical_payload_text, 'UTF8'), 'sha256'), 'hex');
  if computed_hash <> p_payload_hash then raise exception 'PUBLICATION_CONFLICT'; end if;

  perform 1 from public.dpp_passport where id = review_row.passport_id and tenant_id = p_tenant_id for update;
  select * into old_version from public.dpp_version
    where passport_id = review_row.passport_id and publication_state = 'PUBLISHED' for update;
  select coalesce(max(version_number), 0) + 1 into next_number
    from public.dpp_version where passport_id = review_row.passport_id;
  if (p_canonical_payload ->> 'versionNumber')::integer <> next_number then
    raise exception 'PUBLICATION_CONFLICT';
  end if;
  if old_version.id is not null then
    update public.dpp_version set publication_state = 'SUPERSEDED' where id = old_version.id;
  end if;
  insert into public.dpp_version(
    tenant_id, passport_id, version_number, schema_version_id, review_task_id,
    candidate_hash, canonical_payload, canonical_payload_text, payload_hash,
    published_at, published_by, supersedes_version_id, created_by
  ) values (
    p_tenant_id, review_row.passport_id, next_number, review_row.schema_version_id, review_row.id,
    p_candidate_hash, p_canonical_payload, p_canonical_payload_text, p_payload_hash,
    (p_canonical_payload ->> 'publishedAt')::timestamptz, p_actor_user_id, old_version.id, p_actor_user_id
  ) returning * into new_version;
  insert into public.dpp_current_pointer(passport_id, tenant_id, current_version_id, updated_by)
    values(review_row.passport_id, p_tenant_id, new_version.id, p_actor_user_id)
    on conflict (passport_id) do update set current_version_id = excluded.current_version_id,
      updated_by = excluded.updated_by, updated_at = now();
  update public.dpp_review_task set status = 'PUBLISHED', published_version_id = new_version.id
    where id = review_row.id;
  insert into public.dpp_publication_audit(
    tenant_id, event_type, actor_user_id, passport_id, version_id, review_task_id,
    candidate_hash, payload_hash, schema_version_id, previous_current_version_id,
    new_current_version_id, correlation_id
  ) values (
    p_tenant_id, 'publication.publish', p_actor_user_id, review_row.passport_id,
    new_version.id, review_row.id, p_candidate_hash, p_payload_hash,
    review_row.schema_version_id, old_version.id, new_version.id, p_correlation_id
  );
  if old_version.id is not null then
    insert into public.dpp_publication_audit(
      tenant_id, event_type, actor_user_id, passport_id, version_id,
      previous_current_version_id, new_current_version_id, correlation_id
    ) values (p_tenant_id, 'publication.supersede', p_actor_user_id,
      review_row.passport_id, old_version.id, old_version.id, new_version.id, p_correlation_id);
  end if;
  return new_version;
end;
$$;

create or replace function public.v2_withdraw_current_version(
  p_tenant_id uuid,
  p_version_id uuid,
  p_reason_category text,
  p_actor_user_id uuid,
  p_correlation_id text
)
returns public.dpp_version
language plpgsql security definer set search_path = public as $$
declare version_row public.dpp_version%rowtype;
begin
  select * into version_row from public.dpp_version
    where id = p_version_id and tenant_id = p_tenant_id for update;
  if not found then raise exception 'PASSPORT_NOT_FOUND'; end if;
  if version_row.publication_state <> 'PUBLISHED' then raise exception 'REVIEW_STATE_INVALID'; end if;
  if length(btrim(coalesce(p_reason_category, ''))) < 3 then raise exception 'INVALID_WITHDRAW_REASON'; end if;
  delete from public.dpp_current_pointer
    where passport_id = version_row.passport_id and current_version_id = version_row.id;
  update public.dpp_version set publication_state = 'WITHDRAWN',
    withdraw_reason_category = upper(btrim(p_reason_category)), withdrawn_at = now(),
    withdrawn_by = p_actor_user_id where id = version_row.id returning * into version_row;
  insert into public.dpp_publication_audit(
    tenant_id, event_type, actor_user_id, passport_id, version_id,
    previous_current_version_id, correlation_id, metadata
  ) values (p_tenant_id, 'publication.withdraw', p_actor_user_id,
    version_row.passport_id, version_row.id, version_row.id, p_correlation_id,
    jsonb_build_object('reasonCategory', version_row.withdraw_reason_category));
  return version_row;
end;
$$;

revoke all on function public.v2_publish_approved_review(uuid,uuid,text,jsonb,text,text,uuid,text) from public, anon, authenticated;
grant execute on function public.v2_publish_approved_review(uuid,uuid,text,jsonb,text,text,uuid,text) to service_role;
revoke all on function public.v2_withdraw_current_version(uuid,uuid,text,uuid,text) from public, anon, authenticated;
grant execute on function public.v2_withdraw_current_version(uuid,uuid,text,uuid,text) to service_role;

alter table public.dpp_passport enable row level security;
alter table public.dpp_review_task enable row level security;
alter table public.dpp_version enable row level security;
alter table public.dpp_current_pointer enable row level security;
alter table public.resolver_mapping enable row level security;
alter table public.dpp_publication_audit enable row level security;
alter table public.resolver_host_allowlist enable row level security;

create policy dpp_passport_select on public.dpp_passport for select to authenticated
using (public.v2_user_has_capability(tenant_id, 'dpp.view') or public.v2_user_has_partner_resource_capability(tenant_id, 'dpp.view', 'DPP_PASSPORT', id, null));
create policy dpp_passport_insert on public.dpp_passport for insert to authenticated
with check (public.v2_user_has_capability(tenant_id, 'dpp.create'));
create policy dpp_passport_update on public.dpp_passport for update to authenticated
using (public.v2_user_has_capability(tenant_id, 'dpp.edit')) with check (public.v2_user_has_capability(tenant_id, 'dpp.edit'));

create policy dpp_review_select on public.dpp_review_task for select to authenticated
using (public.v2_user_has_capability(tenant_id, 'dpp.review') or public.v2_user_has_capability(tenant_id, 'dpp.view'));
create policy dpp_review_insert on public.dpp_review_task for insert to authenticated
with check (public.v2_user_has_capability(tenant_id, 'dpp.submit_review'));
create policy dpp_review_update on public.dpp_review_task for update to authenticated
using (public.v2_user_has_capability(tenant_id, 'dpp.review')) with check (public.v2_user_has_capability(tenant_id, 'dpp.review'));

create policy dpp_version_select on public.dpp_version for select to authenticated
using (public.v2_user_has_capability(tenant_id, 'dpp.view') or public.v2_user_has_partner_resource_capability(tenant_id, 'dpp.view', 'DPP_PASSPORT', passport_id, null));
create policy dpp_current_pointer_select on public.dpp_current_pointer for select to authenticated
using (public.v2_user_has_capability(tenant_id, 'dpp.view') or public.v2_user_has_partner_resource_capability(tenant_id, 'dpp.view', 'DPP_PASSPORT', passport_id, null));
create policy resolver_mapping_select on public.resolver_mapping for select to authenticated
using (public.v2_user_has_capability(tenant_id, 'dpp.view') or public.v2_user_has_partner_resource_capability(tenant_id, 'dpp.view', 'DPP_PASSPORT', passport_id, null));
create policy resolver_mapping_insert on public.resolver_mapping for insert to authenticated
with check (public.v2_user_has_capability(tenant_id, 'identifier.manage'));
create policy resolver_mapping_update on public.resolver_mapping for update to authenticated
using (public.v2_user_has_capability(tenant_id, 'identifier.manage')) with check (public.v2_user_has_capability(tenant_id, 'identifier.manage'));
create policy dpp_publication_audit_select on public.dpp_publication_audit for select to authenticated
using (public.v2_user_has_capability(tenant_id, 'dpp.view'));

insert into public.greanlean_migration_ledger (
  migration_number, migration_name, checksum_sha256, environment, applied_by, result, notes
) values (
  '0030', 'v2_phase4_passport_publication_resolver', null, 'development', 'codex', 'applied',
  'Stable DPP Passport identity, candidate-bound review, immutable publication versions, Resolver, projection, and compatibility foundations.'
) on conflict (migration_number) do update set
  migration_name = excluded.migration_name,
  environment = excluded.environment,
  applied_by = excluded.applied_by,
  applied_at = now(),
  result = excluded.result,
  notes = excluded.notes;

commit;
