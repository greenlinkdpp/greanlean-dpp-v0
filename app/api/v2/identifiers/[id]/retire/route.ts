import { withApiRoute } from "@/lib/server/apiRoute";
import { executeIdempotentWrite, requireIdempotencyKey, requireUuid } from "@/lib/server/v2/repository";
import { updateProductRow } from "@/lib/server/v2/productRepository";
import { requireV2PolicyContext } from "@/lib/server/v2/security";

type RouteContext = { params: { id: string } };

export const POST = withApiRoute<RouteContext>(async (request, requestContext, route) => {
  const id = requireUuid(route.params.id, "Identifier");
  const idempotencyKey = requireIdempotencyKey(request);
  const { policyContext, admin } = await requireV2PolicyContext(request, requestContext, {
    capability: "identifier.manage",
    resourceType: "IDENTIFIER",
    resourceId: id,
    purpose: "identifier.retire",
  }, { productFeature: true });
  const payload = { id, status: "RETIRED" };
  const result = await executeIdempotentWrite({
    admin,
    context: policyContext,
    requestPath: requestContext.path,
    idempotencyKey,
    payload,
    operation: async () => ({
      status: 200,
      data: await updateProductRow(
        admin,
        policyContext,
        "product_subject_identifier",
        id,
        { status: "RETIRED", is_primary: false, valid_until: new Date().toISOString() },
        "IDENTIFIER_NOT_FOUND",
      ),
    }),
  });
  return Response.json(result.data, {
    status: result.status,
    headers: { "Cache-Control": "private, no-store", "X-Idempotent-Replay": String(result.replay) },
  });
});
