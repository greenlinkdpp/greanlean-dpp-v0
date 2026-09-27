import { withApiRoute } from "../apiRoute";
import { allowFields, executeIdempotentWrite, requireIdempotencyKey, requireJsonObject, requireUuid } from "./repository";
import {
  createPassport, createResolverMapping,
  decideReview, getPassport, getReview, listPassports, listReviews,
  publishReview, submitReview, updatePassport, withdrawVersion,
} from "./phase4Repository";
import { requireV2PolicyContext } from "./security";

export function passportCollectionHandlers() {
  const GET = withApiRoute(async (request, context) => {
    const { policyContext, admin } = await requireV2PolicyContext(request, context, {
      capability: "dpp.view", resourceType: "DPP_PASSPORT", purpose: "passport.list",
    }, { passportFeature: true });
    return Response.json({ data: await listPassports(admin, policyContext) }, { headers: { "Cache-Control": "private, no-store" } });
  });
  const POST = withApiRoute(async (request, context) => {
    const idempotencyKey = requireIdempotencyKey(request);
    const input = allowFields(requireJsonObject(await request.json()), [
      "subject_type", "subject_id", "passport_profile_code", "passport_identifier",
      "schema_definition_id", "publication_source", "issuer", "scheme",
    ]);
    const { policyContext, admin } = await requireV2PolicyContext(request, context, {
      capability: "dpp.create", resourceType: "DPP_PASSPORT", purpose: "passport.create",
    }, { passportFeature: true, productFeature: true, schemaFeature: true, publicationWriteFeature: true });
    const result = await executeIdempotentWrite({
      admin, context: policyContext, requestPath: context.path, idempotencyKey, payload: input,
      operation: async () => ({ status: 201, data: await createPassport(admin, policyContext, input) }),
    });
    return Response.json(result.data, { status: result.status, headers: { "X-Idempotent-Replay": String(result.replay), "Cache-Control": "private, no-store" } });
  });
  return { GET, POST };
}

export function reviewCollectionHandlers() {
  const GET = withApiRoute(async (request, context) => {
    const { policyContext, admin } = await requireV2PolicyContext(request, context, {
      capability: "dpp.review", resourceType: "DPP_REVIEW", purpose: "review.list",
    }, { reviewFeature: true });
    return Response.json({ data: await listReviews(admin, policyContext) }, { headers: { "Cache-Control": "private, no-store" } });
  });
  const POST = withApiRoute(async (request, context) => {
    const idempotencyKey = requireIdempotencyKey(request);
    const input = allowFields(requireJsonObject(await request.json()), ["passport_id", "schema_version_id", "candidate_hash"]);
    const { policyContext, admin } = await requireV2PolicyContext(request, context, {
      capability: "dpp.submit_review", resourceType: "DPP_REVIEW", purpose: "review.submit",
    }, { reviewFeature: true, passportFeature: true, productFeature: true, schemaFeature: true, canonicalFeature: true, provenanceFeature: true, resolutionFeature: true, publicationWriteFeature: true });
    const result = await executeIdempotentWrite({
      admin, context: policyContext, requestPath: context.path, idempotencyKey, payload: input,
      operation: async () => ({ status: 201, data: await submitReview(admin, policyContext, input) }),
    });
    return Response.json(result.data, { status: result.status, headers: { "X-Idempotent-Replay": String(result.replay), "Cache-Control": "private, no-store" } });
  });
  return { GET, POST };
}

export function reviewDecisionHandler(action: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED", capability: string) {
  return withApiRoute<{ params: { id: string } }>(async (request, context, route) => {
    const id = requireUuid(route.params.id, "Review identifier");
    const body = requireJsonObject(await request.json());
    const input = allowFields(body, ["reason"]);
    const idempotencyKey = requireIdempotencyKey(request);
    const { policyContext, admin } = await requireV2PolicyContext(request, context, {
      capability, resourceType: "DPP_REVIEW", resourceId: id, purpose: `review.${action.toLowerCase()}`,
    }, { reviewFeature: true, publicationWriteFeature: true });
    const result = await executeIdempotentWrite({
      admin, context: policyContext, requestPath: context.path, idempotencyKey, payload: input,
      operation: async () => ({ status: 200, data: await decideReview(admin, policyContext, id, action, input.reason ? String(input.reason) : undefined) }),
    });
    return Response.json(result.data, { status: result.status, headers: { "X-Idempotent-Replay": String(result.replay), "Cache-Control": "private, no-store" } });
  });
}

export const createResolverMappingHandler = withApiRoute(async (request, context) => {
  const idempotencyKey = requireIdempotencyKey(request);
  const input = allowFields(requireJsonObject(await request.json()), [
    "identifier_id", "host", "normalized_path", "passport_id", "target_mapping_id",
    "mapping_type", "status", "is_public", "valid_from", "valid_until", "redirect_http_status",
  ]);
  const { policyContext, admin } = await requireV2PolicyContext(request, context, {
    capability: "identifier.manage", resourceType: "RESOLVER_MAPPING", purpose: "resolver_mapping.create",
  }, { resolverFeature: true, passportFeature: true, productFeature: true, publicationWriteFeature: true });
  const result = await executeIdempotentWrite({
    admin, context: policyContext, requestPath: context.path, idempotencyKey, payload: input,
    operation: async () => ({ status: 201, data: await createResolverMapping(admin, policyContext, input) }),
  });
  return Response.json(result.data, { status: result.status, headers: { "X-Idempotent-Replay": String(result.replay), "Cache-Control": "private, no-store" } });
});

export { getPassport, getReview, publishReview, updatePassport, withdrawVersion };
