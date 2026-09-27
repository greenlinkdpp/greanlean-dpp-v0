import { createProductItemHandlers } from "@/lib/server/v2/productRoutes";

const handlers = createProductItemHandlers({
  table: "sku",
  resourceType: "SKU",
  entityName: "sku",
  insertFields: [],
  updateFields: ["model_id", "sku_code", "name", "market", "configuration_json", "status"],
  notFoundCode: "SKU_NOT_FOUND",
});

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
