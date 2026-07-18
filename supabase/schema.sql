create extension if not exists "pgcrypto";

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  contact text not null,
  industry text,
  message text,
  status text default 'new',
  source text default 'greanlean.com',
  created_at timestamptz default now()
);

create table if not exists public.dpp_category_profiles (
  id uuid primary key default gen_random_uuid(),
  sector_code text not null,
  category_code text not null,
  subcategory_code text,
  profile_key text not null unique,
  profile_name text not null,
  profile_name_zh text,
  regulation_basis text,
  schema_version text default 'v1',
  parent_profile_key text,
  status text default 'active',
  sort_order integer default 100,
  field_schema jsonb default '{}'::jsonb,
  required_modules jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.dpp_field_templates (
  id uuid primary key default gen_random_uuid(),
  profile_key text not null references public.dpp_category_profiles(profile_key) on delete cascade,
  module_key text not null,
  field_key text not null,
  field_label text not null,
  field_label_zh text,
  data_type text default 'text',
  unit text,
  required boolean default false,
  evidence_required boolean default false,
  visibility_level text default 'public',
  validation_hint text,
  options jsonb default '[]'::jsonb,
  sort_order integer default 100,
  created_at timestamptz default now(),
  unique (profile_key, field_key)
);

create table if not exists public.dpp_validation_rules (
  id uuid primary key default gen_random_uuid(),
  profile_key text not null references public.dpp_category_profiles(profile_key) on delete cascade,
  field_key text,
  module_key text,
  rule_type text not null,
  rule_config jsonb default '{}'::jsonb,
  severity text default 'warning',
  message text,
  message_zh text,
  created_at timestamptz default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text,
  brand text,
  category text,
  subcategory text,
  sector_code text,
  category_code text,
  subcategory_code text,
  dpp_profile_key text references public.dpp_category_profiles(profile_key) on delete set null,
  description text,
  status text default 'draft',
  current_version text default 'v1.0',
  granularity_level text default 'model',
  commodity_code text,
  unique_product_identifier text,
  eu_registration_status text default 'not_registered',
  dpp_id text unique,
  public_slug text unique,
  main_image text,
  name_zh text,
  description_zh text,
  season text,
  care_instructions text,
  care_instructions_zh text,
  repair_instructions text,
  repair_instructions_zh text,
  end_of_life_instructions text,
  end_of_life_instructions_zh text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.product_sector_field_values (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  profile_key text references public.dpp_category_profiles(profile_key) on delete set null,
  module_key text,
  field_key text not null,
  field_label text,
  field_label_zh text,
  field_value text,
  field_value_json jsonb,
  unit text,
  evidence_status text default 'pending',
  source_type text default 'manual',
  visibility_level text default 'public',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (product_id, field_key)
);

create table if not exists public.product_versions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  version text not null,
  lifecycle_status text not null default 'draft',
  change_type text,
  change_summary text,
  changed_by text default 'greanlean admin',
  snapshot jsonb,
  data_hash text,
  hash_algorithm text default 'SHA-256',
  created_at timestamptz default now(),
  unique (product_id, version)
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
  facility_name text,
  facility_name_zh text,
  latitude numeric,
  longitude numeric,
  created_at timestamptz default now()
);

create table if not exists public.supplier_products (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.product_suppliers(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  supplier_role text,
  relationship_status text default 'active',
  notes text,
  notes_zh text,
  created_at timestamptz default now(),
  unique (supplier_id, product_id)
);

create table if not exists public.product_materials (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  supplier_id uuid references public.product_suppliers(id) on delete set null,
  material_name text not null,
  material_name_zh text,
  material_type text,
  material_type_zh text,
  percentage numeric,
  recycled_content numeric,
  origin_country text,
  chemical_info text,
  chemical_info_zh text,
  recyclability text,
  recyclability_zh text,
  certification text,
  created_at timestamptz default now()
);

create table if not exists public.product_bom (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  component_name text not null,
  component_name_zh text,
  component_type text,
  component_type_zh text,
  quantity numeric,
  unit text,
  position text,
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
  certificate_name_zh text,
  certificate_type text,
  certificate_type_zh text,
  certificate_number text,
  issuer text,
  issue_date date,
  expiry_date date,
  certificate_url text,
  verification_status text default 'pending',
  evidence_hash text,
  hash_algorithm text default 'SHA-256',
  visibility_level text default 'public',
  created_at timestamptz default now()
);

create table if not exists public.product_traceability (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  event_type text,
  event_name text not null,
  event_name_zh text,
  event_date timestamptz,
  country text,
  city text,
  facility_name text,
  facility_name_zh text,
  supplier_name text,
  transport_method text,
  verification_status text default 'pending',
  notes text,
  notes_zh text,
  created_at timestamptz default now()
);

create table if not exists public.product_circularity (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  repairability_score numeric,
  recyclability_score numeric,
  take_back_program text,
  resale_supported boolean default false,
  remanufacturing_supported boolean default false,
  disassembly_guide text,
  recycling_instructions text,
  end_of_life_info text,
  created_at timestamptz default now()
);

create table if not exists public.product_consumer_transparency (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  brand_story text,
  brand_story_zh text,
  sustainability_story text,
  sustainability_story_zh text,
  consumer_notice text,
  consumer_notice_zh text,
  marketing_content text,
  marketing_content_zh text,
  packaging_info text,
  created_at timestamptz default now()
);

create table if not exists public.product_digital_identity (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  product_uuid text,
  gtin text,
  style_id text,
  batch_id text,
  serial_id text,
  digital_link_url text,
  data_carrier_type text default 'qr',
  data_carrier_url text,
  qr_code_id text,
  nfc_id text,
  rfid_epc text,
  created_at timestamptz default now()
);

create table if not exists public.product_documents (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  document_name text not null,
  document_type text,
  file_url text,
  file_size text,
  language text,
  uploaded_by text,
  version text,
  evidence_hash text,
  hash_algorithm text default 'SHA-256',
  visibility_level text default 'public',
  created_at timestamptz default now()
);

create table if not exists public.product_data_governance (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  data_source text,
  data_owner text,
  audit_status text,
  data_quality_score numeric,
  created_at timestamptz default now()
);

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

alter table public.leads enable row level security;
alter table public.dpp_category_profiles enable row level security;
alter table public.dpp_field_templates enable row level security;
alter table public.dpp_validation_rules enable row level security;
alter table public.products enable row level security;
alter table public.product_sector_field_values enable row level security;
alter table public.product_versions enable row level security;
alter table public.product_suppliers enable row level security;
alter table public.supplier_products enable row level security;
alter table public.product_materials enable row level security;
alter table public.product_bom enable row level security;
alter table public.product_esg_metrics enable row level security;
alter table public.product_certificates enable row level security;
alter table public.product_traceability enable row level security;
alter table public.product_circularity enable row level security;
alter table public.product_consumer_transparency enable row level security;
alter table public.product_digital_identity enable row level security;
alter table public.product_documents enable row level security;
alter table public.product_data_governance enable row level security;
alter table public.dpp_registry_submissions enable row level security;
alter table public.dpp_registration_proofs enable row level security;
alter table public.dpp_evidence_links enable row level security;
alter table public.dpp_audit_logs enable row level security;
alter table public.dpp_blockchain_anchors enable row level security;

drop policy if exists "Anyone can create leads" on public.leads;
create policy "Anyone can create leads" on public.leads for insert to anon, authenticated with check (true);
drop policy if exists "Authenticated can read leads" on public.leads;
create policy "Authenticated can read leads" on public.leads for select to authenticated using (true);
drop policy if exists "Authenticated can update leads" on public.leads;
create policy "Authenticated can update leads" on public.leads for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated can manage category profiles" on public.dpp_category_profiles;
create policy "Authenticated can manage category profiles" on public.dpp_category_profiles for all to authenticated using (true) with check (true);
drop policy if exists "Public can read active category profiles" on public.dpp_category_profiles;
create policy "Public can read active category profiles" on public.dpp_category_profiles for select to anon using (status = 'active');

drop policy if exists "Authenticated can manage field templates" on public.dpp_field_templates;
create policy "Authenticated can manage field templates" on public.dpp_field_templates for all to authenticated using (true) with check (true);
drop policy if exists "Public can read field templates" on public.dpp_field_templates;
create policy "Public can read field templates" on public.dpp_field_templates for select to anon using (
  exists (select 1 from public.dpp_category_profiles p where p.profile_key = dpp_field_templates.profile_key and p.status = 'active')
);

drop policy if exists "Authenticated can manage validation rules" on public.dpp_validation_rules;
create policy "Authenticated can manage validation rules" on public.dpp_validation_rules for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated can manage products" on public.products;
create policy "Authenticated can manage products" on public.products for all to authenticated using (true) with check (true);
drop policy if exists "Public can read published products" on public.products;
create policy "Public can read published products" on public.products for select to anon using (status in ('published', 'updated', 'expired'));

drop policy if exists "Authenticated can manage sector field values" on public.product_sector_field_values;
create policy "Authenticated can manage sector field values" on public.product_sector_field_values for all to authenticated using (true) with check (true);
drop policy if exists "Public can read sector field values" on public.product_sector_field_values;
create policy "Public can read sector field values" on public.product_sector_field_values for select to anon using (
  coalesce(visibility_level, 'public') = 'public'
  and exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'updated', 'expired'))
);

