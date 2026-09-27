import { withApiRoute } from "../apiRoute";
import { allowFields, executeIdempotentWrite, requireIdempotencyKey, requireJsonObject } from "./repository";
import { createPhase3TenantRow, listPhase3TenantRows } from "./phase3Repository";
import { requireV2PolicyContext } from "./security";

type Phase3FeatureOptions = {
  schemaFeature?: boolean;
  canonicalFeature?: boolean;
  provenanceFeature?: boolean;
  resolutionFeature?: boolean;
};

export function createPhase3TenantCollectionHandlers(configuration: {
  table: string;
  resourceType: string;
  entityName: string;
  readCapability: string;
  writeCapability: string;
  insertFields: readonly string[];
  features: Phase3FeatureOptions;
}) {
  const GET = withApiRoute(async (request, requestContext) => {
    const { policyContext, admin } = await requireV2PolicyContext(request, requestContext, {
      capability: configuration.readCapability,
      resourceType: configuration.resourceType,
      purpose: configuration.entityName + ".list",
    }, configuration.features);
    const data = await listPhase3TenantRows(admin, policyContext, configuration.table);
    return Response.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
  });

  const POST = withApiRoute(async (request, requestContext) => {
    const idempotencyKey = requireIdempotencyKey(request);
    const input = allowFields(requireJsonObject(await request.json()), configuration.insertFields);
    const { policyContext, admin } = await requireV2PolicyContext(request, requestContext, {
      capability: configuration.writeCapability,
      resourceType: configuration.resourceType,
      purpose: configuration.entityName + ".create",
    }, configuration.features);
    const result = await executeIdempotentWrite({
      admin,
      context: policyContext,
      requestPath: requestContext.path,
      idempotencyKey,
      payload: input,
      operation: async () => ({ status: 201, data: await createPhase3TenantRow(admin, policyContext, configuration.table, input) }),
    });
    return Response.json(result.data, {
      status: result.status,
      headers: { "Cache-Control": "private, no-store", "X-Idempotent-Replay": String(result.replay) },
    });
  });
  return { GET, POST };
}

