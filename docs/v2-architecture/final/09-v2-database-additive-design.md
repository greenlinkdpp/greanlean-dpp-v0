# 09 V2 Database Additive Design

## Important

The SQL below is a **design draft only**. It was not executed. Names, types, indexes, grants, RLS, and migration batching require a reviewed implementation migration after architecture acceptance and Production baseline completion.

## Naming and coexistence

- New unambiguous concepts use their target names (`tenant`, `partner`, `product_model`, `dpp_passport`).
- `organisation_v2` is deliberately separate from `dpp_organisation`.
- V1 table names, columns, primary keys, and routes remain unchanged.
- `legacy_entity_mapping` records reviewed V1→V2 identity; no name-based inference.
- every Tenant-owned table carries non-null `tenant_id` and composite integrity where practical.

## Core DDL draft

```sql
-- DESIGN ONLY — DO NOT EXECUTE

create table public.tenant (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  status text not null check (status in ('ACTIVE','SUSPENDED','CLOSED')),
  legal_jurisdiction text,
  default_locale text not null default 'en',
  residency_policy jsonb not null default '{}'::jsonb,
  feature_profile jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, status)
);

create table public.organisation_v2 (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete restrict,
  parent_organisation_id uuid,
  organisation_type text not null,
  legal_name text not null,
  trading_name text,
  country text,
  registration_identifier text,
  vat_number text,
  eori text,
  address jsonb not null default '{}'::jsonb,
  status text not null check (status in ('ACTIVE','INACTIVE','ARCHIVED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, tenant_id),
  foreign key (parent_organisation_id, tenant_id)
    references public.organisation_v2(id, tenant_id) on delete restrict
);

create table public.partner (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  trading_name text,
  registration_identifier text,
  country text,
  partner_type text not null,
  status text not null check (status in ('ACTIVE','SUSPENDED','REVOKED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.permission_profile (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  status text not null default 'ACTIVE'
);

create table public.partner_tenant_authorization (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partner(id) on delete restrict,
  tenant_id uuid not null references public.tenant(id) on delete restrict,
  permission_profile_id uuid not null references public.permission_profile(id),
  scope jsonb not null default '{}'::jsonb,
  valid_from timestamptz not null,
  valid_until timestamptz,
  status text not null check (status in ('PENDING','ACTIVE','SUSPENDED','REVOKED','EXPIRED')),
  approved_by uuid,
  approval_evidence_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_until is null or valid_until > valid_from),
  unique (id, tenant_id)
);

create table public.role (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenant(id) on delete restrict,
  code text not null,
  name text not null,
  role_class text not null check (role_class in ('PLATFORM','TENANT','PARTNER','INTEGRATION')),
  managed boolean not null default true,
  status text not null default 'ACTIVE',
  unique nulls not distinct (tenant_id, code),
  unique (id, tenant_id, role_class)
);

create table public.tenant_membership (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  role_id uuid not null,
  role_class text generated always as ('TENANT') stored,
  status text not null check (status in ('INVITED','ACTIVE','SUSPENDED','REVOKED','EXPIRED')),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id),
  unique (id, tenant_id),
  foreign key (role_id, tenant_id, role_class)
    references public.role(id, tenant_id, role_class) on delete restrict,
  check (valid_until is null or valid_until > valid_from)
);

create table public.capability (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text not null,
  risk_class text not null check (risk_class in ('READ','WRITE','APPROVE','PUBLISH','ADMIN'))
);

create table public.role_capability (
  role_id uuid not null references public.role(id) on delete cascade,
  capability_id uuid not null references public.capability(id) on delete restrict,
  primary key (role_id, capability_id)
);

create table public.scope_grant (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete restrict,
  grantee_type text not null check (grantee_type in ('MEMBERSHIP','PARTNER_AUTHORIZATION','INTEGRATION')),
  grantee_id uuid not null,
  capability_id uuid not null references public.capability(id),
  resource_type text not null,
  resource_id uuid,
  purpose text,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  status text not null default 'ACTIVE',
  check (valid_until is null or valid_until > valid_from)
);
```

