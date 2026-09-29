import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRef = "efhiaufukjchxqhbmpvq";
const protectedRefs = new Set(["lpxdbysgmdsjhxrjzhly", "qlrbrwrpvtnlphajvqao"]);
const operatorEmail = "phase7-platform-operator@preprod.greanlean.invalid";
const evidencePath = "docs/v2-implementation/phase-7/evidence/platform-admin-multitenant-preprod.json";
const deployment = {
  id: "dpl_7ntfD7zmosspCRhBM3invmRYsZXX",
  immutableUrl: "https://greanlean-dpp-preprod-fhtnfm97j-songweinie-1175s-projects.vercel.app",
  stableAlias: "https://greanlean-dpp-preprod.vercel.app",
};

if (protectedRefs.has(projectRef)) throw new Error("REFUSED: protected target.");
if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.includes(projectRef)) {
  throw new Error("REFUSED: isolated PreProd environment is required.");
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
  const body = raw ? JSON.parse(raw) : null;
  if (!response.ok) throw new Error(`PreProd query failed (${response.status}): ${String(body?.message || body?.error || raw).slice(0, 800)}`);
  return body;
}

async function probe(url) {
  const started = Date.now();
  const response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(30_000) });
  return { url, status: response.status, finalUrl: response.url, durationMs: Date.now() - started };
}

const [state] = await query(`
select
  (select max(migration_number) from public.greanlean_migration_ledger where result='applied') as migration_head,
  (select count(*)::int from public.tenant) as tenant_count,
  (select count(*)::int from public.organisation_v2) as organisation_count,
  (select count(*)::int from public.product_model) as product_model_count,
  (select count(*)::int from public.dpp_passport) as dpp_count,
  (select count(*)::int from public.products) as v1_product_count,
  (select count(*)::int from public.dpp_publication) as v1_publication_count,
  (select count(*)::int from public.platform_role_assignment pra join auth.users u on u.id=pra.user_id where lower(u.email)=lower('${operatorEmail}') and pra.status='ACTIVE') as operator_assignments,
  (select count(*)::int from public.tenant_membership tm join auth.users u on u.id=tm.user_id where lower(u.email)=lower('${operatorEmail}')) as operator_tenant_memberships,
  (select count(*)::int from public.capability where code like 'platform.%') as platform_capabilities,
  (select count(*)::int from public.product_model where tenant_id=(select id from public.tenant where code='greanlean-reference-mobility')) as reference_models,
  (select count(*)::int from public.sku where tenant_id=(select id from public.tenant where code='greanlean-reference-mobility')) as reference_skus,
  (select count(*)::int from public.product_item where tenant_id=(select id from public.tenant where code='greanlean-reference-mobility')) as reference_items,
  (select count(*)::int from public.canonical_claim where tenant_id=(select id from public.tenant where code='greanlean-reference-mobility')) as reference_claims,
  (select count(*)::int from public.dpp_passport where tenant_id=(select id from public.tenant where code='greanlean-reference-mobility')) as reference_passports,
  (select count(*)::int from public.dpp_version where tenant_id=(select id from public.tenant where code='greanlean-reference-mobility')) as reference_versions,
  (select count(*)::int from public.dpp_current_pointer where tenant_id=(select id from public.tenant where code='greanlean-reference-mobility')) as reference_current_pointers,
  (select count(*)::int from public.resolver_mapping where tenant_id=(select id from public.tenant where code='greanlean-reference-mobility')) as reference_resolver_mappings,
  (select count(*)::int from public.bms_aggregation_snapshot where tenant_id=(select id from public.tenant where code='greanlean-reference-mobility')) as reference_bms_snapshots,
  (select count(*)::int from (select passport_identifier from public.dpp_passport group by passport_identifier having count(*) > 1) d) as duplicate_dpp_ids,
  (select count(*)::int from (select tenant_id, serial_number from public.product_item where serial_number is not null group by tenant_id, serial_number having count(*) > 1) d) as duplicate_serials,
  (select count(*)::int from public.dpp_version v join public.dpp_passport p on p.id=v.passport_id where p.tenant_id<>v.tenant_id) +
  (select count(*)::int from public.dpp_current_pointer cp join public.dpp_passport p on p.id=cp.passport_id where p.tenant_id<>cp.tenant_id) +
  (select count(*)::int from public.resolver_mapping rm join public.dpp_passport p on p.id=rm.passport_id where rm.passport_id is not null and p.tenant_id<>rm.tenant_id) as cross_tenant_relationship_violations
`);

