import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const migrationPath = path.join(root, "supabase/migrations/0009_battery_domain.sql");
const catalog = JSON.parse(await readFile(path.join(root, "config/battery/battery-pass-ready-longlist-v1.3.json"), "utf8"));

const schemaConfigurations = [
  { code: "battery.ev", file: "EV.json", legal: "ev", variant: null, profile: "battery.ev.default" },
  { code: "battery.lmt", file: "LMT.json", legal: "lmt", variant: null, profile: "battery.lmt.default" },
  { code: "battery.industrial.without_bms", file: "Industrial_Without_BMS.json", legal: "industrial", variant: "without_bms", profile: "battery.industrial.without_bms" },
  { code: "battery.industrial.non_stationary", file: "Other_Industrial_Above_2kWh.json", legal: "industrial", variant: "non_stationary_above_2kwh", profile: "battery.industrial.non_stationary_above_2kwh" },
  { code: "battery.industrial.stationary", file: "Stationary_Industrial_Above_2kWh.json", legal: "industrial", variant: "stationary_above_2kwh", profile: "battery.industrial.stationary_above_2kwh" },
];

const schemaSources = await Promise.all(schemaConfigurations.map(async (configuration) => {
  const raw = await readFile(path.join(root, "config/battery/schemas", configuration.file), "utf8");
  return { ...configuration, raw, sha256: createHash("sha256").update(raw).digest("hex") };
}));

function sql(value) {
  if (value === null || value === undefined) return "null";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function json(value) {
  return `${sql(JSON.stringify(value))}::jsonb`;
}

function tuple(values) {
  return `(${values.join(", ")})`;
}

const lines = [];
lines.push("-- Generated from checked-in BatteryPass-Ready sources. Do not edit this block manually.");
lines.push("insert into public.regulatory_reference (source_type, source_code, title, source_version, source_uri, confirmation_status, notes)");
lines.push("values");
lines.push("  ('regulation', 'EU-2023-1542', 'Regulation (EU) 2023/1542 concerning batteries and waste batteries', '2023-07-12', 'https://eur-lex.europa.eu/eli/reg/2023/1542/oj', 'CONFIRMED', 'Primary battery-passport legal source.'),");
lines.push("  ('reference_model', 'BPR-LONGLIST', 'BatteryPass-Ready Data Attribute Longlist', '1.3', null, 'DRAFT', 'Reference model under CC BY 4.0; not the final EU Registry semantic catalogue.')");
lines.push("on conflict do nothing;", "");

const definitions = [
  tuple([sql("battery.longlist"), sql("battery"), "null", "null", sql("BatteryPass-Ready"), sql("Battery reference field dictionary"), sql("电池参考字段字典"), sql("active")]),
  ...schemaSources.map((source) => tuple([sql(source.code), sql("battery"), sql(source.legal), sql(source.variant), sql("BatteryPass-Ready"), sql(`${source.code} validation configuration`), sql(`${source.code} 验证配置`), sql("active")])),
];
lines.push("insert into public.schema_definition (code, sector_code, legal_category_code, technical_variant_code, source_name, name_en, name_zh, status)");
lines.push("values", `  ${definitions.join(",\n  ")}`);
lines.push("on conflict (code) do update set status = excluded.status, updated_at = now();", "");

const longlistSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://www.greanlean.com/schemas/battery/longlist/1.3.0",
  title: "BatteryPass-Ready Longlist v1.3 normalized field dictionary",
  type: "object",
  "x-source-sha256": catalog.sourceSha256,
};
lines.push("insert into public.schema_version (schema_definition_id, version, source_version, json_schema, checksum_sha256, status, created_by)");
lines.push(`select id, '1.3.0', '1.3', ${json(longlistSchema)}, ${sql(catalog.sourceSha256)}, 'draft', 'scripts/battery/generate_schema_seed.mjs'`);
lines.push("from public.schema_definition where code = 'battery.longlist'");
lines.push("on conflict (schema_definition_id, version) do nothing;", "");

for (const source of schemaSources) {
  lines.push("insert into public.schema_version (schema_definition_id, version, source_version, json_schema, checksum_sha256, status, created_by)");
  lines.push(`select id, '1.0.0', 'BatteryPass-Ready 1.0', ${sql(source.raw)}::jsonb, ${sql(source.sha256)}, 'published', 'scripts/battery/generate_schema_seed.mjs'`);
  lines.push(`from public.schema_definition where code = ${sql(source.code)}`);
  lines.push("on conflict (schema_definition_id, version) do nothing;", "");
}

