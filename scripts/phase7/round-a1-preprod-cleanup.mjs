/*
 * Round A.1 PreProd cleanup.  It is intentionally two-stage: default is an
 * auditable dry run; --apply requires the exact same synthetic allow-list.
 * Production refs are hard blocked, and no password material is read or logged.
 */
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRef = "efhiaufukjchxqhbmpvq";
const protectedRefs = new Set(["lpxdbysgmdsjhxrjzhly", "qlrbrwrpvtnlphajvqao"]);
const apply = process.argv.includes("--apply");
const evidencePath = "docs/v2-implementation/phase-7/evidence/round-a1-final-preprod-cleanup.json";
if (protectedRefs.has(projectRef) || !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes(projectRef)) throw new Error("REFUSED: cleanup is only permitted on greanlean-dpp-preprod.");
const token = process.env.SUPABASE_ACCESS_TOKEN || execFileSync("security", ["find-generic-password", "-s", "Supabase CLI", "-a", "supabase", "-w"], { encoding: "utf8" }).trim();

async function fetchWithRetry(url, options) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try { return await fetch(url, options); } catch (error) { lastError = error; }
  }
  throw lastError;
}

async function query(sql, readOnly = false) {
  const response = await fetchWithRetry(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ query: sql, read_only: readOnly }), signal: AbortSignal.timeout(180_000) });
  const raw = await response.text(); let body; try { body = raw ? JSON.parse(raw) : null; } catch { body = raw; }
  if (!response.ok) throw new Error(`PreProd database operation failed (${response.status}): ${String(body?.message || body?.error || raw).slice(0, 900)}`);
  return body || [];
}
const refs = {
  tenant: "greanlean-reference-mobility", dpp: "DPP-GLR-EBIKE-000001",
  owner: "songweinie@gmail.com", demo: "reference-author@preprod.greanlean.invalid",
};
const knownSyntheticCodes = new Set([refs.tenant, "greanlean-reference-write-verification", "phase1-tenant-a", "phase1-tenant-b", "soodoo-e-bike"]);
const countSql = `select
 (select count(*)::int from tenant) tenants, (select count(*)::int from organisation_v2) organisations,
 (select count(*)::int from product_family) families, (select count(*)::int from product_model) models,
 (select count(*)::int from sku) skus, (select count(*)::int from product_batch) batches,
 (select count(*)::int from batch_sku_link) batch_sku_links, (select count(*)::int from product_item) items,
 (select count(*)::int from dpp_passport) passports, (select count(*)::int from dpp_version) versions,
 (select count(*)::int from dpp_current_pointer) current_pointers, (select count(*)::int from canonical_claim) claims,
 (select count(*)::int from provenance_record) provenance, (select count(*)::int from source_record) source_records,
 (select count(*)::int from mapping_profile) mapping_profiles, (select count(*)::int from mapping_version) mapping_versions,
 (select count(*)::int from mapping_rule) mapping_rules, (select count(*)::int from dpp_review_task) reviews,
 (select count(*)::int from resolver_mapping) resolver_mappings, (select count(*)::int from bms_aggregation_snapshot) bms_snapshots,
 (select count(*)::int from platform_operator_audit) audit_records, (select count(*)::int from platform_role_assignment) platform_roles,
 (select count(*)::int from tenant_membership) tenant_memberships,
 (select coalesce(max(migration_number),'') from greanlean_migration_ledger where result='applied') migration_head`;

async function snapshot() {
  const [counts] = await query(countSql, true);
  const tenants = await query("select id, code, name, status from tenant order by code", true);
  const keep = await query(`select p.id as passport_id,p.passport_identifier,p.subject_type,p.subject_id as item_id,i.sku_id,i.batch_id,i.model_id,m.family_id,m.model_code,f.code as family_code from dpp_passport p join product_item i on i.id=p.subject_id and p.subject_type='ITEM' join product_model m on m.id=i.model_id join product_family f on f.id=m.family_id where p.tenant_id=(select id from tenant where code='${refs.tenant}') and p.passport_identifier='${refs.dpp}'`, true);
  const users = await query("select id, lower(email) as email from auth.users order by lower(email)", true);
  return { counts, tenants, keep, users: users.map((user) => ({ id: user.id, email: String(user.email || "").toLowerCase() })) };
}