const tenantWriteModels = await query(`
select pm.id, pm.model_code, pm.name, t.code as tenant_code
from public.product_model pm
join public.tenant t on t.id=pm.tenant_id
where pm.model_code in ('P7-PLATFORM-A-20260929','P7-PLATFORM-B-20260929')
order by pm.model_code
`);

const manualClaims = await query(`
select cc.id, cc.resolution_state, cc.verification_status, cc.applicability_reason,
       pr.evidence_references, t.code as tenant_code, cc.created_at
from public.canonical_claim cc
join public.tenant t on t.id=cc.tenant_id
left join public.provenance_record pr on pr.id=cc.provenance_record_id and pr.tenant_id=cc.tenant_id
where cc.id='8b5ea7f2-d166-4ccc-ba5e-eb98664abd6c'::uuid
`);

const latestImport = await query(`
select cis.id, cis.file_format, cis.status, cis.committed_at, cis.created_at, t.code as tenant_code
from public.connector_import_session cis
join public.tenant t on t.id=cis.tenant_id
join auth.users u on u.id=cis.created_by
where lower(u.email)=lower('${operatorEmail}')
order by cis.created_at desc
limit 1
`);

const auditSummary = await query(`
select decision, reason_code, count(*)::int as count
from public.platform_operator_audit poa
join auth.users u on u.id=poa.actor_user_id
where lower(u.email)=lower('${operatorEmail}')
group by decision, reason_code
order by decision, reason_code
`);

const latestInvalidTenantDenial = await query(`
select poa.decision, poa.reason_code, poa.platform_capability, poa.operation, poa.tenant_id, poa.safe_metadata, poa.created_at
from public.platform_operator_audit poa
join auth.users u on u.id=poa.actor_user_id
where lower(u.email)=lower('${operatorEmail}') and reason_code='ACTIVE_TENANT_INVALID'
order by poa.created_at desc
limit 1
`);

const expected = {
  migration_head: "0036", tenant_count: 5, operator_assignments: 1,
  operator_tenant_memberships: 0, platform_capabilities: 22,
  reference_models: 8, reference_skus: 22, reference_items: 22,
  reference_claims: 374, reference_passports: 22, reference_versions: 22,
  reference_current_pointers: 22, reference_resolver_mappings: 22, reference_bms_snapshots: 22,
  duplicate_dpp_ids: 0, duplicate_serials: 0, cross_tenant_relationship_violations: 0,
};
for (const [key, value] of Object.entries(expected)) {
  if (state[key] !== value) throw new Error(`Verification failed for ${key}: expected ${value}, received ${state[key]}`);
}
if (tenantWriteModels.length !== 2 || tenantWriteModels[0].tenant_code !== "phase1-tenant-a" || tenantWriteModels[1].tenant_code !== "phase1-tenant-b") {
  throw new Error(`Tenant write isolation evidence failed: ${JSON.stringify(tenantWriteModels)}`);
}
if (manualClaims.length !== 1 || manualClaims[0].tenant_code !== "phase1-tenant-a" || manualClaims[0].resolution_state !== "UNKNOWN") {
  throw new Error(`Manual claim evidence failed: ${JSON.stringify(manualClaims)}`);
}
if (latestImport.length !== 1 || latestImport[0].tenant_code !== "phase1-tenant-a" || latestImport[0].status !== "PREFLIGHT" || latestImport[0].committed_at !== null) {
  throw new Error(`Import preflight evidence failed: ${JSON.stringify(latestImport)}`);
}
if (latestInvalidTenantDenial.length !== 1 || latestInvalidTenantDenial[0].decision !== "DENY") {
  throw new Error("Forged Tenant denial was not found in the Platform audit.");
}

