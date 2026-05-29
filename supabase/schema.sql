create extension if not exists "pgcrypto";

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  contact text not null,
  industry text,
  message text,
  source text default 'greanlean.com',
  created_at timestamptz default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text,
  brand text,
  category text,
  subcategory text,
  description text,
  status text default 'draft',
  dpp_id text unique,
  public_slug text unique,
  main_image text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.product_suppliers (
  id uuid primary key default gen_random_uuid(),
  supplier_name text not null,
  supplier_type text,
  country text,
  city text,
  contact_person text,
  email text,
  certifications text,
  esg_score numeric,
  created_at timestamptz default now()
);

create table if not exists public.product_materials (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  supplier_id uuid references public.product_suppliers(id) on delete set null,
  material_name text not null,
  material_type text,
  percentage numeric,
  recycled_content numeric,
  origin_country text,
  chemical_info text,
  recyclability text,
  certification text,
  created_at timestamptz default now()
);

create table if not exists public.product_esg_metrics (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  carbon_footprint numeric,
  water_usage numeric,
  energy_consumption numeric,
  waste_generation numeric,
  recycled_content numeric,
  chemical_management text,
  lca_report_url text,
  methodology text,
  verified_by text,
  created_at timestamptz default now()
);

create table if not exists public.product_certificates (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  supplier_id uuid references public.product_suppliers(id) on delete set null,
  certificate_name text not null,
  certificate_type text,
  certificate_number text,
  issuer text,
  issue_date date,
  expiry_date date,
  certificate_url text,
  verification_status text default 'pending',
  created_at timestamptz default now()
);

alter table public.leads enable row level security;
alter table public.products enable row level security;
alter table public.product_suppliers enable row level security;
alter table public.product_materials enable row level security;
alter table public.product_esg_metrics enable row level security;
alter table public.product_certificates enable row level security;

drop policy if exists "Anyone can create leads" on public.leads;
create policy "Anyone can create leads" on public.leads for insert to anon with check (true);

drop policy if exists "Authenticated can manage products" on public.products;
create policy "Authenticated can manage products" on public.products for all to authenticated using (true) with check (true);
drop policy if exists "Public can read published products" on public.products;
create policy "Public can read published products" on public.products for select to anon using (status = 'published');

drop policy if exists "Authenticated can manage suppliers" on public.product_suppliers;
create policy "Authenticated can manage suppliers" on public.product_suppliers for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated can manage materials" on public.product_materials;
create policy "Authenticated can manage materials" on public.product_materials for all to authenticated using (true) with check (true);
drop policy if exists "Public can read materials" on public.product_materials;
create policy "Public can read materials" on public.product_materials for select to anon using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));

drop policy if exists "Authenticated can manage esg" on public.product_esg_metrics;
create policy "Authenticated can manage esg" on public.product_esg_metrics for all to authenticated using (true) with check (true);
drop policy if exists "Public can read esg" on public.product_esg_metrics;
create policy "Public can read esg" on public.product_esg_metrics for select to anon using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));

drop policy if exists "Authenticated can manage certificates" on public.product_certificates;
create policy "Authenticated can manage certificates" on public.product_certificates for all to authenticated using (true) with check (true);
drop policy if exists "Public can read certificates" on public.product_certificates;
create policy "Public can read certificates" on public.product_certificates for select to anon using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));

insert into public.products (name, sku, brand, category, description, status, dpp_id, public_slug)
values ('Demo Organic Cotton T-Shirt','GL-TSHIRT-001','GreenLean','Apparel','A demo digital product passport for sustainable apparel.','published','DPP-DEMO-001','demo-organic-cotton-tshirt')
on conflict (public_slug) do nothing;
