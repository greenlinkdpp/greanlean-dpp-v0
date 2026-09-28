import { withApiRoute } from "@/lib/server/apiRoute";
import { createSupabaseAdminClient, requireAuthenticatedUser } from "@/lib/server/supabase";

type RoleRow = { id: string; code: string; name: string; status: string };
type TenantRow = { id: string; code: string; name: string; status: string };

function capabilityCodes(rows: Array<{ role_id?: string; permission_profile_id?: string; capability?: { code?: string } | Array<{ code?: string }> | null }>, key: "role_id" | "permission_profile_id") {
  const result = new Map<string, string[]>();
  for (const row of rows) {
    const id = row[key];
    const capability = Array.isArray(row.capability) ? row.capability[0] : row.capability;
    if (!id || !capability?.code) continue;
    result.set(id, [...(result.get(id) || []), capability.code]);
  }
  return result;
}

function isCurrentlyValid(row: { valid_from?: string | null; valid_until?: string | null }) {
  const now = Date.now();
  return (!row.valid_from || Date.parse(row.valid_from) <= now) && (!row.valid_until || Date.parse(row.valid_until) > now);
}

export const GET = withApiRoute(async (request) => {
  const { user } = await requireAuthenticatedUser(request);
  const admin = createSupabaseAdminClient();

  const [{ data: memberships, error: membershipError }, { data: partnerLinks, error: partnerLinkError }] = await Promise.all([
    admin.from("tenant_membership").select("id,tenant_id,role_id,status,valid_from,valid_until").eq("user_id", user.id).eq("status", "ACTIVE"),
    admin.from("partner_user_link").select("partner_id,status").eq("user_id", user.id).eq("status", "ACTIVE"),
  ]);
  if (membershipError || partnerLinkError) throw new Error("Backoffice authority lookup failed.");

  const partnerIds = (partnerLinks || []).map((row) => row.partner_id);
  const { data: partnerAuthorizations, error: partnerAuthorizationError } = partnerIds.length
    ? await admin.from("partner_tenant_authorization")
      .select("id,partner_id,tenant_id,permission_profile_id,status,valid_from,valid_until")
      .in("partner_id", partnerIds)
      .eq("status", "ACTIVE")
    : { data: [], error: null };
  if (partnerAuthorizationError) throw new Error("Backoffice partner authority lookup failed.");

  const tenantIds = Array.from(new Set([
    ...(memberships || []).map((row) => row.tenant_id),
    ...(partnerAuthorizations || []).map((row) => row.tenant_id),
  ]));
  const roleIds = Array.from(new Set((memberships || []).map((row) => row.role_id)));
  const profileIds = Array.from(new Set((partnerAuthorizations || []).map((row) => row.permission_profile_id)));

  const [tenantResult, roleResult, roleCapabilityResult, profileResult, profileCapabilityResult] = await Promise.all([
    tenantIds.length ? admin.from("tenant").select("id,code,name,status").in("id", tenantIds) : Promise.resolve({ data: [], error: null }),
    roleIds.length ? admin.from("role").select("id,code,name,status").in("id", roleIds).eq("status", "ACTIVE") : Promise.resolve({ data: [], error: null }),
    roleIds.length ? admin.from("role_capability").select("role_id,capability:capability(code)").in("role_id", roleIds) : Promise.resolve({ data: [], error: null }),
    profileIds.length ? admin.from("permission_profile").select("id,code,name,status").in("id", profileIds).eq("status", "ACTIVE") : Promise.resolve({ data: [], error: null }),
    profileIds.length ? admin.from("permission_profile_capability").select("permission_profile_id,capability:capability(code)").in("permission_profile_id", profileIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (tenantResult.error || roleResult.error || roleCapabilityResult.error || profileResult.error || profileCapabilityResult.error) {
    throw new Error("Backoffice authority metadata lookup failed.");
  }

  const tenants = new Map((tenantResult.data as TenantRow[] || []).map((row) => [row.id, row]));
  const roles = new Map((roleResult.data as RoleRow[] || []).map((row) => [row.id, row]));
  const profiles = new Map((profileResult.data as RoleRow[] || []).map((row) => [row.id, row]));
  const roleCapabilities = capabilityCodes(roleCapabilityResult.data || [], "role_id");
  const profileCapabilities = capabilityCodes(profileCapabilityResult.data || [], "permission_profile_id");

  const contexts = [
    ...(memberships || []).filter(isCurrentlyValid).flatMap((membership) => {
      const tenant = tenants.get(membership.tenant_id);
      const role = roles.get(membership.role_id);
      if (!tenant || !role) return [];
      return [{
        tenantId: tenant.id,
        tenantCode: tenant.code,
        tenantName: tenant.name,
        tenantStatus: tenant.status,
        authorityType: "TENANT" as const,
        authorityId: membership.id,
        roleCode: role.code,
        roleName: role.name,
        capabilities: (roleCapabilities.get(role.id) || []).sort(),
      }];
    }),
    ...(partnerAuthorizations || []).filter(isCurrentlyValid).flatMap((authorization) => {
      const tenant = tenants.get(authorization.tenant_id);
      const profile = profiles.get(authorization.permission_profile_id);
      if (!tenant || !profile) return [];
      return [{
        tenantId: tenant.id,
        tenantCode: tenant.code,
        tenantName: tenant.name,
        tenantStatus: tenant.status,
        authorityType: "PARTNER" as const,
        authorityId: authorization.id,
        roleCode: profile.code,
        roleName: profile.name,
        capabilities: (profileCapabilities.get(profile.id) || []).sort(),
      }];
    }),
  ].sort((left, right) => left.tenantName.localeCompare(right.tenantName));

  return Response.json({ data: contexts }, { headers: { "Cache-Control": "private, no-store" } });
});
