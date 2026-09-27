import { createProductCollectionHandlers } from "@/lib/server/v2/productRoutes";

const handlers = createProductCollectionHandlers({
  table: "product_item",
  resourceType: "ITEM",
  entityName: "item",
  insertFields: [
    "model_id",
    "sku_id",
    "batch_id",
    "serial_number",
    "upi",
    "enforce_batch_sku_link",
    "status",
  ],
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
export const POST = handlers.POST;
