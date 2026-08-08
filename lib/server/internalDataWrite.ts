import { createHash } from "node:crypto";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { InternalWriteFilter, InternalWriteRequest } from "@/lib/client/internalDataWrite";
import { ApiError } from "./apiRoute";

type AdminClient = SupabaseClient<any, "public", any>;

const PRODUCT_SCOPED_TABLES = new Set([
  "product_digital_identity",
  "product_materials",
  "product_bom",
  "product_esg_metrics",
  "product_traceability",
  "product_circularity",
  "product_consumer_transparency",
  "product_certificates",
  "product_documents",
  "product_data_governance",
  "product_sector_field_values",
  "supplier_products",
  "dpp_evidence_links",
]);

const ALLOWED_TABLES = new Set([
  "products",
  "product_suppliers",
  ...Array.from(PRODUCT_SCOPED_TABLES),
]);

const BLOCKED_PAYLOAD_KEYS = new Set([
  "id",
  "created_at",
  "created_by",
  "updated_by",
  "published_at",
  "published_by",
  "transaction_hash",
  "block_number",
  "registry_response",
  "accepted_at",
]);

const ALLOWED_FILTERS = new Set([
  "id",
  "product_id",
  "sku",
  "supplier_id",
  "field_key",
  "profile_key",
]);

const PRODUCT_SYSTEM_FIELDS = new Set([
  "status",
  "current_version",
  "eu_registration_status",
  "published_at",
  "published_by",
]);

function databaseError(error: { code?: string; message?: string } | null) {
  if (!error) return;
  throw new ApiError(500, "INTERNAL_DATA_WRITE_FAILED", "The product data change could not be saved.", {
    database: `${error.code || ""} ${error.message || ""}`.trim(),
  });
}

function assertPlainObject(value: unknown): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(400, "INVALID_WRITE_PAYLOAD", "A structured data payload is required.");
  }
}

function sanitizeRow(row: unknown) {
  assertPlainObject(row);
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (!/^[a-z][a-z0-9_]{0,79}$/.test(key) || BLOCKED_PAYLOAD_KEYS.has(key)) {
      throw new ApiError(400, "WRITE_FIELD_NOT_ALLOWED", `The field ${key} cannot be written through this endpoint.`);
    }
    result[key] = value;
  }
  return result;
}

function sanitizeValues(values: InternalWriteRequest["values"]) {
  if (Array.isArray(values)) {
    if (!values.length || values.length > 500) {
      throw new ApiError(400, "INVALID_WRITE_BATCH", "A write batch must contain between 1 and 500 rows.");
    }
    return values.map(sanitizeRow);
  }
  return sanitizeRow(values);
}

function sanitizeFilters(filters: InternalWriteFilter[] | undefined) {
  if (!filters?.length || filters.length > 4) {
    throw new ApiError(400, "WRITE_FILTER_REQUIRED", "One to four write filters are required.");
  }
  return filters.map((filter) => {
    if (!ALLOWED_FILTERS.has(filter.column) || !["eq", "in"].includes(filter.operator)) {
      throw new ApiError(400, "WRITE_FILTER_NOT_ALLOWED", "The requested write filter is not allowed.");
    }
    if (filter.operator === "in" && (!Array.isArray(filter.value) || filter.value.length > 500)) {
      throw new ApiError(400, "WRITE_FILTER_INVALID", "The IN filter must contain no more than 500 values.");
    }
    return filter;
  });
}

function applyFilters(query: any, filters: InternalWriteFilter[]) {
  let result = query;
  for (const filter of filters) {
    result = filter.operator === "in"
      ? result.in(filter.column, filter.value as unknown[])
      : result.eq(filter.column, filter.value);
  }
  return result;
}

function productIdsFromValues(values: Record<string, unknown> | Array<Record<string, unknown>>) {
  const rows = Array.isArray(values) ? values : [values];
  return Array.from(new Set(rows.map((row) => row.product_id).filter(Boolean).map(String)));
}

async function productIdsFromFilters(
  admin: AdminClient,
  table: string,
  filters: InternalWriteFilter[],
) {
  if (table === "products") {
    const id = filters.find((filter) => filter.column === "id");
    return id
      ? (Array.isArray(id.value) ? id.value.map(String) : [String(id.value)])
      : [];
  }
  const explicit = filters.find((filter) => filter.column === "product_id");
  if (explicit) {
    return Array.isArray(explicit.value)
      ? explicit.value.map(String)
      : [String(explicit.value)];
  }
  let query = admin.from(table).select("product_id");
  query = applyFilters(query, filters);
  const { data, error } = await query.limit(500);
  databaseError(error);
  return Array.from(new Set((data || []).map((row: any) => row.product_id).filter(Boolean).map(String)));
}

