import { withApiRoute } from "@/lib/server/apiRoute";
import {
  allowFields,
  executeIdempotentWrite,
  requireIdempotencyKey,
  requireJsonObject,
  requireUuid,
  transitionPartnerAuthorization,
} from "@/lib/server/v2/repository";
import { requireV2PolicyContext } from "@/lib/server/v2/security";

type RouteContext = { params: { authorizationId: string } };

export const POST = withApiRoute<RouteContext>(async (request, requestContext, route) => {
  const authorizationId = requireUuid(route.params.authorizationId, "partner authorization identifier");
  const idempotencyKey = requireIdempotencyKey(request);
  const input = allowFields(
    requireJsonObject(await request.json().catch(() => ({}))),
    ["approval_evidence_reference"],
  );
  const { policyContext, admin } = await requireV2PolicyContext(request, requestContext, {
    capability: "partner_authorization.approve",
    resourceType: "PARTNER_AUTHORIZATION",
    resourceId: authorizationId,
    purpose: "APPROVE",
  }, { partnerFeature: true });
  const result = await executeIdempotentWrite({
    admin,
    context: policyContext,
    requestPath: requestContext.path,
    idempotencyKey,
    payload: { authorization_id: authorizationId, ...input },
    operation: async () => ({
      status: 200,
      data: await transitionPartnerAuthorization(admin, policyContext, authorizationId, "APPROVE", input),
    }),
  });
  return Response.json(result.data, {
    status: result.status,
    headers: { "Cache-Control": "private, no-store", "X-Idempotent-Replay": String(result.replay) },
  });
});
