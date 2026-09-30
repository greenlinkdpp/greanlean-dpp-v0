import { createProductItemHandlers } from "@/lib/server/v2/productRoutes";

const handlers = createProductItemHandlers({
  table: "product_organisation_relation", resourceType: "PRODUCT_ORGANISATION_RELATION", entityName: "product_organisation_relation",
  insertFields: [], updateFields: ["organisation_id", "relation_type", "status"], notFoundCode: "PRODUCT_ORGANISATION_RELATION_NOT_FOUND",
});
export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
