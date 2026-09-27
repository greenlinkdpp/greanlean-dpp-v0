import { createProductCollectionHandlers } from "@/lib/server/v2/productRoutes";

const handlers = createProductCollectionHandlers({
  table: "sku",
  resourceType: "SKU",
  entityName: "sku",
  insertFields: ["model_id", "sku_code", "name", "market", "configuration_json", "status"],
  updateFields: ["model_id", "sku_code", "name", "market", "configuration_json", "status"],
  notFoundCode: "SKU_NOT_FOUND",
});

export const GET = handlers.GET;
export const POST = handlers.POST;
