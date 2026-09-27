import { createProductItemHandlers } from "@/lib/server/v2/productRoutes";

const handlers = createProductItemHandlers({
  table: "product_item",
  resourceType: "ITEM",
  entityName: "item",
  insertFields: [],
  updateFields: [
    "model_id",
    "sku_id",
    "batch_id",
    "serial_number",
    "upi",
    "enforce_batch_sku_link",
    "status",
  ],
  notFoundCode: "PRODUCT_ITEM_NOT_FOUND",
});

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