## Product subject and hierarchy draft

A central subject row gives Passport, Claim, Identifier, and Provenance a real foreign-key target instead of an unenforced polymorphic UUID.

```sql
-- DESIGN ONLY — DO NOT EXECUTE
create table public.product_subject (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete restrict,
  subject_type text not null check (subject_type in ('FAMILY','MODEL','SKU','BATCH','ITEM')),
  created_at timestamptz not null default now(),
  unique (id, tenant_id),
  unique (id, tenant_id, subject_type)
);

create table public.product_family (
  id uuid primary key,
  tenant_id uuid not null,
  subject_type text generated always as ('FAMILY') stored,
  code text not null,
  name text not null,
  status text not null,
  unique (id, tenant_id),
  foreign key (id, tenant_id, subject_type)
    references public.product_subject(id, tenant_id, subject_type)
);

create table public.product_model (
  id uuid primary key,
  tenant_id uuid not null,
  subject_type text generated always as ('MODEL') stored,
  family_id uuid,
  manufacturer_organisation_id uuid not null,
  model_code text not null,
  name text not null,
  status text not null,
  unique (id, tenant_id),
  unique (tenant_id, model_code),
  foreign key (id, tenant_id, subject_type)
    references public.product_subject(id, tenant_id, subject_type),
  foreign key (family_id, tenant_id) references public.product_family(id, tenant_id),
  foreign key (manufacturer_organisation_id, tenant_id)
    references public.organisation_v2(id, tenant_id)
);

create table public.sku (
  id uuid primary key,
  tenant_id uuid not null,
  subject_type text generated always as ('SKU') stored,
  model_id uuid not null,
  sku_code text not null,
  gtin text,
  market text,
  configuration jsonb not null default '{}'::jsonb,
  status text not null,
  unique (id, tenant_id),
  unique (id, tenant_id, model_id),
  unique (tenant_id, sku_code),
  foreign key (id, tenant_id, subject_type)
    references public.product_subject(id, tenant_id, subject_type),
  foreign key (model_id, tenant_id) references public.product_model(id, tenant_id)
);

create table public.product_batch (
  id uuid primary key,
  tenant_id uuid not null,
  subject_type text generated always as ('BATCH') stored,
  model_id uuid not null,
  batch_number text not null,
  manufactured_at timestamptz,
  manufacturer_organisation_id uuid,
  status text not null,
  unique (id, tenant_id),
  unique (id, tenant_id, model_id),
  unique (tenant_id, model_id, batch_number),
  foreign key (id, tenant_id, subject_type)
    references public.product_subject(id, tenant_id, subject_type),
  foreign key (model_id, tenant_id) references public.product_model(id, tenant_id),
  foreign key (manufacturer_organisation_id, tenant_id)
    references public.organisation_v2(id, tenant_id)
);

create table public.batch_sku_link (
  tenant_id uuid not null,
  model_id uuid not null,
  batch_id uuid not null,
  sku_id uuid not null,
  status text not null default 'ACTIVE',
  primary key (batch_id, sku_id),
  foreign key (batch_id, tenant_id, model_id)
    references public.product_batch(id, tenant_id, model_id),
  foreign key (sku_id, tenant_id, model_id)
    references public.sku(id, tenant_id, model_id)
);

create table public.product_item (
  id uuid primary key,
  tenant_id uuid not null,
  subject_type text generated always as ('ITEM') stored,
  model_id uuid not null,
  sku_id uuid,
  batch_id uuid,
  serial_number text,
  upi text,
  status text not null,
  unique (id, tenant_id),
  unique (tenant_id, model_id, serial_number),
  unique (upi),
  foreign key (id, tenant_id, subject_type)
    references public.product_subject(id, tenant_id, subject_type),
  foreign key (model_id, tenant_id) references public.product_model(id, tenant_id),
  foreign key (sku_id, tenant_id, model_id) references public.sku(id, tenant_id, model_id),
  foreign key (batch_id, tenant_id, model_id) references public.product_batch(id, tenant_id, model_id)
);

create table public.product_subject_identifier (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  subject_id uuid not null,
  identifier_type text not null,
  value text not null,
  normalized_value text not null,
  issuer text not null default '',
  scheme text not null,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  is_primary boolean not null default false,
  status text not null default 'ACTIVE',
  unique (id, tenant_id),
  foreign key (subject_id, tenant_id) references public.product_subject(id, tenant_id),
  check (valid_until is null or valid_until > valid_from)
);
```

