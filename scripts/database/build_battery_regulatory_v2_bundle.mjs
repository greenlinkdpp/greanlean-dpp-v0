import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const catalogPath = resolve(root, "config/battery/eu-battery-passport-datapoints-v2.0.json");
const legacyPath = resolve(root, "config/battery/battery-pass-ready-longlist-v1.3.json");
const catalogText = await readFile(catalogPath, "utf8");
const catalog = JSON.parse(catalogText);
const legacy = JSON.parse(await readFile(legacyPath, "utf8"));
const checksum = createHash("sha256").update(catalogText).digest("hex");
const legacyCodes = new Set(legacy.fields.map((field) => field.fieldCode));
const extensionFields = catalog.fields.filter((field, index, fields) =>
  !legacyCodes.has(field.canonicalFieldCode)
  && fields.findIndex((candidate) => candidate.canonicalFieldCode === field.canonicalFieldCode) === index,
);

function sql(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  return `'${String(value).replaceAll("'", "''")}'`;
}

function accessLevel(access) {
  return access === "professional" ? "LEGITIMATE_INTEREST" : access === "regulator" ? "AUTHORITY_ONLY" : "PUBLIC";
}

function granularity(level) {
  return level === "batch" ? "BATCH" : level === "individual" || level === "lifecycle" ? "ITEM" : "MODEL";
}