drop policy if exists "Authenticated can manage product versions" on public.product_versions;
create policy "Authenticated can manage product versions" on public.product_versions for all to authenticated using (true) with check (true);
drop policy if exists "Public can read published product versions" on public.product_versions;
create policy "Public can read published product versions" on public.product_versions for select to anon using (
  exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'updated', 'expired'))
);

drop policy if exists "Authenticated can manage suppliers" on public.product_suppliers;
create policy "Authenticated can manage suppliers" on public.product_suppliers for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated can manage supplier products" on public.supplier_products;
create policy "Authenticated can manage supplier products" on public.supplier_products for all to authenticated using (true) with check (true);
drop policy if exists "Public can read published supplier products" on public.supplier_products;
create policy "Public can read published supplier products"
on public.supplier_products for select to anon using (
  exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'updated', 'expired'))
);

drop policy if exists "Authenticated can manage materials" on public.product_materials;
create policy "Authenticated can manage materials" on public.product_materials for all to authenticated using (true) with check (true);
drop policy if exists "Public can read materials" on public.product_materials;
create policy "Public can read materials" on public.product_materials for select to anon using (exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'updated', 'expired')));

drop policy if exists "Authenticated can manage bom" on public.product_bom;
create policy "Authenticated can manage bom" on public.product_bom for all to authenticated using (true) with check (true);
drop policy if exists "Public can read bom" on public.product_bom;
create policy "Public can read bom" on public.product_bom for select to anon using (exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'updated', 'expired')));

