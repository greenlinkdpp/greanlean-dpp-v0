import { createTenantCollectionHandlers } from "@/lib/server/v2/collectionRoute";

const handlers = createTenantCollectionHandlers({
  table: "organisation_v2",
  resourceType: "ORGANISATION",
  readCapability: "organisation.view",
  writeCapability: "organisation.edit",
  insertFields: [
    "parent_organisation_id",
    "organisation_type",
    "legal_name",
    "trading_name",
    "country",
    "registration_identifier",
    "vat_number",
    "eori",
    "address",
    "status",
  ],
});

export const GET = handlers.GET;
export const POST = handlers.POST;