lines.push("insert into public.codelist (code, version, source_name, schema_version_id, label_en, label_zh, status)");
lines.push("select seed.code, '1.0.0', 'Greanlean + BatteryPass-Ready', sv.id, seed.label_en, seed.label_zh, 'draft'");
lines.push("from (values ('battery.category', 'Battery category', '电池类别'), ('battery.status', 'Battery status', '电池状态'), ('battery.chemistry', 'Battery chemistry', '电池化学体系')) as seed(code, label_en, label_zh)");
lines.push("join public.schema_definition sd on sd.code = 'battery.longlist'");
lines.push("join public.schema_version sv on sv.schema_definition_id = sd.id and sv.version = '1.3.0'");
lines.push("on conflict (code, version) do nothing;", "");

const categoryValues = [
  ["ev", "Electric vehicle battery", "电动汽车电池"],
  ["lmt", "Light means of transport battery", "轻型交通工具电池"],
  ["industrial", "Industrial battery", "工业电池"],
  ["portable", "Portable battery", "便携式电池"],
  ["sli", "Starting, lighting and ignition battery", "启动、照明和点火电池"],
  ["other", "Other configurable battery", "其他可配置电池"],
];
const statusValues = ["original", "reused", "remanufactured", "repurposed", "waste", "exported", "unknown"].map((value) => [value, value, value]);
const chemistryValues = [...new Set(schemaSources.flatMap((source) => {
  const schema = JSON.parse(source.raw);
  return schema.$defs?.customChemicalCodes?.enum || [];
}))].sort().map((value) => [value, value, value]);

for (const [code, values] of [["battery.category", categoryValues], ["battery.status", statusValues], ["battery.chemistry", chemistryValues]]) {
  const valueRows = values.map((value, index) => tuple(["cl.id", sql(value[0]), sql(value[1]), sql(value[2]), String((index + 1) * 10)]));
  lines.push("insert into public.codelist_value (codelist_id, value_code, label_en, label_zh, sort_order)");
  lines.push("select rows.codelist_id, rows.value_code, rows.label_en, rows.label_zh, rows.sort_order");
  lines.push(`from public.codelist cl cross join lateral (values ${valueRows.join(", ")}) as rows(codelist_id, value_code, label_en, label_zh, sort_order)`);
  lines.push(`where cl.code = ${sql(code)} and cl.version = '1.0.0' and cl.status = 'draft'`);
  lines.push("on conflict (codelist_id, value_code) do nothing;", "");
}

const fieldRows = catalog.fields.map((field) => {
  const pointer = field.jsonPointers["battery.lmt"] || field.jsonPointers["battery.ev"] || Object.values(field.jsonPointers).find(Boolean) || null;
  const storagePath = field.dataBehavior === "DYNAMIC"
    ? ["integer", "decimal"].includes(field.dataType) ? "battery_operating_metric.metric_value" : "battery_lifecycle_event.event_data"
    : "battery_field_value.value_json";
  const evidence = { required: field.evidenceRequired, sourceSuggestionZh: field.sourceSuggestionZh };
  return tuple([
    "sv.id", sql(field.fieldCode), sql(pointer), sql(storagePath), sql(field.labelEn), sql(field.labelZh),
    sql(field.descriptionEn), sql(field.instructionZh), sql(field.dataType), sql(field.unit), sql(field.dataBehavior),
    sql(field.dataGranularity), sql(field.accessLevel), sql("TBD"), json(evidence), String(field.sequence * 10),
  ]);
});
lines.push("insert into public.field_definition (schema_version_id, field_code, json_pointer, storage_path, label_en, label_zh, description_en, description_zh, data_type, unit_code, data_behavior, data_granularity, access_level_code, requirement_status, evidence_requirement, sort_order)");
lines.push("select rows.schema_version_id, rows.field_code, rows.json_pointer, rows.storage_path, rows.label_en, rows.label_zh, rows.description_en, rows.description_zh, rows.data_type, rows.unit_code, rows.data_behavior, rows.data_granularity, rows.access_level_code, rows.requirement_status, rows.evidence_requirement, rows.sort_order");
lines.push(`from public.schema_definition sd join public.schema_version sv on sv.schema_definition_id = sd.id cross join lateral (values\n  ${fieldRows.join(",\n  ")}\n) as rows(schema_version_id, field_code, json_pointer, storage_path, label_en, label_zh, description_en, description_zh, data_type, unit_code, data_behavior, data_granularity, access_level_code, requirement_status, evidence_requirement, sort_order)`);
lines.push("where sd.code = 'battery.longlist' and sv.version = '1.3.0' and sv.status = 'draft'");
lines.push("on conflict (schema_version_id, field_code) do update set label_en = excluded.label_en, label_zh = excluded.label_zh, description_en = excluded.description_en, description_zh = excluded.description_zh, data_type = excluded.data_type, unit_code = excluded.unit_code, data_behavior = excluded.data_behavior, data_granularity = excluded.data_granularity, access_level_code = excluded.access_level_code, evidence_requirement = excluded.evidence_requirement, sort_order = excluded.sort_order;", "");