drop policy if exists "Authenticated can manage esg" on public.product_esg_metrics;
create policy "Authenticated can manage esg" on public.product_esg_metrics for all to authenticated using (true) with check (true);
drop policy if exists "Public can read esg" on public.product_esg_metrics;
create policy "Public can read esg" on public.product_esg_metrics for select to anon using (exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'updated', 'expired')));

drop policy if exists "Authenticated can manage certificates" on public.product_certificates;
create policy "Authenticated can manage certificates" on public.product_certificates for all to authenticated using (true) with check (true);
drop policy if exists "Public can read certificates" on public.product_certificates;
create policy "Public can read certificates" on public.product_certificates for select to anon using (
  coalesce(visibility_level, 'public') = 'public'
  and exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'updated', 'expired'))
);

drop policy if exists "Authenticated can manage traceability" on public.product_traceability;
create policy "Authenticated can manage traceability" on public.product_traceability for all to authenticated using (true) with check (true);
drop policy if exists "Public can read traceability" on public.product_traceability;
create policy "Public can read traceability" on public.product_traceability for select to anon using (exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'updated', 'expired')));

drop policy if exists "Authenticated can manage circularity" on public.product_circularity;
create policy "Authenticated can manage circularity" on public.product_circularity for all to authenticated using (true) with check (true);
drop policy if exists "Public can read circularity" on public.product_circularity;
create policy "Public can read circularity" on public.product_circularity for select to anon using (exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'updated', 'expired')));

drop policy if exists "Authenticated can manage consumer transparency" on public.product_consumer_transparency;
create policy "Authenticated can manage consumer transparency" on public.product_consumer_transparency for all to authenticated using (true) with check (true);
drop policy if exists "Public can read consumer transparency" on public.product_consumer_transparency;
create policy "Public can read consumer transparency" on public.product_consumer_transparency for select to anon using (exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'updated', 'expired')));

drop policy if exists "Authenticated can manage digital identity" on public.product_digital_identity;
create policy "Authenticated can manage digital identity" on public.product_digital_identity for all to authenticated using (true) with check (true);
drop policy if exists "Public can read digital identity" on public.product_digital_identity;
create policy "Public can read digital identity" on public.product_digital_identity for select to anon using (exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'updated', 'expired')));

drop policy if exists "Authenticated can manage documents" on public.product_documents;
create policy "Authenticated can manage documents" on public.product_documents for all to authenticated using (true) with check (true);
drop policy if exists "Public can read documents" on public.product_documents;
create policy "Public can read documents" on public.product_documents for select to anon using (
  coalesce(visibility_level, 'public') = 'public'
  and exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'updated', 'expired'))
);

drop policy if exists "Authenticated can manage governance" on public.product_data_governance;
create policy "Authenticated can manage governance" on public.product_data_governance for all to authenticated using (true) with check (true);
drop policy if exists "Public can read governance" on public.product_data_governance;
create policy "Public can read governance" on public.product_data_governance for select to anon using (exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'updated', 'expired')));

drop policy if exists "Authenticated can manage registry submissions" on public.dpp_registry_submissions;
create policy "Authenticated can manage registry submissions" on public.dpp_registry_submissions for all to authenticated using (true) with check (true);
drop policy if exists "Public can read registry submissions" on public.dpp_registry_submissions;
create policy "Public can read registry submissions" on public.dpp_registry_submissions for select to anon using (
  coalesce(visibility_level, 'internal') = 'public'
  and exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'updated', 'expired'))
);

drop policy if exists "Authenticated can manage registration proofs" on public.dpp_registration_proofs;
create policy "Authenticated can manage registration proofs" on public.dpp_registration_proofs for all to authenticated using (true) with check (true);
drop policy if exists "Public can read registration proofs" on public.dpp_registration_proofs;
create policy "Public can read registration proofs" on public.dpp_registration_proofs for select to anon using (
  coalesce(visibility_level, 'authority') = 'public'
  and exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'updated', 'expired'))
);

drop policy if exists "Authenticated can manage evidence links" on public.dpp_evidence_links;
create policy "Authenticated can manage evidence links" on public.dpp_evidence_links for all to authenticated using (true) with check (true);
drop policy if exists "Public can read evidence links" on public.dpp_evidence_links;
create policy "Public can read evidence links" on public.dpp_evidence_links for select to anon using (
  coalesce(visibility_level, 'public') = 'public'
  and exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'updated', 'expired'))
);

