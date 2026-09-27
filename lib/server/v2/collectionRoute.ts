import { withApiRoute } from "../apiRoute";
import {
  allowFields,
  createTenantRow,
  executeIdempotentWrite,
  listTenantRows,
  requireIdempotencyKey,
  requireJsonObject,
} from "./repository";
import { requireV2PolicyContext } from "./security";
import type { VerifiedV2PolicyContext } from "./security";

type CollectionConfiguration = {
  table: string;
  resourceType: string;
  readCapability: string;
  writeCapability: string;
  insertFields: readonly string[];
  partnerFeature?: boolean;
  select?: string;
  serverFields?: (context: VerifiedV2PolicyContext) => Record<string, unknown>;
};

export function createTenantCollectionHandlers(configuration: CollectionConfiguration) {
  const GET = withApiRoute(async (request, requestContext) => {
    const { policyContext, admin } = await requireV2PolicyContext(request, requestContext, {
      capability: configuration.readCapability,
      resourceType: configuration.resourceType,
      purpose: "LIST",
    }, { partnerFeature: configuration.partnerFeature });
    const data = await listTenantRows(admin, policyContext, configuration.table, configuration.select);
    return Response.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
  });

  const POST = withApiRoute(async (request, requestContext) => {
    const idempotencyKey = requireIdempotencyKey(request);
    const input = allowFields(requireJsonObject(await request.json()), configuration.insertFields);
    const { policyContext, admin } = await requireV2PolicyContext(request, requestContext, {
      capability: configuration.writeCapability,
      resourceType: configuration.resourceType,
      purpose: "CREATE",
    }, { partnerFeature: configuration.partnerFeature });
    const result = await executeIdempotentWrite({
      admin,
      context: policyContext,
      requestPath: requestContext.path,
      idempotencyKey,
      payload: input,
      operation: async () => ({
        status: 201,
        data: await createTenantRow(admin, policyContext, configuration.table, {
          ...input,
          ...(configuration.serverFields ? configuration.serverFields(policyContext) : {}),
        }),
      }),
    });
    return Response.json(result.data, {
      status: result.status,
      headers: {
        "Cache-Control": "private, no-store",
        "X-Idempotent-Replay": String(result.replay),
      },
    });
  });

  return { GET, POST };
}