for (const [fieldCode, codelistCode] of [
  ["battery.battery_category", "battery.category"],
  ["battery.battery_status", "battery.status"],
  ["battery.battery_chemistry", "battery.chemistry"],
]) {
  lines.push("update public.field_definition fd set codelist_id = cl.id");
  lines.push("from public.schema_version sv, public.schema_definition sd, public.codelist cl");
  lines.push(`where fd.schema_version_id = sv.id and sv.schema_definition_id = sd.id and sd.code = 'battery.longlist' and sv.status = 'draft' and fd.field_code = ${sql(fieldCode)} and cl.code = ${sql(codelistCode)} and cl.version = '1.0.0';`);
}
lines.push("");

const directValidationRows = catalog.fields.map((field) => tuple([
  sql(field.fieldCode), sql(`type.${String(field.sequence).padStart(3, "0")}`), sql("type"), json({ dataType: field.dataType, unit: field.unit }),
  sql(`BATTERY_FIELD_${String(field.sequence).padStart(3, "0")}_INVALID`), sql(`${field.labelEn} has an invalid value.`),
  sql(`${field.labelZh}的值不符合字段类型或单位要求。`), sql("error"), String(field.sequence * 10),
]));
lines.push("insert into public.validation_rule (schema_version_id, field_definition_id, rule_code, rule_type, rule_config, error_code, message_en, message_zh, severity, sort_order)");
lines.push("select sv.id, fd.id, rows.rule_code, rows.rule_type, rows.rule_config, rows.error_code, rows.message_en, rows.message_zh, rows.severity, rows.sort_order");
lines.push(`from public.schema_definition sd join public.schema_version sv on sv.schema_definition_id = sd.id join public.field_definition fd on fd.schema_version_id = sv.id join (values\n  ${directValidationRows.join(",\n  ")}\n) as rows(field_code, rule_code, rule_type, rule_config, error_code, message_en, message_zh, severity, sort_order) on rows.field_code = fd.field_code`);
lines.push("where sd.code = 'battery.longlist' and sv.version = '1.3.0' and sv.status = 'draft'");
lines.push("on conflict (schema_version_id, rule_code) do nothing;", "");

const categoryKeys = ["battery.ev", "battery.lmt", "battery.industrial.non_stationary", "battery.industrial.stationary", "battery.industrial.without_bms", "battery.portable", "battery.sli", "battery.other"];
const applicabilityRows = catalog.fields.flatMap((field) => categoryKeys.map((category, categoryIndex) => tuple([
  sql(field.fieldCode), sql(`app.${String(field.sequence).padStart(3, "0")}.${category.replaceAll(".", "_")}`),
  sql(category.split(".")[1] === "industrial" ? "industrial" : category.split(".")[1]),
  category === "battery.industrial.non_stationary"
    ? sql("non_stationary_above_2kwh")
    : category === "battery.industrial.stationary"
      ? sql("stationary_above_2kwh")
      : category === "battery.industrial.without_bms"
        ? sql("without_bms")
        : "null",
  sql(field.dataGranularity), json({ field: "schemaCode", operator: "equals", value: category }),
  sql(field.categoryRequirementStatus[category] || (category === "battery.industrial.without_bms" ? field.categoryRequirementStatus["battery.industrial.non_stationary"] : "TBD")), String(1000 - categoryIndex), sql(field.regulatoryReference),
])));
lines.push("insert into public.applicability_rule (schema_version_id, field_definition_id, rule_code, legal_category_code, technical_variant_code, data_granularity, condition_config, result_status, priority, source_note)");
lines.push("select sv.id, fd.id, rows.rule_code, rows.legal_category_code, rows.technical_variant_code, rows.data_granularity, rows.condition_config, rows.result_status, rows.priority, rows.source_note");
lines.push(`from public.schema_definition sd join public.schema_version sv on sv.schema_definition_id = sd.id join public.field_definition fd on fd.schema_version_id = sv.id join (values\n  ${applicabilityRows.join(",\n  ")}\n) as rows(field_code, rule_code, legal_category_code, technical_variant_code, data_granularity, condition_config, result_status, priority, source_note) on rows.field_code = fd.field_code`);
lines.push("where sd.code = 'battery.longlist' and sv.version = '1.3.0' and sv.status = 'draft'");
lines.push("on conflict (schema_version_id, rule_code) do nothing;", "");

