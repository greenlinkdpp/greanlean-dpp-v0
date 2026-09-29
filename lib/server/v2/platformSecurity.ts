import type { User } from "@supabase/supabase-js";
import { ApiError } from "../apiRoute";
import type { RequestContext } from "../requestContext";
import { createSupabaseAdminClient, requireAuthenticatedUser } from "../supabase";
import type { PlatformCapability } from "@/lib/v2/platformCapabilities";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

export type VerifiedPlatformContext = {
  user: User;
  assignmentId: string;
  roleId: string;
  roleCode: string;
  capability: PlatformCapability;
  capabilities: string[];
  tenantId: string | null;
  correlationId: string;
};

function currentlyActive(row: { status: string; valid_from: string; valid_until?: string | null }) {
  const now = Date.now();
  return row.status === "ACTIVE"
    && Date.parse(row.valid_from) <= now
    && (!row.valid_until || Date.parse(row.valid_until) > now);
}

async function writeAudit(admin: AdminClient, values: {
  userId: string;
  roleCode: string;
  capability: PlatformCapability;
  tenantId?: string | null;
  resourceType: string;
  operation: string;
  decision: "ALLOW" | "DENY";
  reasonCode: string;
  correlationId: string;
}) {
  const { error } = await admin.from("platform_operator_audit").insert({
    actor_user_id: values.userId,
    identity_context: "PLATFORM_OPERATOR",
    platform_role: values.roleCode,
    platform_capability: values.capability,
    tenant_id: values.tenantId || null,
    resource_type: values.resourceType,
    resource_id: null,
    operation: values.operation,
    decision: values.decision,
    reason_code: values.reasonCode,
    correlation_id: values.correlationId,
    safe_metadata: {},
  });
  if (error) throw new ApiError(500, "PLATFORM_AUDIT_WRITE_FAILED", "The platform decision could not be audited.");
}

export async function requirePlatformCapability(
  request: Request,
  requestContext: RequestContext,
  capability: PlatformCapability,
  options: { tenantId?: string | null; resourceType: string; operation: string },
) {
  const { user } = await requireAuthenticatedUser(request);
  const admin = createSupabaseAdminClient();
  const { data: assignment, error } = await admin
    .from("platform_role_assignment")
    .select("id,role_id,status,valid_from,valid_until")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new ApiError(500, "PLATFORM_ASSIGNMENT_LOOKUP_FAILED", "Platform authority could not be resolved.");
  if (!assignment || !currentlyActive(assignment)) {
    throw new ApiError(403, "PLATFORM_AUTHORITY_REQUIRED", "Active Platform Operator authority is required.");
  }

  const [{ data: role, error: roleError }, { data: capabilityRows, error: capabilityError }] = await Promise.all([
    admin.from("role").select("id,code,role_class,status").eq("id", assignment.role_id).maybeSingle(),
    admin.from("role_capability").select("capability:capability(code,status)").eq("role_id", assignment.role_id),
  ]);
  if (roleError || capabilityError) throw new ApiError(500, "PLATFORM_ROLE_LOOKUP_FAILED", "Platform role metadata could not be resolved.");
  const capabilities = (capabilityRows || []).flatMap((row: any) => {
    const value = Array.isArray(row.capability) ? row.capability[0] : row.capability;
    return value?.status === "ACTIVE" && typeof value.code === "string" ? [value.code] : [];
  });
  const roleCode = role?.code || "unknown";
  if (!role || role.role_class !== "PLATFORM" || role.status !== "ACTIVE" || !capabilities.includes(capability)) {
    await writeAudit(admin, { userId: user.id, roleCode, capability, tenantId: options.tenantId, resourceType: options.resourceType, operation: options.operation, decision: "DENY", reasonCode: "PLATFORM_CAPABILITY_DENIED", correlationId: requestContext.correlationId });
    throw new ApiError(403, "PLATFORM_CAPABILITY_DENIED", "The Platform Operator lacks the required capability.");
  }

  let tenantId = options.tenantId || null;
  if (tenantId) {
    const { data: tenant, error: tenantError } = await admin.from("tenant").select("id,status").eq("id", tenantId).maybeSingle();
    if (tenantError) throw new ApiError(500, "PLATFORM_TENANT_LOOKUP_FAILED", "The active Tenant could not be resolved.");
    if (!tenant || tenant.status !== "ACTIVE") {
      await writeAudit(admin, { userId: user.id, roleCode, capability, tenantId, resourceType: options.resourceType, operation: options.operation, decision: "DENY", reasonCode: "ACTIVE_TENANT_INVALID", correlationId: requestContext.correlationId });
      throw new ApiError(403, "ACTIVE_TENANT_INVALID", "The requested active Tenant is unavailable.");
    }
    tenantId = tenant.id;
  }

  await writeAudit(admin, { userId: user.id, roleCode, capability, tenantId, resourceType: options.resourceType, operation: options.operation, decision: "ALLOW", reasonCode: tenantId ? "PLATFORM_CAPABILITY_ACTIVE_TENANT" : "PLATFORM_CAPABILITY", correlationId: requestContext.correlationId });
  const platformContext: VerifiedPlatformContext = {
    user,
    assignmentId: assignment.id,
    roleId: assignment.role_id,
    roleCode,
    capability,
    capabilities,
    tenantId,
    correlationId: requestContext.correlationId,
  };
  return { platformContext, admin };
}

export function platformPagination(request: Request) {
  const search = new URL(request.url).searchParams;
  const page = Math.max(1, Number.parseInt(search.get("page") || "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(search.get("pageSize") || "50", 10) || 50));
  return { page, pageSize, from: (page - 1) * pageSize, to: page * pageSize - 1 };
}