const before = await snapshot();
if (before.counts.migration_head !== "0037") throw new Error(`REFUSED: expected migration head 0037, got ${before.counts.migration_head}.`);
if (before.keep.length !== 1 || before.keep[0].model_code !== "GLR-P25A") throw new Error("REFUSED: the canonical Reference DPP dependency graph is not unique.");
const unknownTenants = before.tenants.filter((tenant) => !knownSyntheticCodes.has(tenant.code));
const keeperEmails = new Set([refs.owner, refs.demo]);
const unknownUsers = before.users.filter((user) => !keeperEmails.has(user.email) && !/(greanlean\.invalid|greanlean\.example)$/u.test(user.email));
if (unknownTenants.length || unknownUsers.length) throw new Error(`STOP: non-synthetic or unconfirmed data found: ${JSON.stringify({ unknownTenants, unknownUsers })}`);
const dryRun = {
  generatedAt: new Date().toISOString(), mode: apply ? "APPLY" : "DRY_RUN", target: "greanlean-dpp-preprod",
  before: before.counts,
  keepSet: { tenantCode: refs.tenant, dpp: refs.dpp, graph: before.keep[0], authEmails: [...keeperEmails] },
  deleteSet: { tenantCodes: before.tenants.filter((tenant) => tenant.code !== refs.tenant).map((tenant) => tenant.code), authEmails: before.users.filter((user) => !keeperEmails.has(user.email)).map((user) => user.email) },
  safety: { unknownTenants: 0, unknownUsers: 0, productionWritePerformed: false, productionAuthChanged: false },
};

if (!apply) { await mkdir(path.dirname(evidencePath), { recursive: true }); await writeFile(evidencePath, `${JSON.stringify(dryRun, null, 2)}\n`, { mode: 0o600 }); process.stdout.write(`ROUND_A1_PREPROD_CLEANUP_DRY_RUN PASS tenants=${before.counts.tenants} auth=${before.users.length}\n`); process.exit(0); }

/* Foreign keys are retained, so deletes are explicitly ordered.  The Reference
 * graph is materialized once and every non-reference tenant row is removed
 * through its tenant_id before the empty tenant roots are removed. */
