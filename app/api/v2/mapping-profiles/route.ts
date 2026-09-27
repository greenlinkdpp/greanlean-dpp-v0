import { createPhase3TenantCollectionHandlers } from "@/lib/server/v2/phase3Routes";
const handlers = createPhase3TenantCollectionHandlers({
  table: "mapping_profile", resourceType: "MAPPING_PROFILE", entityName: "mapping_profile",
  readCapability: "schema.view", writeCapability: "import.create", features: { schemaFeature: true, canonicalFeature: true },
  insertFields: ["data_source_id", "target_schema_definition_id", "name", "status"],
});
export const GET = handlers.GET;
export const POST = handlers.POST;

