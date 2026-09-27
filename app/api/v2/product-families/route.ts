import { createProductCollectionHandlers } from "@/lib/server/v2/productRoutes";

const handlers = createProductCollectionHandlers({
  table: "product_family",
  resourceType: "PRODUCT_FAMILY",
  entityName: "product_family",
  insertFields: ["code", "name", "description", "status"],
  updateFields: ["code", "name", "description", "status"],
  notFoundCode: "PRODUCT_FAMILY_NOT_FOUND",
});

export const GET = handlers.GET;
export const POST = handlers.POST;
