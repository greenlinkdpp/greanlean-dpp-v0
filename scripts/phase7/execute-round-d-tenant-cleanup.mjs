import { execFileSync } from "node:child_process";

const projectRef = "efhiaufukjchxqhbmpvq";
const targetCode = "test001";
const protectedRefs = new Set(["lpxdbysgmdsjhxrjzhly", "qlrbrwrpvtnlphajvqao"]);

if (protectedRefs.has(projectRef) || !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes(projectRef)) {
  throw new Error("REFUSED: Round D cleanup is restricted to isolated PreProd.");
}

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
    signal: AbortSignal.timeout(120_000),
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`PreProd operation failed (${response.status}): ${raw.slice(0, 800)}`);
  return raw ? JSON.parse(raw) : [];
}

const [target] = await query(`select id, code, status from public.tenant where code = '${targetCode}'`, true);
if (!target || target.status !== "ARCHIVED") throw new Error("REFUSED: target must be the existing archived test001 Tenant.");
const [actor] = await query("select id from auth.users where lower(email) = 'songweinie@gmail.com'", true);
if (!actor) throw new Error("REFUSED: expected PreProd platform operator is unavailable.");

const result = await query(`select * from public.v2_delete_empty_archived_tenant('${target.id}'::uuid, '${actor.id}'::uuid, 'round-d-preprod-tenant-cleanup')`);
if (result.length !== 1 || result[0].deleted_tenant_code !== targetCode || result[0].deleted_role_count !== 5) {
  throw new Error(`Tenant cleanup did not return the expected result: ${JSON.stringify(result)}`);
}

process.stdout.write(`${JSON.stringify({ result: "PASS", deletedTenantCode: result[0].deleted_tenant_code, deletedRoleCount: result[0].deleted_role_count })}\n`);
