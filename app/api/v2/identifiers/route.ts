import { createProductCollectionHandlers } from "@/lib/server/v2/productRoutes";

const handlers = createProductCollectionHandlers({
  table: "product_subject_identifier",
  resourceType: "IDENTIFIER",
  entityName: "identifier",
  readCapability: "product.view",
  writeCapability: "identifier.manage",
  insertFields: [
    "subject_type",
    "subject_id",
    "identifier_type",
    "value",
    "issuer",
    "scheme",
    "valid_from",
    "valid_until",
    "is_primary",
    "status",
  ],
  updateFields: [],
  notFoundCode: "IDENTIFIER_NOT_FOUND",
  conflictCode: "IDENTIFIER_CONFLICT",
});

export const GET = handlers.GET;
export const POST = handlers.POST;
