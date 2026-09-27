import { withApiRoute } from "@/lib/server/apiRoute";
import { executeIdempotentWrite, requireIdempotencyKey, requireUuid } from "@/lib/server/v2/repository";
import { updateProductRow } from "@/lib/server/v2/productRepository";
import { requireV2PolicyContext } from "@/lib/server/v2/security";

type RouteContext = { params: { id: string } };

export const POST = withApiRoute<RouteContext>(async (request, requestContext, route) => {
  const id = requireUuid(route.params.id, "Batch-SKU Link identifier");
  const idempotencyKey = requireIdempotencyKey(request);
  const { policyContext, admin } = await requireV2PolicyContext(request, requestContext, {
    capability: "product.edit",
    resourceType: "BATCH_SKU_LINK",
    resourceId: id,
    purpose: "batch_sku_link.deactivate",
  }, { productFeature: true });
  const payload = { id, status: "INACTIVE" };
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
        "batch_sku_link",
        id,
        { status: "INACTIVE", valid_until: new Date().toISOString() },
        "BATCH_SKU_LINK_NOT_FOUND",
      ),
    }),
  });
  return Response.json(result.data, {
    status: result.status,
    headers: { "Cache-Control": "private, no-store", "X-Idempotent-Replay": String(result.replay) },
  });
});
