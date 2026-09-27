import { withApiRoute } from "@/lib/server/apiRoute";
import {
  allowFields,
  createPartnerProposal,
  executeIdempotentWrite,
  listPartners,
  requireIdempotencyKey,
  requireJsonObject,
} from "@/lib/server/v2/repository";
import { requireV2PolicyContext } from "@/lib/server/v2/security";

export const GET = withApiRoute(async (request, requestContext) => {
  const { policyContext, admin } = await requireV2PolicyContext(request, requestContext, {
    capability: "partner.view",
    resourceType: "PARTNER",
    purpose: "LIST",
  }, { partnerFeature: true });
  const data = await listPartners(admin, policyContext);
  return Response.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
});

export const POST = withApiRoute(async (request, requestContext) => {
  const idempotencyKey = requireIdempotencyKey(request);
  const input = allowFields(requireJsonObject(await request.json()), [
    "legal_name",
    "trading_name",
    "registration_identifier",
    "country",
    "partner_type",
    "status",
    "permission_profile_id",
    "scope",
    "valid_from",
    "valid_until",
  ]);
  const { policyContext, admin } = await requireV2PolicyContext(request, requestContext, {
    capability: "partner.manage",
    resourceType: "PARTNER",
    purpose: "CREATE_AND_PROPOSE",
  }, { partnerFeature: true });
  const result = await executeIdempotentWrite({
    admin,
    context: policyContext,
    requestPath: requestContext.path,
    idempotencyKey,
    payload: input,
    operation: async () => ({ status: 201, data: await createPartnerProposal(admin, policyContext, input) }),
  });
  return Response.json(result.data, {
    status: result.status,
    headers: { "Cache-Control": "private, no-store", "X-Idempotent-Replay": String(result.replay) },
  });
});