drop policy if exists "Authenticated can manage audit logs" on public.dpp_audit_logs;
create policy "Authenticated can manage audit logs" on public.dpp_audit_logs for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated can manage blockchain anchors" on public.dpp_blockchain_anchors;
create policy "Authenticated can manage blockchain anchors" on public.dpp_blockchain_anchors for all to authenticated using (true) with check (true);
drop policy if exists "Public can read blockchain anchors" on public.dpp_blockchain_anchors;
create policy "Public can read blockchain anchors" on public.dpp_blockchain_anchors for select to anon using (
  coalesce(visibility_level, 'public') = 'public'
  and exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'updated', 'expired'))
);

insert into public.dpp_category_profiles (
  sector_code, category_code, subcategory_code, profile_key, profile_name, profile_name_zh,
  regulation_basis, schema_version, sort_order, required_modules
)
values
  ('textile', 'apparel', 'garment', 'textile.apparel.garment.v1', 'Textile / Apparel / Garment', '纺织 / 服装 / 成衣', 'ESPR textile product group preparation', 'v1', 10, '["identity","materials","chemical_compliance","traceability","circularity","evidence"]'::jsonb),
  ('textile', 'fabric', 'woven_fabric', 'textile.fabric.woven.v1', 'Textile / Fabric / Woven fabric', '纺织 / 面料 / 梭织面料', 'ESPR textile product group preparation', 'v1', 20, '["identity","materials","chemical_compliance","performance","traceability","evidence"]'::jsonb),
  ('battery', 'ev_battery', 'battery_unit', 'battery.ev.unit.v1', 'Battery / EV battery / Battery unit', '电池 / 电动车电池 / 电池单元', 'EU Battery Regulation battery passport', 'v1', 30, '["identity","performance_durability","carbon_footprint","materials","circularity","due_diligence","conformity"]'::jsonb),
  ('battery', 'lmt_battery', 'battery_unit', 'battery.lmt.unit.v1', 'Battery / LMT battery / Battery unit', '电池 / LMT 电池 / 电池单元', 'BatteryPass-Ready LMT schema and EU Battery Regulation', 'v1', 31, '["identity","performance_durability","carbon_footprint","materials","circularity","due_diligence","conformity"]'::jsonb),
  ('battery', 'industrial_without_bms', 'battery_unit', 'battery.industrial.without_bms.v1', 'Battery / Industrial battery / Without BMS', '电池 / 工业电池 / 无 BMS', 'BatteryPass-Ready Industrial without BMS schema and EU Battery Regulation', 'v1', 32, '["identity","performance_durability","carbon_footprint","materials","circularity","due_diligence","conformity"]'::jsonb),
  ('battery', 'industrial_other_above_2kwh', 'battery_unit', 'battery.industrial.other_above_2kwh.v1', 'Battery / Industrial battery / Other above 2 kWh', '电池 / 工业电池 / 其他 2kWh 以上', 'BatteryPass-Ready Other Industrial above 2kWh schema and EU Battery Regulation', 'v1', 33, '["identity","performance_durability","carbon_footprint","materials","circularity","due_diligence","conformity"]'::jsonb),
  ('battery', 'industrial_stationary_above_2kwh', 'battery_unit', 'battery.industrial.stationary_above_2kwh.v1', 'Battery / Industrial battery / Stationary above 2 kWh', '电池 / 工业电池 / 固定式 2kWh 以上', 'BatteryPass-Ready Stationary Industrial above 2kWh schema and EU Battery Regulation', 'v1', 34, '["identity","performance_durability","carbon_footprint","materials","circularity","due_diligence","conformity"]'::jsonb),
  ('furniture', 'office_furniture', 'office_chair', 'furniture.office.chair.v1', 'Furniture / Office furniture / Office chair', '家具 / 办公家具 / 办公椅', 'ESPR furniture product group preparation', 'v1', 40, '["identity","materials","performance","repair","disassembly","circularity","evidence"]'::jsonb),
  ('construction', 'building_material', 'wpc_decking', 'construction.material.wpc_decking.v1', 'Construction / Building material / WPC decking', '建材 / 建筑材料 / 木塑地板', 'ESPR and construction product documentation readiness', 'v1', 50, '["identity","materials","performance","chemical_compliance","installation","circularity","evidence"]'::jsonb),
  ('consumer_electronics', 'audio_device', 'audio_device', 'consumer_electronics.audio_device.v1', 'Consumer electronics / Audio device', '消费电子 / 音频设备', 'ESPR consumer electronics product group preparation', 'v1', 60, '["identity","materials","battery_readiness","repair","software","circularity","evidence"]'::jsonb)
on conflict (profile_key) do update set
  sector_code = excluded.sector_code,
  category_code = excluded.category_code,
  subcategory_code = excluded.subcategory_code,
  profile_name = excluded.profile_name,
  profile_name_zh = excluded.profile_name_zh,
  regulation_basis = excluded.regulation_basis,
  schema_version = excluded.schema_version,
  sort_order = excluded.sort_order,
  required_modules = excluded.required_modules,
  updated_at = now();

