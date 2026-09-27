import { createProductItemHandlers } from "@/lib/server/v2/productRoutes";

const handlers = createProductItemHandlers({
  table: "product_family",
  resourceType: "PRODUCT_FAMILY",
  entityName: "product_family",
  insertFields: [],
  updateFields: ["code", "name", "description", "status"],
  notFoundCode: "PRODUCT_FAMILY_NOT_FOUND",
});

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
