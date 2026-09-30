import { withApiRoute, ApiError } from "../apiRoute";
import { allowFields, executeIdempotentWrite, requireIdempotencyKey, requireJsonObject, requireUuid } from "./repository";
import { requireV2PolicyContext } from "./security";

const fields = ["parent_organisation_id", "organisation_type", "legal_name", "trading_name", "country", "registration_identifier", "vat_number", "eori", "address", "status"] as const;

async function load(admin: any, tenantId: string, id: string) {
  const { data, error } = await admin.from("organisation_v2").select("*").eq("tenant_id", tenantId).eq("id", id).maybeSingle();
  if (error) throw new ApiError(500, "ORGANISATION_LOAD_FAILED", "The Organisation could not be loaded.");
  if (!data) throw new ApiError(404, "ORGANISATION_NOT_FOUND", "The Organisation was not found.");
  return data;
}

export const organisationItemHandlers = {
  GET: withApiRoute<{ params: { id: string } }>(async (request, requestContext, route) => {
    const id = requireUuid(route.params.id, "Organisation identifier");
    const { policyContext, admin } = await requireV2PolicyContext(request, requestContext, { capability: "organisation.view", resourceType: "ORGANISATION", resourceId: id, purpose: "ORGANISATION_READ" });
    return Response.json({ data: await load(admin, policyContext.tenantId, id) }, { headers: { "Cache-Control": "private, no-store" } });
  }),
  PATCH: withApiRoute<{ params: { id: string } }>(async (request, requestContext, route) => {
    const id = requireUuid(route.params.id, "Organisation identifier");
    const input = allowFields(requireJsonObject(await request.json()), fields);
    const idempotencyKey = requireIdempotencyKey(request);
    const { policyContext, admin } = await requireV2PolicyContext(request, requestContext, { capability: "organisation.edit", resourceType: "ORGANISATION", resourceId: id, purpose: input.status === "ARCHIVED" ? "ORGANISATION_ARCHIVE" : "ORGANISATION_UPDATE" });
    const result = await executeIdempotentWrite({ admin, context: policyContext, requestPath: requestContext.path, idempotencyKey, payload: { id, ...input }, operation: async () => {
      await load(admin, policyContext.tenantId, id);
      const { data, error } = await admin.from("organisation_v2").update(input).eq("tenant_id", policyContext.tenantId).eq("id", id).select().single();
      if (error) throw new ApiError(409, "ORGANISATION_UPDATE_FAILED", "The Organisation could not be updated.");
      return { status: 200, data };
    }});
    return Response.json(result.data, { status: result.status, headers: { "Cache-Control": "private, no-store", "X-Idempotent-Replay": String(result.replay) } });
  }),
  DELETE: withApiRoute<{ params: { id: string } }>(async (request, requestContext, route) => {
    const id = requireUuid(route.params.id, "Organisation identifier");
    const idempotencyKey = requireIdempotencyKey(request);
    const { policyContext, admin } = await requireV2PolicyContext(request, requestContext, { capability: "organisation.edit", resourceType: "ORGANISATION", resourceId: id, purpose: "ORGANISATION_DELETE" });
    const result = await executeIdempotentWrite({ admin, context: policyContext, requestPath: requestContext.path, idempotencyKey, payload: { id, action: "DELETE" }, operation: async () => {
      await load(admin, policyContext.tenantId, id);
      const probes = await Promise.all([
        admin.from("product_model").select("id", { count: "exact", head: true }).eq("tenant_id", policyContext.tenantId).eq("manufacturer_organisation_id", id),
        admin.from("product_batch").select("id", { count: "exact", head: true }).eq("tenant_id", policyContext.tenantId).eq("manufacturing_organisation_id", id),
        admin.from("product_organisation_relation").select("id", { count: "exact", head: true }).eq("tenant_id", policyContext.tenantId).eq("organisation_id", id),
        admin.from("data_source").select("id", { count: "exact", head: true }).eq("tenant_id", policyContext.tenantId).eq("provider_organisation_id", id),
      ]);
      const names = ["product_models", "product_batches", "product_responsibilities", "data_sources"];
      const dependencies = Object.fromEntries(probes.map((row, index) => [names[index], row.count || 0]).filter(([, count]) => Number(count) > 0));
      if (Object.keys(dependencies).length) throw new ApiError(409, "ORGANISATION_DELETE_BLOCKED", "The Organisation is referenced by Product or DPP evidence records and must be archived instead.", { dependencies, action: "ARCHIVE" });
      const { error } = await admin.from("organisation_v2").delete().eq("tenant_id", policyContext.tenantId).eq("id", id);
      if (error) throw new ApiError(409, "ORGANISATION_DELETE_FAILED", "The Organisation could not be deleted.");
      return { status: 200, data: { id, deleted: true } };
    }});
    return Response.json(result.data, { status: result.status, headers: { "Cache-Control": "private, no-store", "X-Idempotent-Replay": String(result.replay) } });
  }),
};
