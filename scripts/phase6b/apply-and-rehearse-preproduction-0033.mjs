import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRef = "efhiaufukjchxqhbmpvq";
const protectedRefs = new Set(["lpxdbysgmdsjhxrjzhly", "qlrbrwrpvtnlphajvqao"]);
const migrationPath = "supabase/migrations/0033_v2_phase6b_future_tenant_connector_capabilities.sql";
const rollbackPath = "supabase/rollbacks/0033_v2_phase6b_future_tenant_connector_capabilities.down.sql";
const evidencePath = "docs/v2-implementation/phase-6b/evidence/preproduction-0033-capability-repair.json";
if (protectedRefs.has(projectRef)) throw new Error("REFUSED: protected target.");

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
  if (!response.ok) throw new Error(`Database query failed (${response.status}): ${String(body?.message ?? body?.error ?? "unknown").slice(0, 500)}`);
  return body;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const migration = await readFile(migrationPath, "utf8");
const rollback = await readFile(rollbackPath, "utf8");
const initial = (await query(
  "select (select coalesce(max(migration_number),'') from public.greanlean_migration_ledger where result='applied') as head, " +
  "exists(select 1 from public.role r join public.role_capability rc on rc.role_id=r.id join public.capability c on c.id=rc.capability_id " +
  "where r.tenant_id='11111111-1111-4111-8111-111111111111' and r.code='tenant_admin' and c.code='connector.manage') as repaired",
  true,
))?.[0];
assert(
  (initial?.head === "0032" && initial.repaired === false) ||
  (initial?.head === "0033" && initial.repaired === true),
  "REFUSED: expected the observed 0032 gap or the interrupted 0033 rehearsal state.",
);

await query(
  "delete from public.role where tenant_id in (select id from public.tenant where name='Phase 6B future-role probe' and code like 'p6b-%'); " +
  "delete from public.tenant where name='Phase 6B future-role probe' and code like 'p6b-%';",
  false,
);

if (initial.head === "0032") await query(migration, false);
const afterApply = (await query(
  "select (select coalesce(max(migration_number),'') from public.greanlean_migration_ledger where result='applied') as head, " +
  "exists(select 1 from public.role r join public.role_capability rc on rc.role_id=r.id join public.capability c on c.id=rc.capability_id " +
  "where r.tenant_id='11111111-1111-4111-8111-111111111111' and r.code='tenant_admin' and c.code='connector.manage') as repaired",
  true,
))?.[0];
assert(afterApply?.head === "0033" && afterApply.repaired === true, "0033 did not repair the existing synthetic tenant.");

const temporaryTenantId = randomUUID();
await query(`insert into public.tenant(id,code,name,status) values ('${temporaryTenantId}','p6b-${temporaryTenantId.slice(0, 8)}','Phase 6B future-role probe','ACTIVE')`, false);
const futureTenant = (await query(
  `select count(*)::int as binding_count from public.role r join public.role_capability rc on rc.role_id=r.id join public.capability c on c.id=rc.capability_id ` +
  `where r.tenant_id='${temporaryTenantId}' and r.code='tenant_admin' and c.code in ('connector.view','connector.manage','connector.execute','connector.retry','connector.read_receipt','webhook.manage')`,
  true,
))?.[0];
assert(futureTenant?.binding_count === 6, "Future tenant roles did not receive all Phase 5 capabilities.");
await query(`delete from public.role where tenant_id='${temporaryTenantId}'; delete from public.tenant where id='${temporaryTenantId}'`, false);

await query(rollback, false);
const afterRollback = (await query(
  "select (select coalesce(max(migration_number),'') from public.greanlean_migration_ledger where result='applied') as head, to_regprocedure('public.v2_phase6b_seed_connector_role_capabilities()') is null as function_removed, " +
  "to_regclass('public.greanlean_0033_role_capability_delta') is null as delta_removed",
  true,
))?.[0];
assert(afterRollback?.head === "0032" && afterRollback.function_removed && afterRollback.delta_removed, "0033 rollback verification failed.");

await query(migration, false);
const afterReapply = (await query(
  "select (select coalesce(max(migration_number),'') from public.greanlean_migration_ledger where result='applied') as head, " +
  "exists(select 1 from public.role r join public.role_capability rc on rc.role_id=r.id join public.capability c on c.id=rc.capability_id " +
  "where r.tenant_id='11111111-1111-4111-8111-111111111111' and r.code='tenant_admin' and c.code='connector.manage') as repaired",
  true,
))?.[0];
assert(afterReapply?.head === "0033" && afterReapply.repaired, "0033 reapply verification failed.");

const evidence = {
  generatedAt: new Date().toISOString(),
  target: { environment: "preproduction", projectRefFingerprint: createHash("sha256").update(projectRef).digest("hex").slice(0, 12) },
  migration: { file: migrationPath, sha256: createHash("sha256").update(migration).digest("hex") },
  rollback: { file: rollbackPath, sha256: createHash("sha256").update(rollback).digest("hex") },
  initial,
  afterApply,
  futureTenantRoleBindingCount: futureTenant.binding_count,
  afterRollback,
  afterReapply,
  result: "PASS",
  productionWritePerformed: false,
  productionTrafficSwitched: false,
};
await mkdir(path.dirname(evidencePath), { recursive: true });
await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
console.log("PREPRODUCTION 0033 CAPABILITY REPAIR/ROLLBACK/REAPPLY PASS");