The implementation must create the `product_subject` row and its concrete row in one transaction. Generated discriminator columns make the composite foreign key reject a concrete row whose declared type does not match its subject registry row.

## Passport, claims, provenance, and resolver draft

```sql
-- DESIGN ONLY — DO NOT EXECUTE
create table public.dpp_passport (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  subject_type text not null check (subject_type in ('MODEL','SKU','BATCH','ITEM')),
  subject_id uuid not null,
  passport_profile_code text not null default 'PRIMARY'
    check (passport_profile_code ~ '^[A-Z][A-Z0-9_]{1,63}$'),
  passport_identifier text not null,
  schema_definition_id uuid not null references public.schema_definition(id),
  status text not null check (status in ('ACTIVE','SUSPENDED','RETIRED')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (id, tenant_id),
  unique (tenant_id, passport_identifier),
  foreign key (subject_id, tenant_id, subject_type)
    references public.product_subject(id, tenant_id, subject_type)
);

create unique index dpp_passport_one_active_profile_idx
  on public.dpp_passport (
    tenant_id,
    subject_type,
    subject_id,
    passport_profile_code
  )
  where status = 'ACTIVE';

create table public.dpp_version (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  passport_id uuid not null,
  version_number integer not null check (version_number > 0),
  schema_version_id uuid not null references public.schema_version(id),
  canonical_payload jsonb not null,
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  content_workflow_state text not null,
  publication_state text not null,
  supersedes_version_id uuid,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique (id, tenant_id),
  unique (passport_id, version_number),
  foreign key (passport_id, tenant_id) references public.dpp_passport(id, tenant_id),
  foreign key (supersedes_version_id, tenant_id) references public.dpp_version(id, tenant_id)
);

create table public.dpp_current_pointer (
  passport_id uuid primary key,
  tenant_id uuid not null,
  version_id uuid not null,
  changed_by uuid not null references auth.users(id),
  changed_at timestamptz not null default now(),
  foreign key (passport_id, tenant_id) references public.dpp_passport(id, tenant_id),
  foreign key (version_id, tenant_id) references public.dpp_version(id, tenant_id)
);

create table public.provenance_record (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id),
  subject_id uuid not null,
  field_definition_id uuid not null references public.field_definition(id),
  source_id uuid,
  source_record_id text,
  provider_organisation_id uuid,
  actor_id uuid,
  raw_value jsonb,
  normalized_value jsonb,
  transformation_version text,
  observed_at timestamptz,
  ingested_at timestamptz not null default now(),
  verification_status text not null,
  evidence_reference jsonb not null default '[]'::jsonb,
  foreign key (subject_id, tenant_id) references public.product_subject(id, tenant_id),
  foreign key (provider_organisation_id, tenant_id)
    references public.organisation_v2(id, tenant_id)
);

create table public.canonical_claim (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  subject_id uuid not null,
  field_definition_id uuid not null references public.field_definition(id),
  schema_version_id uuid not null references public.schema_version(id),
  resolution_state text not null check (resolution_state in
    ('INHERIT','OVERRIDE','CLEAR','NOT_APPLICABLE','UNKNOWN')),
  value_json jsonb,
  canonical_unit text,
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  verification_status text not null,
  provenance_record_id uuid references public.provenance_record(id),
  supersedes_claim_id uuid references public.canonical_claim(id),
  created_at timestamptz not null default now(),
  foreign key (subject_id, tenant_id) references public.product_subject(id, tenant_id),
  check (effective_to is null or effective_to > effective_from),
  check ((resolution_state = 'OVERRIDE') = (value_json is not null))
);

create table public.resolver_mapping (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id),
  host text not null,
  normalized_path text not null,
  identifier_id uuid,
  passport_id uuid not null,
  mapping_type text not null check (mapping_type in ('PRIMARY','ALIAS','LEGACY_REDIRECT')),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  status text not null default 'ACTIVE',
  redirect_http_status integer,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique nulls not distinct (host, normalized_path, status),
  foreign key (identifier_id, tenant_id)
    references public.product_subject_identifier(id, tenant_id),
  foreign key (passport_id, tenant_id)
    references public.dpp_passport(id, tenant_id)
);

create table public.legacy_entity_mapping (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenant(id),
  legacy_table text not null,
  legacy_id text not null,
  target_table text not null,
  target_id uuid,
  mapping_status text not null check (mapping_status in
    ('PROPOSED','CONFIRMED','AMBIGUOUS','QUARANTINED')),
  rule_version text not null,
  source_checksum text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  unique (legacy_table, legacy_id, target_table)
);
```

