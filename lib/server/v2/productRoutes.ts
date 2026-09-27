import { withApiRoute } from "../apiRoute";
import {
  allowFields,
  executeIdempotentWrite,
  requireIdempotencyKey,
  requireJsonObject,
  requireUuid,
} from "./repository";
import {
  createProductRow,
  listProductRows,
  loadProductRow,
  updateProductRow,
} from "./productRepository";
import { requireV2PolicyContext } from "./security";

export type ProductRouteConfiguration = {
  table: string;
  resourceType: string;
  entityName: string;
  readCapability?: string;
  writeCapability?: string;
  insertFields: readonly string[];
  updateFields: readonly string[];
  notFoundCode: string;
  conflictCode?: string;
};

export function createProductCollectionHandlers(configuration: ProductRouteConfiguration) {
  const readCapability = configuration.readCapability || "product.view";
  const writeCapability = configuration.writeCapability || "product.edit";
  const GET = withApiRoute(async (request, requestContext) => {
    const { policyContext, admin } = await requireV2PolicyContext(request, requestContext, {
      capability: readCapability,
      resourceType: configuration.resourceType,
      purpose: configuration.entityName + ".list",
    }, { partnerFeature: true, productFeature: true });
    const data = await listProductRows(admin, policyContext, configuration.table);
    return Response.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
  });

  const POST = withApiRoute(async (request, requestContext) => {
    const idempotencyKey = requireIdempotencyKey(request);
    const input = allowFields(requireJsonObject(await request.json()), configuration.insertFields);
    const { policyContext, admin } = await requireV2PolicyContext(request, requestContext, {
      capability: writeCapability,
      resourceType: configuration.resourceType,
      purpose: configuration.entityName + ".create",
    }, { productFeature: true });
    const result = await executeIdempotentWrite({
      admin,
      context: policyContext,
      requestPath: requestContext.path,
      idempotencyKey,
      payload: input,
      operation: async () => ({
        status: 201,
        data: await createProductRow(
          admin,
          policyContext,
          configuration.table,
          input,
          configuration.conflictCode,
        ),
      }),
    });
    return Response.json(result.data, {
      status: result.status,
      headers: { "Cache-Control": "private, no-store", "X-Idempotent-Replay": String(result.replay) },
    });
  });
  return { GET, POST };
}

export function createProductItemHandlers(configuration: ProductRouteConfiguration) {
  type RouteContext = { params: { id: string } };
  const readCapability = configuration.readCapability || "product.view";
  const writeCapability = configuration.writeCapability || "product.edit";

  const GET = withApiRoute<RouteContext>(async (request, requestContext, route) => {
    const id = requireUuid(route.params.id, "Product resource identifier");
    const { policyContext, admin } = await requireV2PolicyContext(request, requestContext, {
      capability: readCapability,
      resourceType: configuration.resourceType,
      resourceId: id,
      purpose: configuration.entityName + ".read",
    }, { partnerFeature: true, productFeature: true });
    const data = await loadProductRow(admin, policyContext, configuration.table, id, configuration.notFoundCode);
    return Response.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
  });

  const PATCH = withApiRoute<RouteContext>(async (request, requestContext, route) => {
    const id = requireUuid(route.params.id, "Product resource identifier");
    const idempotencyKey = requireIdempotencyKey(request);
    const input = allowFields(requireJsonObject(await request.json()), configuration.updateFields);
    const purpose = input.status === "ARCHIVED"
      ? configuration.entityName + ".archive"
      : configuration.entityName + ".update";
    const { policyContext, admin } = await requireV2PolicyContext(request, requestContext, {
      capability: writeCapability,
      resourceType: configuration.resourceType,
      resourceId: id,
      purpose,
    }, { productFeature: true });
    const result = await executeIdempotentWrite({
      admin,
      context: policyContext,
      requestPath: requestContext.path,
      idempotencyKey,
      payload: { id, ...input },
      operation: async () => ({
        status: 200,
        data: await updateProductRow(
          admin,
          policyContext,
          configuration.table,
          id,
          input,
          configuration.notFoundCode,
        ),
      }),
    });
    return Response.json(result.data, {
      status: result.status,
      headers: { "Cache-Control": "private, no-store", "X-Idempotent-Replay": String(result.replay) },
    });
  });
  return { GET, PATCH };
}