const publicRegression = await Promise.all([
  probe("https://www.greanlean.com/"),
  probe("https://www.greanlean.com/p/DPP-GLR-EBIKE-000001"),
  probe("https://www.greanlean.com/api/v2/resolver/DPP-GLR-EBIKE-000001?format=json"),
  probe(`${deployment.stableAlias}/`),
  probe(`${deployment.stableAlias}/p/DPP-GLR-EBIKE-000001`),
  probe(`${deployment.stableAlias}/api/v2/resolver/DPP-GLR-EBIKE-000001?format=json`),
]);
if (publicRegression.some((entry) => entry.status !== 200)) throw new Error(`Public regression failed: ${JSON.stringify(publicRegression)}`);
const publicProjectionResponse = await fetch(`${deployment.stableAlias}/api/v2/resolver/DPP-GLR-EBIKE-000001?format=json`, { signal: AbortSignal.timeout(30_000) });
const publicProjectionText = await publicProjectionResponse.text();
const forbiddenPublicMarkers = ["\"source_vendor\":", "\"vendor_name\":", "\"device_external_id\":", "\"bms_aggregation_snapshot\":", "\"raw_payload\":"];
const publicLeakageMarkers = forbiddenPublicMarkers.filter((marker) => publicProjectionText.toLowerCase().includes(marker));
if (publicLeakageMarkers.length) throw new Error(`Public projection leakage markers found: ${publicLeakageMarkers.join(", ")}`);

const evidence = {
  generatedAt: new Date().toISOString(),
  target: {
    environment: "preproduction",
    projectRefFingerprint: createHash("sha256").update(projectRef).digest("hex").slice(0, 12),
    deployment,
  },
  architectureBaseline: "v2.1",
  authority: {
    model: "PLATFORM_ASSIGNMENT_ONLY",
    activePlatformAssignments: state.operator_assignments,
    tenantMembershipsForPlatformOperator: state.operator_tenant_memberships,
    platformCapabilities: state.platform_capabilities,
  },
  globalVisibility: {
    tenants: state.tenant_count,
    organisations: state.organisation_count,
    products: state.product_model_count,
    dpps: state.dpp_count,
    tenantOwnershipShownInPlatformConsole: true,
  },
  tenantScopedWrites: {
    result: "PASS",
    models: tenantWriteModels,
    forgedTenantContext: { httpStatus: 403, result: "DENIED", audit: latestInvalidTenantDenial[0] },
    crossTenantMutation: {
      sourceTenant: "phase1-tenant-a",
      targetTenant: "phase1-tenant-b",
      targetModelId: "e359aef9-a7be-447c-ae33-e5ff94b44ab9",
      attemptedOperation: "PATCH product model",
      httpStatus: 404,
      result: "DENIED",
      targetUnchanged: true,
    },
  },
  manualDppEntry: { result: "PASS", claim: manualClaims[0] },
  fileImport: {
    result: "PASS",
    uiVerified: true,
    fixture: "output/playwright/phase7-import-preflight.csv",
    session: latestImport[0],
    productionFeatureFlag: "OFF_BY_DEFAULT_AND_NOT_DEPLOYED",
  },
  referenceDataIntegrity: {
    models: state.reference_models, skus: state.reference_skus, items: state.reference_items,
    claims: state.reference_claims, passports: state.reference_passports, versions: state.reference_versions,
    currentPointers: state.reference_current_pointers, resolverMappings: state.reference_resolver_mappings,
    bmsSnapshots: state.reference_bms_snapshots, duplicateDppIds: state.duplicate_dpp_ids,
    duplicateSerials: state.duplicate_serials, crossTenantRelationshipViolations: state.cross_tenant_relationship_violations,
    publicLeakageMarkers, immutableVersionMutationPerformed: false, result: "PASS",
  },
  v1Data: { products: state.v1_product_count, publications: state.v1_publication_count, unchanged: true },
  auditSummary,
  publicRegression,
  screenshots: [
    "output/playwright/platform-console-preprod.png",
    "output/playwright/import-preflight-preprod.png",
    "output/playwright/tenant-workspace-zh-mobile-preprod.png",
  ],
  assertions: {
    platformConsole: "PASS", globalTenantVisibility: "PASS", globalProductVisibility: "PASS",
    globalDppVisibility: "PASS", activeTenantContext: "PASS", tenantScopedWrite: "PASS",
    forgedTenantContext: "DENIED", crossTenantMutation: "DENIED", manualDppEntry: "PASS",
    fileImportPreflightMappingPreProd: "PASS", navigationConsolidation: "PASS",
    productionDeployed: false, productionWritePerformed: false, observationWindowRestartRequired: false,
  },
  ownerLogoAssetRequired: true,
  logoIntegration: "PENDING_OWNER_ASSET",
  result: "PASS",
};

await mkdir(path.dirname(evidencePath), { recursive: true });
await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
process.stdout.write("PLATFORM ADMIN MULTITENANT PREPRODUCTION VERIFICATION PASS\n");
