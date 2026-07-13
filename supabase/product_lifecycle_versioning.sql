alter table public.products
add column if not exists current_version text default 'v1.0';

alter table public.products
add column if not exists granularity_level text default 'model';

alter table public.products
add column if not exists commodity_code text;

alter table public.products
add column if not exists unique_product_identifier text;

alter table public.products
add column if not exists eu_registration_status text default 'not_registered';

create table if not exists public.product_versions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  version text not null,
  lifecycle_status text not null default 'draft',
  change_type text,
  change_summary text,
  changed_by text default 'greanlean admin',
  snapshot jsonb,
  created_at timestamptz default now(),
  unique (product_id, version)
);

alter table public.product_versions enable row level security;

alter table public.product_versions
add column if not exists data_hash text;

alter table public.product_versions
add column if not exists hash_algorithm text default 'SHA-256';

alter table public.product_certificates
add column if not exists evidence_hash text;

alter table public.product_certificates
add column if not exists hash_algorithm text default 'SHA-256';

alter table public.product_certificates
add column if not exists visibility_level text default 'public';

alter table public.product_documents
add column if not exists evidence_hash text;

alter table public.product_documents
add column if not exists hash_algorithm text default 'SHA-256';

alter table public.product_documents
add column if not exists visibility_level text default 'public';

create table if not exists public.dpp_registry_submissions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  submission_status text default 'draft',
  registry_environment text default 'sandbox',
  eu_registration_identifier text,
  commodity_code text,
  submitted_version text,
  submitted_hash text,
  semantic_model_version text,
  submitted_payload jsonb,
  registry_response jsonb,
  submitted_at timestamptz,
  accepted_at timestamptz,
  rejected_reason text,
  visibility_level text default 'internal',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.dpp_registration_proofs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  submission_id uuid references public.dpp_registry_submissions(id) on delete set null,
  proof_type text default 'eu_registry',
  proof_url text,
  proof_hash text,
  hash_algorithm text default 'SHA-256',
  qualified_seal_status text,
  qualified_timestamp text,
  generated_at timestamptz,
  expires_at timestamptz,
  visibility_level text default 'authority',
  created_at timestamptz default now()
);

create table if not exists public.dpp_evidence_links (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  evidence_type text not null,
  evidence_ref_id uuid,
  supported_field text not null,
  supported_module text,
  claim_value text,
  verification_status text default 'pending',
  visibility_level text default 'public',
  created_at timestamptz default now()
);

create table if not exists public.dpp_audit_logs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  actor_name text,
  actor_role text,
  action_type text not null,
  target_table text,
  target_id uuid,
  previous_hash text,
  new_hash text,
  ip_context text,
  notes text,
  visibility_level text default 'internal',
  created_at timestamptz default now()
);

create table if not exists public.dpp_blockchain_anchors (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  version text,
  anchored_hash text not null,
  hash_algorithm text default 'SHA-256',
  chain_name text,
  chain_id text,
  network text default 'testnet',
  contract_address text,
  transaction_hash text,
  block_number text,
  anchor_status text default 'pending',
  anchored_at timestamptz,
  explorer_url text,
  notes text,
  visibility_level text default 'public',
  created_at timestamptz default now()
);

alter table public.dpp_registry_submissions enable row level security;
alter table public.dpp_registration_proofs enable row level security;
alter table public.dpp_evidence_links enable row level security;
alter table public.dpp_audit_logs enable row level security;
alter table public.dpp_blockchain_anchors enable row level security;

drop policy if exists "Authenticated can manage product versions" on public.product_versions;
create policy "Authenticated can manage product versions"
on public.product_versions for all to authenticated
using (true)
with check (true);

drop policy if exists "Public can read published product versions" on public.product_versions;
create policy "Public can read published product versions"
on public.product_versions for select to anon
using (
  exists (
    select 1
    from public.products p
    where p.id = product_id
      and p.status in ('published', 'updated', 'expired')
  )
);

drop policy if exists "Public can read published products" on public.products;
create policy "Public can read published products"
on public.products for select to anon
using (status in ('published', 'updated', 'expired'));

drop policy if exists "Public can read published supplier products" on public.supplier_products;
create policy "Public can read published supplier products"
on public.supplier_products for select to anon using (
  exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'updated', 'expired'))
);

drop policy if exists "Public can read materials" on public.product_materials;
create policy "Public can read materials"
on public.product_materials for select to anon using (
  exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'updated', 'expired'))
);

