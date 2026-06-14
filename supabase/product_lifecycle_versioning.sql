alter table public.products
add column if not exists current_version text default 'v1.0';

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
  exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'updated', 'expired'))
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
  exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'updated', 'expired'))
);

drop policy if exists "Public can read governance" on public.product_data_governance;
create policy "Public can read governance"
on public.product_data_governance for select to anon using (
  exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'updated', 'expired'))
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
