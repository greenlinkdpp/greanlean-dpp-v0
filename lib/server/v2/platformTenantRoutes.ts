import { ApiError, withApiRoute } from "../apiRoute";
import { requireJsonObject, requireUuid } from "./repository";
import { requirePlatformCapability } from "./platformSecurity";

function clean(input: Record<string, unknown>, fields: readonly string[]) {
  const unknown = Object.keys(input).filter((key) => !fields.includes(key));
  if (unknown.length) throw new ApiError(400, "UNKNOWN_FIELDS", "The request contains unsupported Tenant fields.", { fields: unknown });
  return Object.fromEntries(Object.entries(input).filter(([key]) => fields.includes(key)));
}

export const platformTenantCollectionHandlers = {
  POST: withApiRoute(async (request, requestContext) => {
    const input = clean(requireJsonObject(await request.json()), ["code", "name", "status", "residency_policy"]);
    if (typeof input.code !== "string" || typeof input.name !== "string") throw new ApiError(400, "TENANT_CODE_AND_NAME_REQUIRED", "Tenant code and name are required.");
    const { admin } = await requirePlatformCapability(request, requestContext, "platform.tenant.create", { resourceType: "TENANT", operation: "platform.tenant.create" });
    const { data, error } = await admin.from("tenant").insert({ code: input.code, name: input.name, status: input.status || "ACTIVE", residency_policy: input.residency_policy || {} }).select().single();
    if (error) throw new ApiError(409, "TENANT_CREATE_FAILED", "The Tenant could not be created.");
    return Response.json({ data }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  }),
};

export const platformTenantItemHandlers = {
  GET: withApiRoute<{ params: { id: string } }>(async (request, requestContext, route) => {
    const id = requireUuid(route.params.id, "Tenant identifier");
    const { admin } = await requirePlatformCapability(request, requestContext, "platform.tenant.view", { resourceType: "TENANT", operation: "platform.tenant.read" });
    const { data, error } = await admin.from("tenant").select("*").eq("id", id).maybeSingle();
    if (error || !data) throw new ApiError(404, "TENANT_NOT_FOUND", "The Tenant was not found.");
    return Response.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
  }),
  PATCH: withApiRoute<{ params: { id: string } }>(async (request, requestContext, route) => {
    const id = requireUuid(route.params.id, "Tenant identifier");
    const input = clean(requireJsonObject(await request.json()), ["code", "name", "status", "residency_policy"]);
    const { admin } = await requirePlatformCapability(request, requestContext, "platform.tenant.manage", { resourceType: "TENANT", operation: "platform.tenant.update" });
    const { data, error } = await admin.from("tenant").update(input).eq("id", id).select().maybeSingle();
    if (error || !data) throw new ApiError(409, "TENANT_UPDATE_FAILED", "The Tenant could not be updated.");
    return Response.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
  }),
  DELETE: withApiRoute<{ params: { id: string } }>(async (request, requestContext, route) => {
    const id = requireUuid(route.params.id, "Tenant identifier");
    const { admin } = await requirePlatformCapability(request, requestContext, "platform.tenant.manage", { resourceType: "TENANT", operation: "platform.tenant.delete" });
    const [models, passports, memberships] = await Promise.all([
      admin.from("product_model").select("id", { count: "exact", head: true }).eq("tenant_id", id),
      admin.from("dpp_passport").select("id", { count: "exact", head: true }).eq("tenant_id", id),
      admin.from("tenant_membership").select("id", { count: "exact", head: true }).eq("tenant_id", id),
    ]);
    const dependencies = { models: models.count || 0, passports: passports.count || 0, memberships: memberships.count || 0 };
    if (Object.values(dependencies).some(Boolean)) throw new ApiError(409, "TENANT_DELETE_BLOCKED", "A Tenant with business data must be archived, not deleted.", { dependencies, action: "ARCHIVE" });
    const { error } = await admin.from("tenant").delete().eq("id", id);
    if (error) throw new ApiError(409, "TENANT_DELETE_FAILED", "The Tenant could not be deleted.");
    return Response.json({ data: { id, deleted: true } }, { headers: { "Cache-Control": "private, no-store" } });
  }),
};