insert into public.dpp_field_templates (
  profile_key, module_key, field_key, field_label, field_label_zh, data_type, unit,
  required, evidence_required, visibility_level, validation_hint, sort_order
)
values
  ('textile.fabric.woven.v1', 'materials', 'fiber_composition', 'Fiber composition', '纤维成分', 'text', null, true, true, 'public', 'Declare material percentages and link supplier or lab evidence.', 10),
  ('textile.fabric.woven.v1', 'chemical_compliance', 'restricted_substance_statement', 'Restricted substance statement', '受限物质声明', 'text', null, true, true, 'public', 'REACH/SVHC/RSL/PFAS statement or test report should be linked.', 20),
  ('textile.fabric.woven.v1', 'performance', 'durability_test_basis', 'Durability test basis', '耐久性测试依据', 'text', null, false, true, 'public', 'Reference abrasion, tensile, colour fastness or customer specification reports.', 30),
  ('textile.apparel.garment.v1', 'materials', 'fiber_composition', 'Fiber composition', '纤维成分', 'text', null, true, true, 'public', 'Declare shell/lining/trims where applicable.', 10),
  ('textile.apparel.garment.v1', 'circularity', 'care_repair_reuse_route', 'Care, repair and reuse route', '护理、维修与再使用路径', 'text', null, true, false, 'public', 'Consumer-facing care and end-of-life route.', 20),
  ('battery.ev.unit.v1', 'identifiers', 'battery_model_identifier', 'Battery model identifier', '电池型号标识', 'text', null, true, false, 'public', 'Battery passport model identifier.', 10),
  ('battery.ev.unit.v1', 'performance_durability', 'rated_capacity', 'Rated capacity', '额定容量', 'number', 'Ah', true, true, 'public', 'Use value plus unit; EV guide example uses Ah.', 20),
  ('battery.ev.unit.v1', 'performance_durability', 'state_of_charge', 'State of charge SoC', '荷电状态 SoC', 'number', '%', false, false, 'public', 'Percentage value.', 30),
  ('battery.ev.unit.v1', 'carbon_footprint', 'carbon_footprint_per_kwh', 'Carbon footprint per functional unit', '单位功能碳足迹', 'number', 'kgCO2-eq/kWh', true, true, 'public', 'Battery carbon footprint per kWh.', 40),
  ('battery.ev.unit.v1', 'materials', 'battery_chemistry', 'Battery chemistry', '电池化学体系', 'text', null, true, false, 'public', 'Example: Li-ion NMC, LFP.', 50),
  ('battery.ev.unit.v1', 'due_diligence', 'due_diligence_report', 'Due diligence report', '供应链尽调报告', 'url', null, true, true, 'authority', 'Reference report URL or URN.', 60),
  ('battery.lmt.unit.v1', 'identifiers', 'battery_model_identifier', 'Battery model identifier', '电池型号标识', 'text', null, true, false, 'public', 'BatteryPass-Ready product category specific identifier.', 10),
  ('battery.lmt.unit.v1', 'performance_durability', 'rated_capacity', 'Rated capacity', '额定容量', 'number', 'Ah', true, true, 'public', 'Use value plus unit.', 20),
  ('battery.lmt.unit.v1', 'performance_durability', 'state_of_charge', 'State of charge SoC', '荷电状态 SoC', 'number', '%', false, false, 'public', 'Percentage value.', 30),
  ('battery.lmt.unit.v1', 'carbon_footprint', 'carbon_footprint_per_kwh', 'Carbon footprint per functional unit', '单位功能碳足迹', 'number', 'kgCO2-eq/kWh', true, true, 'public', 'Battery carbon footprint per kWh.', 40),
  ('battery.lmt.unit.v1', 'materials', 'battery_chemistry', 'Battery chemistry', '电池化学体系', 'text', null, true, false, 'public', 'Example: Li-ion NMC, LFP.', 50),
  ('battery.lmt.unit.v1', 'due_diligence', 'due_diligence_report', 'Due diligence report', '供应链尽调报告', 'url', null, true, true, 'authority', 'Reference report URL or URN.', 60),
  ('battery.industrial.without_bms.v1', 'identifiers', 'battery_model_identifier', 'Battery model identifier', '电池型号标识', 'text', null, true, false, 'public', 'BatteryPass-Ready product category specific identifier.', 10),
  ('battery.industrial.without_bms.v1', 'performance_durability', 'rated_capacity', 'Rated capacity', '额定容量', 'number', 'Ah', true, true, 'public', 'Use value plus unit.', 20),
  ('battery.industrial.without_bms.v1', 'performance_durability', 'state_of_charge', 'State of charge SoC', '荷电状态 SoC', 'number', '%', false, false, 'public', 'Percentage value.', 30),
  ('battery.industrial.without_bms.v1', 'carbon_footprint', 'carbon_footprint_per_kwh', 'Carbon footprint per functional unit', '单位功能碳足迹', 'number', 'kgCO2-eq/kWh', true, true, 'public', 'Battery carbon footprint per kWh.', 40),
  ('battery.industrial.without_bms.v1', 'materials', 'battery_chemistry', 'Battery chemistry', '电池化学体系', 'text', null, true, false, 'public', 'Example: Li-ion NMC, LFP.', 50),
  ('battery.industrial.without_bms.v1', 'due_diligence', 'due_diligence_report', 'Due diligence report', '供应链尽调报告', 'url', null, true, true, 'authority', 'Reference report URL or URN.', 60),
  ('battery.industrial.other_above_2kwh.v1', 'identifiers', 'battery_model_identifier', 'Battery model identifier', '电池型号标识', 'text', null, true, false, 'public', 'BatteryPass-Ready product category specific identifier.', 10),
  ('battery.industrial.other_above_2kwh.v1', 'performance_durability', 'rated_capacity', 'Rated capacity', '额定容量', 'number', 'Ah', true, true, 'public', 'Use value plus unit.', 20),
  ('battery.industrial.other_above_2kwh.v1', 'performance_durability', 'state_of_charge', 'State of charge SoC', '荷电状态 SoC', 'number', '%', false, false, 'public', 'Percentage value.', 30),
  ('battery.industrial.other_above_2kwh.v1', 'carbon_footprint', 'carbon_footprint_per_kwh', 'Carbon footprint per functional unit', '单位功能碳足迹', 'number', 'kgCO2-eq/kWh', true, true, 'public', 'Battery carbon footprint per kWh.', 40),
  ('battery.industrial.other_above_2kwh.v1', 'materials', 'battery_chemistry', 'Battery chemistry', '电池化学体系', 'text', null, true, false, 'public', 'Example: Li-ion NMC, LFP.', 50),
  ('battery.industrial.other_above_2kwh.v1', 'due_diligence', 'due_diligence_report', 'Due diligence report', '供应链尽调报告', 'url', null, true, true, 'authority', 'Reference report URL or URN.', 60),
  ('battery.industrial.stationary_above_2kwh.v1', 'identifiers', 'battery_model_identifier', 'Battery model identifier', '电池型号标识', 'text', null, true, false, 'public', 'BatteryPass-Ready product category specific identifier.', 10),
  ('battery.industrial.stationary_above_2kwh.v1', 'performance_durability', 'rated_capacity', 'Rated capacity', '额定容量', 'number', 'Ah', true, true, 'public', 'Use value plus unit.', 20),
  ('battery.industrial.stationary_above_2kwh.v1', 'performance_durability', 'state_of_charge', 'State of charge SoC', '荷电状态 SoC', 'number', '%', false, false, 'public', 'Percentage value.', 30),
  ('battery.industrial.stationary_above_2kwh.v1', 'carbon_footprint', 'carbon_footprint_per_kwh', 'Carbon footprint per functional unit', '单位功能碳足迹', 'number', 'kgCO2-eq/kWh', true, true, 'public', 'Battery carbon footprint per kWh.', 40),
  ('battery.industrial.stationary_above_2kwh.v1', 'materials', 'battery_chemistry', 'Battery chemistry', '电池化学体系', 'text', null, true, false, 'public', 'Example: Li-ion NMC, LFP.', 50),
  ('battery.industrial.stationary_above_2kwh.v1', 'due_diligence', 'due_diligence_report', 'Due diligence report', '供应链尽调报告', 'url', null, true, true, 'authority', 'Reference report URL or URN.', 60),
  ('furniture.office.chair.v1', 'performance', 'durability_test', 'Durability test', '耐久性测试', 'text', null, true, true, 'public', 'Reference seating durability and stability reports.', 10),
  ('furniture.office.chair.v1', 'repair', 'replaceable_parts', 'Replaceable parts', '可替换部件', 'text', null, true, false, 'public', 'List casters, gas lift, armrests, cushion or other service parts.', 20),
  ('construction.material.wpc_decking.v1', 'performance', 'declaration_of_performance', 'Declaration of performance', '性能声明', 'url', null, true, true, 'public', 'Reference DoP or performance report.', 10),
  ('construction.material.wpc_decking.v1', 'chemical_compliance', 'voc_or_reach_evidence', 'VOC / REACH evidence', 'VOC / REACH 证据', 'url', null, true, true, 'public', 'Reference VOC, formaldehyde, REACH or SVHC evidence.', 20),
  ('consumer_electronics.audio_device.v1', 'battery_readiness', 'battery_safety_document', 'Battery safety document', '电池安全文件', 'url', null, false, true, 'public', 'Reference MSDS, UN38.3 or battery handling evidence.', 10),
  ('consumer_electronics.audio_device.v1', 'software', 'firmware_security_update_policy', 'Firmware security update policy', '固件安全更新政策', 'text', null, false, false, 'public', 'Reserve field for connected electronics.', 20)
