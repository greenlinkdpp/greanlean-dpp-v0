import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const projectRef = "efhiaufukjchxqhbmpvq";
const protectedRefs = new Set(["lpxdbysgmdsjhxrjzhly", "qlrbrwrpvtnlphajvqao"]);
if (protectedRefs.has(projectRef)) throw new Error("REFUSED: protected target.");
const token = process.env.SUPABASE_ACCESS_TOKEN || execFileSync(
  "security",
  ["find-generic-password", "-s", "Supabase CLI", "-a", "supabase", "-w"],
  { encoding: "utf8" },
).trim();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey || !supabaseUrl.includes(projectRef)) throw new Error("PreProd service-role environment is required.");

async function query(sql, readOnly) {
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

const initial = (await query("select max(migration_number) as head from public.greanlean_migration_ledger where result='applied'", true))[0];
if (!['0034', '0035'].includes(initial.head)) throw new Error(`REFUSED: expected PreProd head 0034/0035, found ${initial.head}.`);
if (initial.head === '0034') {
  await query(await readFile("supabase/migrations/0035_phase6c_resolver_fast_path.sql", "utf8"), false);
}

const sqlLiteral = (value) => `'${value.replaceAll("'", "''")}'`;
async function resolve(identifier) {
  const paths = [`/p/${identifier}`, `/01/${identifier}`, `/${identifier}`, `/api/v2/resolver/${identifier}`];
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/v2_phase6c_resolve_public_passport`, {
    method: "POST",
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, "content-type": "application/json" },
    body: JSON.stringify({ p_host: "greanlean-dpp-preprod.vercel.app", p_identifier: identifier, p_candidate_paths: paths }),
    signal: AbortSignal.timeout(30_000),
  });
  const row = await response.json();
  if (!response.ok) throw new Error(`Fast-path RPC failed (${response.status}): ${JSON.stringify(row).slice(0, 500)}`);
  return { identifier, kind: row.kind, passportIdentifier: row.passport?.passport_identifier, publicationState: row.version?.publication_state, payloadHashPresent: /^[a-f0-9]{64}$/.test(row.version?.payload_hash || "") };
}

const [dppId, gtin, legacyAlias] = await Promise.all([
  resolve("DPP-P4-MUJEZBWJ140310"),
  resolve("7904891679884"),
  resolve("legacy-mujezbwj140310"),
]);
const verification = (await query(`
  select
    (select max(migration_number) from public.greanlean_migration_ledger where result='applied') as head,
    to_regprocedure('public.v2_phase6c_resolve_public_passport(text,text,text[])') is not null as function_present,
    to_regclass('public.product_identifier_normalized_active_idx') is not null as index_present,
    has_function_privilege('service_role','public.v2_phase6c_resolve_public_passport(text,text,text[])','EXECUTE') as service_role_execute,
    has_function_privilege('anon','public.v2_phase6c_resolve_public_passport(text,text,text[])','EXECUTE') as anon_execute,
    has_function_privilege('authenticated','public.v2_phase6c_resolve_public_passport(text,text,text[])','EXECUTE') as authenticated_execute
`, true))[0];
if (verification.head !== '0035' || !verification.function_present || !verification.index_present || !verification.service_role_execute || verification.anon_execute || verification.authenticated_execute) {
  throw new Error(`0035 verification failed: ${JSON.stringify(verification)}`);
}
for (const result of [dppId, gtin, legacyAlias]) {
  if (result.kind !== 'PUBLISHED' || result.passportIdentifier !== 'DPP-P4-MUJEZBWJ140310' || result.publicationState !== 'PUBLISHED' || !result.payloadHashPresent) {
    throw new Error(`Resolver fast-path mismatch: ${JSON.stringify(result)}`);
  }
}

process.stdout.write(`${JSON.stringify({
  generatedAt: new Date().toISOString(),
  target: "Hosted PreProd only",
  initialHead: initial.head,
  verification,
  compatibility: { dppId, gtin, legacyAlias },
  databaseFunctionPlan: "Measured through hosted Server-Timing after deployment; management SQL role intentionally lacks EXECUTE.",
  productionWritePerformed: false,
}, null, 2)}\n`);
