import { execFileSync } from "node:child_process";

const projectRef = "efhiaufukjchxqhbmpvq";
const protectedRefs = new Set(["lpxdbysgmdsjhxrjzhly", "qlrbrwrpvtnlphajvqao"]);

if (protectedRefs.has(projectRef) || !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes(projectRef)) {
  throw new Error("REFUSED: Round D audit is restricted to isolated PreProd.");
}

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
    signal: AbortSignal.timeout(120_000),
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`PreProd read-only query failed (${response.status}): ${raw.slice(0, 800)}`);
  return raw ? JSON.parse(raw) : [];
}

const result = await query(`
with target as (select id from public.tenant where code = 'test001')
select jsonb_build_object(
  'tenant', (select jsonb_agg(to_jsonb(t)) from (
    select id, code, name, status, created_at from public.tenant where id = (select id from target)
  ) t),
  'foreign_key_dependencies', (select coalesce(jsonb_agg(jsonb_build_object(
    'table_name', rel_ns.nspname || '.' || rel.relname,
    'column_name', att.attname,
    'constraint_name', con.conname,
    'delete_action', con.confdeltype
  ) order by rel_ns.nspname, rel.relname), '[]'::jsonb)
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace rel_ns on rel_ns.oid = rel.relnamespace
  join unnest(con.conkey) with ordinality k(attnum, ord) on true
  join pg_attribute att on att.attrelid = rel.oid and att.attnum = k.attnum
  where con.contype = 'f' and con.confrelid = 'public.tenant'::regclass),
  'rls_backup', (select jsonb_build_object(
    'exists', to_regclass('public.greanlean_0012_data_backup') is not null,
    'rls', coalesce((select relrowsecurity from pg_class where oid = to_regclass('public.greanlean_0012_data_backup')), false),
    'fk_count', (select count(*)::int from pg_constraint where contype = 'f' and (conrelid = to_regclass('public.greanlean_0012_data_backup') or confrelid = to_regclass('public.greanlean_0012_data_backup'))),
    'view_count', (select count(*)::int from pg_depend d join pg_rewrite rw on rw.oid = d.objid join pg_class v on v.oid = rw.ev_class where d.refobjid = to_regclass('public.greanlean_0012_data_backup') and v.relkind in ('v', 'm')),
    'trigger_count', (select count(*)::int from pg_trigger where tgrelid = to_regclass('public.greanlean_0012_data_backup') and not tgisinternal)
  )),
  'lead', (select coalesce(jsonb_agg(to_jsonb(l)), '[]'::jsonb) from (
    select id, name, company, contact, industry, message, status, source, created_at
    from public.leads
    where name = 'TEST PREPROD Lead'
      and company = 'TEST PREPROD GreanLean'
      and contact = 'test-preprod-lead@example.invalid'
    order by created_at
  ) l),
  'auth', (select jsonb_agg(to_jsonb(u)) from (
    select lower(email) as email from auth.users order by lower(email)
  ) u),
  'migration_head', (select max(migration_number) from public.greanlean_migration_ledger where result = 'applied')
) as result;
`);

const dependencyCounts = await query(`
with target as (select id from public.tenant where code = 'test001')
select * from (
  select 'memberships' as dependency, count(*)::int as count from public.tenant_membership where tenant_id=(select id from target)
  union all select 'organisations', count(*)::int from public.organisation_v2 where tenant_id=(select id from target)
  union all select 'families', count(*)::int from public.product_family where tenant_id=(select id from target)
  union all select 'models', count(*)::int from public.product_model where tenant_id=(select id from target)
  union all select 'skus', count(*)::int from public.sku where tenant_id=(select id from target)
  union all select 'batches', count(*)::int from public.product_batch where tenant_id=(select id from target)
  union all select 'individuals', count(*)::int from public.product_item where tenant_id=(select id from target)
  union all select 'dpps', count(*)::int from public.dpp_passport where tenant_id=(select id from target)
  union all select 'published_versions', count(*)::int from public.dpp_version where tenant_id=(select id from target) and publication_state='PUBLISHED'
  union all select 'resolver_mappings', count(*)::int from public.resolver_mapping where tenant_id=(select id from target)
  union all select 'demo_catalog_refs', count(*)::int from public.demo_showcase_entry where tenant_id=(select id from target)
  union all select 'policy_audit_refs', count(*)::int from public.policy_decision_audit where tenant_id=(select id from target)
  union all select 'platform_audit_refs', count(*)::int from public.platform_operator_audit where tenant_id=(select id from target)
  union all select 'roles', count(*)::int from public.role where tenant_id=(select id from target)
  union all select 'partner_authorizations', count(*)::int from public.partner_tenant_authorization where tenant_id=(select id from target)
  union all select 'scope_grants', count(*)::int from public.scope_grant where tenant_id=(select id from target)
  union all select 'legacy_mappings', count(*)::int from public.legacy_entity_mapping where tenant_id=(select id from target)
  union all select 'idempotency_records', count(*)::int from public.v2_idempotency_record where tenant_id=(select id from target)
) counts order by dependency;
`);

const postCloseout = await query(`
select jsonb_build_object(
  'tenants', (select jsonb_agg(to_jsonb(t) order by t.code) from (
    select id, code, name, status from public.tenant
  ) t),
  'tenant_count', (select count(*)::int from public.tenant),
  'reference_integrity', (select jsonb_build_object(
    'models', (select count(*)::int from public.product_model where tenant_id = t.id),
    'passports', (select count(*)::int from public.dpp_passport where tenant_id = t.id),
    'resolver_mappings', (select count(*)::int from public.resolver_mapping where tenant_id = t.id)
  ) from public.tenant t where t.code = 'greanlean-reference-mobility'),
  'backup_table_exists', to_regclass('public.greanlean_0012_data_backup') is not null,
  'migration_head', (select max(migration_number) from public.greanlean_migration_ledger where result = 'applied'),
  'auth_count', (select count(*)::int from auth.users),
  'delete_audit_count', (select count(*)::int from public.platform_operator_audit where operation = 'platform.tenant.delete' and reason_code = 'ARCHIVED_EMPTY_TENANT_DELETED' and safe_metadata->>'deletedTenantCode' = 'test001'),
  'orphan_memberships', (select count(*)::int from public.tenant_membership tm left join public.tenant t on t.id = tm.tenant_id where t.id is null)
) as result;
`);

process.stdout.write(`${JSON.stringify({ result, dependencyCounts, postCloseout })}\n`);
