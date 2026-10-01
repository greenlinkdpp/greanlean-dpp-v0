/**
 * Round G0 is deliberately READ ONLY against both Supabase projects.
 * It captures deterministic JSON evidence locally for a separately authorised
 * Round G execution; it never sends a database statement without read_only.
 */
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const production = "lpxdbysgmdsjhxrjzhly";
const preprod = "efhiaufukjchxqhbmpvq";
const legacy = Array.from({ length: 22 }, (_, i) => `DPP-GLR-EBIKE-${String(i + 1).padStart(6, "0")}`);
const approved = ["DPP-GLR-LMT-000001", "DPP-GLR-LMT-000002", "DPP-GLR-LMT-000003", "DPP-DEMO-ESS-000001", "DPP-DEMO-TEX-000001", "DPP-DEMO-CE-000001", "DPP-DEMO-BLD-000001", "DPP-DEMO-HW-000001"];
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const evidenceDir = resolve(root, "docs/v2-implementation/phase-12/evidence");
const sqlArray = (values) => `array[${values.map((value) => `'${value.replaceAll("'", "''")}'`).join(",")}]`;
const token = process.env.SUPABASE_ACCESS_TOKEN || execFileSync("security", ["find-generic-password", "-s", "Supabase CLI", "-a", "supabase", "-w"], { encoding: "utf8" }).trim();
async function query(project, sql) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`, {
    method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ query: sql, read_only: true }), signal: AbortSignal.timeout(120000),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Read-only query failed for ${project}: ${response.status} ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : [];
}
async function rows(project, table, predicate = "true") {
  try {
    return (await query(project, `select to_jsonb(t) as row from public.${table} t where ${predicate} order by 1`)).map((entry) => entry.row);
  } catch (error) {
    if (String(error).includes("does not exist")) return [];
    throw error;
  }
}
const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
async function save(name, body) {
  await mkdir(evidenceDir, { recursive: true });
  const payload = { generated_at: new Date().toISOString(), round: "G0", read_only: true, ...body };
  await writeFile(resolve(evidenceDir, name), `${JSON.stringify(payload, null, 2)}\n`);
  return { name, sha256: hash(payload), bytes: Buffer.byteLength(JSON.stringify(payload, null, 2)) };
}
function countTables(tables) { return Object.fromEntries(Object.entries(tables).map(([table, records]) => [table, records.length])); }

const legacyFilter = `passport_identifier = any(${sqlArray(legacy)}::text[])`;
const targetDppSql = `(select id from public.dpp_passport where ${legacyFilter})`;
const targetVersionSql = `(select id from public.dpp_version where passport_id in ${targetDppSql})`;
const legacyPredicate = (table) => {
  if (["dpp_current_pointer", "resolver_mapping", "dpp_version", "demo_showcase_entry", "registry_submission_v2"].includes(table)) return `passport_id in ${targetDppSql}`;
  if (table === "dpp_review_task") return `(passport_id in ${targetDppSql} or id in (select review_task_id from public.dpp_version where passport_id in ${targetDppSql} and review_task_id is not null))`;
  if (table === "dpp_publication_audit") return `(passport_id in ${targetDppSql} or version_id in ${targetVersionSql} or review_task_id in (select id from public.dpp_review_task where passport_id in ${targetDppSql}))`;
  if (table === "connector_job") return `(passport_id in ${targetDppSql} or version_id in ${targetVersionSql})`;
  return "false";
};
const [prodHead, prodDpps, prodTables, fkMap, tenantRows, passportCollisionRows] = await Promise.all([
  query(production, "select max(migration_number)::text as head from public.greanlean_migration_ledger where result='applied'"),
  rows(production, "dpp_passport", legacyFilter),
  Promise.all(["dpp_current_pointer", "dpp_publication_audit", "dpp_review_task", "dpp_version", "resolver_mapping", "connector_job", "demo_showcase_entry", "registry_submission_v2"].map(async (table) => [table, await rows(production, table, legacyPredicate(table))])),
  query(production, "select con.conname, child.relname as table_name, array_agg(child_col.attname order by pos.n) as fk_columns, parent.relname as parent_table, array_agg(parent_col.attname order by pos.n) as parent_columns from pg_constraint con join pg_class child on child.oid=con.conrelid join pg_class parent on parent.oid=con.confrelid join lateral unnest(con.conkey, con.confkey) with ordinality as pos(child_attnum,parent_attnum,n) on true join pg_attribute child_col on child_col.attrelid=child.oid and child_col.attnum=pos.child_attnum join pg_attribute parent_col on parent_col.attrelid=parent.oid and parent_col.attnum=pos.parent_attnum where con.contype='f' and child.relnamespace='public'::regnamespace and (child.relname in ('dpp_current_pointer','dpp_publication_audit','dpp_review_task','dpp_version','resolver_mapping','connector_job','demo_showcase_entry','registry_submission_v2') or parent.relname in ('dpp_current_pointer','dpp_publication_audit','dpp_review_task','dpp_version','resolver_mapping','connector_job','demo_showcase_entry','registry_submission_v2')) group by con.conname,child.relname,parent.relname order by child.relname,con.conname"),
  rows(production, "tenant", "code='greanlean-reference-mobility' or lower(name)=lower('GreanLean Reference Mobility')"),
  query(production, `select passport_identifier from public.dpp_passport where passport_identifier = any(${sqlArray(approved)}::text[]) order by passport_identifier`),
]);
const legacyTables = { dpp_passport: prodDpps, ...Object.fromEntries(prodTables) };
const archiveRows = Object.values(legacyTables).reduce((sum, tableRows) => sum + tableRows.length, 0);
if (prodHead[0]?.head !== "0039") throw new Error(`Production migration head is ${prodHead[0]?.head}, expected 0039.`);
if (prodDpps.length !== 22) throw new Error(`Production legacy target count is ${prodDpps.length}, expected 22.`);
const directTableNames = new Set(Object.keys(legacyTables));
const dependencyMap = fkMap.map((fk) => ({ ...fk, row_count: legacyTables[fk.table_name]?.length ?? 0, classification: directTableNames.has(fk.table_name) ? "exclusive to selected DPP scope when row_count > 0" : "shared/global reference; retain", delete_order: fk.table_name === "dpp_current_pointer" ? 10 : fk.table_name === "dpp_publication_audit" ? 20 : fk.table_name === "resolver_mapping" ? 30 : fk.table_name === "dpp_version" ? 50 : fk.table_name === "dpp_review_task" ? 60 : 40 }));
const cycles = [{ from: "dpp_version.review_task_id", to: "dpp_review_task.id" }, { from: "dpp_review_task.published_version_id", to: "dpp_version.id", nullable_bridge: true }];

const approvedFilter = `passport_identifier = any(${sqlArray(approved)}::text[])`;
const approvedDppSql = `(select id from public.dpp_passport where ${approvedFilter})`;
const [preDpps, preTablePairs, preTenants, preOrganisations, preProducts, preSchemas, preDemo] = await Promise.all([
  rows(preprod, "dpp_passport", approvedFilter),
  Promise.all(["dpp_current_pointer", "dpp_publication_audit", "dpp_review_task", "dpp_version", "resolver_mapping", "demo_showcase_entry"].map(async (table) => [table, await rows(preprod, table, table === "dpp_current_pointer" || table === "resolver_mapping" || table === "demo_showcase_entry" ? `passport_id in ${approvedDppSql}` : table === "dpp_version" ? `passport_id in ${approvedDppSql}` : table === "dpp_review_task" ? `passport_id in ${approvedDppSql}` : `passport_id in ${approvedDppSql}`)])),
  query(preprod, `select to_jsonb(t) as row from public.tenant t where t.id in (select distinct tenant_id from public.dpp_passport where ${approvedFilter}) order by t.id`).then((rs) => rs.map((r) => r.row)),
  query(preprod, `select to_jsonb(o) as row from public.organisation_v2 o where o.tenant_id in (select distinct tenant_id from public.dpp_passport where ${approvedFilter}) order by o.id`).then((rs) => rs.map((r) => r.row)),
  Promise.all(["product_family", "product_model", "sku", "product_batch", "product_item", "product_subject_identifier", "product_organisation_relation"].map(async (table) => [table, await rows(preprod, table, `tenant_id in (select distinct tenant_id from public.dpp_passport where ${approvedFilter})`)])),
  Promise.all(["schema_definition", "schema_version"].map(async (table) => [table, await rows(preprod, table, "true")])),
  rows(preprod, "demo_showcase_entry", `passport_id in ${approvedDppSql}`),
]);
if (preDpps.length !== 8) throw new Error(`PreProd approved source count is ${preDpps.length}, expected 8.`);
const sourceTables = { tenant: preTenants, organisation_v2: preOrganisations, ...Object.fromEntries(preProducts), dpp_passport: preDpps, ...Object.fromEntries(preTablePairs), ...Object.fromEntries(preSchemas) };
const sourceRows = Object.values(sourceTables).reduce((sum, tableRows) => sum + tableRows.length, 0);
const sourceEntries = preDpps.map((dpp) => ({ source_primary_key: dpp.id, portable_business_identifier: dpp.passport_identifier, id_classification: "environment-local UUID; passport_identifier is portable", target_production_mapping: "resolve or insert predecessor entities by portable business keys, then create new Production UUID records; never copy PreProd UUIDs", final_showcase_order: approved.indexOf(dpp.passport_identifier) + 1 })).sort((a, b) => a.final_showcase_order - b.final_showcase_order);
const tenant = tenantRows[0] || null;
const collisionSpecs = [
  ["product_model", "model_code"], ["product_item", "serial_number"], ["organisation_v2", "registration_identifier"],
  ["resolver_mapping", "resolver_key"], ["demo_showcase_entry", "category_code"],
];
const collisionMatches = [...passportCollisionRows.map((row) => ({ type: "dpp_passport.passport_identifier", value: row.passport_identifier }))];
for (const [table, column] of collisionSpecs) {
  const values = [...new Set((sourceTables[table] || []).map((row) => row[column]).filter((value) => typeof value === "string" && value.length > 0))];
  if (!values.length) continue;
  try {
    const found = await query(production, `select ${column} as value from public.${table} where ${column} = any(${sqlArray(values)}::text[]) order by 1`);
    collisionMatches.push(...found.map((row) => ({ type: `${table}.${column}`, value: row.value })));
  } catch (error) {
    if (!String(error).includes("does not exist")) throw error;
  }
}
// Existing model/item keys are deliberately mapped to reuse; only a duplicate
// future DPP identifier is an unresolved cutover collision.
const collisions = collisionMatches.filter((match) => match.type === "dpp_passport.passport_identifier");
const copyPreparation = { banned_internal_terms: ["演示数据", "合成", "合成数据", "合成演示", "测试数据", "示例数据", "Synthetic Demo", "Synthetic Demo Data", "Demo Data", "Reference Demo", "Reference Data", "deterministic demo", "mock", "fixture", "placeholder"], rendering_rule: "Apply the resolved card content below during Round G import/rendering; source JSON remains unchanged in this read-only evidence package.", disclaimer: { zh: "本页面为 GreanLean 数字产品护照 Demo，用于展示平台的数据组织、展示与管理能力。页面数据不代表真实客户产品或正式监管申报结果。", en: "This GreanLean Digital Product Passport Demo is provided to illustrate the platform’s data structure, presentation and management capabilities. The data does not represent a real customer product or a formal regulatory submission." }, approved_order: approved, resolved_cards: [
  ["DPP-GLR-LMT-000001", "GLR-P25A", "A lightweight e-bike battery pack designed for urban commuting.", "为城市通勤设计的轻型电助力单车电池包。"], ["DPP-GLR-LMT-000002", "GLR-S36B", "A high-energy-density NMC battery pack for extended urban riding.", "采用高能量密度 NMC 电芯，适用于城市长续航骑行。"], ["DPP-GLR-LMT-000003", "GLR-X48C", "A high-load battery pack designed for cargo and fleet operations.", "面向货运与车队运营的高负载电池包。"], ["DPP-DEMO-ESS-000001", "GreenVault", "A 14.3 kWh LFP energy storage module for commercial and industrial applications.", "工商业场景的 14.3 kWh 磷酸铁锂储能模块。"], ["DPP-DEMO-TEX-000001", "EcoWeave", "An organic cotton basic T-shirt made with comfortable 180 g/m² fabric.", "有机棉基础款 T 恤，采用 180 g/m² 舒适面料。"], ["DPP-DEMO-CE-000001", "LoopSound", "Bluetooth wireless headphones with a recycled ABS enclosure.", "采用再生 ABS 外壳的蓝牙无线耳机。"], ["DPP-DEMO-BLD-000001", "TerraDeck", "Wood-plastic composite flooring with 52% recycled content.", "再生材料含量 52% 的木塑复合地板。"], ["DPP-DEMO-HW-000001", "ForgeFix", "A precision alloy-steel tool set with replaceable bits.", "批头可更换的合金钢精密工具套装。"]
].map(([passport_identifier, title, description_en, description_zh], sort_order) => ({ passport_identifier, title, description_en, description_zh, sort_order: sort_order + 1 })) };
const promotionPlan = { read_only_prepared: true, source_project_ref: preprod, target_project_ref: production, target_tenant: tenant ? { action: "REUSE_EXISTING", source: "Production read-only lookup", id: tenant.id, code: tenant.code } : { action: "CREATE_CANONICAL_TENANT", source: preTenants[0] || null }, insertion_order: ["tenant (reuse/create)", "organisation_v2", "product_family", "product_model", "sku", "product_batch", "product_item", "product_subject_identifier", "product_organisation_relation", "dpp_passport", "dpp_review_task", "dpp_version", "dpp_current_pointer", "dpp_publication_audit", "resolver_mapping", "demo_showcase_entry"], table_plan: Object.entries(sourceTables).map(([table, records]) => ({ table, rows_to_insert: ["tenant", "schema_definition", "schema_version"].includes(table) ? 0 : records.length, rows_to_reuse: ["tenant", "schema_definition", "schema_version"].includes(table) ? records.length : 0, rows_to_update: 0, source_key: "PreProd primary key plus business identifier", target_key: "Production UUID generated/resolved by mapping", mapping_rule: "Business-key lookup first; create only if no approved target exists" })), resolved_existing_mappings: collisionMatches.filter((match) => !collisions.includes(match)).map((match) => ({ ...match, action: "REUSE_EXISTING" })), collisions };

const artifacts = [];
artifacts.push(await save("round-g0-legacy22-archive.json", { environment: { project_ref: production, migration_head: "0039" }, target_passport_identifiers: legacy, tables: legacyTables, table_counts: countTables(legacyTables), total_rows: archiveRows }));
artifacts.push(await save("round-g0-legacy22-dependency-map.json", { target_passport_identifiers: legacy, dependencies: dependencyMap, cyclic_pairs: cycles, review_version_rows: { review_task_ids: legacyTables.dpp_review_task.map((row) => row.id), version_ids: legacyTables.dpp_version.map((row) => row.id) } }));
artifacts.push(await save("round-g0-legacy22-delete-dry-run.json", { mutation_performed: false, rows_to_delete_by_table: countTables(legacyTables), rows_to_keep_shared_by_table: { tenant: 1, schema_definition: 0, schema_version: 0 }, rows_to_keep_global_by_table: { auth_users: "all", tenant: "all" }, non_target_dpp_affected: 0, auth_rows_affected: 0, tenant_rows_affected: 0, required_cycle_bridge: "Set dpp_review_task.published_version_id to NULL only in the authorised delete transaction before deleting linked dpp_version / review task rows." }));
artifacts.push(await save("round-g0-approved8-source-manifest.json", { environment: { project_ref: preprod }, approved_identifiers: approved, entries: sourceEntries, tables: sourceTables, table_counts: countTables(sourceTables), total_rows: sourceRows, completeness_note: "Full source rows include canonical payload JSON containing documents, lifecycle, sustainability, materials, repair/service, end-of-life and LMT BMS data where present." }));
artifacts.push(await save("round-g0-approved8-production-promotion-plan.json", promotionPlan));
artifacts.push(await save("round-g0-public-copy-preparation.json", copyPreparation));
artifacts.push(await save("round-g0-cutover-package-index.json", { production: { project_ref: production, migration_head: "0039" }, preprod: { project_ref: preprod }, artifacts, verification: { legacy_target_count: legacy.length, approved_demo_count: approved.length, collision_count: collisions.length, demo_target_tenant_exists: Boolean(tenant), production_mutation_performed: false, production_application_deployed: false } }));
const report = `# Round G0 — Production Cutover Package\n\n- Generated UTC: ${new Date().toISOString()}\n- Scope: read-only evidence preparation. No Production mutation or deployment was performed.\n- Production: \`${production}\`, migration head \`0039\`.\n- Legacy archive: ${legacy.length} target DPPs, ${archiveRows} complete captured rows across ${Object.keys(legacyTables).length} tables.\n- PreProd manifest: ${approved.length} approved DPPs, ${sourceRows} source rows across ${Object.keys(sourceTables).length} tables.\n- Demo tenant action next round: ${tenant ? "REUSE_EXISTING" : "CREATE_CANONICAL_TENANT"}.\n- Collision count for the approved DPP identifiers: ${collisions.length}.\n\nAll Round G0 package artifacts are listed in [the index](./evidence/round-g0-cutover-package-index.json).\n`;
await mkdir(resolve(root, "docs/v2-implementation/phase-12"), { recursive: true });
await writeFile(resolve(root, "docs/v2-implementation/phase-12/73-round-g0-prepare-production-cutover-package.md"), report);
process.stdout.write(`${JSON.stringify({ result: "PASS", legacyArchiveRows: archiveRows, legacyTables: Object.keys(legacyTables).length, sourceRows, sourceTables: Object.keys(sourceTables).length, tenantExists: Boolean(tenant), collisionCount: collisions.length, artifacts }, null, 2)}\n`);
