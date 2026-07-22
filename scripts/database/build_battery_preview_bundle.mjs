import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const outputDirectory = path.join(root, "supabase/bundles");
const migrations = [
  "0001_project_migration_ledger.sql",
  "0006_schema_registry.sql",
  "0007_field_definitions_and_rules.sql",
  "0009_battery_domain.sql",
  "0010_battery_dynamic_metrics.sql",
];
const rollbacks = [
  "0010_battery_dynamic_metrics.down.sql",
  "0009_battery_domain.down.sql",
  "0007_field_definitions_and_rules.down.sql",
  "0006_schema_registry.down.sql",
  "0001_project_migration_ledger.down.sql",
];

function checksum(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function compose(directory, files, header) {
  const sections = [];
  for (const file of files) {
    const source = await readFile(path.join(root, directory, file), "utf8");
    sections.push([
      `-- ============================================================================`,
      `-- SOURCE: ${directory}/${file}`,
      `-- SHA256: ${checksum(source)}`,
      `-- ============================================================================`,
      source.trim(),
    ].join("\n"));
  }
  return `${header.trim()}\n\n${sections.join("\n\n")}\n`;
}

const installHeader = `
-- GREANLEAN BATTERY DPP PREVIEW INSTALL BUNDLE
-- Generated file. Do not edit this bundle manually.
-- Target: a disposable Supabase Preview/Test project with the legacy products
-- and product_documents tables already installed.
-- Run the entire file in Supabase SQL Editor. Each source migration keeps its
-- own transaction boundary. Do not enable the application feature flag until
-- battery_dpp_preview_verify.sql reports every check as passed.
`;

const rollbackHeader = `
-- GREANLEAN BATTERY DPP PREVIEW ROLLBACK BUNDLE
-- DESTRUCTIVE: use only on a disposable Preview/Test database that has not
-- accepted business data. Once battery data exists, disable the application
-- feature flag and use a forward repair instead of running this file.
`;

const verifySql = `
-- GREANLEAN BATTERY DPP PREVIEW VERIFICATION
-- Read-only checks. Every row must return passed = true before the feature flag
-- is enabled. Registry readiness here does not mean EU Registry registration.

with checks(check_name, expected, actual) as (
  select 'migration ledger table', 1::bigint,
    (select count(*) from unnest(array[to_regclass('public.greanlean_migration_ledger')]) item where item is not null)
  union all
  select 'access levels', 4::bigint,
    (select count(*) from public.access_level where code in ('PUBLIC', 'LEGITIMATE_INTEREST', 'AUTHORITY_ONLY', 'INTERNAL'))
  union all
  select 'published BatteryPass longlist versions', 1::bigint,
    (select count(*) from public.schema_version sv join public.schema_definition sd on sd.id = sv.schema_definition_id where sd.code = 'battery.longlist' and sv.version = '1.3.0' and sv.status = 'published')
  union all
  select 'BatteryPass longlist fields', 100::bigint,
    (select count(*) from public.field_definition fd join public.schema_version sv on sv.id = fd.schema_version_id join public.schema_definition sd on sd.id = sv.schema_definition_id where sd.code = 'battery.longlist' and sv.version = '1.3.0')
  union all
  select 'static battery fields', 78::bigint,
    (select count(*) from public.field_definition fd join public.schema_version sv on sv.id = fd.schema_version_id join public.schema_definition sd on sd.id = sv.schema_definition_id where sd.code = 'battery.longlist' and sv.version = '1.3.0' and fd.data_behavior = 'STATIC')
  union all
  select 'dynamic battery fields', 22::bigint,
    (select count(*) from public.field_definition fd join public.schema_version sv on sv.id = fd.schema_version_id join public.schema_definition sd on sd.id = sv.schema_definition_id where sd.code = 'battery.longlist' and sv.version = '1.3.0' and fd.data_behavior = 'DYNAMIC')
  union all
  select 'battery validation rules', 100::bigint,
    (select count(*) from public.validation_rule vr join public.schema_version sv on sv.id = vr.schema_version_id join public.schema_definition sd on sd.id = sv.schema_definition_id where sd.code = 'battery.longlist' and sv.version = '1.3.0')
  union all
  select 'battery applicability rules', 800::bigint,
    (select count(*) from public.applicability_rule ar join public.schema_version sv on sv.id = ar.schema_version_id join public.schema_definition sd on sd.id = sv.schema_definition_id where sd.code = 'battery.longlist' and sv.version = '1.3.0')
  union all
  select 'imported validation Schema versions', 5::bigint,
    (select count(*) from public.schema_version sv join public.schema_definition sd on sd.id = sv.schema_definition_id where sd.code in ('battery.ev', 'battery.lmt', 'battery.industrial.without_bms', 'battery.industrial.non_stationary', 'battery.industrial.stationary') and sv.version = '1.0.0' and sv.status = 'published')
  union all
  select 'battery Schema profiles', 8::bigint,
    (select count(*) from public.battery_schema_profile where code like 'battery.%')
  union all
  select 'battery metric types', 23::bigint,
    (select count(*) from public.battery_metric_type where status = 'active')
  union all
  select 'battery domain tables with RLS', 13::bigint,
    (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname in ('battery_schema_profile', 'battery_model_profile', 'battery_batch', 'battery_item', 'battery_field_value', 'battery_material_composition', 'battery_sustainability_data', 'battery_performance_spec', 'battery_compliance_document', 'battery_disassembly_information', 'battery_lifecycle_event', 'battery_metric_type', 'battery_operating_metric') and c.relrowsecurity)
  union all
  select 'append-only history triggers', 2::bigint,
    (select count(*) from pg_trigger where not tgisinternal and tgname in ('battery_lifecycle_event_append_only', 'battery_operating_metric_append_only'))
  union all
  select 'authenticated battery write policies', 0::bigint,
    (select count(*) from pg_policies where schemaname = 'public' and tablename like 'battery_%' and cmd <> 'SELECT' and 'authenticated' = any(roles))
)
select check_name, expected, actual, actual = expected as passed
from checks
order by passed, check_name;
`;

await mkdir(outputDirectory, { recursive: true });
const install = await compose("supabase/migrations", migrations, installHeader);
const rollback = await compose("supabase/rollbacks", rollbacks, rollbackHeader);
await Promise.all([
  writeFile(path.join(outputDirectory, "battery_dpp_preview_install.sql"), install),
  writeFile(path.join(outputDirectory, "battery_dpp_preview_verify.sql"), verifySql.trimStart()),
  writeFile(path.join(outputDirectory, "battery_dpp_preview_rollback.sql"), rollback),
]);

console.info(`Generated install, verification, and rollback bundles in ${outputDirectory}`);
