import { execFileSync } from "node:child_process";

const projectRef = "efhiaufukjchxqhbmpvq";
const protectedRefs = new Set(["lpxdbysgmdsjhxrjzhly", "qlrbrwrpvtnlphajvqao"]);
if (protectedRefs.has(projectRef)) throw new Error("REFUSED: protected target.");
const token = process.env.SUPABASE_ACCESS_TOKEN || execFileSync(
  "security",
  ["find-generic-password", "-s", "Supabase CLI", "-a", "supabase", "-w"],
  { encoding: "utf8" },
).trim();

async function query(sql) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ query: sql, read_only: true }),
    signal: AbortSignal.timeout(180_000),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`Query failed (${response.status}): ${JSON.stringify(body).slice(0, 500)}`);
  return body;
}

const host = "greanlean-dpp-preprod.vercel.app";
const identifier = "DPP-P4-MUJEZBWJ140310";
const paths = [
  `/p/${identifier}`,
  `/01/${identifier}`,
  `/${identifier}`,
  `/api/v2/resolver/${identifier}`,
];
const literal = (value) => `'${value.replaceAll("'", "''")}'`;
const explain = async (sql) => (await query(`explain (analyze, buffers, format json) ${sql}`))[0]["QUERY PLAN"][0];

const rowCounts = (await query(`
  select
    (select count(*)::int from public.product_subject_identifier) identifier_rows,
    (select count(*)::int from public.resolver_mapping) mapping_rows,
    (select count(*)::int from public.dpp_passport) passport_rows,
    (select count(*)::int from public.dpp_current_pointer) pointer_rows,
    (select count(*)::int from public.dpp_version) version_rows
`))[0];
const indexes = await query(`
  select tablename, indexname, indexdef
  from pg_indexes
  where schemaname='public' and tablename in (
    'product_subject_identifier','resolver_mapping','dpp_passport','dpp_current_pointer','dpp_version'
  )
  order by tablename,indexname
`);
const plans = {
  hostAllowlist: await explain(`select host from public.resolver_host_allowlist where host=${literal(host)} and status='ACTIVE'`),
  pathMapping: await explain(`select * from public.resolver_mapping where host=${literal(host)} and is_public=true and status='ACTIVE' and normalized_path = any(array[${paths.map(literal).join(",")}])`),
  identifierLookup: await explain(`select id from public.product_subject_identifier where status='ACTIVE' and normalized_value = any(array[${literal(identifier)},${literal(identifier.toUpperCase())}])`),
  identifierMapping: await explain(`select * from public.resolver_mapping where host=${literal(host)} and is_public=true and status='ACTIVE' and identifier_id in (select id from public.product_subject_identifier where status='ACTIVE' and normalized_value = any(array[${literal(identifier)},${literal(identifier.toUpperCase())}]))`),
  passport: await explain(`select * from public.dpp_passport where passport_identifier=${literal(identifier)} and status='ACTIVE'`),
  pointerVersion: await explain(`select p.current_version_id,v.* from public.dpp_current_pointer p join public.dpp_version v on v.id=p.current_version_id and v.passport_id=p.passport_id and v.tenant_id=p.tenant_id where p.passport_id=(select id from public.dpp_passport where passport_identifier=${literal(identifier)} limit 1)`),
};

function summarize(plan) {
  return {
    planningMs: plan["Planning Time"],
    executionMs: plan["Execution Time"],
    rootNode: plan.Plan?.["Node Type"],
    actualRows: plan.Plan?.["Actual Rows"],
    sharedHitBlocks: plan.Plan?.["Shared Hit Blocks"],
    plan: plan.Plan,
  };
}

process.stdout.write(`${JSON.stringify({
  generatedAt: new Date().toISOString(),
  target: "Hosted PreProd database only",
  rowCounts,
  indexes,
  plans: Object.fromEntries(Object.entries(plans).map(([name, plan]) => [name, summarize(plan)])),
  currentApplicationQueryCount: "6 normal; 7 when identifier mappings exist; additional per alias hop; withdrawn fallback adds 1",
}, null, 2)}\n`);