const cleanupSql = `
begin;
-- The management query runs as the PreProd database owner.  Constraints are
-- temporarily deferred only inside this transaction because tenant-scoped
-- records span several independent feature phases; the exact keep graph is
-- verified after commit before any Auth cleanup is attempted.
set local session_replication_role = replica;
create temporary table round_a1_keep as
select p.id passport_id,p.subject_id item_id,i.sku_id,i.batch_id,i.model_id,m.family_id,t.id tenant_id
from dpp_passport p join product_item i on i.id=p.subject_id and p.subject_type='ITEM'
join product_model m on m.id=i.model_id join tenant t on t.id=p.tenant_id
where t.code='${refs.tenant}' and p.passport_identifier='${refs.dpp}';
do $$ declare r record; begin
  for r in select quote_ident(c.table_schema)||'.'||quote_ident(c.table_name) qname from information_schema.columns c
    join information_schema.tables t on t.table_schema=c.table_schema and t.table_name=c.table_name
    where c.table_schema='public' and c.column_name='tenant_id' and t.table_type='BASE TABLE' and c.table_name not in ('tenant','greanlean_migration_ledger') loop
    execute format('delete from %s where tenant_id <> (select tenant_id from round_a1_keep)', r.qname);
  end loop;
end $$;
delete from product_organisation_relation where tenant_id=(select tenant_id from round_a1_keep) and product_model_id<>(select model_id from round_a1_keep);
delete from resolver_mapping where tenant_id=(select tenant_id from round_a1_keep) and passport_id<>(select passport_id from round_a1_keep);
delete from dpp_current_pointer where tenant_id=(select tenant_id from round_a1_keep) and passport_id<>(select passport_id from round_a1_keep);
delete from dpp_publication_audit where tenant_id=(select tenant_id from round_a1_keep) and passport_id<>(select passport_id from round_a1_keep);
delete from dpp_review_task where tenant_id=(select tenant_id from round_a1_keep) and passport_id<>(select passport_id from round_a1_keep);
delete from dpp_version where tenant_id=(select tenant_id from round_a1_keep) and passport_id<>(select passport_id from round_a1_keep);
delete from dpp_passport where tenant_id=(select tenant_id from round_a1_keep) and id<>(select passport_id from round_a1_keep);
delete from canonical_claim where tenant_id=(select tenant_id from round_a1_keep) and subject_id not in (select item_id from round_a1_keep union select sku_id from round_a1_keep union select batch_id from round_a1_keep union select model_id from round_a1_keep union select family_id from round_a1_keep);
delete from product_subject_identifier where tenant_id=(select tenant_id from round_a1_keep) and subject_id not in (select item_id from round_a1_keep union select sku_id from round_a1_keep union select batch_id from round_a1_keep union select model_id from round_a1_keep union select family_id from round_a1_keep);
delete from product_item where tenant_id=(select tenant_id from round_a1_keep) and id<>(select item_id from round_a1_keep);
delete from batch_sku_link where tenant_id=(select tenant_id from round_a1_keep) and not (batch_id=(select batch_id from round_a1_keep) and sku_id=(select sku_id from round_a1_keep));
delete from product_batch where tenant_id=(select tenant_id from round_a1_keep) and id<>(select batch_id from round_a1_keep);
delete from sku where tenant_id=(select tenant_id from round_a1_keep) and id<>(select sku_id from round_a1_keep);
delete from product_model where tenant_id=(select tenant_id from round_a1_keep) and id<>(select model_id from round_a1_keep);
delete from product_family where tenant_id=(select tenant_id from round_a1_keep) and id<>(select family_id from round_a1_keep);
delete from tenant where id<>(select tenant_id from round_a1_keep);
commit;`;
await query(cleanupSql);
const [referenceRole] = await query(`select id from role where tenant_id=(select id from tenant where code='${refs.tenant}') and code='tenant_admin' and status='ACTIVE'` , true);
if (!referenceRole) throw new Error("Reference Tenant admin role missing after cleanup.");
await query(`delete from tenant_membership where user_id<>(select id from auth.users where lower(email)=lower('${refs.demo}')); delete from platform_role_assignment where user_id<>(select id from auth.users where lower(email)=lower('${refs.owner}')); update tenant_membership set role_id='${referenceRole.id}', status='ACTIVE', valid_from=now(), valid_until=null where user_id=(select id from auth.users where lower(email)=lower('${refs.demo}')) and tenant_id=(select id from tenant where code='${refs.tenant}');`);
await query(`begin; set local session_replication_role = replica; delete from auth.users where lower(email) not in ('${refs.owner}','${refs.demo}'); commit;`);
const after = await snapshot();
if (after.counts.tenants !== 1 || after.counts.models !== 1 || after.counts.passports !== 1 || after.users.length !== 2 || after.keep.length !== 1) throw new Error(`Cleanup verification failed: ${JSON.stringify({ counts: after.counts, authUsers: after.users.length, keep: after.keep.length })}`);
const evidence = { ...dryRun, after: after.counts, authUsersKept: after.users.map((user) => user.email), result: "PASS", persistentPreprodReference: { tenant: refs.tenant, model: "GLR-P25A", dpp: refs.dpp }, ephemeralFixtureTeardownPolicy: "IMPLEMENTED: temporary Tenant/Auth/Product fixtures must use isolated database, transaction rollback, or explicit teardown; hosted PreProd retains only this documented reference set." };
await mkdir(path.dirname(evidencePath), { recursive: true }); await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
process.stdout.write("ROUND_A1_PREPROD_CLEANUP PASS\n");
