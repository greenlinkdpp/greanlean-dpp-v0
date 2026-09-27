import { createProductItemHandlers } from "@/lib/server/v2/productRoutes";

const handlers = createProductItemHandlers({
  table: "product_subject_identifier",
  resourceType: "IDENTIFIER",
  entityName: "identifier",
  readCapability: "product.view",
  writeCapability: "identifier.manage",
  insertFields: [],
  updateFields: [],
  notFoundCode: "IDENTIFIER_NOT_FOUND",
  conflictCode: "IDENTIFIER_CONFLICT",
});

export const GET = handlers.GET;
