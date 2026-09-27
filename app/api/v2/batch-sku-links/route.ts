import { createProductCollectionHandlers } from "@/lib/server/v2/productRoutes";

const handlers = createProductCollectionHandlers({
  table: "batch_sku_link",
  resourceType: "BATCH_SKU_LINK",
  entityName: "batch_sku_link",
  insertFields: ["model_id", "batch_id", "sku_id", "status", "valid_from", "valid_until"],
  updateFields: [],
  notFoundCode: "BATCH_SKU_LINK_NOT_FOUND",
});

export const GET = handlers.GET;
export const POST = handlers.POST;