async function auditWrite(
  admin: AdminClient,
  user: User,
  input: InternalWriteRequest,
  productIds: string[],
  actorRole: "platform_admin" | "partner_editor",
) {
  const payloadHash = createHash("sha256")
    .update(JSON.stringify(input.values ?? null))
    .digest("hex");
  const rows = (productIds.length ? productIds : [null]).map((productId) => ({
    product_id: productId,
    actor_name: user.email || user.id,
    actor_role: actorRole,
    action_type: `SERVER_${input.operation.toUpperCase()}`,
    target_table: input.table,
    new_hash: payloadHash,
    notes: "Server-authorised product data write",
    visibility_level: "internal",
  }));
  const { error } = await admin.from("dpp_audit_logs").insert(rows);
  databaseError(error);
}

export async function executeInternalDataWrite(
  admin: AdminClient,
  user: User,
  input: InternalWriteRequest,
  actorRole: "platform_admin" | "partner_editor" = "platform_admin",
) {
  if (!ALLOWED_TABLES.has(input.table)) {
    throw new ApiError(400, "WRITE_TABLE_NOT_ALLOWED", "This table is not available through the product data write endpoint.");
  }
  if (!["insert", "update", "delete", "upsert"].includes(input.operation)) {
    throw new ApiError(400, "WRITE_OPERATION_NOT_ALLOWED", "The requested write operation is not allowed.");
  }

  let values: Record<string, unknown> | Array<Record<string, unknown>> | null = null;
  let filters: InternalWriteFilter[] = [];
  if (input.operation !== "delete") values = sanitizeValues(input.values);
  if (["update", "delete"].includes(input.operation)) filters = sanitizeFilters(input.filters);

  if (input.table === "products" && values) {
    const rows = Array.isArray(values) ? values : [values];
    for (const row of rows) {
      for (const field of Array.from(PRODUCT_SYSTEM_FIELDS)) {
        if (Object.prototype.hasOwnProperty.call(row, field)) {
          throw new ApiError(
            400,
            "PRODUCT_SYSTEM_FIELD_NOT_WRITABLE",
            `The product field ${field} is controlled by the publication and Registry workflows.`,
          );
        }
      }
    }
    if (input.operation === "insert") {
      const withDraftDefaults = rows.map((row) => ({
        ...row,
        status: "draft",
        current_version: "v1.0",
        eu_registration_status: "not_registered",
      }));
      values = Array.isArray(values) ? withDraftDefaults : withDraftDefaults[0];
    }
  }

  if (PRODUCT_SCOPED_TABLES.has(input.table) && values) {
    const productIds = productIdsFromValues(values);
    if (input.operation === "insert" && !productIds.length) {
      throw new ApiError(400, "PRODUCT_SCOPE_REQUIRED", "Product-scoped records require a product identifier.");
    }
  }
  if (input.operation === "upsert") {
    if (!input.onConflict || !/^[a-z0-9_,]{1,160}$/.test(input.onConflict)) {
      throw new ApiError(400, "UPSERT_CONFLICT_KEY_REQUIRED", "A valid upsert conflict key is required.");
    }
  }

  if (input.table === "products" && input.operation === "delete") {
    let productQuery = admin.from("products").select("id,status");
    productQuery = applyFilters(productQuery, filters);
    const { data, error } = await productQuery;
    databaseError(error);
    if ((data || []).some((product: any) => product.status !== "draft")) {
      throw new ApiError(409, "PUBLISHED_PRODUCT_DELETE_FORBIDDEN", "Only draft products can be deleted.");
    }
  }

  let affectedProductIds = values ? productIdsFromValues(values) : [];
  if (
    !affectedProductIds.length
    && ["update", "delete"].includes(input.operation)
  ) {
    affectedProductIds = await productIdsFromFilters(admin, input.table, filters);
  }

  let query: any;
  if (input.operation === "insert") {
    query = admin.from(input.table).insert(values!);
  } else if (input.operation === "upsert") {
    query = admin.from(input.table).upsert(values!, { onConflict: input.onConflict });
  } else if (input.operation === "update") {
    query = applyFilters(admin.from(input.table).update(values!), filters);
  } else {
    query = applyFilters(admin.from(input.table).delete(), filters);
  }

  if (input.returning === "single") query = query.select("*").single();
  else if (input.returning === "rows") query = query.select("*");
  const { data, error } = await query;
  databaseError(error);

  await auditWrite(admin, user, input, affectedProductIds, actorRole);
  return data ?? null;
}
