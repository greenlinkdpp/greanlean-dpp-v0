import { createProductCollectionHandlers } from "@/lib/server/v2/productRoutes";

const handlers = createProductCollectionHandlers({
  table: "product_model",
  resourceType: "PRODUCT_MODEL",
  entityName: "product_model",
  insertFields: [
    "family_id",
    "manufacturer_organisation_id",
    "model_code",
    "name",
    "description",
    "product_category",
    "sector",
    "status",
  ],
  updateFields: [
    "family_id",
    "manufacturer_organisation_id",
    "model_code",
    "name",
    "description",
    "product_category",
    "sector",
    "status",
  ],
  notFoundCode: "PRODUCT_MODEL_NOT_FOUND",
});

export const GET = handlers.GET;
export const POST = handlers.POST;
