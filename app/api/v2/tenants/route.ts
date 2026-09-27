import { withApiRoute } from "@/lib/server/apiRoute";
import {
  allowFields,
  executeIdempotentWrite,
  loadTenant,
  requireIdempotencyKey,
  requireJsonObject,
  updateTenant,
} from "@/lib/server/v2/repository";
import { requireV2PolicyContext } from "@/lib/server/v2/security";

export const GET = withApiRoute(async (request, requestContext) => {
  const { policyContext, admin } = await requireV2PolicyContext(request, requestContext, {
    capability: "tenant.view",
    resourceType: "TENANT",
    purpose: "READ",
  });
  const data = await loadTenant(admin, policyContext);
  return Response.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
});

export const PATCH = withApiRoute(async (request, requestContext) => {
  const idempotencyKey = requireIdempotencyKey(request);
  const input = allowFields(requireJsonObject(await request.json()), ["name", "residency_policy"]);
  const { policyContext, admin } = await requireV2PolicyContext(request, requestContext, {
    capability: "tenant.manage",
    resourceType: "TENANT",
    purpose: "UPDATE",
  });
  const result = await executeIdempotentWrite({
    admin,
    context: policyContext,
    requestPath: requestContext.path,
    idempotencyKey,
    payload: input,
    operation: async () => ({ status: 200, data: await updateTenant(admin, policyContext, input) }),
  });
  return Response.json(result.data, {
    status: result.status,
    headers: { "Cache-Control": "private, no-store", "X-Idempotent-Replay": String(result.replay) },
  });
});
