import { createPhase3TenantCollectionHandlers } from "@/lib/server/v2/phase3Routes";
const handlers = createPhase3TenantCollectionHandlers({
  table: "source_record", resourceType: "SOURCE_RECORD", entityName: "source_record",
  readCapability: "schema.view", writeCapability: "import.create", features: { schemaFeature: true, provenanceFeature: true },
  insertFields: ["data_source_id", "external_record_id", "subject_type", "subject_id", "subject_hint", "payload_mode", "payload_json", "payload_reference", "payload_hash", "observed_at", "classification", "status"],
});
export const GET = handlers.GET;
export const POST = handlers.POST;

