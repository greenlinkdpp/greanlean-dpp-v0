import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRef = "efhiaufukjchxqhbmpvq";
const protectedRefs = new Set(["lpxdbysgmdsjhxrjzhly", "qlrbrwrpvtnlphajvqao"]);
const evidencePath = "docs/v2-implementation/phase-6b/evidence/preproduction-rollback-rehearsal.json";
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

const state = await query(
  "select (select coalesce(max(migration_number),'') from public.greanlean_migration_ledger where result='applied') as head, " +
  "(select count(*) from public.product_model)::int as product_models, " +
  "(select count(*) from public.dpp_passport)::int as passports, " +
  "(select count(*) from public.connector_instance)::int as connectors",
  true,
);
const initial = state?.[0];
if (initial?.head !== "0033") throw new Error("REFUSED: expected migration head 0033.");
if ([initial.product_models, initial.passports, initial.connectors].some((count) => count !== 0)) {
  throw new Error("REFUSED: business data exists; rollback rehearsal must precede synthetic-data creation.");
}

const rollbackFiles = (await readdir("supabase/rollbacks"))
  .filter((name) => /^00(2[7-9]|3[0-3])_.+\.down\.sql$/u.test(name))
  .sort((left, right) => right.localeCompare(left));
const migrationFiles = (await readdir("supabase/migrations"))
  .filter((name) => /^00(2[7-9]|3[0-3])_.+\.sql$/u.test(name))
  .sort((left, right) => left.localeCompare(right));
if (rollbackFiles.length !== 7 || migrationFiles.length !== 7) throw new Error("Unexpected Phase 1-6B rollback/migration set.");

async function executeFiles(directory, files) {
  const results = [];
  for (const file of files) {
    const sql = await readFile(path.join(directory, file), "utf8");
    const started = performance.now();
    await query(sql, false);
    results.push({ file, sha256: createHash("sha256").update(sql).digest("hex"), elapsedMs: Math.round(performance.now() - started), status: "PASS" });
    console.log(`PASS ${file}`);
  }
  return results;
}

const rolledBack = await executeFiles("supabase/rollbacks", rollbackFiles);
const afterRollback = (await query(
  "select coalesce(max(migration_number),'') as head, " +
  "to_regclass('public.tenant') is null as tenant_removed, " +
  "to_regclass('public.product_model') is null as product_model_removed, " +
  "to_regclass('public.dpp_passport') is null as passport_removed, " +
  "to_regclass('public.connector_instance') is null as connector_removed " +
  "from public.greanlean_migration_ledger where result='applied'",
  true,
))?.[0];
if (afterRollback?.head !== "0026" || !afterRollback.tenant_removed || !afterRollback.product_model_removed || !afterRollback.passport_removed || !afterRollback.connector_removed) {
  throw new Error("Rollback verification failed.");
}

const reapplied = await executeFiles("supabase/migrations", migrationFiles);
const afterReapply = (await query(
  "select coalesce(max(migration_number),'') as head, " +
  "to_regclass('public.tenant') is not null as tenant_present, " +
  "to_regclass('public.product_model') is not null as product_model_present, " +
  "to_regclass('public.dpp_passport') is not null as passport_present, " +
  "to_regclass('public.connector_instance') is not null as connector_present " +
  "from public.greanlean_migration_ledger where result='applied'",
  true,
))?.[0];
if (afterReapply?.head !== "0033" || !afterReapply.tenant_present || !afterReapply.product_model_present || !afterReapply.passport_present || !afterReapply.connector_present) {
  throw new Error("Reapply verification failed.");
}

const evidence = {
  generatedAt: new Date().toISOString(),
  target: { environment: "preproduction", projectRefFingerprint: createHash("sha256").update(projectRef).digest("hex").slice(0, 12) },
  initial,
  rolledBack,
  afterRollback,
  reapplied,
  afterReapply,
  result: "PASS",
  productionWritePerformed: false,
  productionTrafficSwitched: false,
};
await mkdir(path.dirname(evidencePath), { recursive: true });
await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
console.log("PREPRODUCTION ROLLBACK REHEARSAL PASS");