on conflict (profile_key, field_key) do update set
  module_key = excluded.module_key,
  field_label = excluded.field_label,
  field_label_zh = excluded.field_label_zh,
  data_type = excluded.data_type,
  unit = excluded.unit,
  required = excluded.required,
  evidence_required = excluded.evidence_required,
  visibility_level = excluded.visibility_level,
  validation_hint = excluded.validation_hint,
  sort_order = excluded.sort_order;

insert into public.products (
  name, name_zh, sku, brand, category, subcategory, sector_code, category_code, subcategory_code, dpp_profile_key, season, description, description_zh,
  status, dpp_id, public_slug, main_image, care_instructions, care_instructions_zh,
  repair_instructions, repair_instructions_zh, end_of_life_instructions, end_of_life_instructions_zh
)
values (
  'Organic Cotton T-Shirt',
  '有机棉基础 T 恤',
  'GL-TSHIRT-001',
  'greanlean',
  'Textile & Apparel',
  'T-Shirt',
  'textile',
  'apparel',
  'garment',
  'textile.apparel.garment.v1',
  '2026 Core Collection',
  'A demo digital product passport for sustainable apparel, covering identity, materials, production traceability, ESG metrics, certificates and consumer transparency.',
  '用于展示欧盟 DPP 数据结构的可持续服装样品，覆盖产品身份、材料来源、生产追溯、ESG、证书和消费者透明化信息。',
  'published',
  'DPP-DEMO-001',
  'demo-organic-cotton-tshirt',
  '/images/demo-organic-cotton-tshirt.png',
  'Machine wash cold with similar colors. Do not bleach. Line dry where possible to reduce energy use.',
  '建议冷水机洗并与相近颜色衣物同洗。不可漂白，优先自然晾干以减少能源消耗。',
  'Minor seam damage can be repaired with standard cotton thread. Keep spare buttons and repair before disposal.',
  '轻微线缝破损可使用普通棉线修补。建议保留备用纽扣，报废前优先维修。',
  'Reuse, donate or return through textile take-back channels. Remove non-textile trims before recycling where required.',
  '建议优先再使用、捐赠或通过纺织品回收渠道回收。必要时在回收前移除非纺织辅料。'
)
on conflict (public_slug) do update set
  name = excluded.name,
  name_zh = excluded.name_zh,
  sku = excluded.sku,
  brand = excluded.brand,
  category = excluded.category,
  subcategory = excluded.subcategory,
  sector_code = excluded.sector_code,
  category_code = excluded.category_code,
  subcategory_code = excluded.subcategory_code,
  dpp_profile_key = excluded.dpp_profile_key,
  season = excluded.season,
  description = excluded.description,
  description_zh = excluded.description_zh,
  status = excluded.status,
  dpp_id = excluded.dpp_id,
  main_image = excluded.main_image,
  care_instructions = excluded.care_instructions,
  care_instructions_zh = excluded.care_instructions_zh,
  repair_instructions = excluded.repair_instructions,
  repair_instructions_zh = excluded.repair_instructions_zh,
  end_of_life_instructions = excluded.end_of_life_instructions,
  end_of_life_instructions_zh = excluded.end_of_life_instructions_zh,
  updated_at = now();

