import type { User } from "@supabase/supabase-js";
import { ApiError } from "../apiRoute";
import type { RequestContext } from "../requestContext";
import { requireAuthenticatedUser } from "../supabase";
import { requireV2FeatureFlags } from "./featureFlags";
import { evaluatePolicyDecisionPoint, type V2PolicyRequest } from "./policyDecisionPoint";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const policyContextBrand: unique symbol = Symbol("verified-v2-policy-context");

export type VerifiedV2PolicyContext = {
  readonly [policyContextBrand]: true;
  readonly user: User;
  readonly tenantId: string;
  readonly actorType: "TENANT" | "PARTNER";
  readonly authorityId: string;
  readonly partnerId: string | null;
  readonly capability: string;
  readonly correlationId: string;
  readonly effectiveScope: Record<string, unknown>;
};

export async function requireV2PolicyContext(
  request: Request,
  requestContext: RequestContext,
  policyRequest: Omit<V2PolicyRequest, "tenantId">,
  options: {
    partnerFeature?: boolean;
    productFeature?: boolean;
    schemaFeature?: boolean;
    canonicalFeature?: boolean;
    provenanceFeature?: boolean;
    resolutionFeature?: boolean;
    passportFeature?: boolean;
    reviewFeature?: boolean;
    publicationFeature?: boolean;
    publicationWriteFeature?: boolean;
    resolverFeature?: boolean;
    publicProjectionFeature?: boolean;
    integrationFeature?: boolean;
    fileImportFeature?: boolean;
    registryTestFeature?: boolean;
    externalConnectorFeature?: boolean;
    bmsFeature?: boolean;
    connectorExecutionFeature?: boolean;
  } = {},
) {
  requireV2FeatureFlags(
    ...(options.partnerFeature ? ["FEATURE_V2_PARTNER" as const] : []),
    ...(options.productFeature ? ["FEATURE_V2_PRODUCT_CORE" as const] : []),
    ...(options.schemaFeature ? ["FEATURE_V2_SCHEMA_CORE" as const] : []),
    ...(options.canonicalFeature ? ["FEATURE_V2_CANONICAL_DATA" as const] : []),
    ...(options.provenanceFeature ? ["FEATURE_V2_PROVENANCE" as const] : []),
    ...(options.resolutionFeature ? ["FEATURE_V2_RESOLUTION_ENGINE" as const] : []),
    ...(options.passportFeature ? ["FEATURE_V2_DPP_PASSPORT" as const] : []),
    ...(options.reviewFeature ? ["FEATURE_V2_DPP_REVIEW" as const] : []),
    ...(options.publicationFeature ? ["FEATURE_V2_DPP_PUBLICATION" as const] : []),
    ...(options.resolverFeature ? ["FEATURE_V2_RESOLVER" as const] : []),
    ...(options.publicProjectionFeature ? ["FEATURE_V2_PUBLIC_PROJECTION" as const] : []),
    ...(options.integrationFeature ? ["FEATURE_V2_INTEGRATION_CORE" as const] : []),
    ...(options.fileImportFeature ? ["FEATURE_V2_FILE_IMPORT" as const] : []),
    ...(options.registryTestFeature ? ["FEATURE_V2_REGISTRY_TEST" as const] : []),
    ...(options.externalConnectorFeature ? ["FEATURE_V2_EXTERNAL_CONNECTORS" as const] : []),
    ...(options.bmsFeature ? ["FEATURE_V2_BMS_ADAPTER" as const] : []),
    ...(options.publicationWriteFeature ? ["FEATURE_V2_PUBLICATION_WRITE" as const] : []),
    ...(options.connectorExecutionFeature ? ["FEATURE_V2_CONNECTOR_EXECUTION" as const] : []),
  );
  const { user } = await requireAuthenticatedUser(request);
  const tenantId = request.headers.get("x-tenant-id")?.trim() || "";
  if (!UUID.test(tenantId)) {
    throw new ApiError(400, "TENANT_CONTEXT_REQUIRED", "A valid x-tenant-id header is required.");
  }
  const { decision, admin } = await evaluatePolicyDecisionPoint(user, requestContext, {
    tenantId,
    ...policyRequest,
  });
  if (!decision.allowed || !decision.authorityId || (decision.actorType !== "TENANT" && decision.actorType !== "PARTNER")) {
    throw new ApiError(403, decision.reasonCode, "The requested operation is not permitted.");
  }
  const policyContext: VerifiedV2PolicyContext = {
    [policyContextBrand]: true,
    user,
    tenantId,
    actorType: decision.actorType,
    authorityId: decision.authorityId,
    partnerId: decision.partnerId,
    capability: policyRequest.capability,
    correlationId: requestContext.correlationId,
    effectiveScope: decision.effectiveScope,
  };
  return { policyContext, admin };
}

export function assertVerifiedPolicyContext(context: VerifiedV2PolicyContext | undefined) {
  if (!context || context[policyContextBrand] !== true) {
    throw new ApiError(500, "VERIFIED_POLICY_CONTEXT_REQUIRED", "The service repository requires a verified policy context.");
  }
}
