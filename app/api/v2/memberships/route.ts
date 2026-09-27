import { createTenantCollectionHandlers } from "@/lib/server/v2/collectionRoute";

const handlers = createTenantCollectionHandlers({
  table: "tenant_membership",
  resourceType: "MEMBERSHIP",
  readCapability: "membership.view",
  writeCapability: "membership.manage",
  insertFields: ["user_id", "role_id", "status", "valid_from", "valid_until"],
});

export const GET = handlers.GET;
export const POST = handlers.POST;
