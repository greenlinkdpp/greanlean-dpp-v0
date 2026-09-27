import { withApiRoute } from "@/lib/server/apiRoute";
import { allowFields, executeIdempotentWrite, requireIdempotencyKey, requireJsonObject, requireUuid } from "@/lib/server/v2/repository";
import { getPassport, updatePassport } from "@/lib/server/v2/phase4Repository";
import { requireV2PolicyContext } from "@/lib/server/v2/security";

export const GET = withApiRoute<{ params: { id: string } }>(async (request, context, route) => {
  const id = requireUuid(route.params.id, "Passport identifier");
  const { policyContext, admin } = await requireV2PolicyContext(request, context, {
    capability: "dpp.view", resourceType: "DPP_PASSPORT", resourceId: id, purpose: "passport.read",
  }, { passportFeature: true });
  return Response.json({ data: await getPassport(admin, policyContext, id) }, { headers: { "Cache-Control": "private, no-store" } });
});

export const PATCH = withApiRoute<{ params: { id: string } }>(async (request, context, route) => {
  const id = requireUuid(route.params.id, "Passport identifier");
  const idempotencyKey = requireIdempotencyKey(request);
  const input = allowFields(requireJsonObject(await request.json()), ["passport_profile_code", "status"]);
  const { policyContext, admin } = await requireV2PolicyContext(request, context, {
    capability: "dpp.edit", resourceType: "DPP_PASSPORT", resourceId: id, purpose: "passport.update",
  }, { passportFeature: true, publicationWriteFeature: true });
  const result = await executeIdempotentWrite({ admin, context: policyContext, requestPath: context.path, idempotencyKey, payload: input,
    operation: async () => ({ status: 200, data: await updatePassport(admin, policyContext, id, input) }) });
  return Response.json(result.data, { status: result.status, headers: { "X-Idempotent-Replay": String(result.replay), "Cache-Control": "private, no-store" } });
});
