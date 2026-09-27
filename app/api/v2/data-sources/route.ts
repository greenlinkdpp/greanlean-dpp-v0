import { createPhase3TenantCollectionHandlers } from "@/lib/server/v2/phase3Routes";
const handlers = createPhase3TenantCollectionHandlers({
  table: "data_source", resourceType: "DATA_SOURCE", entityName: "data_source",
  readCapability: "schema.view", writeCapability: "import.create", features: { schemaFeature: true },
  insertFields: ["source_type", "name", "provider_organisation_id", "system_identifier", "trust_level", "status", "residency_classification", "connector_reference"],
});
export const GET = handlers.GET;
export const POST = handlers.POST;