function csv(value) {
  const text = value === null || value === undefined
    ? ""
    : Array.isArray(value) ? value.join("|") : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

const mappingHeaders = [
  "data_point_number", "data_point_code", "name_en", "name_zh", "legal_source",
  "ev_status", "lmt_status", "industrial_status", "chapter", "data_level",
  "data_type", "unit", "access", "dynamic", "canonical_field_code",
  "legacy_field_codes", "mapping_quality", "field_origin", "evidence_required",
  "expert_review_status", "expert_review_note", "source_note",
];
const mappingCsv = [
  mappingHeaders.map(csv).join(","),
  ...catalog.fields.map((field) => [
    field.number, field.id, field.nameEn, field.nameZh, field.legalSource,
    field.status.ev, field.status.lmt, field.status.industrial, field.chapter,
    field.dataLevel, field.dataType, field.unit, field.access, field.dynamic,
    field.canonicalFieldCode, field.legacyFieldCodes, field.mappingQuality,
    field.fieldOrigin, field.evidenceRequired, field.expertReviewStatus,
    field.expertReviewNote, field.sourceNote,
  ].map(csv).join(",")),
].join("\n") + "\n";

const dataPointRows = catalog.fields.map((field) => `  (${[
  sql(catalog.catalogVersion), field.number, sql(field.id), sql(field.nameEn), sql(field.nameZh),
  sql(field.legalSource), sql(field.chapter), sql(field.sourceNote), sql(field.dataLevel),
  sql(field.dataType), sql(field.unit), sql(field.access), field.dynamic, sql(field.canonicalFieldCode),
  `${sql(JSON.stringify(field.legacyFieldCodes))}::jsonb`, sql(field.mappingQuality), sql(field.fieldOrigin), field.evidenceRequired,
  sql(field.expertReviewStatus), sql(field.expertReviewNote), field.number * 10,
].join(", ")})`).join(",\n");

const applicabilityRows = catalog.fields.flatMap((field) => ["ev", "lmt", "industrial"].map((category) =>
  `  (${sql(catalog.catalogVersion)}, ${field.number}, ${sql(category)}, ${sql(field.status[category])}, ${sql(field.sourceNote)})`,
)).join(",\n");

const fieldDefinitionRows = extensionFields.map((field) => `  (${sql(field.canonicalFieldCode)}, ${sql(field.nameEn)}, ${sql(field.nameZh)}, ${sql(field.sourceNote)}, ${sql(field.dataType)}, ${sql(field.unit)}, ${sql(field.dynamic ? "DYNAMIC" : "STATIC")}, ${sql(granularity(field.dataLevel))}, ${sql(accessLevel(field.access))}, ${sql(JSON.stringify({ required: field.evidenceRequired, dataPoint: field.id, legalSource: field.legalSource }))}::jsonb, ${field.number * 10})`).join(",\n");

const migration = `begin;
-- Generated from config/battery/eu-battery-passport-datapoints-v2.0.json.
-- Source: Digital Batteries Passport - data points by category, v2.0, 15 August 2026.

do $$
begin
  if to_regclass('public.battery_field_value') is null
    or to_regclass('public.schema_definition') is null
    or to_regclass('public.field_definition') is null
    or to_regclass('public.dpp_field_evidence_link') is null
  then
    raise exception '0026 requires schema, battery-domain and evidence migrations';
  end if;
end;
$$;

create table if not exists public.battery_regulatory_catalog (
  version text primary key,
  source_name text not null,
  source_version text not null,
  source_date date not null,
  regulation text not null,
  checksum_sha256 text not null,
  disclaimer_en text not null,
  disclaimer_zh text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  constraint battery_regulatory_catalog_checksum_check check (checksum_sha256 ~ '^[a-f0-9]{64}$')
);

create table if not exists public.battery_regulatory_data_point (
  id uuid primary key default gen_random_uuid(),
  catalog_version text not null references public.battery_regulatory_catalog(version) on delete restrict,
  data_point_number integer not null check (data_point_number between 1 and 71),
  data_point_code text not null,
  name_en text not null,
  name_zh text not null,
  legal_source text not null,
  chapter_code text not null,
  source_note text not null,
  data_level text not null check (data_level in ('model','batch','individual','lifecycle')),
  data_type text not null check (data_type in ('string','integer','decimal','boolean','date','datetime','uri','object','array')),
  unit_code text,
  access_class text not null check (access_class in ('public','professional','regulator')),
  is_dynamic boolean not null,
  canonical_field_code text not null,
  legacy_field_codes jsonb not null default '[]'::jsonb check (jsonb_typeof(legacy_field_codes) = 'array'),
  mapping_quality text not null check (mapping_quality in ('A','B','C','D','E')),
  field_origin text not null,
  evidence_required boolean not null default false,
  default_expert_review_status text not null check (default_expert_review_status in ('not_required','pending','confirmed','questioned')),
  default_expert_review_note text,
  sort_order integer not null,
  unique (catalog_version, data_point_number),
  unique (catalog_version, data_point_code)
);

create table if not exists public.battery_regulatory_applicability (
  id uuid primary key default gen_random_uuid(),
  catalog_version text not null,
  data_point_number integer not null,
  battery_category text not null check (battery_category in ('ev','lmt','industrial')),
  requirement_status text not null check (requirement_status in ('mandatory','conditional','optional','future','duplicate','not_applicable')),
  source_note text not null,
  unique (catalog_version, data_point_number, battery_category),
  foreign key (catalog_version, data_point_number)
    references public.battery_regulatory_data_point(catalog_version, data_point_number) on delete restrict
);

alter table public.battery_field_value
  add column if not exists data_status text not null default 'declared',
  add column if not exists expert_review_status text not null default 'pending',
  add column if not exists expert_review_note text,
  add column if not exists field_origin text not null default 'batterypass_ready_v1_3';

alter table public.battery_field_value
  drop constraint if exists battery_field_data_status_check,
  add constraint battery_field_data_status_check check (data_status in ('missing','pending','declared','verified','not_applicable')),
  drop constraint if exists battery_field_expert_review_check,
  add constraint battery_field_expert_review_check check (expert_review_status in ('not_required','pending','confirmed','questioned')),
  drop constraint if exists battery_field_origin_check,
  add constraint battery_field_origin_check check (field_origin in ('eu_guidance_v2','batterypass_ready_v1_3','greanlean_extension','legacy'));

insert into public.battery_regulatory_catalog (
  version, source_name, source_version, source_date, regulation, checksum_sha256,
  disclaimer_en, disclaimer_zh, is_active
) values (
  ${sql(catalog.catalogVersion)}, ${sql(catalog.sourceName)}, ${sql(catalog.sourceVersion)},
  ${sql(catalog.sourceDate)}::date, ${sql(catalog.regulation)}, ${sql(checksum)},
  ${sql(catalog.disclaimerEn)}, ${sql(catalog.disclaimerZh)}, true
)
on conflict (version) do update set
  checksum_sha256 = excluded.checksum_sha256,
  disclaimer_en = excluded.disclaimer_en,
  disclaimer_zh = excluded.disclaimer_zh,
  is_active = true;

update public.battery_regulatory_catalog set is_active = false where version <> ${sql(catalog.catalogVersion)};

insert into public.battery_regulatory_data_point (
  catalog_version, data_point_number, data_point_code, name_en, name_zh, legal_source,
  chapter_code, source_note, data_level, data_type, unit_code, access_class, is_dynamic,
  canonical_field_code, legacy_field_codes, mapping_quality, field_origin, evidence_required,
  default_expert_review_status, default_expert_review_note, sort_order
) values
${dataPointRows}
on conflict (catalog_version, data_point_number) do update set
  data_point_code = excluded.data_point_code,
  name_en = excluded.name_en,
  name_zh = excluded.name_zh,
  legal_source = excluded.legal_source,
  chapter_code = excluded.chapter_code,
  source_note = excluded.source_note,
  data_level = excluded.data_level,
  data_type = excluded.data_type,
  unit_code = excluded.unit_code,
  access_class = excluded.access_class,
  is_dynamic = excluded.is_dynamic,
  canonical_field_code = excluded.canonical_field_code,
  legacy_field_codes = excluded.legacy_field_codes,
  mapping_quality = excluded.mapping_quality,
  field_origin = excluded.field_origin,
  evidence_required = excluded.evidence_required,
  default_expert_review_status = excluded.default_expert_review_status,
  default_expert_review_note = excluded.default_expert_review_note,
  sort_order = excluded.sort_order;

insert into public.battery_regulatory_applicability (
  catalog_version, data_point_number, battery_category, requirement_status, source_note
) values
${applicabilityRows}
on conflict (catalog_version, data_point_number, battery_category) do update set
  requirement_status = excluded.requirement_status,
  source_note = excluded.source_note;

insert into public.schema_definition (
  code, sector_code, legal_category_code, source_name, name_en, name_zh,
  description_en, description_zh, status
) values (
  'battery.eu_guidance', 'battery', null, ${sql(catalog.sourceName)},
  'EU battery-passport guidance extensions', '欧盟电池护照指南扩展字段',
  'Storage definitions for v2.0 data points not present in the BatteryPass-Ready adapter.',
  '保存 BatteryPass-Ready 适配器中不存在的 v2.0 数据点；法规状态由独立适用性表维护。', 'active'
)
on conflict (code) do nothing;

insert into public.schema_version (
  schema_definition_id, version, source_version, json_schema, checksum_sha256,
  effective_from, status, created_by
)
select id, ${sql(catalog.catalogVersion)}, ${sql(catalog.sourceVersion)},
  jsonb_build_object('$schema','https://json-schema.org/draft/2020-12/schema','title',${sql(catalog.sourceName)}),
  ${sql(checksum)}, ${sql(catalog.sourceDate)}::date, 'draft', 'migration-0026'
from public.schema_definition where code = 'battery.eu_guidance'
on conflict (schema_definition_id, version) do nothing;

with sv as (
  select version.id, version.status
  from public.schema_version version
  join public.schema_definition definition on definition.id = version.schema_definition_id
  where definition.code = 'battery.eu_guidance' and version.version = ${sql(catalog.catalogVersion)}
)
insert into public.field_definition (
  schema_version_id, field_code, label_en, label_zh, description_en, data_type,
  unit_code, data_behavior, data_granularity, access_level_code,
  requirement_status, evidence_requirement, sort_order
)
select sv.id, rows.field_code, rows.label_en, rows.label_zh,
  rows.description_en, rows.data_type, rows.unit_code, rows.data_behavior,
  rows.data_granularity, rows.access_level_code, 'TBD', rows.evidence_requirement, rows.sort_order
from (values
${fieldDefinitionRows}
) as rows(field_code, label_en, label_zh, description_en, data_type, unit_code, data_behavior, data_granularity, access_level_code, evidence_requirement, sort_order)
cross join sv
where sv.status = 'draft'
on conflict (schema_version_id, field_code) do nothing;

update public.schema_version version
set status = 'published', published_at = coalesce(published_at, now())
from public.schema_definition definition
where definition.id = version.schema_definition_id
  and definition.code = 'battery.eu_guidance'
  and version.version = ${sql(catalog.catalogVersion)}
  and version.status = 'draft';

update public.battery_field_value value
set data_status = case when value.verification_status = 'verified' then 'verified' else 'declared' end,
    field_origin = case when value.field_origin = 'legacy' then 'legacy' else 'batterypass_ready_v1_3' end
where value.data_status in ('missing','pending','declared','verified');

update public.battery_model_profile profile
set legal_category_code = 'industrial', stationary = true
from public.products product
where product.id = profile.product_id
  and product.dpp_id = 'DPP-GV-ESS-14K3-000001';

update public.battery_field_value value
set verification_status = 'unverified',
    data_status = 'declared',
    expert_review_status = 'pending',
    evidence_status = case when value.evidence_status = 'verified' then 'missing' else value.evidence_status end
from public.products product, public.field_definition field
where product.id = value.product_id
  and field.id = value.field_definition_id
  and product.dpp_id = 'DPP-GV-ESS-14K3-000001'
  and not exists (
    select 1 from public.dpp_field_evidence_link link
    where link.product_id = product.id and link.field_code = field.field_code
  );

alter table public.battery_regulatory_catalog enable row level security;
alter table public.battery_regulatory_data_point enable row level security;
alter table public.battery_regulatory_applicability enable row level security;
revoke all on public.battery_regulatory_catalog, public.battery_regulatory_data_point,
  public.battery_regulatory_applicability from anon, authenticated;
grant select on public.battery_regulatory_catalog, public.battery_regulatory_data_point,
  public.battery_regulatory_applicability to anon, authenticated;

drop policy if exists "Public reads active battery regulatory catalogs" on public.battery_regulatory_catalog;
create policy "Public reads active battery regulatory catalogs" on public.battery_regulatory_catalog
  for select to anon, authenticated using (is_active);
drop policy if exists "Public reads active battery data points" on public.battery_regulatory_data_point;
create policy "Public reads active battery data points" on public.battery_regulatory_data_point
  for select to anon, authenticated using (exists (
    select 1 from public.battery_regulatory_catalog catalog
    where catalog.version = catalog_version and catalog.is_active
  ));
drop policy if exists "Public reads active battery applicability" on public.battery_regulatory_applicability;
create policy "Public reads active battery applicability" on public.battery_regulatory_applicability
  for select to anon, authenticated using (exists (
    select 1 from public.battery_regulatory_catalog catalog
    where catalog.version = catalog_version and catalog.is_active
  ));

insert into public.greanlean_migration_ledger (
  migration_number, migration_name, checksum_sha256, environment, applied_by, result, notes
) values (
  '0026', 'battery_regulatory_datapoints_v2', ${sql(checksum)}, 'supabase', current_user, 'applied',
  'Installs the 71-point category-specific battery passport catalog and value provenance metadata.'
)
on conflict (migration_number) do update set
  checksum_sha256 = excluded.checksum_sha256,
  applied_by = excluded.applied_by,
  applied_at = now(),
  result = 'applied',
  notes = excluded.notes;

commit;
`;

const verify = `-- Verify migration 0026. Every returned value must be true.
select
  (select count(*) = 71 from public.battery_regulatory_data_point where catalog_version = ${sql(catalog.catalogVersion)}) as data_points_passed,
  (select count(*) = 213 from public.battery_regulatory_applicability where catalog_version = ${sql(catalog.catalogVersion)}) as category_statuses_passed,
  (select count(*) = 1 from public.battery_regulatory_catalog where version = ${sql(catalog.catalogVersion)} and is_active) as active_catalog_passed,
  (select count(*) = 10 from (select distinct chapter_code from public.battery_regulatory_data_point where catalog_version = ${sql(catalog.catalogVersion)}) chapters) as chapters_passed,
  (select count(*) = 71 from public.battery_regulatory_applicability where catalog_version = ${sql(catalog.catalogVersion)} and battery_category = 'industrial') as industrial_scope_passed,
  (select count(*) = ${extensionFields.length} from public.field_definition field join public.schema_version version on version.id = field.schema_version_id join public.schema_definition definition on definition.id = version.schema_definition_id where definition.code = 'battery.eu_guidance' and version.version = ${sql(catalog.catalogVersion)}) as extension_fields_passed,
  exists (select 1 from information_schema.columns where table_schema='public' and table_name='battery_field_value' and column_name='data_status') as data_status_passed,
  exists (select 1 from information_schema.columns where table_schema='public' and table_name='battery_field_value' and column_name='expert_review_status') as expert_review_passed,
  not exists (
    select 1 from public.battery_field_value value
    join public.products product on product.id = value.product_id
    join public.field_definition field on field.id = value.field_definition_id
    where product.dpp_id = 'DPP-GV-ESS-14K3-000001'
      and value.verification_status = 'verified'
      and not exists (select 1 from public.dpp_field_evidence_link link where link.product_id = product.id and link.field_code = field.field_code)
  ) as greenvault_unverified_without_evidence_passed,
  exists (
    select 1 from public.battery_model_profile profile
    join public.products product on product.id = profile.product_id
    where product.dpp_id = 'DPP-GV-ESS-14K3-000001'
      and profile.legal_category_code = 'industrial'
  ) as greenvault_industrial_classification_passed;
`;

const rollback = `-- Non-destructive rollback for migration 0026.
-- The catalog is deactivated, while captured values and audit-relevant metadata are retained.
begin;
update public.battery_regulatory_catalog set is_active = false where version = ${sql(catalog.catalogVersion)};
update public.greanlean_migration_ledger set result = 'rolled_back', applied_at = now(), notes = 'Soft rollback: v2.0 catalog deactivated; data retained.' where migration_number = '0026';
commit;
`;

const outputs = [
  ["supabase/migrations/0026_battery_regulatory_datapoints_v2.sql", migration],
  ["supabase/rollbacks/0026_battery_regulatory_datapoints_v2.down.sql", rollback],
  ["supabase/bundles/battery_regulatory_v2_install.sql", `-- Generated bundle. Do not edit directly.\n${migration}`],
  ["supabase/bundles/battery_regulatory_v2_verify.sql", `-- Generated bundle. Do not edit directly.\n${verify}`],
  ["supabase/bundles/battery_regulatory_v2_rollback.sql", `-- Generated bundle. Do not edit directly.\n${rollback}`],
  ["docs/generated/BATTERY_REGULATORY_V2_MAPPING.csv", mappingCsv],
];

for (const [path, body] of outputs) await writeFile(resolve(root, path), body);
console.log(`Generated migration 0026 with ${catalog.fields.length} data points, ${catalog.fields.length * 3} applicability rows and ${extensionFields.length} extension fields.`);
