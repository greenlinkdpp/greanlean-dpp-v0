import { execFileSync } from "node:child_process";

const projectRef = "lpxdbysgmdsjhxrjzhly";
const token = process.env.SUPABASE_ACCESS_TOKEN || execFileSync("security", ["find-generic-password", "-s", "Supabase CLI", "-a", "supabase", "-w"], { encoding: "utf8" }).trim();
async function query(sql) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ query: sql, read_only: true }), signal: AbortSignal.timeout(120_000) });
  const raw = await response.text();
  if (!response.ok) throw new Error(`Production read-only query failed (${response.status}): ${raw.slice(0, 800)}`);
  return raw ? JSON.parse(raw) : [];
}
const tables = await query("select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by table_name");
const names = new Set(tables.map((row) => row.table_name));
const count = async (table) => names.has(table) ? Number((await query(`select count(*)::int as count from public.${table}`))[0]?.count || 0) : null;
const [migration, rlsDisabled, broadPolicies, authUsers, tenantCount, organisationCount, modelCount, dppCount, publishedVersions, resolverMappings, leadCount, demoCount] = await Promise.all([
  names.has("greanlean_migration_ledger") ? query("select max(migration_number) as head from public.greanlean_migration_ledger where result='applied'") : [],
  query("select n.nspname as schema_name,c.relname as table_name from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relispartition and not c.relrowsecurity order by c.relname"),
  query("select tablename, policyname, cmd from pg_policies where schemaname='public' and (coalesce(qual,'') ~* 'using\\s*\\(\\s*true\\s*\\)' or coalesce(with_check,'') ~* 'with\\s+check\\s*\\(\\s*true\\s*\\)') order by tablename, policyname"),
  query("select count(*)::int as count from auth.users"), count("tenant"), count("organisation_v2"), count("product_model"), count("dpp_passport"),
  names.has("dpp_version") ? query("select count(*)::int as count from public.dpp_version where publication_state='PUBLISHED'") : [], count("resolver_mapping"), count("leads"), count("demo_showcase_entry"),
]);
const [tenants, membershipSummary, orphanOrganisations, orphanMemberships] = await Promise.all([
  names.has("tenant") ? query("select code, status from public.tenant order by code") : [],
  names.has("tenant_membership") ? query("select status, count(*)::int as count from public.tenant_membership group by status order by status") : [],
  names.has("organisation_v2") && names.has("tenant") ? query("select count(*)::int as count from public.organisation_v2 o left join public.tenant t on t.id=o.tenant_id where t.id is null") : [],
  names.has("tenant_membership") && names.has("tenant") ? query("select count(*)::int as count from public.tenant_membership m left join public.tenant t on t.id=m.tenant_id where t.id is null") : [],
]);
const result = {
  projectRef, migrationHead: migration[0]?.head || null, publicTableCount: tables.length,
  rlsDisabledTables: rlsDisabled.map((row) => row.table_name), broadPolicies,
  authUsers: authUsers[0]?.count ?? null, tenantCount, organisationCount, modelCount, dppCount,
  publishedVersions: publishedVersions[0]?.count ?? null, resolverMappings: resolverMappings, leadTableExists: names.has("leads"), leadCount, demoCatalogExists: names.has("demo_showcase_entry"), demoCount,
  tenants, membershipSummary, orphanOrganisations: orphanOrganisations[0]?.count ?? null, orphanMemberships: orphanMemberships[0]?.count ?? null,
};
process.stdout.write(`${JSON.stringify(result)}\n`);