lines.push("insert into public.field_regulatory_reference (field_definition_id, regulatory_reference_id, relation_type, notes)");
lines.push("select fd.id, rr.id, 'informs', 'BatteryPass-Ready Longlist v1.3 reference mapping'");
lines.push("from public.field_definition fd join public.schema_version sv on sv.id = fd.schema_version_id join public.schema_definition sd on sd.id = sv.schema_definition_id cross join public.regulatory_reference rr");
lines.push("where sd.code = 'battery.longlist' and sv.version = '1.3.0' and sv.status = 'draft' and rr.source_code = 'BPR-LONGLIST'");
lines.push("on conflict do nothing;", "");

lines.push("update public.codelist set status = 'published' where code in ('battery.category', 'battery.status', 'battery.chemistry') and version = '1.0.0' and status = 'draft';");
lines.push("update public.schema_version sv set status = 'published' from public.schema_definition sd where sv.schema_definition_id = sd.id and sd.code = 'battery.longlist' and sv.version = '1.3.0' and sv.status = 'draft';", "");

const profileRows = [
  ...schemaSources.map((source) => [source.profile, source.legal, source.variant, source.code, source.code, "active"]),
  ["battery.portable.reference", "portable", null, null, "battery.portable", "draft"],
  ["battery.sli.reference", "sli", null, null, "battery.sli", "draft"],
  ["battery.other.reference", "other", null, null, "battery.other", "draft"],
];
for (const profile of profileRows) {
  const validationId = profile[3]
    ? `(select sv.id from public.schema_version sv join public.schema_definition sd on sd.id = sv.schema_definition_id where sd.code = ${sql(profile[3])} and sv.version = '1.0.0')`
    : "null";
  lines.push("insert into public.battery_schema_profile (code, legal_category_code, technical_variant_code, validation_schema_version_id, longlist_schema_version_id, source_profile_code, status, notes)");
  lines.push(`select ${sql(profile[0])}, ${sql(profile[1])}, ${sql(profile[2])}, ${validationId}, sv.id, ${sql(profile[4])}, ${sql(profile[5])}, 'BatteryPass reference configuration; not final EU Registry semantics.'`);
  lines.push("from public.schema_version sv join public.schema_definition sd on sd.id = sv.schema_definition_id where sd.code = 'battery.longlist' and sv.version = '1.3.0'");
  lines.push("on conflict (code) do update set validation_schema_version_id = excluded.validation_schema_version_id, longlist_schema_version_id = excluded.longlist_schema_version_id, status = excluded.status, updated_at = now();", "");
}

const migration = await readFile(migrationPath, "utf8");
const startMarker = "-- BEGIN GENERATED BATTERY REFERENCE CATALOG";
const endMarker = "-- END GENERATED BATTERY REFERENCE CATALOG";
const start = migration.indexOf(startMarker);
const end = migration.indexOf(endMarker);
if (start < 0 || end < start) throw new Error("Generated seed markers were not found in 0009_battery_domain.sql");
const generated = `${startMarker}\n${lines.join("\n")}\n${endMarker}`;
const output = `${migration.slice(0, start)}${generated}${migration.slice(end + endMarker.length)}`
  .replace(/[ \t]+$/gm, "");
await writeFile(migrationPath, output);
console.info(`Generated ${catalog.fields.length} fields and ${applicabilityRows.length} applicability rules in ${migrationPath}`);
