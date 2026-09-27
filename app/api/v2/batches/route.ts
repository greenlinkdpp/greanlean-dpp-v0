import { createProductCollectionHandlers } from "@/lib/server/v2/productRoutes";

const handlers = createProductCollectionHandlers({
  table: "product_batch",
  resourceType: "BATCH",
  entityName: "batch",
  insertFields: [
    "model_id",
    "batch_number",
    "manufacturing_organisation_id",
    "production_date",
    "status",
  ],
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
export const POST = handlers.POST;
