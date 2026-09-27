import { ApiError } from "../apiRoute";
import { assertVerifiedPolicyContext, type VerifiedV2PolicyContext } from "./security";

type AdminClient = any;

export async function resolveProductHierarchy(
  admin: AdminClient,
  context: VerifiedV2PolicyContext,
  itemId: string,
) {
  assertVerifiedPolicyContext(context);
  const { data: item, error } = await admin
    .from("product_item")
    .select("*")
    .eq("tenant_id", context.tenantId)
    .eq("id", itemId)
    .maybeSingle();
  if (error) throw new ApiError(500, "PRODUCT_HIERARCHY_FAILED", "The Product hierarchy could not be resolved.");
  if (!item) throw new ApiError(404, "PRODUCT_ITEM_NOT_FOUND", "The requested Product resource was not found.");
  const [modelResult, skuResult, batchResult] = await Promise.all([
    admin.from("product_model").select("*").eq("tenant_id", context.tenantId).eq("id", item.model_id).single(),
    item.sku_id
      ? admin.from("sku").select("*").eq("tenant_id", context.tenantId).eq("id", item.sku_id).single()
      : Promise.resolve({ data: null, error: null }),
    item.batch_id
      ? admin.from("product_batch").select("*").eq("tenant_id", context.tenantId).eq("id", item.batch_id).single()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (modelResult.error || skuResult.error || batchResult.error) {
    throw new ApiError(500, "PRODUCT_HIERARCHY_FAILED", "The Product hierarchy could not be resolved.");
  }
  const familyResult = modelResult.data.family_id
    ? await admin
      .from("product_family")
      .select("*")
      .eq("tenant_id", context.tenantId)
      .eq("id", modelResult.data.family_id)
      .single()
    : { data: null, error: null };
  if (familyResult.error) {
    throw new ApiError(500, "PRODUCT_HIERARCHY_FAILED", "The Product hierarchy could not be resolved.");
  }
  return {
    family: familyResult.data,
    model: modelResult.data,
    sku: skuResult.data,
    batch: batchResult.data,
    item,
  };
}
