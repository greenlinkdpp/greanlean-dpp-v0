import { createHash, randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRef = "efhiaufukjchxqhbmpvq";
const protectedRefs = new Set(["lpxdbysgmdsjhxrjzhly", "qlrbrwrpvtnlphajvqao"]);
const email = "phase7-platform-operator@preprod.greanlean.invalid";
const keychainService = "GreanLean Phase7 PreProd Platform Operator";
const evidencePath = "docs/v2-implementation/phase-7/evidence/platform-admin-preprod-identity.json";
if (protectedRefs.has(projectRef)) throw new Error("REFUSED: protected target.");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl?.includes(projectRef) || !serviceKey) throw new Error("REFUSED: isolated PreProd service-role environment is required.");
const token = process.env.SUPABASE_ACCESS_TOKEN || execFileSync("security", ["find-generic-password", "-s", "Supabase CLI", "-a", "supabase", "-w"], { encoding: "utf8" }).trim();

async function managementQuery(sql, readOnly = false) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ query: sql, read_only: readOnly }), signal: AbortSignal.timeout(120_000),
  });
  const raw = await response.text();
  const body = raw ? JSON.parse(raw) : null;
  if (!response.ok) throw new Error(`PreProd query failed (${response.status}): ${String(body?.message || body?.error || raw).slice(0, 500)}`);
  return body;
}

async function auth(pathname, init = {}) {
  const response = await fetch(`${supabaseUrl}/auth/v1/admin${pathname}`, {
    ...init,
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "content-type": "application/json", ...(init.headers || {}) },
    signal: AbortSignal.timeout(30_000),
  });
  const raw = await response.text();
  const body = raw ? JSON.parse(raw) : null;
  if (!response.ok) throw new Error(`PreProd Auth failed (${response.status}): ${String(body?.message || body?.error || raw).slice(0, 500)}`);
  return body;
}

const password = `P7-${randomBytes(24).toString("base64url")}!a9`;
const listed = await auth("/users?page=1&per_page=1000");
let user = listed.users?.find((candidate) => candidate.email?.toLowerCase() === email);
if (!user) {
  user = await auth("/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { synthetic: true, environment: "preproduction", purpose: "phase7_platform_multitenant_acceptance" } }) });
} else {
  user = await auth(`/users/${user.id}`, { method: "PUT", body: JSON.stringify({ password, email_confirm: true, user_metadata: { ...(user.user_metadata || {}), synthetic: true, environment: "preproduction", purpose: "phase7_platform_multitenant_acceptance" } }) });
}

execFileSync("security", ["add-generic-password", "-U", "-s", keychainService, "-a", email, "-w", password]);
const escapedUserId = String(user.id).replaceAll("'", "''");
await managementQuery(`
insert into public.platform_role_assignment(user_id, role_id, status, valid_from)
select '${escapedUserId}'::uuid, id, 'ACTIVE', now()
from public.role
where tenant_id is null and code='platform_operator' and role_class='PLATFORM' and status='ACTIVE'
on conflict (user_id) do update set role_id=excluded.role_id, status='ACTIVE', valid_from=now(), valid_until=null, updated_at=now();
`);
const verification = (await managementQuery(`
select
  (select max(migration_number) from public.greanlean_migration_ledger where result='applied') as head,
  (select count(*)::int from public.platform_role_assignment where user_id='${escapedUserId}' and status='ACTIVE') as active_platform_assignments,
  (select count(*)::int from public.tenant_membership where user_id='${escapedUserId}') as tenant_memberships,
  (select count(*)::int from public.role_capability rc join public.capability c on c.id=rc.capability_id join public.role r on r.id=rc.role_id where r.code='platform_operator' and r.tenant_id is null and c.code like 'platform.%') as platform_capabilities
`, true))[0];
if (verification.head !== "0036" || verification.active_platform_assignments !== 1 || verification.tenant_memberships !== 0 || verification.platform_capabilities !== 22) {
  throw new Error(`PreProd Platform Operator verification failed: ${JSON.stringify(verification)}`);
}

const evidence = {
  generatedAt: new Date().toISOString(),
  target: { environment: "preproduction", projectRefFingerprint: createHash("sha256").update(projectRef).digest("hex").slice(0, 12) },
  identity: { email, userIdFingerprint: createHash("sha256").update(user.id).digest("hex").slice(0, 16), synthetic: true, secretRecorded: false },
  verification,
  authorityModel: "PLATFORM_ASSIGNMENT_ONLY",
  result: "PASS",
  productionWritePerformed: false,
};
await mkdir(path.dirname(evidencePath), { recursive: true });
await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
process.stdout.write("PREPRODUCTION PLATFORM OPERATOR PROVISIONED WITHOUT TENANT MEMBERSHIP\n");
