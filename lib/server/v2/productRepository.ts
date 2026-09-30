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

/**
 * Product hierarchy records are deliberately conservative to remove.  A
 * database FK is the final line of defence, but this preflight makes the
 * operational outcome explicit and prevents a user from discovering a
 * published/passport dependency through a generic constraint error.
 */
export async function deleteProductRow(
  admin: AdminClient,
  context: VerifiedV2PolicyContext,
  table: string,
  id: string,
  notFoundCode: string,
) {
  const record = await loadProductRow(admin, context, table, id, notFoundCode);
  const tenantId = context.tenantId;
  const checks: Array<[string, Promise<any>]> = [];
  const count = (name: string, query: any) => checks.push([name, query]);
  if (table === "product_family") count("models", admin.from("product_model").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("family_id", id));
  if (table === "product_model") {
    count("skus", admin.from("sku").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("model_id", id));
    count("batches", admin.from("product_batch").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("model_id", id));
    count("items", admin.from("product_item").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("model_id", id));
    count("organisation_relations", admin.from("product_organisation_relation").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("product_model_id", id));
  }
  if (table === "sku") {
    count("items", admin.from("product_item").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("sku_id", id));
    count("batch_sku_links", admin.from("batch_sku_link").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("sku_id", id));
    count("organisation_relations", admin.from("product_organisation_relation").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("sku_id", id));
  }
  if (table === "product_batch") {
    count("items", admin.from("product_item").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("batch_id", id));
    count("batch_sku_links", admin.from("batch_sku_link").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("batch_id", id));
  }
  const subjectType = ({ product_family: "FAMILY", product_model: "MODEL", sku: "SKU", product_batch: "BATCH", product_item: "ITEM" } as Record<string, string>)[table];
  if (subjectType) {
    count("claims", admin.from("canonical_claim").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("subject_type", subjectType).eq("subject_id", id));
    count("passports", admin.from("dpp_passport").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("subject_type", subjectType).eq("subject_id", id));
  }
  const settled = await Promise.all(checks.map(async ([name, query]) => {
    const result = await query;
    if (result.error && !String(result.error.message || "").includes("product_organisation_relation")) productDatabaseError(result.error, "PRODUCT_DELETE_PREFLIGHT_FAILED", "The Product dependency check could not be completed.");
    return [name, result.count || 0] as const;
  }));
  const dependencies = Object.fromEntries(settled.filter(([, value]) => value > 0));
  if (Object.keys(dependencies).length) {
    throw new ApiError(409, "PRODUCT_DELETE_BLOCKED", "This Product record has dependent business, claim, or Passport records and must be archived instead.", { dependencies, action: "ARCHIVE_OR_DEACTIVATE" });
  }
  const { error } = await admin.from(table).delete().eq("tenant_id", tenantId).eq("id", id);
  if (error) productDatabaseError(error, "PRODUCT_DELETE_FAILED", "The Product record could not be deleted.");
  return { id: record.id, deleted: true };
}
