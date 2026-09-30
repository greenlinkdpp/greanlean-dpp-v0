import { ApiError, withApiRoute } from "../apiRoute";
import { requireJsonObject, requireUuid } from "./repository";
import { requirePlatformCapability } from "./platformSecurity";

const categories = new Set([
  "LMT_BATTERY", "INDUSTRIAL_BATTERY", "TEXTILE", "CONSUMER_ELECTRONICS",
  "BUILDING_MATERIAL", "HARDWARE",
]);

const writableFields = [
  "tenant_id", "passport_id", "category_code", "title_en", "title_zh", "brand",
  "summary_en", "summary_zh", "key_parameters", "cover_style", "sort_order",
  "is_featured", "is_public",
] as const;

function clean(input: Record<string, unknown>, fields: readonly string[]) {
  const unknown = Object.keys(input).filter((key) => !fields.includes(key));
  if (unknown.length) throw new ApiError(400, "UNKNOWN_FIELDS", "The request contains unsupported Demo Showcase fields.", { fields: unknown });
  return Object.fromEntries(Object.entries(input).filter(([key]) => fields.includes(key)));
}

function requireText(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) throw new ApiError(400, "DEMO_FIELD_REQUIRED", `${label} is required.`);
  return value.trim();
}

function validate(input: Record<string, unknown>, create: boolean) {
  if (create) {
    requireUuid(String(input.tenant_id || ""), "Tenant identifier");
    requireUuid(String(input.passport_id || ""), "Passport identifier");
    for (const field of ["title_en", "title_zh", "brand", "summary_en", "summary_zh"] as const) requireText(input[field], field);
  }
  if ("category_code" in input && !categories.has(String(input.category_code))) {
    throw new ApiError(400, "DEMO_CATEGORY_INVALID", "The Demo Showcase category is not supported.");
  }
  if ("sort_order" in input && (!Number.isInteger(input.sort_order) || Number(input.sort_order) < 0)) {
    throw new ApiError(400, "DEMO_SORT_ORDER_INVALID", "The Demo Showcase sort order must be a non-negative integer.");
  }
  if ("key_parameters" in input && (!input.key_parameters || Array.isArray(input.key_parameters) || typeof input.key_parameters !== "object")) {
    throw new ApiError(400, "DEMO_PARAMETERS_INVALID", "Demo Showcase key parameters must be an object.");
  }
}

async function assertPassportBinding(admin: any, tenantId: string, passportId: string) {
  const { data, error } = await admin.from("dpp_passport")
    .select("id,tenant_id,status,publication_source")
    .eq("id", passportId).eq("tenant_id", tenantId).maybeSingle();
  if (error || !data) throw new ApiError(409, "DEMO_PASSPORT_SCOPE_INVALID", "The selected Passport does not belong to the selected active Tenant.");
  if (data.status !== "ACTIVE") throw new ApiError(409, "DEMO_PASSPORT_INACTIVE", "Only an active Passport can be shown in the Demo Showcase.");
}

export const demoShowcaseCollectionHandlers = {
  POST: withApiRoute(async (request, requestContext) => {
    const input = clean(requireJsonObject(await request.json()), writableFields);
    validate(input, true);
    const tenantId = String(input.tenant_id);
    const passportId = String(input.passport_id);
    const { admin, platformContext } = await requirePlatformCapability(request, requestContext, "platform.demo.manage", { tenantId, resourceType: "DEMO_SHOWCASE", operation: "platform.demo.create" });
    await assertPassportBinding(admin, tenantId, passportId);
    const { data, error } = await admin.from("demo_showcase_entry").insert({
      ...input, tenant_id: tenantId, passport_id: passportId, is_demo: true, synthetic: true,
      created_by: platformContext.user.id,
    }).select().single();
    if (error?.code === "23505") throw new ApiError(409, "DEMO_SHOWCASE_CONFLICT", "A Demo Showcase entry already uses this Passport or sort position.");
    if (error) throw new ApiError(409, "DEMO_SHOWCASE_CREATE_FAILED", "The Demo Showcase entry could not be created.");
    return Response.json({ data }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  }),
};

export const demoShowcaseItemHandlers = {
  PATCH: withApiRoute<{ params: { id: string } }>(async (request, requestContext, route) => {
    const id = requireUuid(route.params.id, "Demo Showcase identifier");
    const input = clean(requireJsonObject(await request.json()), writableFields.filter((field) => !["tenant_id", "passport_id"].includes(field)));
    if (!Object.keys(input).length) throw new ApiError(400, "DEMO_UPDATE_REQUIRED", "At least one Demo Showcase field is required.");
    validate(input, false);
    const { admin } = await requirePlatformCapability(request, requestContext, "platform.demo.manage", { resourceType: "DEMO_SHOWCASE", operation: "platform.demo.update" });
    const { data, error } = await admin.from("demo_showcase_entry").update(input).eq("id", id).select().maybeSingle();
    if (error?.code === "23505") throw new ApiError(409, "DEMO_SHOWCASE_CONFLICT", "Another Demo Showcase entry already uses this sort position.");
    if (error) throw new ApiError(409, "DEMO_SHOWCASE_UPDATE_FAILED", "The Demo Showcase entry could not be updated.");
    if (!data) throw new ApiError(404, "DEMO_SHOWCASE_NOT_FOUND", "The Demo Showcase entry was not found.");
    return Response.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
  }),
  DELETE: withApiRoute<{ params: { id: string } }>(async (request, requestContext, route) => {
    const id = requireUuid(route.params.id, "Demo Showcase identifier");
    const { admin } = await requirePlatformCapability(request, requestContext, "platform.demo.manage", { resourceType: "DEMO_SHOWCASE", operation: "platform.demo.delete" });
    const { data, error } = await admin.from("demo_showcase_entry").delete().eq("id", id).select("id").maybeSingle();
    if (error) throw new ApiError(409, "DEMO_SHOWCASE_DELETE_FAILED", "The Demo Showcase entry could not be deleted.");
    if (!data) throw new ApiError(404, "DEMO_SHOWCASE_NOT_FOUND", "The Demo Showcase entry was not found.");
    return Response.json({ data: { id, deleted: true } }, { headers: { "Cache-Control": "private, no-store" } });
  }),
};
