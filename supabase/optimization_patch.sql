-- GreenLean DPP optimization patch. Safe to run multiple times.

alter table public.products
add column if not exists name_zh text,
add column if not exists description_zh text,
add column if not exists care_instructions text,
add column if not exists care_instructions_zh text,
add column if not exists repair_instructions text,
add column if not exists repair_instructions_zh text,
add column if not exists end_of_life_instructions text,
add column if not exists end_of_life_instructions_zh text;

alter table public.product_bom
add column if not exists component_name_zh text,
add column if not exists component_type_zh text;

alter table public.product_materials
add column if not exists material_name_zh text,
add column if not exists material_type_zh text,
add column if not exists chemical_info_zh text,
add column if not exists recyclability_zh text;

alter table public.product_certificates
add column if not exists certificate_name_zh text,
add column if not exists certificate_type_zh text;

alter table public.product_suppliers
add column if not exists supplier_name_zh text,
add column if not exists facility_name text,
add column if not exists facility_name_zh text,
add column if not exists latitude numeric,
add column if not exists longitude numeric;

alter table public.product_traceability
add column if not exists event_name_zh text,
add column if not exists notes_zh text,
add column if not exists facility_name_zh text;

alter table public.product_consumer_transparency
add column if not exists brand_story_zh text,
add column if not exists sustainability_story_zh text,
add column if not exists consumer_notice_zh text,
add column if not exists marketing_content_zh text;

alter table public.product_digital_identity
  drop constraint if exists product_digital_identity_product_id_fkey;

alter table public.product_digital_identity
  add constraint product_digital_identity_product_id_fkey
  foreign key (product_id) references public.products(id) on delete cascade;

create index if not exists idx_products_public_slug on public.products(public_slug);
create index if not exists idx_products_dpp_id on public.products(dpp_id);
create index if not exists idx_product_bom_product_id on public.product_bom(product_id);
create index if not exists idx_product_materials_product_id on public.product_materials(product_id);
create index if not exists idx_product_certificates_product_id on public.product_certificates(product_id);
create index if not exists idx_product_esg_metrics_product_id on public.product_esg_metrics(product_id);
create index if not exists idx_product_traceability_product_id on public.product_traceability(product_id);
create index if not exists idx_product_circularity_product_id on public.product_circularity(product_id);
create index if not exists idx_product_consumer_transparency_product_id on public.product_consumer_transparency(product_id);
create index if not exists idx_product_digital_identity_product_id on public.product_digital_identity(product_id);
create index if not exists idx_product_documents_product_id on public.product_documents(product_id);
create index if not exists idx_product_data_governance_product_id on public.product_data_governance(product_id);
create index if not exists idx_leads_status_created_at on public.leads(status, created_at desc);

alter table public.leads enable row level security;
alter table public.products enable row level security;
alter table public.product_bom enable row level security;
alter table public.product_materials enable row level security;
alter table public.product_certificates enable row level security;
alter table public.product_esg_metrics enable row level security;
alter table public.product_traceability enable row level security;
alter table public.product_circularity enable row level security;
alter table public.product_consumer_transparency enable row level security;
alter table public.product_digital_identity enable row level security;
alter table public.product_documents enable row level security;
alter table public.product_data_governance enable row level security;
alter table public.product_suppliers enable row level security;

drop policy if exists "Enable insert for anon and authenticated" on public.leads;
drop policy if exists "Anyone can create leads" on public.leads;
drop policy if exists "Allow anonymous lead inserts" on public.leads;
drop policy if exists "Allow insert for anon" on public.leads;
create policy "Enable insert for anon and authenticated"
on public.leads for insert to anon, authenticated with check (true);

drop policy if exists "Authenticated can read leads" on public.leads;
create policy "Authenticated can read leads"
on public.leads for select to authenticated using (true);

drop policy if exists "Authenticated can update leads" on public.leads;
create policy "Authenticated can update leads"
on public.leads for update to authenticated using (true) with check (true);

drop policy if exists "Public can read published products" on public.products;
create policy "Public can read published products"
on public.products for select to anon using (status = 'published');

drop policy if exists "Authenticated can manage products" on public.products;
create policy "Authenticated can manage products"
on public.products for all to authenticated using (true) with check (true);

drop policy if exists "Public can read bom" on public.product_bom;
create policy "Public can read bom" on public.product_bom for select to anon using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));

drop policy if exists "Public can read materials" on public.product_materials;
create policy "Public can read materials" on public.product_materials for select to anon using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));

drop policy if exists "Public can read certificates" on public.product_certificates;
create policy "Public can read certificates" on public.product_certificates for select to anon using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));

drop policy if exists "Public can read esg" on public.product_esg_metrics;
create policy "Public can read esg" on public.product_esg_metrics for select to anon using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));

drop policy if exists "Public can read traceability" on public.product_traceability;
create policy "Public can read traceability" on public.product_traceability for select to anon using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));

drop policy if exists "Public can read circularity" on public.product_circularity;
create policy "Public can read circularity" on public.product_circularity for select to anon using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));

drop policy if exists "Public can read consumer transparency" on public.product_consumer_transparency;
create policy "Public can read consumer transparency" on public.product_consumer_transparency for select to anon using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));

drop policy if exists "Public can read digital identity" on public.product_digital_identity;
create policy "Public can read digital identity" on public.product_digital_identity for select to anon using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));

drop policy if exists "Public can read documents" on public.product_documents;
create policy "Public can read documents" on public.product_documents for select to anon using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));

drop policy if exists "Public can read governance" on public.product_data_governance;
create policy "Public can read governance" on public.product_data_governance for select to anon using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));

drop policy if exists "Authenticated can manage bom" on public.product_bom;
create policy "Authenticated can manage bom" on public.product_bom for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated can manage materials" on public.product_materials;
create policy "Authenticated can manage materials" on public.product_materials for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated can manage certificates" on public.product_certificates;
create policy "Authenticated can manage certificates" on public.product_certificates for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated can manage esg" on public.product_esg_metrics;
create policy "Authenticated can manage esg" on public.product_esg_metrics for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated can manage traceability" on public.product_traceability;
create policy "Authenticated can manage traceability" on public.product_traceability for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated can manage circularity" on public.product_circularity;
create policy "Authenticated can manage circularity" on public.product_circularity for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated can manage consumer transparency" on public.product_consumer_transparency;
create policy "Authenticated can manage consumer transparency" on public.product_consumer_transparency for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated can manage digital identity" on public.product_digital_identity;
create policy "Authenticated can manage digital identity" on public.product_digital_identity for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated can manage documents" on public.product_documents;
create policy "Authenticated can manage documents" on public.product_documents for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated can manage governance" on public.product_data_governance;
create policy "Authenticated can manage governance" on public.product_data_governance for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated can manage suppliers" on public.product_suppliers;
create policy "Authenticated can manage suppliers" on public.product_suppliers for all to authenticated using (true) with check (true);