do $$
declare
  demo_product_id uuid;
begin
  select id into demo_product_id
  from public.products
  where public_slug = 'demo-organic-cotton-tshirt';

  delete from public.product_materials where product_id = demo_product_id;
  delete from public.product_bom where product_id = demo_product_id;
  delete from public.product_esg_metrics where product_id = demo_product_id;
  delete from public.product_certificates where product_id = demo_product_id;
  delete from public.product_traceability where product_id = demo_product_id;
  delete from public.product_circularity where product_id = demo_product_id;
  delete from public.product_consumer_transparency where product_id = demo_product_id;
  delete from public.product_digital_identity where product_id = demo_product_id;
  delete from public.product_documents where product_id = demo_product_id;
  delete from public.product_data_governance where product_id = demo_product_id;

  insert into public.product_materials (
    product_id, material_name, material_name_zh, material_type, material_type_zh,
    percentage, recycled_content, origin_country, chemical_info, chemical_info_zh,
    recyclability, recyclability_zh, certification
  )
  values
    (
      demo_product_id,
      'Organic cotton',
      '有机棉',
      'Fiber',
      '纤维',
      95,
      0,
      'China',
      'Low-impact reactive dyeing; restricted substances screened against OEKO-TEX requirements.',
      '采用低影响活性染色，并按 OEKO-TEX 要求筛查受限物质。',
      'Recyclable through cotton textile recycling streams',
      '可进入棉纺织品回收体系',
      'GOTS / OEKO-TEX'
    ),
    (
      demo_product_id,
      'Recycled polyester sewing thread',
      '再生涤纶缝纫线',
      'Trim',
      '辅料',
      5,
      80,
      'China',
      'Dope-dyed thread to reduce dyeing water use.',
      '原液着色缝纫线，减少染色用水。',
      'Separable during textile recycling when required',
      '必要时可在纺织品回收过程中分离',
      'GRS'
    );

  insert into public.product_bom (
    product_id, component_name, component_name_zh, component_type, component_type_zh,
    quantity, unit, position
  )
  values
    (demo_product_id, 'Main body fabric', '主身面料', 'Fabric', '面料', 180, 'g', 'Body'),
    (demo_product_id, 'Neck label', '领标', 'Label', '标签', 1, 'pc', 'Inside neck');

  insert into public.product_traceability (
    product_id, event_type, event_name, event_name_zh, event_date, country, city,
    facility_name, facility_name_zh, transport_method, verification_status, notes, notes_zh
  )
  values
    (
      demo_product_id,
      'material sourcing',
      'Organic cotton yarn sourced',
      '采购有机棉纱线',
      '2026-03-18'::timestamp,
      'China',
      'Aksu',
      'Demo Organic Cotton Cooperative',
      '示例有机棉合作社',
      'Truck',
      'verified',
      'Supplier declaration and scope certificate checked.',
      '已核查供应商声明和范围证书。'
    ),
    (
      demo_product_id,
      'manufacturing',
      'Knitting, cutting and sewing',
      '织造、裁剪与缝制',
      '2026-04-22'::timestamp,
      'China',
      'Ningbo',
      'Demo Garment Factory',
      '示例服装工厂',
      'Internal transfer',
      'verified',
      'Production batch record linked to SKU GL-TSHIRT-001.',
      '生产批次记录已关联 SKU GL-TSHIRT-001。'
    ),
    (
      demo_product_id,
      'transport',
      'Export shipment to EU warehouse',
      '出口运输至欧盟仓库',
      '2026-05-06'::timestamp,
      'Germany',
      'Hamburg',
      'Demo EU Distribution Warehouse',
      '示例欧盟分拨仓',
      'Sea freight + rail',
      'pending',
      'Shipment data reserved for carrier API connection.',
      '运输数据预留给后续承运商 API 对接。'
    );

  insert into public.product_esg_metrics (
    product_id, carbon_footprint, water_usage, energy_consumption, waste_generation,
    recycled_content, chemical_management, lca_report_url, methodology, verified_by
  )
  values (
    demo_product_id,
    3.2,
    118,
    8.4,
    0.38,
    4,
    'Restricted substance list and supplier declarations reviewed.',
    '/api/dpp-export?format=pdf&product=DPP-DEMO-001',
    'Internal screening LCA based on factory energy, material composition and logistics assumptions.',
    'greanlean review'
  );

  insert into public.product_circularity (
    product_id, repairability_score, recyclability_score, take_back_program,
    resale_supported, remanufacturing_supported, disassembly_guide,
    recycling_instructions, end_of_life_info
  )
  values (
    demo_product_id,
    72,
    81,
    'Eligible for brand textile take-back and resale screening.',
    true,
    false,
    'Remove neck label and trims if required by recycler.',
    'Sort as cotton-rich textile waste.',
    'Designed for reuse first, then textile recycling.'
  );

  insert into public.product_certificates (
    product_id, certificate_name, certificate_name_zh, certificate_type, certificate_type_zh,
    certificate_number, issuer, issue_date, expiry_date, certificate_url, verification_status
  )
  values
    (
      demo_product_id,
      'GOTS Scope Certificate',
      'GOTS 范围证书',
      'Material',
      '材料认证',
      'GOTS-DEMO-2026-001',
      'Demo Certification Body',
      '2026-01-15'::date,
      '2027-01-14'::date,
      '/api/chemical-document?type=svhc&product=DPP-DEMO-001',
      'verified'
    ),
    (
      demo_product_id,
      'OEKO-TEX Standard 100',
      'OEKO-TEX Standard 100',
      'Chemical safety',
      '化学安全',
      'OEKO-DEMO-2026-018',
      'Demo Textile Testing Institute',
      '2026-02-01'::date,
      '2027-01-31'::date,
      '/api/chemical-document?type=heavy-metals&product=DPP-DEMO-001',
      'verified'
    );

  insert into public.product_consumer_transparency (
    product_id, brand_story, brand_story_zh, sustainability_story, sustainability_story_zh,
    consumer_notice, consumer_notice_zh, packaging_info
  )
  values (
    demo_product_id,
    'This product demonstrates how apparel data can be turned into a consumer-readable digital passport.',
    '该产品用于展示如何把服装数据转化为消费者可读的数字产品护照。',
    'Organic cotton, lower-impact dyeing and documented supplier traceability are recorded in this DPP.',
    '本 DPP 记录有机棉、低影响染色和供应商追溯信息。',
    'Color may vary slightly by batch. Scan this page again before resale or recycling for updated product information.',
    '不同批次颜色可能略有差异。转售或回收前可再次扫码查看更新后的产品信息。',
    'Recycled paper hangtag and recyclable polybag where local infrastructure accepts it.'
  );

  insert into public.product_digital_identity (
    product_id, product_uuid, gtin, style_id, batch_id, serial_id,
    digital_link_url, qr_code_id, nfc_id, rfid_epc
  )
  values (
    demo_product_id,
    '7b78c8c6-8f0d-4e0e-a9f6-demo000001',
    '06900000000012',
    'STYLE-TEE-ORG-001',
    'BATCH-2026-001',
    'DEMO-TEE-0001',
    'https://www.greanlean.com/01/06900000000012/10/BATCH-2026-001/21/DEMO-TEE-0001',
    'QR-DPP-DEMO-001',
    'NFC-RESERVED',
    'RFID-RESERVED'
  );

  insert into public.product_documents (
    product_id, document_name, document_type, file_url, file_size, language, uploaded_by, version
  )
  values (
    demo_product_id,
    'Demo LCA Summary',
    'LCA',
    '/api/dpp-export?format=pdf&product=DPP-DEMO-001',
    '420 KB',
    'EN / ZH',
    'greanlean admin',
    'v1.0'
  );

  insert into public.product_data_governance (
    product_id, data_source, data_owner, audit_status, data_quality_score
  )
  values (
    demo_product_id,
    'Supplier declarations, certificates, factory batch records and logistics documents.',
    'greanlean admin',
    'Internal review completed',
    86
  );
end $$;
