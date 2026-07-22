begin;

create table if not exists public.access_level (
  code text primary key,
  label_en text not null,
  label_zh text not null,
  description_en text,
  description_zh text,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  constraint access_level_code_check check (code in ('PUBLIC', 'LEGITIMATE_INTEREST', 'AUTHORITY_ONLY', 'INTERNAL'))
);

create table if not exists public.schema_definition (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  sector_code text not null,
  legal_category_code text,
  technical_variant_code text,
  source_name text not null,
  name_en text not null,
  name_zh text not null,
  description_en text,
  description_zh text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schema_definition_code_check check (code ~ '^[a-z][a-z0-9]*([._-][a-z0-9]+)*$'),
  constraint schema_definition_status_check check (status in ('draft', 'active', 'retired'))
);

create table if not exists public.schema_version (
  id uuid primary key default gen_random_uuid(),
  schema_definition_id uuid not null references public.schema_definition(id) on delete restrict,
  version text not null,
  source_version text,
  json_schema jsonb not null default '{}'::jsonb,
  checksum_sha256 text,
  effective_from date,
  effective_until date,
  status text not null default 'draft',
  published_at timestamptz,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  created_by text,
  unique (schema_definition_id, version),
  constraint schema_version_semver_check check (version ~ '^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$'),
  constraint schema_version_json_check check (jsonb_typeof(json_schema) = 'object'),
  constraint schema_version_checksum_check check (checksum_sha256 is null or checksum_sha256 ~ '^[a-f0-9]{64}$'),
  constraint schema_version_status_check check (status in ('draft', 'published', 'retired')),
  constraint schema_version_effective_dates_check check (effective_until is null or effective_from is null or effective_until >= effective_from),
  constraint schema_version_published_checksum_check check (status <> 'published' or checksum_sha256 is not null)
);

create table if not exists public.regulatory_reference (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  source_code text not null,
  title text,
  article_reference text,
  source_version text,
  source_uri text,
  confirmation_status text not null default 'TBD',
  effective_from date,
  effective_until date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint regulatory_reference_source_type_check check (
    source_type in ('regulation', 'delegated_act', 'implementing_act', 'standard', 'standard_draft', 'reference_model', 'guidance')
  ),
  constraint regulatory_reference_status_check check (confirmation_status in ('CONFIRMED', 'DRAFT', 'TBD', 'SUPERSEDED')),
  constraint regulatory_reference_dates_check check (effective_until is null or effective_from is null or effective_until >= effective_from)
);

create unique index if not exists regulatory_reference_identity_idx
  on public.regulatory_reference (source_type, source_code, coalesce(article_reference, ''), coalesce(source_version, ''));

create table if not exists public.codelist (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  version text not null,
  source_name text not null,
  schema_version_id uuid references public.schema_version(id) on delete restrict,
  label_en text not null,
  label_zh text not null,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (code, version),
  constraint codelist_status_check check (status in ('draft', 'published', 'retired'))
);

create table if not exists public.codelist_value (
  id uuid primary key default gen_random_uuid(),
  codelist_id uuid not null references public.codelist(id) on delete cascade,
  value_code text not null,
  label_en text not null,
  label_zh text not null,
  description_en text,
  description_zh text,
  sort_order integer not null default 100,
  valid_from date,
  valid_until date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (codelist_id, value_code),
  constraint codelist_value_metadata_check check (jsonb_typeof(metadata) = 'object'),
  constraint codelist_value_dates_check check (valid_until is null or valid_from is null or valid_until >= valid_from)
);

create index if not exists schema_definition_sector_idx on public.schema_definition (sector_code, status);
create index if not exists schema_version_definition_idx on public.schema_version (schema_definition_id, status);
create index if not exists codelist_schema_version_idx on public.codelist (schema_version_id);

create or replace function public.greanlean_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.greanlean_protect_schema_version()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'published' and new.published_at is null then
      new.published_at = now();
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.status in ('published', 'retired') then
      raise exception 'Published or retired Schema versions cannot be deleted';
    end if;
    return old;
  end if;

  if old.status = 'retired' then
    raise exception 'Retired Schema versions are immutable';
  end if;

  if old.status = 'published' then
    if new.status <> 'retired'
      or row(new.schema_definition_id, new.version, new.source_version, new.json_schema, new.checksum_sha256, new.effective_from, new.published_at, new.created_at, new.created_by)
         is distinct from
         row(old.schema_definition_id, old.version, old.source_version, old.json_schema, old.checksum_sha256, old.effective_from, old.published_at, old.created_at, old.created_by)
    then
      raise exception 'Published Schema versions are immutable and may only transition to retired';
    end if;
    if new.retired_at is null then
      new.retired_at = now();
    end if;
  elsif new.status = 'published' and new.published_at is null then
    new.published_at = now();
  end if;
  return new;
end;
$$;

