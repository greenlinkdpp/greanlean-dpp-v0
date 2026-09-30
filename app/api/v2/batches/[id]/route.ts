import { createProductItemHandlers } from "@/lib/server/v2/productRoutes";

const handlers = createProductItemHandlers({
  table: "product_batch",
  resourceType: "BATCH",
  entityName: "batch",
  insertFields: [],
  updateFields: [
    "model_id",
    "batch_number",
    "manufacturing_organisation_id",
    "production_date",
    "status",
  ],
  notFoundCode: "BATCH_NOT_FOUND",
});

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
