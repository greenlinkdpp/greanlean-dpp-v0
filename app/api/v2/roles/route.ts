import { withApiRoute } from "@/lib/server/apiRoute";
import {
  allowFields,
  createRoleWithCapabilities,
  executeIdempotentWrite,
  listTenantRows,
  requireIdempotencyKey,
  requireJsonObject,
} from "@/lib/server/v2/repository";
import { requireV2PolicyContext } from "@/lib/server/v2/security";

export const GET = withApiRoute(async (request, requestContext) => {
  const { policyContext, admin } = await requireV2PolicyContext(request, requestContext, {
    capability: "membership.view",
    resourceType: "ROLE",
    purpose: "LIST",
  });
  const data = await listTenantRows(admin, policyContext, "role");
  return Response.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
});

export const POST = withApiRoute(async (request, requestContext) => {
  const idempotencyKey = requireIdempotencyKey(request);
  const input = allowFields(requireJsonObject(await request.json()), ["code", "name", "managed", "status", "capability_codes"]);
  const { policyContext, admin } = await requireV2PolicyContext(request, requestContext, {
    capability: "membership.manage",
    resourceType: "ROLE",
    purpose: "CREATE",
  });
  const result = await executeIdempotentWrite({
    admin,
    context: policyContext,
    requestPath: requestContext.path,
    idempotencyKey,
    payload: input,
    operation: async () => ({ status: 201, data: await createRoleWithCapabilities(admin, policyContext, input) }),
  });
  return Response.json(result.data, {
    status: result.status,
    headers: { "Cache-Control": "private, no-store", "X-Idempotent-Replay": String(result.replay) },
  });
});
