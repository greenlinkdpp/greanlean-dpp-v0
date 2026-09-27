import { ApiError } from "../apiRoute";
import { PRODUCT_ERROR_CODES, productRelationshipErrorCode } from "../../v2/productErrors";
import { assertVerifiedPolicyContext, type VerifiedV2PolicyContext } from "./security";

type AdminClient = any;

function productDatabaseError(error: any, fallbackCode: string, message: string): never {
  const serverMessage = String(error?.message || "");
  if (serverMessage.includes("BATCH_SKU_LINK_REQUIRED")) {
    throw new ApiError(409, PRODUCT_ERROR_CODES.BATCH_SKU_LINK_REQUIRED, "The Item SKU and Batch are not actively linked.");
  }
  if (serverMessage.includes("IDENTIFIER_INVALID")) {
    throw new ApiError(400, PRODUCT_ERROR_CODES.IDENTIFIER_INVALID, "The identifier is invalid.");
  }
  if (error?.code === "23505") {
    throw new ApiError(409, fallbackCode === "IDENTIFIER_CONFLICT" ? fallbackCode : "PRODUCT_CONFLICT", "The requested value conflicts with an active record.");
  }
  if (error?.code === "23503" || serverMessage.includes("TENANT_RELATIONSHIP_MISMATCH")) {
    throw new ApiError(409, productRelationshipErrorCode(serverMessage), "The referenced Product resource is outside the permitted Tenant or Model relationship.");
  }
  throw new ApiError(500, fallbackCode, message, { database_code: error?.code || null });
}

export async function listProductRows(
  admin: AdminClient,
  context: VerifiedV2PolicyContext,
  table: string,
  select = "*",
) {
  assertVerifiedPolicyContext(context);
  const { data, error } = await admin.from(table).select(select).eq("tenant_id", context.tenantId);
  if (error) productDatabaseError(error, "PRODUCT_LIST_FAILED", "The Product records could not be loaded.");
  return data || [];
}

export async function loadProductRow(
  admin: AdminClient,
  context: VerifiedV2PolicyContext,
  table: string,
  id: string,
  notFoundCode: string,
) {
  assertVerifiedPolicyContext(context);
  const { data, error } = await admin
    .from(table)
    .select("*")
    .eq("tenant_id", context.tenantId)
    .eq("id", id)
    .maybeSingle();
  if (error) productDatabaseError(error, "PRODUCT_LOAD_FAILED", "The Product record could not be loaded.");
  if (!data) throw new ApiError(404, notFoundCode, "The requested Product resource was not found.");
  return data;
}

export async function createProductRow(
  admin: AdminClient,
  context: VerifiedV2PolicyContext,
  table: string,
  input: Record<string, unknown>,
  conflictCode = "PRODUCT_CONFLICT",
) {
  assertVerifiedPolicyContext(context);
  const { data, error } = await admin
    .from(table)
    .insert({ ...input, tenant_id: context.tenantId, created_by: context.user.id })
    .select()
    .single();
  if (error) productDatabaseError(error, conflictCode, "The Product record could not be created.");
  return data;
}

export async function updateProductRow(
  admin: AdminClient,
  context: VerifiedV2PolicyContext,
  table: string,
  id: string,
  input: Record<string, unknown>,
  notFoundCode: string,
) {
  assertVerifiedPolicyContext(context);
  const { data, error } = await admin
    .from(table)
    .update(input)
    .eq("tenant_id", context.tenantId)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) productDatabaseError(error, "PRODUCT_UPDATE_FAILED", "The Product record could not be updated.");
  if (!data) throw new ApiError(404, notFoundCode, "The requested Product resource was not found.");
  return data;
}
