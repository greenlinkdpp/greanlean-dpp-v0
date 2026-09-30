import type { VerifiedPlatformContext } from "./platformSecurity";

type AdminClient = any;

function tenantNames(rows: any[]) {
  return new Map(rows.map((row) => [row.id, { tenantCode: row.code, tenantName: row.name, tenantStatus: row.status }]));
}

function withTenant<T extends { tenant_id: string | null }>(rows: T[], tenants: Map<string, any>) {
  return rows.map((row) => ({
    ...row,
    ...(row.tenant_id ? tenants.get(row.tenant_id) : undefined) || {
      tenantCode: null,
      tenantName: null,
      tenantStatus: null,
    },
  }));
}

async function allTenants(admin: AdminClient) {
  const { data, error } = await admin.from("tenant").select("id,code,name,status,residency_policy,created_at,updated_at").order("name");
  if (error) throw new Error("Platform Tenant inventory failed.");
  return data || [];
}

export async function platformTenants(admin: AdminClient, context: VerifiedPlatformContext, range: { from: number; to: number }) {
  const tenants = await allTenants(admin);
  const selected = tenants.slice(range.from, range.to + 1);
  const ids = selected.map((tenant: any) => tenant.id);
  const [organisations, models, skus, batches, items, passports, versions] = await Promise.all([
    ids.length ? admin.from("organisation_v2").select("tenant_id").in("tenant_id", ids) : { data: [] },
    ids.length ? admin.from("product_model").select("tenant_id").in("tenant_id", ids) : { data: [] },
    ids.length ? admin.from("sku").select("tenant_id").in("tenant_id", ids) : { data: [] },
    ids.length ? admin.from("product_batch").select("tenant_id").in("tenant_id", ids) : { data: [] },
    ids.length ? admin.from("product_item").select("tenant_id").in("tenant_id", ids) : { data: [] },
    ids.length ? admin.from("dpp_passport").select("tenant_id").in("tenant_id", ids) : { data: [] },
    ids.length ? admin.from("dpp_version").select("tenant_id,publication_state").in("tenant_id", ids) : { data: [] },
  ]);
  const count = (rows: any[] | null, tenantId: string) => (rows || []).filter((row) => row.tenant_id === tenantId).length;
  const published = (tenantId: string) => (versions.data || []).filter((row: any) => row.tenant_id === tenantId && row.publication_state === "PUBLISHED").length;
  const draftOrReview = (tenantId: string) => (versions.data || []).filter((row: any) => row.tenant_id === tenantId && ["DRAFT", "IN_REVIEW", "READY_FOR_REVIEW"].includes(row.publication_state)).length;
  return {
    actor: { authorityType: "PLATFORM", authorityId: context.assignmentId, roleCode: context.roleCode },
    rows: selected.map((tenant: any) => ({
      ...tenant,
      organisationCount: count(organisations.data, tenant.id),
      modelCount: count(models.data, tenant.id),
      skuCount: count(skus.data, tenant.id),
      batchCount: count(batches.data, tenant.id),
      itemCount: count(items.data, tenant.id),
      passportCount: count(passports.data, tenant.id),
      publishedCount: published(tenant.id),
      draftReviewCount: draftOrReview(tenant.id),
      completeness: null,
      lastUpdated: [tenant.updated_at, ...(models.data || []).filter((row: any) => row.tenant_id === tenant.id).map((row: any) => row.updated_at)].filter(Boolean).sort().at(-1) || null,
    })),
    pagination: { total: tenants.length, from: range.from, to: Math.min(range.to, Math.max(0, tenants.length - 1)) },
  };
}

export async function platformProducts(admin: AdminClient, context: VerifiedPlatformContext, range: { from: number; to: number }) {
  const tenants = await allTenants(admin);
  const { data, error, count } = await admin.from("product_model")
    .select("id,tenant_id,family_id,model_code,name,product_category,sector,status,updated_at", { count: "exact" })
    .order("updated_at", { ascending: false }).range(range.from, range.to);
  if (error) throw new Error("Platform Product inventory failed.");
  return { actor: { authorityType: "PLATFORM", authorityId: context.assignmentId }, rows: withTenant(data || [], tenantNames(tenants)), pagination: { total: count || 0, from: range.from, to: range.to } };
}

export async function platformOrganisations(admin: AdminClient, context: VerifiedPlatformContext, range: { from: number; to: number }) {
  const tenants = await allTenants(admin);
  const { data, error, count } = await admin.from("organisation_v2")
    .select("id,tenant_id,parent_organisation_id,organisation_type,legal_name,trading_name,country,status,updated_at", { count: "exact" })
    .order("updated_at", { ascending: false }).range(range.from, range.to);
  if (error) throw new Error("Platform Organisation inventory failed.");
  return { actor: { authorityType: "PLATFORM", authorityId: context.assignmentId }, rows: withTenant(data || [], tenantNames(tenants)), pagination: { total: count || 0, from: range.from, to: range.to } };
}

export async function platformDpps(admin: AdminClient, context: VerifiedPlatformContext, range: { from: number; to: number }) {
  const tenants = await allTenants(admin);
  const { data, error, count } = await admin.from("dpp_passport")
    .select("id,tenant_id,subject_type,subject_id,passport_identifier,status,updated_at", { count: "exact" })
    .order("updated_at", { ascending: false }).range(range.from, range.to);
  if (error) throw new Error("Platform DPP inventory failed.");
  const passportIds = (data || []).map((row: any) => row.id);
  const [{ data: pointers }, { data: versions }] = await Promise.all([
    passportIds.length ? admin.from("dpp_current_pointer").select("passport_id,current_version_id,updated_at").in("passport_id", passportIds) : { data: [] },
    passportIds.length ? admin.from("dpp_version").select("id,passport_id,version_number,publication_state,published_at").in("passport_id", passportIds) : { data: [] },
  ]);
  const pointerMap = new Map((pointers || []).map((row: any) => [row.passport_id, row]));
  const versionMap = new Map((versions || []).map((row: any) => [row.id, row]));
  const rows = withTenant(data || [], tenantNames(tenants)).map((passport: any) => {
    const pointer = pointerMap.get(passport.id) as any;
    const version = pointer ? versionMap.get(pointer.current_version_id) as any : null;
    return { ...passport, currentVersion: version?.version_number || null, publicationState: version?.publication_state || null, publishedAt: version?.published_at || null };
  });
  return { actor: { authorityType: "PLATFORM", authorityId: context.assignmentId }, rows, pagination: { total: count || 0, from: range.from, to: range.to } };
}

export async function platformOperations(admin: AdminClient, context: VerifiedPlatformContext, range: { from: number; to: number }) {
  const tenants = await allTenants(admin);
  const tenantMap = tenantNames(tenants);
  const [imports, audits] = await Promise.all([
    admin.from("connector_import_session").select("id,tenant_id,file_format,status,created_at,committed_at").order("created_at", { ascending: false }).range(range.from, range.to),
    admin.from("platform_operator_audit").select("id,tenant_id,platform_capability,resource_type,operation,decision,reason_code,correlation_id,created_at").order("created_at", { ascending: false }).range(range.from, range.to),
  ]);
  if (imports.error || audits.error) throw new Error("Platform operations inventory failed.");
  return { actor: { authorityType: "PLATFORM", authorityId: context.assignmentId }, imports: withTenant(imports.data || [], tenantMap), audit: withTenant(audits.data || [], tenantMap) };
}
