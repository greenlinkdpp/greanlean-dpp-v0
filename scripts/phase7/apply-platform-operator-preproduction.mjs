import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRef = "efhiaufukjchxqhbmpvq";
const protectedRefs = new Set(["lpxdbysgmdsjhxrjzhly", "qlrbrwrpvtnlphajvqao"]);
const migrationPath = "supabase/migrations/0036_v2_platform_operator_multitenant.sql";
const rollbackPath = "supabase/rollbacks/0036_v2_platform_operator_multitenant.down.sql";
const evidencePath = "docs/v2-implementation/phase-7/evidence/platform-admin-multitenant-database-preprod.json";
if (protectedRefs.has(projectRef)) throw new Error("REFUSED: protected target.");
if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.includes(projectRef)) throw new Error("REFUSED: isolated PreProd environment is required.");

const token = process.env.SUPABASE_ACCESS_TOKEN || execFileSync(
  "security",
  ["find-generic-password", "-s", "Supabase CLI", "-a", "supabase", "-w"],
  { encoding: "utf8" },
).trim();

async function query(sql, readOnly = false) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ query: sql, read_only: readOnly }),
    signal: AbortSignal.timeout(180_000),
  });
  const raw = await response.text();
  let body;
  try { body = raw ? JSON.parse(raw) : null; } catch { body = null; }
  if (!response.ok) throw new Error(`Database query failed (${response.status}): ${String(body?.message ?? body?.error ?? raw).slice(0, 1000)}`);
  return body;
}

const stateSql = `
select
  (select coalesce(max(migration_number),'') from public.greanlean_migration_ledger where result='applied') as head,
  (select count(*)::int from public.tenant_membership) as tenant_memberships,
  (select count(*)::int from public.tenant) as tenants,
  (select count(*)::int from public.products) as v1_products,
  (select count(*)::int from public.dpp_publication) as v1_publications,
  (select count(*)::int from public.product_model where tenant_id=(select id from public.tenant where code='greanlean-reference-mobility')) as reference_models,
  (select count(*)::int from public.sku where tenant_id=(select id from public.tenant where code='greanlean-reference-mobility')) as reference_skus,
  (select count(*)::int from public.product_item where tenant_id=(select id from public.tenant where code='greanlean-reference-mobility')) as reference_items,
  (select count(*)::int from public.canonical_claim where tenant_id=(select id from public.tenant where code='greanlean-reference-mobility')) as reference_claims,
  (select count(*)::int from public.dpp_passport where tenant_id=(select id from public.tenant where code='greanlean-reference-mobility')) as reference_passports
`;
const migration = await readFile(migrationPath, "utf8");
const rollback = await readFile(rollbackPath, "utf8");
const before = (await query(stateSql, true))[0];
if (!["0035", "0036"].includes(before.head)) throw new Error(`REFUSED: expected PreProd head 0035/0036, found ${before.head}.`);

if (before.head === "0036") await query(rollback, false);
await query(migration, false);
const afterApply = (await query(`${stateSql},
  to_regclass('public.platform_role_assignment') is not null as assignment_table,
  to_regclass('public.platform_operator_audit') is not null as audit_table,
  (select count(*)::int from public.capability where code like 'platform.%') as platform_capabilities,
  (select count(*)::int from public.role where tenant_id is null and code='platform_operator' and role_class='PLATFORM') as platform_roles,
  (select count(*)::int from public.platform_role_assignment where status='ACTIVE') as active_platform_assignments
`, true))[0];
if (afterApply.head !== "0036" || !afterApply.assignment_table || !afterApply.audit_table || afterApply.platform_capabilities !== 22 || afterApply.platform_roles !== 1) {
  throw new Error(`0036 apply verification failed: ${JSON.stringify(afterApply)}`);
}
if (afterApply.tenant_memberships !== before.tenant_memberships) throw new Error("Platform migration changed Tenant membership count.");

await query(rollback, false);
const afterRollback = (await query(`${stateSql},
  to_regclass('public.platform_role_assignment') is null as assignment_removed,
  to_regclass('public.platform_operator_audit') is null as audit_removed,
  (select count(*)::int from public.capability where code like 'platform.%') as platform_capabilities
`, true))[0];
if (afterRollback.head !== "0035" || !afterRollback.assignment_removed || !afterRollback.audit_removed || afterRollback.platform_capabilities !== 0) {
  throw new Error(`0036 rollback verification failed: ${JSON.stringify(afterRollback)}`);
}

await query(migration, false);
const finalState = (await query(`${stateSql},
  (select count(*)::int from public.capability where code like 'platform.%') as platform_capabilities,
  (select count(*)::int from public.platform_role_assignment where status='ACTIVE') as active_platform_assignments,
  (select count(*)::int from public.tenant_membership tm join public.platform_role_assignment pa on pa.user_id=tm.user_id) as platform_users_with_tenant_membership
`, true))[0];
if (finalState.head !== "0036" || finalState.platform_capabilities !== 22 || finalState.tenant_memberships !== before.tenant_memberships) {
  throw new Error(`0036 final verification failed: ${JSON.stringify(finalState)}`);
}

const protectedKeys = ["tenants", "v1_products", "v1_publications", "reference_models", "reference_skus", "reference_items", "reference_claims", "reference_passports"];
for (const key of protectedKeys) {
  if (finalState[key] !== before[key]) throw new Error(`Protected data changed for ${key}: ${before[key]} -> ${finalState[key]}`);
}

const evidence = {
  generatedAt: new Date().toISOString(),
  target: { environment: "preproduction", projectRefFingerprint: createHash("sha256").update(projectRef).digest("hex").slice(0, 12) },
  migration: { file: migrationPath, sha256: createHash("sha256").update(migration).digest("hex") },
  rollback: { file: rollbackPath, sha256: createHash("sha256").update(rollback).digest("hex") },
  before, afterApply, afterRollback, finalState,
  assertions: {
    tenantMembershipsUnchanged: true,
    v1DataUnchanged: true,
    referenceDataUnchanged: true,
    rollbackReapply: "PASS",
  },
  result: "PASS",
  productionWritePerformed: false,
  productionDeployed: false,
};
await mkdir(path.dirname(evidencePath), { recursive: true });
await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
process.stdout.write("PREPRODUCTION 0036 APPLY/ROLLBACK/REAPPLY PASS\n");
