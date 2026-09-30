import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const projectRef = "efhiaufukjchxqhbmpvq";
const protectedRefs = new Set(["lpxdbysgmdsjhxrjzhly", "qlrbrwrpvtnlphajvqao"]);
if (protectedRefs.has(projectRef) || !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes(projectRef)) throw new Error("REFUSED: Round A.1 is restricted to hosted PreProd.");
const token = process.env.SUPABASE_ACCESS_TOKEN || execFileSync("security", ["find-generic-password", "-s", "Supabase CLI", "-a", "supabase", "-w"], { encoding: "utf8" }).trim();
async function query(sql, readOnly = false) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ query: sql, read_only: readOnly }), signal: AbortSignal.timeout(180_000) });
  const raw = await response.text(); let body; try { body = raw ? JSON.parse(raw) : null; } catch { body = raw; }
  if (!response.ok) throw new Error(`PreProd query failed (${response.status}): ${String(body?.message || body?.error || raw).slice(0, 600)}`);
  return body;
}
const migration = await readFile("supabase/migrations/0037_v2_product_organisation_relationships.sql", "utf8");
const [before] = await query("select coalesce(max(migration_number),'') as head from public.greanlean_migration_ledger where result='applied'", true);
if (!['0036', '0037'].includes(before.head)) throw new Error(`REFUSED: expected migration head 0036/0037, got ${before.head}.`);
if (before.head === '0036') await query(migration);
const [after] = await query("select coalesce(max(migration_number),'') as head, to_regclass('public.product_organisation_relation') is not null as relation_table, (select relrowsecurity from pg_class where oid='public.product_organisation_relation'::regclass) as rls_enabled from public.greanlean_migration_ledger where migration_number='0037'", true);
if (after.head !== '0037' || !after.relation_table || !after.rls_enabled) throw new Error("0037 verification failed.");
process.stdout.write(JSON.stringify({ result: "PASS", migration: "0037", checksum: createHash("sha256").update(migration).digest("hex"), beforeHead: before.head, afterHead: after.head, productionWritePerformed: false }) + "\n");