create or replace function public.greanlean_protect_codelist()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    if old.status in ('published', 'retired') then
      raise exception 'Published or retired codelists cannot be deleted';
    end if;
    return old;
  end if;

  if old.status = 'retired' then
    raise exception 'Retired codelists are immutable';
  end if;
  if old.status = 'published' then
    if new.status <> 'retired'
      or row(new.code, new.version, new.source_name, new.schema_version_id, new.label_en, new.label_zh, new.created_at)
         is distinct from
         row(old.code, old.version, old.source_name, old.schema_version_id, old.label_en, old.label_zh, old.created_at)
    then
      raise exception 'Published codelists are immutable and may only transition to retired';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.greanlean_protect_codelist_value()
returns trigger
language plpgsql
as $$
declare
  target_codelist_id uuid;
  target_status text;
begin
  target_codelist_id := case when tg_op = 'DELETE' then old.codelist_id else new.codelist_id end;
  select parent.status into target_status from public.codelist parent where parent.id = target_codelist_id;
  if target_status in ('published', 'retired') then
    raise exception 'Values belonging to a published or retired codelist are immutable';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists schema_definition_touch_updated_at on public.schema_definition;
create trigger schema_definition_touch_updated_at
  before update on public.schema_definition
  for each row execute function public.greanlean_touch_updated_at();

drop trigger if exists regulatory_reference_touch_updated_at on public.regulatory_reference;
create trigger regulatory_reference_touch_updated_at
  before update on public.regulatory_reference
  for each row execute function public.greanlean_touch_updated_at();

drop trigger if exists codelist_touch_updated_at on public.codelist;
create trigger codelist_touch_updated_at
  before update on public.codelist
  for each row execute function public.greanlean_touch_updated_at();

drop trigger if exists codelist_immutable_when_published on public.codelist;
create trigger codelist_immutable_when_published
  before update or delete on public.codelist
  for each row execute function public.greanlean_protect_codelist();

drop trigger if exists codelist_value_immutable_when_published on public.codelist_value;
create trigger codelist_value_immutable_when_published
  before insert or update or delete on public.codelist_value
  for each row execute function public.greanlean_protect_codelist_value();

drop trigger if exists schema_version_immutable_when_published on public.schema_version;
create trigger schema_version_immutable_when_published
  before insert or update or delete on public.schema_version
  for each row execute function public.greanlean_protect_schema_version();

insert into public.access_level (code, label_en, label_zh, description_en, description_zh, sort_order)
values
  ('PUBLIC', 'Public', '公开', 'Visible without authentication.', '无需登录即可查看。', 10),
  ('LEGITIMATE_INTEREST', 'Legitimate interest', '正当利益访问', 'Visible to an approved professional user with a recorded purpose.', '经批准并记录用途的专业用户可查看。', 20),
  ('AUTHORITY_ONLY', 'Authority only', '主管机关访问', 'Visible only to authorised public authorities or equivalent approved roles.', '仅限获授权的主管机关或同等角色查看。', 30),
  ('INTERNAL', 'Internal', '内部访问', 'Visible only inside the responsible organisation.', '仅责任组织内部可查看。', 40)
on conflict (code) do update set
  label_en = excluded.label_en,
  label_zh = excluded.label_zh,
  description_en = excluded.description_en,
  description_zh = excluded.description_zh,
  sort_order = excluded.sort_order;

alter table public.access_level enable row level security;
alter table public.schema_definition enable row level security;
alter table public.schema_version enable row level security;
alter table public.regulatory_reference enable row level security;
alter table public.codelist enable row level security;
alter table public.codelist_value enable row level security;

drop policy if exists "Public can read access levels" on public.access_level;
create policy "Public can read access levels" on public.access_level for select to anon, authenticated using (true);

drop policy if exists "Authenticated can read schema definitions" on public.schema_definition;
create policy "Authenticated can read schema definitions" on public.schema_definition for select to authenticated using (true);
drop policy if exists "Public can read active schema definitions" on public.schema_definition;
create policy "Public can read active schema definitions" on public.schema_definition for select to anon using (status = 'active');

drop policy if exists "Authenticated can read schema versions" on public.schema_version;
create policy "Authenticated can read schema versions" on public.schema_version for select to authenticated using (true);
drop policy if exists "Public can read published schema versions" on public.schema_version;
create policy "Public can read published schema versions" on public.schema_version for select to anon using (status = 'published');

drop policy if exists "Authenticated can read regulatory references" on public.regulatory_reference;
create policy "Authenticated can read regulatory references" on public.regulatory_reference for select to authenticated using (true);
drop policy if exists "Public can read confirmed regulatory references" on public.regulatory_reference;
create policy "Public can read confirmed regulatory references" on public.regulatory_reference for select to anon using (confirmation_status = 'CONFIRMED');

drop policy if exists "Authenticated can read codelists" on public.codelist;
create policy "Authenticated can read codelists" on public.codelist for select to authenticated using (true);
drop policy if exists "Public can read published codelists" on public.codelist;
create policy "Public can read published codelists" on public.codelist for select to anon using (status = 'published');

drop policy if exists "Authenticated can read codelist values" on public.codelist_value;
create policy "Authenticated can read codelist values" on public.codelist_value for select to authenticated using (true);
drop policy if exists "Public can read published codelist values" on public.codelist_value;
create policy "Public can read published codelist values" on public.codelist_value for select to anon using (
  exists (select 1 from public.codelist parent where parent.id = codelist_id and parent.status = 'published')
);

commit;
