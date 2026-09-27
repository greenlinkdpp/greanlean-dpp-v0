import { createProductItemHandlers } from "@/lib/server/v2/productRoutes";

const handlers = createProductItemHandlers({
  table: "product_model",
  resourceType: "PRODUCT_MODEL",
  entityName: "product_model",
  insertFields: [],
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
export const PATCH = handlers.PATCH;