## Required database guards

Implementation migrations must add and test:

- RLS enabled and forced where appropriate on every Tenant table;
- immutable Tenant ownership and published payload triggers;
- a pointer trigger proving version belongs to Passport and is `PUBLISHED`;
- a supersedes trigger proving same Passport/Tenant and earlier version;
- subject-type constraint triggers;
- active identifier/resolver uniqueness using partial indexes;
- append-only audit/provenance/publication history;
- safe `SECURITY DEFINER` ownership and `search_path`;
- least-privilege grants and explicit revocation from `anon`/`authenticated` where RPC-only.

## Reuse vs new table

| Existing table | Decision | Reason |
|---|---|---|
| `schema_definition`, `schema_version`, `field_definition`, rules/policies | reuse and extend | already close to target authority and immutable model |
| `dpp_organisation` | retain V1; map | mixes current organisation/tenant semantics |
| `dpp_user_membership` | retain V1; new Tenant membership | existing membership is organisation-oriented |
| `products` | retain V1; map | overloaded Product Model/SKU/Passport identity |
| battery model/batch/item | retain as sector extension/compatibility | valuable data and constraints, not generic core |
| `dpp_publication` | retain V1; map eligible rows | product/item-specific shape and V1 compatibility |
| file/evidence/lifecycle tables | reuse through Tenant-safe extension where feasible | mature immutable foundations; ownership must be added safely |
| Registry tables | retain as adapter | external-system state must not become core Passport state |

## Legacy mapping matrix

| Legacy | V2 Target | Mapping | Migration Risk |
|---|---|---|---|
| `products` | Product Model + Passport mapping | reviewed per row | Tenant and identity ambiguity |
| `products.sku` | SKU or legacy identifier | only create SKU with evidence | false 1:1 assumption |
| `battery_model_profile` | Model battery extension | link by confirmed product map | duplicate identity |
| `battery_batch` | Product Batch | preserve Model/Org and source ID | SKU must not be inferred |
| `battery_item` | Product Item | preserve optional Batch, serial, UPI | mismatch/duplicate risk |
| `product_versions` | DPP Version candidate | only immutable published snapshots qualify | schema/hash gaps |
| `dpp_publication` | DPP Version | require stable subject/schema/hash | status/pointer variance |
| `product_sector_field_values` | Canonical Claim | mapping-version driven | field/unit loss |
| `dpp_field_templates` | Field mapping | map to Schema Registry | parallel authority |
| `field_definition` | authoritative V2 Field Definition | reuse IDs where semantics stable | existing battery bias |
