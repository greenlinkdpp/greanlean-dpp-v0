import { withApiRoute } from "../apiRoute";
import { allowFields, executeIdempotentWrite, requireIdempotencyKey, requireJsonObject, requireUuid } from "./repository";
import { createConnector, createConnectorJob, getConnector, getConnectorJob, getReceipt, getRegistrySubmission, listConnectorJobs, listConnectors, retryJob, cancelJob, configureCredential, testConnector, updateConnector, submitRegistry, runImport, aggregateBms, pollRegistrySubmission } from "./phase5Repository";
import { requireV2PolicyContext } from "./security";

const writeHeaders = (replay: boolean) => ({ "X-Idempotent-Replay": String(replay), "Cache-Control": "private, no-store" });

export function connectorCollectionHandlers() {
  const GET = withApiRoute(async (request, context) => {
    const { policyContext, admin } = await requireV2PolicyContext(request, context, { capability: "connector.view", resourceType: "CONNECTOR", purpose: "connector.list" }, { integrationFeature: true });
    return Response.json({ data: await listConnectors(admin, policyContext) }, { headers: { "Cache-Control": "private, no-store" } });
  });
  const POST = withApiRoute(async (request, context) => {
    const idempotencyKey = requireIdempotencyKey(request);
    const input = allowFields(requireJsonObject(await request.json()), ["definition_code","name","environment","status","config_json","data_source_id","mapping_profile_id","rate_limit_profile","retry_profile"]);
    const { policyContext, admin } = await requireV2PolicyContext(request, context, { capability: "connector.manage", resourceType: "CONNECTOR", purpose: "connector.create" }, { integrationFeature: true, externalConnectorFeature: true });
    const result = await executeIdempotentWrite({ admin, context: policyContext, requestPath: context.path, idempotencyKey, payload: input, operation: async () => ({ status: 201, data: await createConnector(admin, policyContext, input) }) });
    return Response.json(result.data, { status: result.status, headers: writeHeaders(result.replay) });
  });
  return { GET, POST };
}

export function connectorJobsHandlers() {
  const GET = withApiRoute<{ params: { id: string } }>(async (request, context, route) => {
    const id = requireUuid(route.params.id, "Connector identifier");
    const { policyContext, admin } = await requireV2PolicyContext(request, context, { capability: "connector.view", resourceType: "CONNECTOR", resourceId: id, purpose: "connector.jobs.list" }, { integrationFeature: true });
    return Response.json({ data: await listConnectorJobs(admin, policyContext, id) }, { headers: { "Cache-Control": "private, no-store" } });
  });
  const POST = withApiRoute<{ params: { id: string } }>(async (request, context, route) => {
    const id = requireUuid(route.params.id, "Connector identifier");
    const idempotencyKey = requireIdempotencyKey(request);
    const input = allowFields(requireJsonObject(await request.json()), ["job_type","direction","subject_type","subject_id","passport_id","version_id","mapping_version_id","operation_snapshot"]);
    const { policyContext, admin } = await requireV2PolicyContext(request, context, { capability: "connector.execute", resourceType: "CONNECTOR", resourceId: id, purpose: "connector.execute" }, { integrationFeature: true, externalConnectorFeature: true, connectorExecutionFeature: true });
    const result = await executeIdempotentWrite({ admin, context: policyContext, requestPath: context.path, idempotencyKey, payload: input, operation: async () => ({ status: 202, data: await createConnectorJob(admin, policyContext, id, input, idempotencyKey) }) });
    return Response.json(result.data, { status: result.status, headers: writeHeaders(result.replay) });
  });
  return { GET, POST };
}

export const registrySubmissionPost = withApiRoute(async (request, context) => {
  const idempotencyKey = requireIdempotencyKey(request);
  const input = allowFields(requireJsonObject(await request.json()), ["connector_instance_id","version_id","registry_profile","fixture_mode"]);
  const { policyContext, admin } = await requireV2PolicyContext(request, context, { capability: "registry.submit", resourceType: "REGISTRY_SUBMISSION", resourceId: String(input.version_id || "") || undefined, purpose: "registry.submit" }, { integrationFeature: true, registryTestFeature: true, publicationFeature: true, connectorExecutionFeature: true });
  const result = await executeIdempotentWrite({ admin, context: policyContext, requestPath: context.path, idempotencyKey, payload: input, operation: async () => ({ status: 201, data: await submitRegistry(admin, policyContext, input, idempotencyKey) }) });
  return Response.json(result.data, { status: result.status, headers: writeHeaders(result.replay) });
});

export const importPost = withApiRoute(async (request, context) => {
  const idempotencyKey = requireIdempotencyKey(request);
  const input = allowFields(requireJsonObject(await request.json()), ["connector_instance_id","mapping_version_id","file_format","content","action","allow_unmapped","subject_type","subject_id"]);
  const commit = String(input.action || "PREFLIGHT").toUpperCase() === "COMMIT";
  const { policyContext, admin } = await requireV2PolicyContext(request, context, { capability: commit ? "import.commit" : "import.create", resourceType: "CONNECTOR_IMPORT", purpose: commit ? "import.commit" : "import.preflight" }, { integrationFeature: true, fileImportFeature: true, schemaFeature: true, canonicalFeature: commit, provenanceFeature: commit, connectorExecutionFeature: true });
  const result = await executeIdempotentWrite({ admin, context: policyContext, requestPath: context.path, idempotencyKey, payload: input, operation: async () => ({ status: commit ? 201 : 200, data: await runImport(admin, policyContext, input) }) });
  return Response.json(result.data, { status: result.status, headers: writeHeaders(result.replay) });
});

export const bmsAggregationPost = withApiRoute(async (request, context) => {
  const idempotencyKey = requireIdempotencyKey(request);
  const input = allowFields(requireJsonObject(await request.json()), ["connector_instance_id","device_id","item_id","samples","thresholds","claim_rule"]);
  const { policyContext, admin } = await requireV2PolicyContext(request, context, { capability: "connector.execute", resourceType: "CONNECTOR", resourceId: String(input.connector_instance_id || "") || undefined, purpose: "bms.aggregate" }, { integrationFeature: true, bmsFeature: true, productFeature: true, connectorExecutionFeature: true });
  const result = await executeIdempotentWrite({ admin, context: policyContext, requestPath: context.path, idempotencyKey, payload: input, operation: async () => ({ status: 201, data: await aggregateBms(admin, policyContext, input) }) });
  return Response.json(result.data, { status: result.status, headers: writeHeaders(result.replay) });
});

export { cancelJob, configureCredential, getConnector, getConnectorJob, getReceipt, getRegistrySubmission, pollRegistrySubmission, retryJob, testConnector, updateConnector };
