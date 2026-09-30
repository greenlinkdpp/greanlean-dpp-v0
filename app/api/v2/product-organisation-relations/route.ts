import { createProductCollectionHandlers } from "@/lib/server/v2/productRoutes";

const handlers = createProductCollectionHandlers({
  table: "product_organisation_relation", resourceType: "PRODUCT_ORGANISATION_RELATION", entityName: "product_organisation_relation",
  insertFields: ["product_model_id", "sku_id", "organisation_id", "relation_type", "status"],
  updateFields: ["organisation_id", "relation_type", "status"], notFoundCode: "PRODUCT_ORGANISATION_RELATION_NOT_FOUND",
});
export const GET = handlers.GET;
export const POST = handlers.POST;