drop policy if exists "Public can read bom" on public.product_bom;
create policy "Public can read bom"
on public.product_bom for select to anon using (
  exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'updated', 'expired'))
);

drop policy if exists "Public can read esg" on public.product_esg_metrics;
create policy "Public can read esg"
on public.product_esg_metrics for select to anon using (
  exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'updated', 'expired'))
);

drop policy if exists "Public can read certificates" on public.product_certificates;
create policy "Public can read certificates"
on public.product_certificates for select to anon using (
  coalesce(visibility_level, 'public') = 'public'
  and exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'updated', 'expired'))
);

drop policy if exists "Public can read traceability" on public.product_traceability;
create policy "Public can read traceability"
on public.product_traceability for select to anon using (
  exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'updated', 'expired'))
);

drop policy if exists "Public can read circularity" on public.product_circularity;
create policy "Public can read circularity"
on public.product_circularity for select to anon using (
  exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'updated', 'expired'))
);

drop policy if exists "Public can read consumer transparency" on public.product_consumer_transparency;
create policy "Public can read consumer transparency"
on public.product_consumer_transparency for select to anon using (
  exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'updated', 'expired'))
);

drop policy if exists "Public can read digital identity" on public.product_digital_identity;
create policy "Public can read digital identity"
on public.product_digital_identity for select to anon using (
  exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'updated', 'expired'))
);

drop policy if exists "Public can read documents" on public.product_documents;
create policy "Public can read documents"
on public.product_documents for select to anon using (
  coalesce(visibility_level, 'public') = 'public'
  and exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'updated', 'expired'))
);

drop policy if exists "Public can read governance" on public.product_data_governance;
create policy "Public can read governance"
on public.product_data_governance for select to anon using (
  exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'updated', 'expired'))
);

drop policy if exists "Authenticated can manage registry submissions" on public.dpp_registry_submissions;
create policy "Authenticated can manage registry submissions"
on public.dpp_registry_submissions for all to authenticated
using (true)
with check (true);

drop policy if exists "Public can read registry submissions" on public.dpp_registry_submissions;
create policy "Public can read registry submissions"
on public.dpp_registry_submissions for select to anon using (
  coalesce(visibility_level, 'internal') = 'public'
  and exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'updated', 'expired'))
);

drop policy if exists "Authenticated can manage registration proofs" on public.dpp_registration_proofs;
create policy "Authenticated can manage registration proofs"
on public.dpp_registration_proofs for all to authenticated
using (true)
with check (true);

drop policy if exists "Public can read registration proofs" on public.dpp_registration_proofs;
create policy "Public can read registration proofs"
on public.dpp_registration_proofs for select to anon using (
  coalesce(visibility_level, 'authority') = 'public'
  and exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'updated', 'expired'))
);

drop policy if exists "Authenticated can manage evidence links" on public.dpp_evidence_links;
create policy "Authenticated can manage evidence links"
on public.dpp_evidence_links for all to authenticated
using (true)
with check (true);

drop policy if exists "Public can read evidence links" on public.dpp_evidence_links;
create policy "Public can read evidence links"
on public.dpp_evidence_links for select to anon using (
  coalesce(visibility_level, 'public') = 'public'
  and exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'updated', 'expired'))
);

drop policy if exists "Authenticated can manage audit logs" on public.dpp_audit_logs;
create policy "Authenticated can manage audit logs"
on public.dpp_audit_logs for all to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated can manage blockchain anchors" on public.dpp_blockchain_anchors;
create policy "Authenticated can manage blockchain anchors"
on public.dpp_blockchain_anchors for all to authenticated
using (true)
with check (true);

drop policy if exists "Public can read blockchain anchors" on public.dpp_blockchain_anchors;
create policy "Public can read blockchain anchors"
on public.dpp_blockchain_anchors for select to anon using (
  coalesce(visibility_level, 'public') = 'public'
  and exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'updated', 'expired'))
);

insert into public.product_versions (
  product_id,
  version,
  lifecycle_status,
  change_type,
  change_summary,
  snapshot
)
select
  p.id,
  coalesce(p.current_version, 'v1.0'),
  coalesce(p.status, 'draft'),
  'initial_publish',
  'Initial DPP version record generated from existing product data.',
  jsonb_build_object(
    'product', to_jsonb(p),
    'generated_from', 'product_lifecycle_versioning.sql'
  )
from public.products p
where not exists (
  select 1
  from public.product_versions v
  where v.product_id = p.id
    and v.version = coalesce(p.current_version, 'v1.0')
);
