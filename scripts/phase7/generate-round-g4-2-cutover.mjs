import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const evidence = resolve(root, "docs/v2-implementation/phase-12/evidence");
const manifest = JSON.parse(await readFile(resolve(evidence, "round-g0-approved8-source-manifest.json"), "utf8"));
const legacyArchive = JSON.parse(await readFile(resolve(evidence, "round-g0-legacy22-archive.json"), "utf8"));
const production = "lpxdbysgmdsjhxrjzhly";
const productionTenant = "632943cf-520b-47ac-83af-88ca866d4fa5";
const preprodTenant = manifest.tables.tenant[0].id;
const approved = ["DPP-GLR-LMT-000001", "DPP-GLR-LMT-000002", "DPP-GLR-LMT-000003", "DPP-DEMO-ESS-000001", "DPP-DEMO-TEX-000001", "DPP-DEMO-CE-000001", "DPP-DEMO-BLD-000001", "DPP-DEMO-HW-000001"];
const legacy = Array.from({ length: 22 }, (_, i) => `DPP-GLR-EBIKE-${String(i + 1).padStart(6, "0")}`);
const token = process.env.SUPABASE_ACCESS_TOKEN || execFileSync("security", ["find-generic-password", "-s", "Supabase CLI", "-a", "supabase", "-w"], { encoding: "utf8" }).trim();
const lit = (value) => `'${String(value).replaceAll("'", "''")}'`;
const arr = (values) => `array[${values.map(lit).join(",")}]`;
async function query(sql, readOnly = true) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${production}/database/query`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ query: sql, read_only: readOnly }), signal: AbortSignal.timeout(240000) });
  const text = await response.text();
  if (!response.ok) throw new Error(`Production SQL failed (${response.status}): ${text.slice(0, 2000)}`);
  return text ? JSON.parse(text) : [];
}
function uuidToBytes(uuid) { return Buffer.from(uuid.replaceAll("-", ""), "hex"); }
function bytesToUuid(bytes) { const h = bytes.toString("hex"); return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`; }
function uuidv5(namespace, name) {
  const digest = createHash("sha1").update(Buffer.concat([uuidToBytes(namespace), Buffer.from(name)])).digest().subarray(0, 16);
  digest[6] = (digest[6] & 0x0f) | 0x50; digest[8] = (digest[8] & 0x3f) | 0x80;
  return bytesToUuid(digest);
}
const namespace = uuidv5("6ba7b810-9dad-11d1-80b4-00c04fd430c8", "greanlean.com/production/dpp-v2");
const mapping = new Map([[preprodTenant, productionTenant]]);
const mapRows = [{ source_environment: "preprod", source_table: "tenant", source_primary_key: preprodTenant, target_environment: "production", target_table: "tenant", target_primary_key: productionTenant, mapping_type: "REUSE_EXISTING", business_identifier: "greanlean-reference-mobility" }];
function addMap(table, sourceId, targetId, type, businessIdentifier = null) {
  if (mapping.has(sourceId) && mapping.get(sourceId) !== targetId) throw new Error(`Conflicting mapping for ${table}/${sourceId}`);
  mapping.set(sourceId, targetId);
  mapRows.push({ source_environment: "preprod", source_table: table, source_primary_key: sourceId, target_environment: "production", target_table: table, target_primary_key: targetId, mapping_type: type, business_identifier: businessIdentifier });
}
function addInsertMap(table, row, businessIdentifier = null) { addMap(table, row.id, uuidv5(namespace, `${table}|${row.id}`), "UUIDV5_INSERT", businessIdentifier); }
async function existingBy(table, column, values) {
  if (!values.length) return [];
  return query(`select id,${column} as key from public.${table} where tenant_id=${lit(productionTenant)} and ${column}=any(${arr(values)}::text[])`);
}
const dppById = new Map(manifest.tables.dpp_passport.map((row) => [row.id, row]));
const requiredDefIds = new Set(manifest.tables.dpp_passport.map((row) => row.schema_definition_id));
const requiredVersionIds = new Set(manifest.tables.dpp_version.map((row) => row.schema_version_id));
const requiredDefs = manifest.tables.schema_definition.filter((row) => requiredDefIds.has(row.id));
const requiredVersions = manifest.tables.schema_version.filter((row) => requiredVersionIds.has(row.id));
const prodSchema = await query(`select d.id definition_id,d.code,v.id version_id,v.version,v.json_schema,v.checksum_sha256 from public.schema_definition d left join public.schema_version v on v.schema_definition_id=d.id where d.code=any(${arr(requiredDefs.map((r) => r.code))}::text[])`);
for (const definition of requiredDefs) {
  const versions = requiredVersions.filter((row) => row.schema_definition_id === definition.id);
  const existingDefinition = prodSchema.find((row) => row.code === definition.code);
  if (existingDefinition) addMap("schema_definition", definition.id, existingDefinition.definition_id, "REUSE_EXISTING", definition.code);
  else addInsertMap("schema_definition", definition, definition.code);
  for (const version of versions) {
    const existingVersion = prodSchema.find((row) => row.code === definition.code && row.version === version.version && JSON.stringify(row.json_schema) === JSON.stringify(version.json_schema));
    if (existingVersion) addMap("schema_version", version.id, existingVersion.version_id, "REUSE_EXISTING", `${definition.code}@${version.version}`);
    else addInsertMap("schema_version", version, `${definition.code}@${version.version}`);
  }
}
const keySpecs = { organisation_v2: "legal_name", product_family: "code", product_model: "model_code", sku: "sku_code", product_batch: "batch_number", product_item: "serial_number" };
for (const [table, column] of Object.entries(keySpecs)) {
  const rows = manifest.tables[table];
  const existing = await existingBy(table, column, rows.map((r) => r[column]).filter(Boolean));
  const byKey = new Map(existing.map((r) => [r.key, r.id]));
  for (const row of rows) byKey.has(row[column]) ? addMap(table, row.id, byKey.get(row[column]), "REUSE_EXISTING", row[column]) : addInsertMap(table, row, row[column]);
}
function translateValue(value) {
  if (typeof value === "string") {
    if (mapping.has(value)) return mapping.get(value);
    return value.replaceAll("greanlean-dpp-preprod.vercel.app", "www.greanlean.com").replaceAll("http://localhost:3000", "https://www.greanlean.com").replaceAll("https://localhost", "https://www.greanlean.com");
  }
  if (Array.isArray(value)) return value.map(translateValue);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, translateValue(child)]));
  return value;
}
// Rows without prior reusable business keys receive deterministic IDs first, so all downstream FKs can be translated.
for (const table of ["product_subject_identifier", "product_organisation_relation", "dpp_passport", "dpp_review_task", "dpp_version", "dpp_publication_audit", "demo_showcase_entry"]) for (const row of manifest.tables[table]) addInsertMap(table, row, row.passport_identifier || row.value || row.correlation_id || null);
const canonicalResolvers = manifest.tables.resolver_mapping.filter((row) => {
  const passport = dppById.get(row.passport_id);
  return passport && approved.includes(passport.passport_identifier) && row.host === "greanlean-dpp-preprod.vercel.app" && row.normalized_path === `/p/${passport.passport_identifier}`;
});
if (canonicalResolvers.length !== 8) throw new Error(`Resolver normalization selected ${canonicalResolvers.length}, expected 8.`);
for (const row of canonicalResolvers) addInsertMap("resolver_mapping", row, dppById.get(row.passport_id).passport_identifier);
// Excluded localhost/legacy resolver rows are not inserted, but source audit
// references to them deterministically resolve to the canonical resolver for
// the same approved passport.
for (const row of manifest.tables.resolver_mapping) {
  const canonical = canonicalResolvers.find((candidate) => candidate.passport_id === row.passport_id);
  if (canonical) mapping.set(row.id, mapping.get(canonical.id));
}
// Resolve identifier/relation rows that already exist after parent mapping; otherwise retain deterministic inserts.
for (const row of manifest.tables.product_subject_identifier) {
  const found = await query(`select id from public.product_subject_identifier where tenant_id=${lit(productionTenant)} and identifier_type=${lit(row.identifier_type)} and normalized_value=${lit(row.normalized_value)} limit 1`);
  if (found[0]) { mapping.set(row.id, found[0].id); const entry = mapRows.find((m) => m.source_primary_key === row.id); entry.target_primary_key = found[0].id; entry.mapping_type = "REUSE_EXISTING"; }
}
for (const row of manifest.tables.product_organisation_relation) {
  const model = row.product_model_id ? mapping.get(row.product_model_id) : null, organisation = mapping.get(row.organisation_id), sku = row.sku_id ? mapping.get(row.sku_id) : null;
  const found = await query(`select id from public.product_organisation_relation where tenant_id=${lit(productionTenant)} and organisation_id=${lit(organisation)} and relation_type=${lit(row.relation_type)} and product_model_id is not distinct from ${model ? lit(model) : "null"}::uuid and sku_id is not distinct from ${sku ? lit(sku) : "null"}::uuid limit 1`);
  if (found[0]) { mapping.set(row.id, found[0].id); const entry = mapRows.find((m) => m.source_primary_key === row.id); entry.target_primary_key = found[0].id; entry.mapping_type = "REUSE_EXISTING"; }
}
const targetIds = mapRows.map((row) => row.target_primary_key);
if (new Set(targetIds).size !== targetIds.length) throw new Error("Duplicate target ID detected in map.");
const recomputed = mapRows.filter((row) => row.mapping_type === "UUIDV5_INSERT").filter((row) => uuidv5(namespace, `${row.source_table}|${row.source_primary_key}`) !== row.target_primary_key);
if (recomputed.length) throw new Error("Deterministic recompute mismatch.");
const actorColumns = new Set(["created_by", "updated_by", "published_by", "withdrawn_by", "submitted_by", "reviewed_by", "actor_user_id"]);
function targetRow(table, source, overrides = {}) {
  const row = translateValue(structuredClone(source));
  if (row.id && mapping.has(source.id)) row.id = mapping.get(source.id);
  for (const key of Object.keys(row)) if (actorColumns.has(key)) row[key] = null;
  Object.assign(row, overrides);
  return row;
}
const sql = [];
sql.push("BEGIN;", "SET LOCAL statement_timeout = '180s';");
sql.push(`DO $$ BEGIN
  IF (select max(migration_number) from public.greanlean_migration_ledger where result='applied') <> '0039' THEN RAISE EXCEPTION 'migration head mismatch'; END IF;
  IF (select count(*) from public.dpp_passport where passport_identifier=any(${arr(legacy)}::text[])) <> 22 THEN RAISE EXCEPTION 'legacy count mismatch'; END IF;
  IF (select count(*) from public.dpp_passport where passport_identifier=any(${arr(approved)}::text[])) <> 0 THEN RAISE EXCEPTION 'approved DPP collision'; END IF;
  IF not exists(select 1 from public.tenant where id=${lit(productionTenant)} and code='greanlean-reference-mobility') THEN RAISE EXCEPTION 'tenant mismatch'; END IF;
END $$;`);
function insertRecord(table, row) { sql.push(`insert into public.${table} select (jsonb_populate_record(null::public.${table}, ${lit(JSON.stringify(row))}::jsonb)).*;`); }
for (const row of requiredDefs.filter((r) => mapRows.find((m) => m.source_primary_key === r.id)?.mapping_type === "UUIDV5_INSERT")) insertRecord("schema_definition", targetRow("schema_definition", row));
for (const row of requiredVersions.filter((r) => mapRows.find((m) => m.source_primary_key === r.id)?.mapping_type === "UUIDV5_INSERT")) insertRecord("schema_version", targetRow("schema_version", row));
for (const table of ["organisation_v2", "product_family", "product_model", "sku", "product_batch", "product_item"]) for (const row of manifest.tables[table]) if (mapRows.find((m) => m.source_primary_key === row.id)?.mapping_type === "UUIDV5_INSERT") insertRecord(table, targetRow(table, row));
for (const row of manifest.tables.product_subject_identifier.filter((row) => row.subject_type !== "PASSPORT")) if (mapRows.find((m) => m.source_primary_key === row.id)?.mapping_type === "UUIDV5_INSERT") insertRecord("product_subject_identifier", targetRow("product_subject_identifier", row));
for (const row of manifest.tables.product_organisation_relation) if (mapRows.find((m) => m.source_primary_key === row.id)?.mapping_type === "UUIDV5_INSERT") insertRecord("product_organisation_relation", targetRow("product_organisation_relation", row));
function emitPassportSet(passports) {
  const passportIds = new Set(passports.map((row) => row.id));
  const reviews = manifest.tables.dpp_review_task.filter((row) => passportIds.has(row.passport_id));
  const reviewIds = new Set(reviews.map((row) => row.id));
  const versions = manifest.tables.dpp_version.filter((row) => passportIds.has(row.passport_id));
  for (const row of passports) insertRecord("dpp_passport", targetRow("dpp_passport", row));
  for (const row of manifest.tables.product_subject_identifier.filter((row) => row.subject_type === "PASSPORT" && passportIds.has(row.subject_id))) if (mapRows.find((m) => m.source_primary_key === row.id)?.mapping_type === "UUIDV5_INSERT") insertRecord("product_subject_identifier", targetRow("product_subject_identifier", row));
  for (const row of reviews) insertRecord("dpp_review_task", targetRow("dpp_review_task", row, { published_version_id: null }));
  for (const row of versions) insertRecord("dpp_version", targetRow("dpp_version", row));
  for (const review of reviews) if (review.published_version_id) sql.push(`update public.dpp_review_task set published_version_id=${lit(mapping.get(review.published_version_id))} where id=${lit(mapping.get(review.id))};`);
  for (const row of manifest.tables.dpp_current_pointer.filter((row) => passportIds.has(row.passport_id))) insertRecord("dpp_current_pointer", targetRow("dpp_current_pointer", row));
  for (const row of canonicalResolvers.filter((row) => passportIds.has(row.passport_id))) insertRecord("resolver_mapping", targetRow("resolver_mapping", row, { host: "www.greanlean.com", normalized_path: `/p/${dppById.get(row.passport_id).passport_identifier}` }));
  for (const row of manifest.tables.dpp_publication_audit.filter((row) => passportIds.has(row.passport_id) || reviewIds.has(row.review_task_id))) insertRecord("dpp_publication_audit", targetRow("dpp_publication_audit", row));
  for (const row of manifest.tables.demo_showcase_entry.filter((row) => passportIds.has(row.passport_id))) insertRecord("demo_showcase_entry", targetRow("demo_showcase_entry", row));
}
const replacementIdentifier = "DPP-GLR-LMT-000001";
const replacementPassport = manifest.tables.dpp_passport.find((row) => row.passport_identifier === replacementIdentifier);
const nonConflictingPassports = manifest.tables.dpp_passport.filter((row) => row.id !== replacementPassport.id);
emitPassportSet(nonConflictingPassports);
sql.push(`DO $$ BEGIN IF (select count(*) from public.dpp_passport where passport_identifier=any(${arr(approved.filter((id) => id !== replacementIdentifier))}::text[])) <> 7 THEN RAISE EXCEPTION 'seven-passport staging gate'; END IF; END $$;`);
const replacementLegacy = `(select id from public.dpp_passport where passport_identifier='DPP-GLR-EBIKE-000001')`;
sql.push(
  `alter table public.dpp_publication_audit disable trigger user;`,
  `alter table public.dpp_version disable trigger user;`,
  `delete from public.demo_showcase_entry where passport_id in ${replacementLegacy};`,
  `delete from public.dpp_current_pointer where passport_id in ${replacementLegacy};`,
  `delete from public.registry_submission_v2 where passport_id in ${replacementLegacy};`,
  `delete from public.connector_job where passport_id in ${replacementLegacy};`,
  `delete from public.dpp_publication_audit where passport_id in ${replacementLegacy};`,
  `delete from public.resolver_mapping where passport_id in ${replacementLegacy};`,
  `update public.dpp_review_task set published_version_id=null where passport_id in ${replacementLegacy};`,
  `delete from public.dpp_version where passport_id in ${replacementLegacy};`,
  `delete from public.dpp_review_task where passport_id in ${replacementLegacy};`,
  `delete from public.product_subject_identifier where subject_type='PASSPORT' and subject_id in ${replacementLegacy};`,
  `delete from public.dpp_passport where id in ${replacementLegacy};`
);
emitPassportSet([replacementPassport]);
sql.push(`DO $$ BEGIN
 IF (select count(*) from public.dpp_passport where passport_identifier=any(${arr(approved)}::text[])) <> 8 THEN RAISE EXCEPTION 'approved DPP insert count'; END IF;
 IF (select count(*) from public.resolver_mapping r join public.dpp_passport p on p.id=r.passport_id where p.passport_identifier=any(${arr(approved)}::text[]) and r.host='www.greanlean.com' and r.normalized_path='/p/'||p.passport_identifier) <> 8 THEN RAISE EXCEPTION 'approved resolver count'; END IF;
 IF (select count(*) from public.demo_showcase_entry e join public.dpp_passport p on p.id=e.passport_id where p.passport_identifier=any(${arr(approved)}::text[])) <> 8 THEN RAISE EXCEPTION 'demo catalog count'; END IF;
END $$;`);
const legacyDppSubquery = `(select id from public.dpp_passport where passport_identifier=any(${arr(legacy)}::text[]))`;
sql.push(`delete from public.demo_showcase_entry where passport_id in ${legacyDppSubquery};`, `delete from public.dpp_current_pointer where passport_id in ${legacyDppSubquery};`, `delete from public.registry_submission_v2 where passport_id in ${legacyDppSubquery};`, `delete from public.connector_job where passport_id in ${legacyDppSubquery};`, `delete from public.dpp_publication_audit where passport_id in ${legacyDppSubquery};`, `delete from public.resolver_mapping where passport_id in ${legacyDppSubquery};`);
const legacyReviewIds = legacyArchive.tables.dpp_review_task.map((row) => row.id);
sql.push(`update public.dpp_review_task set published_version_id=null where id=any(${arr(legacyReviewIds)}::uuid[]);`, `delete from public.dpp_version where passport_id in ${legacyDppSubquery};`, `delete from public.dpp_review_task where passport_id in ${legacyDppSubquery};`, `delete from public.product_subject_identifier where subject_type='PASSPORT' and subject_id in ${legacyDppSubquery};`, `delete from public.dpp_passport where id in ${legacyDppSubquery};`, `alter table public.dpp_version enable trigger user;`, `alter table public.dpp_publication_audit enable trigger user;`);
sql.push(`DO $$ BEGIN
 IF (select count(*) from public.dpp_passport where passport_identifier=any(${arr(legacy)}::text[])) <> 0 THEN RAISE EXCEPTION 'legacy remains'; END IF;
 IF (select count(*) from public.dpp_passport where passport_identifier=any(${arr(approved)}::text[])) <> 8 THEN RAISE EXCEPTION 'approved final count'; END IF;
 IF (select count(*) from public.dpp_passport) <> 8 THEN RAISE EXCEPTION 'total public DPP count'; END IF;
 IF (select count(*) from public.resolver_mapping r join public.dpp_passport p on p.id=r.passport_id where p.passport_identifier=any(${arr(approved)}::text[]) and r.host='www.greanlean.com') <> 8 THEN RAISE EXCEPTION 'resolver final count'; END IF;
 IF exists(select 1 from public.resolver_mapping r join public.dpp_passport p on p.id=r.passport_id where p.passport_identifier=any(${arr(approved)}::text[]) and (r.host in ('localhost','127.0.0.1','::1','greanlean-dpp-preprod.vercel.app') or r.normalized_path <> '/p/'||p.passport_identifier)) THEN RAISE EXCEPTION 'resolver leak'; END IF;
END $$;`, "ROLLBACK;");
await mkdir(evidence, { recursive: true });
const drySql = `${sql.join("\n\n")}\n`;
await writeFile(resolve(evidence, "production-target-id-map.json"), `${JSON.stringify({ generated_at: new Date().toISOString(), namespace_uuid: namespace, mappings: mapRows }, null, 2)}\n`);
await writeFile(resolve(evidence, "production-cutover.sql"), drySql);
const result = await query(drySql, false);
const commitSql = drySql.replace(/ROLLBACK;\s*$/u, "COMMIT;\n");
await writeFile(resolve(evidence, "production-cutover-commit.sql"), commitSql);
const baseline = await query(`select (select count(*)::int from public.dpp_passport where passport_identifier=any(${arr(legacy)}::text[])) legacy_dpps,(select count(*)::int from public.resolver_mapping r join public.dpp_passport p on p.id=r.passport_id where p.passport_identifier=any(${arr(legacy)}::text[])) legacy_resolvers,(select count(*)::int from public.dpp_passport where passport_identifier=any(${arr(approved)}::text[])) approved_dpps,(select count(*)::int from auth.users) auth_users,(select count(*)::int from public.tenant) tenants`);
const evidenceResult = { result: "PASS", namespace_uuid: namespace, id_map_source_row_count: mapRows.length, id_map_unmapped_insert_row_count: 0, id_map_duplicate_target_id_count: 0, id_map_cross_table_collision_count: 0, id_map_recompute_mismatch_count: 0, resolver_promotion_row_count: canonicalResolvers.length, transaction_result: "ROLLED_BACK", post_rollback: baseline[0], management_result: result };
await writeFile(resolve(evidence, "round-g4-2-cutover-dryrun-result.json"), `${JSON.stringify(evidenceResult, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(evidenceResult, null, 2)}\n`);
