import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CANONICAL_MODULE_CODES,
  canProjectAccess,
  countProjectionContent,
  normalizeAccessLevel,
  projectCanonicalPublication,
  type CanonicalEvidence,
  type CanonicalField,
  type CanonicalModule,
  type CanonicalModuleCode,
  type CanonicalPublicationSnapshot,
  type CanonicalRecord,
  type CanonicalVerificationStatus,
  type LocalizedText,
} from "../dpp/canonicalPublication.ts";
import type { AccessLevel } from "../schemaRegistry.ts";
import { canonicalHash, canonicalJson, sortSourceRows } from "./dppCanonicalization.ts";

type AdminClient = SupabaseClient<any, "public", any>;
type Row = Record<string, any>;

export type DppPublicationSources = {
  product: Row;
  profile: Row | null;
  templates: Row[];
  validationRules: Row[];
  digitalIdentity: Row[];
  materials: Row[];
  bom: Row[];
  esg: Row[];
  sectorFieldValues: Row[];
  suppliers: Row[];
  supplierProducts: Row[];
  traceability: Row[];
  certificates: Row[];
  documents: Row[];
  evidenceLinks: Row[];
  fileAssets: Row[];
  fileVersions: Row[];
  fieldEvidenceLinks: Row[];
  circularity: Row[];
  consumerTransparency: Row[];
  dataGovernance: Row[];
  lifecycleEvents: Row[];
  subjectBatteryItem?: Row | null;
  battery: {
    modelProfile: Row | null;
    fieldValues: Row[];
    batches: Row[];
    items: Row[];
    complianceDocuments: Row[];
    lifecycleEvents: Row[];
  } | null;
};

export type DppPublicationCandidate = {
  snapshot: CanonicalPublicationSnapshot;
  canonicalPayload: string;
  snapshotHash: string;
  sourceFingerprint: string;
};

export type DppPublicationFinalization = {
  publicationId: string;
  version: number;
  publishedAt: string;
  publishedBy: string | null;
  supersedesPublicationId: string | null;
};

const LABELS: Record<string, LocalizedText> = {
  "identity.product_name": { zh: "产品名称", en: "Product name" },
  "identity.brand": { zh: "品牌 / 制造商", en: "Brand / manufacturer" },
  "identity.description": { zh: "产品描述", en: "Product description" },
  "identity.dpp_id": { zh: "DPP ID", en: "DPP ID" },
  "identity.sku": { zh: "型号 / SKU", en: "Model / SKU" },
  "identity.category": { zh: "产品类别", en: "Product category" },
  "identity.main_image": { zh: "产品主图", en: "Product image" },
  "identity.season": { zh: "系列 / 季节", en: "Season / range" },
  "identity.care_instructions": { zh: "护理说明", en: "Care instructions" },
  "identity.repair_instructions": { zh: "维修说明", en: "Repair instructions" },
  "identity.end_of_life_instructions": { zh: "生命周期结束说明", en: "End-of-life instructions" },
  "identity.granularity": { zh: "护照粒度", en: "Passport granularity" },
  "identity.upi": { zh: "唯一产品标识", en: "Unique product identifier" },
  "identity.gtin": { zh: "GTIN", en: "GTIN" },
  "identity.sgtin": { zh: "SGTIN", en: "SGTIN" },
  "identity.batch_id": { zh: "批次", en: "Batch" },
  "identity.serial_id": { zh: "单体序列号", en: "Item serial number" },
  "identity.digital_link": { zh: "数字链接", en: "Digital link" },
  "materials.material_name": { zh: "材料名称", en: "Material name" },
  "materials.material_type": { zh: "材料类别", en: "Material class" },
  "materials.percentage": { zh: "质量 / 成分占比", en: "Mass / composition share" },
  "materials.recycled_content": { zh: "再生成分", en: "Recycled content" },
  "materials.origin_country": { zh: "来源国家", en: "Country of origin" },
  "materials.chemical_information": { zh: "化学品与受限物质说明", en: "Chemical and restricted-substance information" },
  "materials.recyclability": { zh: "可回收性", en: "Recyclability" },
  "materials.component_name": { zh: "组件名称", en: "Component name" },
  "materials.component_type": { zh: "组件类别", en: "Component class" },
  "materials.quantity": { zh: "数量", en: "Quantity" },
  "materials.position": { zh: "位置", en: "Position" },
  "environment.carbon_footprint": { zh: "产品碳足迹", en: "Product carbon footprint" },
  "environment.water_usage": { zh: "用水量", en: "Water use" },
  "environment.energy_consumption": { zh: "能源消耗", en: "Energy use" },
  "environment.waste_generation": { zh: "废弃物", en: "Waste generation" },
  "environment.recycled_content": { zh: "再生成分", en: "Recycled content" },
  "environment.chemical_management": { zh: "化学品管理", en: "Chemical management" },
  "environment.methodology": { zh: "核算方法", en: "Methodology" },
  "environment.verification": { zh: "验证说明", en: "Verification note" },
  "traceability.event_type": { zh: "事件类型", en: "Event type" },
  "traceability.event_name": { zh: "事件名称", en: "Event name" },
  "traceability.event_date": { zh: "日期", en: "Date" },
  "traceability.country": { zh: "国家", en: "Country" },
  "traceability.city": { zh: "城市", en: "City" },
  "traceability.facility": { zh: "设施", en: "Facility" },
  "traceability.supplier": { zh: "供应商", en: "Supplier" },
  "traceability.transport": { zh: "运输方式", en: "Transport" },
  "traceability.notes": { zh: "说明", en: "Notes" },
  "evidence.title": { zh: "文件名称", en: "Document title" },
  "evidence.type": { zh: "文件类型", en: "Document type" },
  "evidence.number": { zh: "文件编号", en: "Document number" },
  "evidence.issuer": { zh: "签发方", en: "Issuer" },
  "evidence.issue_date": { zh: "签发日期", en: "Issue date" },
  "evidence.expiry_date": { zh: "有效期至", en: "Valid until" },
  "evidence.version": { zh: "文件版本", en: "Document version" },
  "evidence.supported_field": { zh: "支持字段", en: "Supported field" },
  "circularity.care_instructions": { zh: "护理 / 使用说明", en: "Care / use instructions" },
  "circularity.repair_instructions": { zh: "维修说明", en: "Repair instructions" },
  "circularity.end_of_life_instructions": { zh: "生命周期结束说明", en: "End-of-life instructions" },
  "circularity.repairability_score": { zh: "可维修性", en: "Repairability" },
  "circularity.recyclability_score": { zh: "可回收性", en: "Recyclability" },
  "circularity.take_back_program": { zh: "回收路径", en: "Take-back route" },
  "circularity.disassembly_guide": { zh: "拆解说明", en: "Disassembly guide" },
  "circularity.recycling_instructions": { zh: "回收说明", en: "Recycling instructions" },
  "lifecycle.current_status": { zh: "当前生命周期状态", en: "Current lifecycle status" },
  "lifecycle.update_policy": { zh: "生命周期更新方式", en: "Lifecycle update policy" },
};

const SOURCE_TABLES = [
  "products",
  "dpp_category_profiles",
  "dpp_field_templates",
  "dpp_validation_rules",
  "product_digital_identity",
  "product_materials",
  "product_bom",
  "product_esg_metrics",
  "product_sector_field_values",
  "product_suppliers",
  "supplier_products",
  "product_traceability",
  "product_certificates",
  "product_documents",
  "dpp_evidence_links",
  "product_circularity",
  "product_consumer_transparency",
  "product_data_governance",
] as const;

const BATTERY_SOURCE_TABLES = [
  "battery_model_profile",
  "battery_field_value",
  "battery_batch",
  "battery_item",
  "battery_compliance_document",
  "battery_lifecycle_event",
] as const;

const M4_SOURCE_TABLES = [
  "dpp_file_asset",
  "dpp_file_version",
  "dpp_field_evidence_link",
  "dpp_lifecycle_event",
] as const;

function databaseError(table: string, error: { message?: string; code?: string } | null) {
  if (!error) return;
  throw new Error(`DPP_SOURCE_READ_FAILED:${table}:${error.code || "UNKNOWN"}:${error.message || ""}`);
}

async function productRows(client: AdminClient, table: string, productId: string) {
  const { data, error } = await client
    .from(table)
    .select("*")
    .eq("product_id", productId)
    .order("id", { ascending: true });
  databaseError(table, error);
  return sortSourceRows((data || []) as Row[]);
}

function optionalTableMissing(error: { code?: string; message?: string } | null) {
  const message = String(error?.message || "").toLowerCase();
  return error?.code === "42P01"
    || error?.code === "PGRST205"
    || message.includes("could not find the table")
    || message.includes("does not exist");
}

async function optionalProductRows(
  client: AdminClient,
  table: string,
  productId: string,
) {
  const { data, error } = await client
    .from(table)
    .select("*")
    .eq("product_id", productId)
    .order("id", { ascending: true });
  if (optionalTableMissing(error)) return [];
  databaseError(table, error);
  return sortSourceRows((data || []) as Row[]);
}

async function loadProduct(client: AdminClient, productId: string) {
  const { data, error } = await client
    .from("products")
    .select("*")
    .eq("id", productId)
    .maybeSingle();
  databaseError("products", error);
  if (!data) throw new Error("DPP_PRODUCT_NOT_FOUND");
  return data as Row;
}

async function loadProfileData(client: AdminClient, profileKey: string | null) {
  if (!profileKey) return { profile: null, templates: [], validationRules: [] };
  const [profileResult, templateResult, validationResult] = await Promise.all([
    client.from("dpp_category_profiles").select("*").eq("profile_key", profileKey).maybeSingle(),
    client.from("dpp_field_templates").select("*").eq("profile_key", profileKey).order("sort_order"),
    client.from("dpp_validation_rules").select("*").eq("profile_key", profileKey).order("created_at"),
  ]);
  databaseError("dpp_category_profiles", profileResult.error);
  databaseError("dpp_field_templates", templateResult.error);
  databaseError("dpp_validation_rules", validationResult.error);
  return {
    profile: profileResult.data as Row | null,
    templates: (templateResult.data || []) as Row[],
    validationRules: (validationResult.data || []) as Row[],
  };
}

async function loadSuppliers(
  client: AdminClient,
  productId: string,
) {
  const supplierProducts = await productRows(client, "supplier_products", productId);
  const supplierIds = Array.from(
    new Set(supplierProducts.map((row) => row.supplier_id).filter(Boolean)),
  );
  if (!supplierIds.length) return { supplierProducts, suppliers: [] };
  const { data, error } = await client
    .from("product_suppliers")
    .select("*")
    .in("id", supplierIds)
    .order("id", { ascending: true });
  databaseError("product_suppliers", error);
  return {
    supplierProducts,
    suppliers: sortSourceRows((data || []) as Row[]),
  };
}

async function loadBatterySources(
  client: AdminClient,
  product: Row,
  batteryItemId?: string | null,
): Promise<DppPublicationSources["battery"]> {
  const isBattery = product.sector_code === "battery"
    || String(product.dpp_profile_key || "").startsWith("battery.");
  if (!isBattery) return null;

  const { data: modelProfile, error: profileError } = await client
    .from("battery_model_profile")
    .select("*")
    .eq("product_id", product.id)
    .maybeSingle();
  databaseError("battery_model_profile", profileError);
  if (!modelProfile) {
    return {
      modelProfile: null,
      fieldValues: [],
      batches: [],
      items: [],
      complianceDocuments: [],
      lifecycleEvents: [],
    };
  }

  const [
    fieldResult,
    batchResult,
    itemResult,
    complianceResult,
    lifecycleResult,
  ] = await Promise.all([
    client
      .from("battery_field_value")
      .select(`
        *,
        field_definition!inner(
          field_code,
          label_en,
          label_zh,
          unit_code,
          access_level_code,
          data_behavior,
          data_granularity
        )
      `)
      .eq("battery_model_profile_id", modelProfile.id)
      .order("id"),
    client.from("battery_batch").select("*").eq("battery_model_profile_id", modelProfile.id).order("id"),
    client.from("battery_item").select("*").eq("battery_model_profile_id", modelProfile.id).order("id"),
    client.from("battery_compliance_document").select("*").eq("battery_model_profile_id", modelProfile.id).order("id"),
    client.from("battery_lifecycle_event").select("*").eq("product_id", product.id).order("id"),
  ]);
  databaseError("battery_field_value", fieldResult.error);
  databaseError("battery_batch", batchResult.error);
  databaseError("battery_item", itemResult.error);
  databaseError("battery_compliance_document", complianceResult.error);
  databaseError("battery_lifecycle_event", lifecycleResult.error);

  const items = sortSourceRows((itemResult.data || []) as Row[]);
  if (batteryItemId && !items.some((item) => item.id === batteryItemId)) {
    throw new Error("DPP_BATTERY_ITEM_NOT_FOUND");
  }

  return {
    modelProfile: modelProfile as Row,
    fieldValues: sortSourceRows((fieldResult.data || []) as Row[]),
    batches: sortSourceRows((batchResult.data || []) as Row[]),
    items: batteryItemId ? items.filter((item) => item.id === batteryItemId) : items,
    complianceDocuments: sortSourceRows((complianceResult.data || []) as Row[]),
    lifecycleEvents: sortSourceRows((lifecycleResult.data || []) as Row[]),
  };
}

async function loadM4Sources(client: AdminClient, productId: string) {
  const [fileAssets, fieldEvidenceLinks, lifecycleEvents] = await Promise.all([
    optionalProductRows(client, "dpp_file_asset", productId),
    optionalProductRows(client, "dpp_field_evidence_link", productId),
    optionalProductRows(client, "dpp_lifecycle_event", productId),
  ]);
  const assetIds = fileAssets.map((asset) => asset.id).filter(Boolean);
  if (!assetIds.length) {
    return { fileAssets, fileVersions: [], fieldEvidenceLinks, lifecycleEvents };
  }

  const { data, error } = await client
    .from("dpp_file_version")
    .select("*")
    .in("asset_id", assetIds)
    .order("id", { ascending: true });
  if (optionalTableMissing(error)) {
    return { fileAssets, fileVersions: [], fieldEvidenceLinks, lifecycleEvents };
  }
  databaseError("dpp_file_version", error);
  return {
    fileAssets,
    fileVersions: sortSourceRows((data || []) as Row[]),
    fieldEvidenceLinks,
    lifecycleEvents,
  };
}

export async function loadDppPublicationSources(
  client: AdminClient,
  productId: string,
  options: { batteryItemId?: string | null } = {},
): Promise<DppPublicationSources> {
  const product = await loadProduct(client, productId);
  const [
    profileData,
    supplierData,
    digitalIdentity,
    materials,
    bom,
    esg,
    sectorFieldValues,
    traceability,
    certificates,
    documents,
    evidenceLinks,
    circularity,
    consumerTransparency,
    dataGovernance,
    battery,
    m4Sources,
  ] = await Promise.all([
    loadProfileData(client, product.dpp_profile_key || null),
    loadSuppliers(client, productId),
    productRows(client, "product_digital_identity", productId),
    productRows(client, "product_materials", productId),
    productRows(client, "product_bom", productId),
    productRows(client, "product_esg_metrics", productId),
    productRows(client, "product_sector_field_values", productId),
    productRows(client, "product_traceability", productId),
    productRows(client, "product_certificates", productId),
    productRows(client, "product_documents", productId),
    productRows(client, "dpp_evidence_links", productId),
    productRows(client, "product_circularity", productId),
    productRows(client, "product_consumer_transparency", productId),
    productRows(client, "product_data_governance", productId),
    loadBatterySources(client, product, options.batteryItemId),
    loadM4Sources(client, productId),
  ]);

  return {
    product,
    subjectBatteryItem: options.batteryItemId
      ? battery?.items.find((item) => item.id === options.batteryItemId) || null
      : null,
    ...profileData,
    ...supplierData,
    digitalIdentity,
    materials,
    bom,
    esg,
    sectorFieldValues,
    traceability,
    certificates,
    documents,
    evidenceLinks,
    circularity,
    consumerTransparency,
    dataGovernance,
    battery,
    ...m4Sources,
  };
}

function text(value: unknown) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

function localized(en: unknown, zh: unknown): LocalizedText | undefined {
  const value = { en: text(en), zh: text(zh) };
  return value.en || value.zh ? value : undefined;
}

function verificationStatus(value: unknown, fieldValue: unknown): CanonicalVerificationStatus {
  if (fieldValue === null || fieldValue === undefined || fieldValue === "") return "MISSING";
  const normalized = String(value || "UNVERIFIED").trim().toUpperCase();
  if (normalized === "IN_REVIEW") return "PENDING";
  if (normalized === "MANUALLY_VERIFIED") return "MANUALLY_VERIFIED";
  if (normalized === "DEVICE_REPORTED") return "DEVICE_REPORTED";
  if (["VERIFIED", "REJECTED", "PENDING", "UNVERIFIED"].includes(normalized)) {
    return normalized as CanonicalVerificationStatus;
  }
  return "UNVERIFIED";
}

function field(input: {
  code: string;
  value: unknown;
  table: string;
  row: Row;
  column?: string;
  label?: LocalizedText;
  display?: LocalizedText;
  unit?: string | null;
  accessLevel?: unknown;
  applicability?: CanonicalField["applicability"];
  verification?: unknown;
  sourceType?: unknown;
  evidenceIds?: string[];
  observedAt?: unknown;
  updatedAt?: unknown;
}): CanonicalField {
  return {
    code: input.code,
    value: input.value ?? null,
    ...(input.unit ? { unit: input.unit } : {}),
    ...(input.display ? { display: input.display } : {}),
    label: input.label || LABELS[input.code] || { en: input.code },
    accessLevel: normalizeAccessLevel(input.accessLevel),
    applicability: input.applicability || "APPLICABLE",
    verificationStatus: verificationStatus(input.verification, input.value),
    sourceType: text(input.sourceType) || "DATABASE_RECORD",
    sourceRecord: {
      table: input.table,
      id: text(input.row.id),
      column: input.column || null,
    },
    evidenceIds: Array.from(new Set(input.evidenceIds || [])).sort(),
    ...(input.observedAt ? { observedAt: String(input.observedAt) } : {}),
    ...(input.updatedAt ? { updatedAt: String(input.updatedAt) } : {}),
  };
}

function emptyModules(): Record<CanonicalModuleCode, CanonicalModule> {
  return Object.fromEntries(
    CANONICAL_MODULE_CODES.map((code) => [
      code,
      { code, fields: [], records: [] },
    ]),
  ) as unknown as Record<CanonicalModuleCode, CanonicalModule>;
}

function record(
  id: unknown,
  recordType: string,
  fields: CanonicalField[],
  accessLevel: unknown = "PUBLIC",
): CanonicalRecord {
  return {
    id: text(id) || `${recordType}:${fields.map((item) => item.code).join(":")}`,
    recordType,
    accessLevel: normalizeAccessLevel(accessLevel),
    fields: fields.sort((left, right) => left.code.localeCompare(right.code)),
  };
}

function evidenceIdsByField(sources: DppPublicationSources) {
  const result = new Map<string, string[]>();
  for (const link of sources.evidenceLinks) {
    const key = text(link.supported_field);
    if (!key || !link.id) continue;
    result.set(key, [...(result.get(key) || []), String(link.id)]);
  }
  for (const link of sources.fieldEvidenceLinks) {
    const key = text(link.field_code);
    if (!key || !link.file_version_id) continue;
    result.set(key, [...(result.get(key) || []), String(link.file_version_id)]);
  }
  return result;
}

function batteryIdentityOverride(sources: DppPublicationSources, identity: Row) {
  const item = sources.subjectBatteryItem;
  if (item) {
    return {
      serial: item.serial_identifier,
      serialRow: item,
      serialTable: "battery_item",
      serialColumn: "serial_identifier",
      sgtin: item.item_code || identity.rfid_epc,
      sgtinRow: item,
      sgtinTable: "battery_item",
      sgtinColumn: item.item_code ? "item_code" : "serial_identifier",
      accessLevel: "PUBLIC",
      verification: item.verification_status,
      sourceType: item.source_system || "DATABASE_RECORD",
    };
  }
  const serialRow = sources.battery?.fieldValues.find((row) => {
    const definition = batteryDefinition(row);
    return definition.field_code === "battery.battery_serial_number"
      && String(definition.data_behavior || "STATIC").toUpperCase() !== "DYNAMIC";
  });
  const serial = text(serialRow?.value_json);
  if (!serial || !serialRow) {
    return {
      serial: identity.serial_id,
      serialRow: identity,
      serialTable: "product_digital_identity",
      serialColumn: "serial_id",
      sgtin: identity.rfid_epc,
      sgtinRow: identity,
      sgtinTable: "product_digital_identity",
      sgtinColumn: "rfid_epc",
      accessLevel: undefined,
      verification: undefined,
      sourceType: undefined,
    };
  }

  const epcSerial = serial.replaceAll(/[^A-Za-z0-9]/g, "").slice(0, 20);
  const sgtin = text(identity.rfid_epc) && epcSerial
    ? String(identity.rfid_epc).replace(/[^.]+$/, epcSerial)
    : identity.rfid_epc;
  const definition = batteryDefinition(serialRow);
  return {
    serial,
    serialRow,
    serialTable: "battery_field_value",
    serialColumn: "value_json",
    sgtin,
    sgtinRow: serialRow,
    sgtinTable: "battery_field_value",
    sgtinColumn: "value_json",
    accessLevel: definition.access_level_code,
    verification: serialRow.verification_status,
    sourceType: serialRow.data_source,
  };
}

function buildIdentityModule(
  sources: DppPublicationSources,
  modules: Record<CanonicalModuleCode, CanonicalModule>,
) {
  const product = sources.product;
  const identity = sources.digitalIdentity[0] || {};
  const effectiveIdentity = batteryIdentityOverride(sources, identity);
  const core: CanonicalField[] = [
    field({ code: "identity.product_name", value: product.name, display: localized(product.name, product.name_zh), table: "products", row: product, column: "name", updatedAt: product.updated_at }),
    field({ code: "identity.brand", value: product.brand, table: "products", row: product, column: "brand", updatedAt: product.updated_at }),
    field({ code: "identity.description", value: product.description, display: localized(product.description, product.description_zh), table: "products", row: product, column: "description", updatedAt: product.updated_at }),
    field({ code: "identity.dpp_id", value: product.dpp_id, table: "products", row: product, column: "dpp_id", updatedAt: product.updated_at }),
    field({ code: "identity.sku", value: product.sku, table: "products", row: product, column: "sku", updatedAt: product.updated_at }),
    field({ code: "identity.category", value: product.category_code || product.category, table: "products", row: product, column: "category_code", updatedAt: product.updated_at }),
    field({ code: "identity.main_image", value: product.main_image, table: "products", row: product, column: "main_image", updatedAt: product.updated_at }),
    field({ code: "identity.season", value: product.season, table: "products", row: product, column: "season", updatedAt: product.updated_at }),
    field({ code: "identity.care_instructions", value: product.care_instructions, display: localized(product.care_instructions, product.care_instructions_zh), table: "products", row: product, column: "care_instructions", updatedAt: product.updated_at }),
    field({ code: "identity.repair_instructions", value: product.repair_instructions, display: localized(product.repair_instructions, product.repair_instructions_zh), table: "products", row: product, column: "repair_instructions", updatedAt: product.updated_at }),
    field({ code: "identity.end_of_life_instructions", value: product.end_of_life_instructions, display: localized(product.end_of_life_instructions, product.end_of_life_instructions_zh), table: "products", row: product, column: "end_of_life_instructions", updatedAt: product.updated_at }),
    field({ code: "identity.granularity", value: product.granularity_level, table: "products", row: product, column: "granularity_level", updatedAt: product.updated_at }),
    field({ code: "identity.upi", value: sources.subjectBatteryItem?.unique_product_identifier || identity.product_uuid || product.unique_product_identifier, table: sources.subjectBatteryItem ? "battery_item" : identity.id ? "product_digital_identity" : "products", row: sources.subjectBatteryItem || (identity.id ? identity : product), column: sources.subjectBatteryItem ? "unique_product_identifier" : identity.id ? "product_uuid" : "unique_product_identifier" }),
    field({ code: "identity.gtin", value: identity.gtin, table: "product_digital_identity", row: identity, column: "gtin" }),
    field({ code: "identity.sgtin", value: effectiveIdentity.sgtin, table: effectiveIdentity.sgtinTable, row: effectiveIdentity.sgtinRow, column: effectiveIdentity.sgtinColumn, accessLevel: effectiveIdentity.accessLevel, verification: effectiveIdentity.verification, sourceType: effectiveIdentity.sourceType }),
    field({ code: "identity.batch_id", value: identity.batch_id, table: "product_digital_identity", row: identity, column: "batch_id" }),
    field({ code: "identity.serial_id", value: effectiveIdentity.serial, table: effectiveIdentity.serialTable, row: effectiveIdentity.serialRow, column: effectiveIdentity.serialColumn, accessLevel: effectiveIdentity.accessLevel, verification: effectiveIdentity.verification, sourceType: effectiveIdentity.sourceType }),
    field({ code: "identity.digital_link", value: identity.digital_link_url, table: "product_digital_identity", row: identity, column: "digital_link_url" }),
  ];
  modules.identity.fields.push(...core);

  for (const supplier of sources.suppliers) {
    const relation = sources.supplierProducts.find((item) => item.supplier_id === supplier.id);
    modules.identity.records.push(record(
      supplier.id,
      "economic_operator",
      [
        field({ code: "identity.economic_operator.name", value: supplier.supplier_name, label: { zh: "经济运营者", en: "Economic operator" }, table: "product_suppliers", row: supplier, column: "supplier_name", accessLevel: "LEGITIMATE_INTEREST" }),
        field({ code: "identity.economic_operator.role", value: relation?.supplier_role, label: { zh: "供应链角色", en: "Supply-chain role" }, table: "supplier_products", row: relation || {}, column: "supplier_role", accessLevel: "LEGITIMATE_INTEREST" }),
        field({ code: "identity.economic_operator.country", value: supplier.country, label: { zh: "国家", en: "Country" }, table: "product_suppliers", row: supplier, column: "country", accessLevel: "LEGITIMATE_INTEREST" }),
        field({ code: "identity.economic_operator.facility", value: supplier.facility_name, display: localized(supplier.facility_name, supplier.facility_name_zh), label: { zh: "设施", en: "Facility" }, table: "product_suppliers", row: supplier, column: "facility_name", accessLevel: "LEGITIMATE_INTEREST" }),
      ],
      "LEGITIMATE_INTEREST",
    ));
  }
}

function buildMaterialsModule(
  sources: DppPublicationSources,
  modules: Record<CanonicalModuleCode, CanonicalModule>,
) {
  for (const material of sources.materials) {
    modules.materials.records.push(record(
      material.id,
      "material",
      [
        field({ code: "materials.material_name", value: material.material_name, display: localized(material.material_name, material.material_name_zh), table: "product_materials", row: material, column: "material_name" }),
        field({ code: "materials.material_type", value: material.material_type, display: localized(material.material_type, material.material_type_zh), table: "product_materials", row: material, column: "material_type" }),
        field({ code: "materials.percentage", value: material.percentage, unit: "%", table: "product_materials", row: material, column: "percentage" }),
        field({ code: "materials.recycled_content", value: material.recycled_content, unit: "%", table: "product_materials", row: material, column: "recycled_content" }),
        field({ code: "materials.origin_country", value: material.origin_country, table: "product_materials", row: material, column: "origin_country" }),
        field({ code: "materials.chemical_information", value: material.chemical_info, display: localized(material.chemical_info, material.chemical_info_zh), table: "product_materials", row: material, column: "chemical_info" }),
        field({ code: "materials.recyclability", value: material.recyclability, display: localized(material.recyclability, material.recyclability_zh), table: "product_materials", row: material, column: "recyclability" }),
      ],
    ));
  }

  for (const component of sources.bom) {
    modules.materials.records.push(record(
      component.id,
      "component",
      [
        field({ code: "materials.component_name", value: component.component_name, display: localized(component.component_name, component.component_name_zh), table: "product_bom", row: component, column: "component_name" }),
        field({ code: "materials.component_type", value: component.component_type, display: localized(component.component_type, component.component_type_zh), table: "product_bom", row: component, column: "component_type" }),
        field({ code: "materials.quantity", value: component.quantity, unit: text(component.unit), table: "product_bom", row: component, column: "quantity" }),
        field({ code: "materials.position", value: component.position, table: "product_bom", row: component, column: "position" }),
      ],
    ));
  }
}

function buildEnvironmentModule(
  sources: DppPublicationSources,
  modules: Record<CanonicalModuleCode, CanonicalModule>,
) {
  for (const metric of sources.esg) {
    modules.environment.records.push(record(
      metric.id,
      "environmental_assessment",
      [
        field({ code: "environment.carbon_footprint", value: metric.carbon_footprint, unit: "kg CO2e", table: "product_esg_metrics", row: metric, column: "carbon_footprint", verification: metric.verified_by ? "VERIFIED" : "UNVERIFIED" }),
        field({ code: "environment.water_usage", value: metric.water_usage, unit: "L", table: "product_esg_metrics", row: metric, column: "water_usage" }),
        field({ code: "environment.energy_consumption", value: metric.energy_consumption, unit: "kWh", table: "product_esg_metrics", row: metric, column: "energy_consumption" }),
        field({ code: "environment.waste_generation", value: metric.waste_generation, unit: "kg", table: "product_esg_metrics", row: metric, column: "waste_generation" }),
        field({ code: "environment.recycled_content", value: metric.recycled_content, unit: "%", table: "product_esg_metrics", row: metric, column: "recycled_content" }),
        field({ code: "environment.chemical_management", value: metric.chemical_management, table: "product_esg_metrics", row: metric, column: "chemical_management" }),
        field({ code: "environment.methodology", value: metric.methodology, table: "product_esg_metrics", row: metric, column: "methodology" }),
        field({ code: "environment.verification", value: metric.verified_by, table: "product_esg_metrics", row: metric, column: "verified_by", verification: metric.verified_by ? "VERIFIED" : "UNVERIFIED" }),
      ],
    ));
  }
}

function sectorModuleFor(row: Row): CanonicalModuleCode {
  const moduleKey = String(row.module_key || "").toLowerCase();
  if (/performance|durability|safety/.test(moduleKey)) return "performance";
  if (/material|chemical|substance/.test(moduleKey)) return "materials";
  if (/environment|carbon|sustainab/.test(moduleKey)) return "environment";
  if (/trace|supply|production/.test(moduleKey)) return "traceability";
  if (/evidence|document|compliance|certificate/.test(moduleKey)) return "evidence";
  if (/circular|repair|recycl|end.of.life|disassembly/.test(moduleKey)) return "circularity";
  if (/lifecycle|event|update/.test(moduleKey)) return "lifecycle";
  return "sector";
}

function buildSectorTemplateFields(
  sources: DppPublicationSources,
  modules: Record<CanonicalModuleCode, CanonicalModule>,
  evidenceMap: Map<string, string[]>,
) {
  const templateByField = new Map(sources.templates.map((template) => [template.field_key, template]));
  for (const row of sources.sectorFieldValues) {
    const template = templateByField.get(row.field_key);
    const moduleCode = sectorModuleFor({ ...row, module_key: row.module_key || template?.module_key });
    const value = row.field_value_json ?? row.field_value;
    modules[moduleCode].fields.push(field({
      code: String(row.field_key),
      value,
      unit: text(row.unit || template?.unit),
      label: {
        en: text(row.field_label || template?.field_label),
        zh: text(row.field_label_zh || template?.field_label_zh),
      },
      table: "product_sector_field_values",
      row,
      column: row.field_value_json !== null && row.field_value_json !== undefined
        ? "field_value_json"
        : "field_value",
      accessLevel: row.visibility_level || template?.visibility_level,
      verification: row.evidence_status,
      sourceType: row.source_type,
      evidenceIds: evidenceMap.get(row.field_key) || [],
      updatedAt: row.updated_at,
    }));
  }

  const existing = new Set(sources.sectorFieldValues.map((row) => row.field_key));
  for (const template of sources.templates) {
    if (existing.has(template.field_key)) continue;
    const moduleCode = sectorModuleFor(template);
    modules[moduleCode].fields.push(field({
      code: String(template.field_key),
      value: null,
      unit: text(template.unit),
      label: {
        en: text(template.field_label),
        zh: text(template.field_label_zh),
      },
      table: "dpp_field_templates",
      row: template,
      column: "field_key",
      accessLevel: template.visibility_level,
      verification: "MISSING",
      sourceType: "TEMPLATE_REQUIREMENT",
      evidenceIds: evidenceMap.get(template.field_key) || [],
    }));
  }
}

function buildTraceabilityModule(
  sources: DppPublicationSources,
  modules: Record<CanonicalModuleCode, CanonicalModule>,
) {
  for (const event of sources.traceability) {
    modules.traceability.records.push(record(
      event.id,
      "traceability_event",
      [
        field({ code: "traceability.event_type", value: event.event_type, table: "product_traceability", row: event, column: "event_type", verification: event.verification_status }),
        field({ code: "traceability.event_name", value: event.event_name, display: localized(event.event_name, event.event_name_zh), table: "product_traceability", row: event, column: "event_name", verification: event.verification_status }),
        field({ code: "traceability.event_date", value: event.event_date, table: "product_traceability", row: event, column: "event_date", verification: event.verification_status }),
        field({ code: "traceability.country", value: event.country, table: "product_traceability", row: event, column: "country", verification: event.verification_status }),
        field({ code: "traceability.city", value: event.city, table: "product_traceability", row: event, column: "city", verification: event.verification_status }),
        field({ code: "traceability.facility", value: event.facility_name, display: localized(event.facility_name, event.facility_name_zh), table: "product_traceability", row: event, column: "facility_name", verification: event.verification_status }),
        field({ code: "traceability.supplier", value: event.supplier_name, table: "product_traceability", row: event, column: "supplier_name", verification: event.verification_status }),
        field({ code: "traceability.transport", value: event.transport_method, table: "product_traceability", row: event, column: "transport_method", verification: event.verification_status }),
        field({ code: "traceability.notes", value: event.notes, display: localized(event.notes, event.notes_zh), table: "product_traceability", row: event, column: "notes", verification: event.verification_status }),
      ],
    ));
  }
}

function buildEvidenceModule(
  sources: DppPublicationSources,
  modules: Record<CanonicalModuleCode, CanonicalModule>,
) {
  const evidenceIndex: CanonicalEvidence[] = [];
  const versionedLegacyDocumentIds = new Set(
    sources.fileVersions
      .map((version) => text(version.source_document_id))
      .filter(Boolean),
  );
  for (const certificate of sources.certificates) {
    const accessLevel = normalizeAccessLevel(certificate.visibility_level);
    modules.evidence.records.push(record(
      certificate.id,
      "certificate",
      [
        field({ code: "evidence.title", value: certificate.certificate_name, display: localized(certificate.certificate_name, certificate.certificate_name_zh), table: "product_certificates", row: certificate, column: "certificate_name", accessLevel, verification: certificate.verification_status }),
        field({ code: "evidence.type", value: certificate.certificate_type, display: localized(certificate.certificate_type, certificate.certificate_type_zh), table: "product_certificates", row: certificate, column: "certificate_type", accessLevel, verification: certificate.verification_status }),
        field({ code: "evidence.number", value: certificate.certificate_number, table: "product_certificates", row: certificate, column: "certificate_number", accessLevel, verification: certificate.verification_status }),
        field({ code: "evidence.issuer", value: certificate.issuer, table: "product_certificates", row: certificate, column: "issuer", accessLevel, verification: certificate.verification_status }),
        field({ code: "evidence.issue_date", value: certificate.issue_date, table: "product_certificates", row: certificate, column: "issue_date", accessLevel, verification: certificate.verification_status }),
        field({ code: "evidence.expiry_date", value: certificate.expiry_date, table: "product_certificates", row: certificate, column: "expiry_date", accessLevel, verification: certificate.verification_status }),
      ],
      accessLevel,
    ));
    evidenceIndex.push({
      id: String(certificate.id),
      evidenceType: text(certificate.certificate_type) || "certificate",
      title: localized(certificate.certificate_name, certificate.certificate_name_zh) || {},
      accessLevel,
      verificationStatus: verificationStatus(certificate.verification_status, certificate.certificate_name),
      hash: text(certificate.evidence_hash),
      hashAlgorithm: text(certificate.hash_algorithm),
      url: text(certificate.certificate_url),
      sourceRecord: { table: "product_certificates", id: String(certificate.id) },
    });
  }

  for (const document of sources.documents) {
    if (versionedLegacyDocumentIds.has(String(document.id))) continue;
    const accessLevel = normalizeAccessLevel(document.visibility_level);
    modules.evidence.records.push(record(
      document.id,
      "document",
      [
        field({ code: "evidence.title", value: document.document_name, table: "product_documents", row: document, column: "document_name", accessLevel, verification: document.evidence_hash ? "VERIFIED" : "UNVERIFIED" }),
        field({ code: "evidence.type", value: document.document_type, table: "product_documents", row: document, column: "document_type", accessLevel }),
        field({ code: "evidence.version", value: document.version, table: "product_documents", row: document, column: "version", accessLevel }),
      ],
      accessLevel,
    ));
    evidenceIndex.push({
      id: String(document.id),
      evidenceType: text(document.document_type) || "document",
      title: { en: text(document.document_name), zh: text(document.document_name) },
      accessLevel,
      verificationStatus: verificationStatus(
        document.evidence_hash ? "VERIFIED" : "UNVERIFIED",
        document.document_name,
      ),
      fileVersion: text(document.version),
      hash: text(document.evidence_hash),
      hashAlgorithm: text(document.hash_algorithm),
      url: text(document.file_url),
      sourceRecord: { table: "product_documents", id: String(document.id) },
    });
  }

  for (const link of sources.evidenceLinks) {
    const accessLevel = normalizeAccessLevel(link.visibility_level);
    modules.evidence.records.push(record(
      link.id,
      "field_evidence_link",
      [
        field({ code: "evidence.supported_field", value: link.supported_field, table: "dpp_evidence_links", row: link, column: "supported_field", accessLevel, verification: link.verification_status }),
        field({ code: "evidence.claim", value: link.claim_value, label: { zh: "支持声明", en: "Supported claim" }, table: "dpp_evidence_links", row: link, column: "claim_value", accessLevel, verification: link.verification_status }),
      ],
      accessLevel,
    ));
  }

  const fileVerificationByVersion = new Map<string, CanonicalVerificationStatus>();
  const verificationRank: Record<CanonicalVerificationStatus, number> = {
    MISSING: 0,
    UNVERIFIED: 1,
    PENDING: 2,
    DEVICE_REPORTED: 3,
    REJECTED: 4,
    MANUALLY_VERIFIED: 5,
    VERIFIED: 6,
  };
  for (const link of sources.fieldEvidenceLinks) {
    const versionId = String(link.file_version_id);
    const status = verificationStatus(link.verification_status, link.field_code);
    const current = fileVerificationByVersion.get(versionId) || "UNVERIFIED";
    if (verificationRank[status] > verificationRank[current]) {
      fileVerificationByVersion.set(versionId, status);
    }
  }

  for (const version of sources.fileVersions) {
    const asset = sources.fileAssets.find((item) => item.id === version.asset_id);
    if (!asset) continue;
    const accessLevel = normalizeAccessLevel(version.access_level_code);
    const evidenceVerification = fileVerificationByVersion.get(String(version.id))
      || "UNVERIFIED";
    modules.evidence.records.push(record(
      version.id,
      "file_version",
      [
        field({ code: "evidence.title", value: asset.title, table: "dpp_file_asset", row: asset, column: "title", accessLevel, verification: evidenceVerification }),
        field({ code: "evidence.type", value: asset.document_type, table: "dpp_file_asset", row: asset, column: "document_type", accessLevel }),
        field({ code: "evidence.version", value: version.version_number, table: "dpp_file_version", row: version, column: "version_number", accessLevel }),
        field({ code: "evidence.checksum", value: version.checksum_sha256, label: { zh: "文件校验值", en: "File checksum" }, table: "dpp_file_version", row: version, column: "checksum_sha256", accessLevel, verification: "VERIFIED" }),
      ],
      accessLevel,
    ));
    evidenceIndex.push({
      id: String(version.id),
      evidenceType: text(asset.document_type) || "document",
      title: { en: text(asset.title), zh: text(asset.title) },
      accessLevel,
      verificationStatus: evidenceVerification,
      fileVersionId: String(version.id),
      fileVersion: String(version.version_number),
      hash: text(version.checksum_sha256),
      hashAlgorithm: text(version.hash_algorithm),
      url: `/api/dpp-files/${version.id}`,
      sourceRecord: { table: "dpp_file_version", id: String(version.id) },
    });
  }

  for (const link of sources.fieldEvidenceLinks) {
    const accessLevel = normalizeAccessLevel(link.access_level_code);
    modules.evidence.records.push(record(
      link.id,
      "canonical_field_evidence_link",
      [
        field({ code: "evidence.supported_field", value: link.field_code, table: "dpp_field_evidence_link", row: link, column: "field_code", accessLevel, verification: link.verification_status, evidenceIds: [String(link.file_version_id)] }),
        field({ code: "evidence.claim", value: link.claim_value, label: { zh: "支持声明", en: "Supported claim" }, table: "dpp_field_evidence_link", row: link, column: "claim_value", accessLevel, verification: link.verification_status, evidenceIds: [String(link.file_version_id)] }),
      ],
      accessLevel,
    ));
  }
  return evidenceIndex.sort((left, right) => left.id.localeCompare(right.id));
}

function buildLifecycleModule(
  sources: DppPublicationSources,
  modules: Record<CanonicalModuleCode, CanonicalModule>,
) {
  for (const event of sources.lifecycleEvents) {
    const accessLevel = normalizeAccessLevel(event.access_level_code);
    modules.lifecycle.records.push(record(
      event.id,
      "lifecycle_event",
      [
        field({ code: "lifecycle.event_type", value: event.event_type, label: { zh: "事件类型", en: "Event type" }, table: "dpp_lifecycle_event", row: event, column: "event_type", accessLevel, verification: event.verification_status }),
        field({ code: "lifecycle.event_time", value: event.event_time, label: { zh: "发生时间", en: "Event time" }, table: "dpp_lifecycle_event", row: event, column: "event_time", accessLevel, verification: event.verification_status }),
        field({ code: "lifecycle.scope", value: { type: event.scope_type, identifier: event.scope_identifier }, label: { zh: "事件范围", en: "Event scope" }, table: "dpp_lifecycle_event", row: event, column: "scope_type", accessLevel, verification: event.verification_status }),
        field({ code: "lifecycle.location", value: event.location, label: { zh: "地点", en: "Location" }, table: "dpp_lifecycle_event", row: event, column: "location", accessLevel, verification: event.verification_status }),
        field({ code: "lifecycle.responsible_party", value: event.responsible_party, label: { zh: "责任主体", en: "Responsible party" }, table: "dpp_lifecycle_event", row: event, column: "responsible_party", accessLevel, verification: event.verification_status }),
        field({ code: "lifecycle.event_data", value: event.event_data, label: { zh: "事件数据", en: "Event data" }, table: "dpp_lifecycle_event", row: event, column: "event_data", accessLevel, verification: event.verification_status, sourceType: event.data_source, evidenceIds: event.file_version_id ? [String(event.file_version_id)] : [] }),
        field({ code: "lifecycle.event_hash", value: event.event_hash, label: { zh: "事件校验值", en: "Event digest" }, table: "dpp_lifecycle_event", row: event, column: "event_hash", accessLevel, verification: event.verification_status }),
      ],
      accessLevel,
    ));
  }

  for (const event of sources.battery?.lifecycleEvents || []) {
    const accessLevel = normalizeAccessLevel(event.access_level_code);
    modules.lifecycle.records.push(record(
      event.id,
      "battery_lifecycle_event",
      [
        field({ code: "lifecycle.event_type", value: event.event_type, label: { zh: "事件类型", en: "Event type" }, table: "battery_lifecycle_event", row: event, column: "event_type", accessLevel, verification: event.verification_status }),
        field({ code: "lifecycle.event_time", value: event.event_time, label: { zh: "发生时间", en: "Event time" }, table: "battery_lifecycle_event", row: event, column: "event_time", accessLevel, verification: event.verification_status }),
        field({ code: "lifecycle.event_data", value: event.event_data, label: { zh: "事件数据", en: "Event data" }, table: "battery_lifecycle_event", row: event, column: "event_data", accessLevel, verification: event.verification_status, sourceType: event.data_source }),
      ],
      accessLevel,
    ));
  }
}

function buildCircularityModule(
  sources: DppPublicationSources,
  modules: Record<CanonicalModuleCode, CanonicalModule>,
) {
  const product = sources.product;
  modules.circularity.fields.push(
    field({ code: "circularity.care_instructions", value: product.care_instructions, display: localized(product.care_instructions, product.care_instructions_zh), table: "products", row: product, column: "care_instructions", updatedAt: product.updated_at }),
    field({ code: "circularity.repair_instructions", value: product.repair_instructions, display: localized(product.repair_instructions, product.repair_instructions_zh), table: "products", row: product, column: "repair_instructions", updatedAt: product.updated_at }),
    field({ code: "circularity.end_of_life_instructions", value: product.end_of_life_instructions, display: localized(product.end_of_life_instructions, product.end_of_life_instructions_zh), table: "products", row: product, column: "end_of_life_instructions", updatedAt: product.updated_at }),
  );

  for (const circularity of sources.circularity) {
    modules.circularity.records.push(record(
      circularity.id,
      "circularity_assessment",
      [
        field({ code: "circularity.repairability_score", value: circularity.repairability_score, table: "product_circularity", row: circularity, column: "repairability_score" }),
        field({ code: "circularity.recyclability_score", value: circularity.recyclability_score, table: "product_circularity", row: circularity, column: "recyclability_score" }),
        field({ code: "circularity.take_back_program", value: circularity.take_back_program, table: "product_circularity", row: circularity, column: "take_back_program" }),
        field({ code: "circularity.disassembly_guide", value: circularity.disassembly_guide, table: "product_circularity", row: circularity, column: "disassembly_guide" }),
        field({ code: "circularity.recycling_instructions", value: circularity.recycling_instructions, table: "product_circularity", row: circularity, column: "recycling_instructions" }),
        field({ code: "circularity.resale_supported", value: circularity.resale_supported, label: { zh: "支持再销售", en: "Resale supported" }, table: "product_circularity", row: circularity, column: "resale_supported" }),
        field({ code: "circularity.remanufacturing_supported", value: circularity.remanufacturing_supported, label: { zh: "支持再制造", en: "Remanufacturing supported" }, table: "product_circularity", row: circularity, column: "remanufacturing_supported" }),
      ],
    ));
  }
}

function batteryDefinition(row: Row) {
  return Array.isArray(row.field_definition)
    ? row.field_definition[0] || {}
    : row.field_definition || {};
}

function buildBatteryStaticModules(
  sources: DppPublicationSources,
  modules: Record<CanonicalModuleCode, CanonicalModule>,
) {
  if (!sources.battery) return;
  const { modelProfile, fieldValues, batches, items, complianceDocuments } = sources.battery;

  if (modelProfile) {
    modules.sector.records.push(record(
      modelProfile.id,
      "battery_model",
      [
        field({ code: "battery.legal_category", value: modelProfile.legal_category_code, label: { zh: "电池法定类别", en: "Legal battery category" }, table: "battery_model_profile", row: modelProfile, column: "legal_category_code", verification: modelProfile.verification_status, sourceType: modelProfile.source_type }),
        field({ code: "battery.technical_variant", value: modelProfile.technical_variant_code, label: { zh: "电池技术子类", en: "Battery technical variant" }, table: "battery_model_profile", row: modelProfile, column: "technical_variant_code", verification: modelProfile.verification_status, sourceType: modelProfile.source_type }),
        field({ code: "battery.passport_applicability", value: modelProfile.passport_applicability, label: { zh: "电池护照适用性", en: "Battery passport applicability" }, table: "battery_model_profile", row: modelProfile, column: "passport_applicability", verification: modelProfile.verification_status, sourceType: modelProfile.source_type }),
        field({ code: "battery.applicability_reason", value: modelProfile.applicability_reason, label: { zh: "适用性说明", en: "Applicability reason" }, table: "battery_model_profile", row: modelProfile, column: "applicability_reason", verification: modelProfile.verification_status, sourceType: modelProfile.source_type }),
      ],
    ));
  }

  for (const valueRow of fieldValues) {
    const definition = batteryDefinition(valueRow);
    if (String(definition.data_behavior || "STATIC").toUpperCase() === "DYNAMIC") continue;
    const value = valueRow.value_json;
    modules.sector.fields.push(field({
      code: definition.field_code || `battery.field.${valueRow.field_definition_id}`,
      value,
      unit: text(valueRow.unit_code || definition.unit_code),
      label: {
        en: text(definition.label_en),
        zh: text(definition.label_zh),
      },
      table: "battery_field_value",
      row: valueRow,
      column: "value_json",
      accessLevel: definition.access_level_code,
      verification: valueRow.verification_status,
      sourceType: valueRow.data_source,
      observedAt: valueRow.observed_at,
      updatedAt: valueRow.updated_at,
    }));
  }

  for (const batch of batches) {
    modules.traceability.records.push(record(
      batch.id,
      "battery_batch",
      [
        field({ code: "battery.batch.identifier", value: batch.batch_identifier, label: { zh: "电池批次", en: "Battery batch" }, table: "battery_batch", row: batch, column: "batch_identifier", accessLevel: batch.visibility_level, verification: batch.verification_status }),
        field({ code: "battery.batch.manufacturing_site", value: batch.manufacturing_site_identifier, label: { zh: "制造场所标识", en: "Manufacturing site identifier" }, table: "battery_batch", row: batch, column: "manufacturing_site_identifier", accessLevel: batch.visibility_level, verification: batch.verification_status }),
        field({ code: "battery.batch.manufacturing_date", value: batch.manufacturing_date, label: { zh: "制造日期", en: "Manufacturing date" }, table: "battery_batch", row: batch, column: "manufacturing_date", accessLevel: batch.visibility_level, verification: batch.verification_status }),
      ],
      batch.visibility_level,
    ));
  }

  for (const item of items) {
    modules.traceability.records.push(record(
      item.id,
      "battery_item",
      [
        field({ code: "battery.item.serial_identifier", value: item.serial_identifier, label: { zh: "电池序列号", en: "Battery serial number" }, table: "battery_item", row: item, column: "serial_identifier", accessLevel: item.visibility_level, verification: item.verification_status }),
        field({ code: "battery.item.unique_product_identifier", value: item.unique_product_identifier, label: { zh: "电池单体唯一标识", en: "Battery item unique identifier" }, table: "battery_item", row: item, column: "unique_product_identifier", accessLevel: item.visibility_level, verification: item.verification_status }),
        field({ code: "battery.item.status", value: item.battery_status_code, label: { zh: "电池状态", en: "Battery status" }, table: "battery_item", row: item, column: "battery_status_code", accessLevel: item.visibility_level, verification: item.verification_status }),
      ],
      item.visibility_level,
    ));
  }

  for (const document of complianceDocuments) {
    modules.evidence.records.push(record(
      document.id,
      "battery_compliance_document_link",
      [
        field({ code: "battery.evidence.document_role", value: document.document_role, label: { zh: "电池文件用途", en: "Battery document role" }, table: "battery_compliance_document", row: document, column: "document_role", accessLevel: document.access_level_code, verification: document.verification_status }),
        field({ code: "battery.evidence.supported_field", value: document.supported_field_code, label: { zh: "支持的电池字段", en: "Supported battery field" }, table: "battery_compliance_document", row: document, column: "supported_field_code", accessLevel: document.access_level_code, verification: document.verification_status, evidenceIds: document.product_document_id ? [String(document.product_document_id)] : [] }),
      ],
      document.access_level_code,
    ));
  }
}

function sourceFingerprintInput(sources: DppPublicationSources) {
  return {
    product: sources.product,
    profile: sources.profile,
    templates: sources.templates,
    validationRules: sources.validationRules,
    digitalIdentity: sources.digitalIdentity,
    materials: sources.materials,
    bom: sources.bom,
    esg: sources.esg,
    sectorFieldValues: sources.sectorFieldValues,
    suppliers: sources.suppliers,
    supplierProducts: sources.supplierProducts,
    traceability: sources.traceability,
    certificates: sources.certificates,
    documents: sources.documents,
    evidenceLinks: sources.evidenceLinks,
    fileAssets: sources.fileAssets,
    fileVersions: sources.fileVersions,
    fieldEvidenceLinks: sources.fieldEvidenceLinks,
    circularity: sources.circularity,
    consumerTransparency: sources.consumerTransparency,
    dataGovernance: sources.dataGovernance,
    lifecycleEvents: sources.lifecycleEvents,
    battery: sources.battery,
  };
}

function sourceTimestamp(sources: DppPublicationSources) {
  const candidates: string[] = [];
  const collect = (value: unknown) => {
    if (!value) return;
    const date = new Date(String(value));
    if (!Number.isNaN(date.getTime())) candidates.push(date.toISOString());
  };
  collect(sources.product.updated_at);
  collect(sources.product.created_at);
  for (const rows of Object.values(sourceFingerprintInput(sources))) {
    if (Array.isArray(rows)) {
      for (const row of rows) {
        collect(row?.updated_at);
        collect(row?.observed_at);
        collect(row?.created_at);
      }
    }
  }
  if (sources.battery) {
    collect(sources.battery.modelProfile?.updated_at);
    for (const rows of [
      sources.battery.fieldValues,
      sources.battery.batches,
      sources.battery.items,
      sources.battery.complianceDocuments,
      sources.battery.lifecycleEvents,
    ]) {
      for (const row of rows) {
        collect(row.updated_at);
        collect(row.observed_at);
        collect(row.created_at);
      }
    }
  }
  return candidates.sort().at(-1) || new Date(0).toISOString();
}

function sortModules(modules: Record<CanonicalModuleCode, CanonicalModule>) {
  for (const code of CANONICAL_MODULE_CODES) {
    modules[code].fields.sort((left, right) => left.code.localeCompare(right.code));
    modules[code].records.sort((left, right) => left.id.localeCompare(right.id));
  }
}

function languageCoverage(product: Row): Array<"zh" | "en"> {
  const result: Array<"zh" | "en"> = [];
  if (text(product.name) || text(product.description)) result.push("en");
  if (text(product.name_zh) || text(product.description_zh)) result.push("zh");
  return result;
}

function audienceManifest(snapshot: CanonicalPublicationSnapshot) {
  return Object.fromEntries(
    (["PUBLIC", "LEGITIMATE_INTEREST", "AUTHORITY_ONLY", "INTERNAL"] as AccessLevel[])
      .map((audience) => {
        const projected = projectCanonicalPublication(snapshot, audience);
        return [
          audience,
          countProjectionContent(projected.modules, projected.evidenceIndex),
        ];
      }),
  ) as CanonicalPublicationSnapshot["audienceManifest"];
}

export function buildDppPublicationCandidateFromSources(
  sources: DppPublicationSources,
): DppPublicationCandidate {
  const sourceHash = canonicalHash(sourceFingerprintInput(sources));
  const modules = emptyModules();
  const evidenceMap = evidenceIdsByField(sources);

  buildIdentityModule(sources, modules);
  buildMaterialsModule(sources, modules);
  buildEnvironmentModule(sources, modules);
  buildSectorTemplateFields(sources, modules, evidenceMap);
  buildTraceabilityModule(sources, modules);
  const evidenceIndex = buildEvidenceModule(sources, modules);
  buildCircularityModule(sources, modules);
  buildBatteryStaticModules(sources, modules);
  buildLifecycleModule(sources, modules);

  modules.lifecycle.fields.push(
    field({
      code: "lifecycle.current_status",
      value: sources.product.status,
      table: "products",
      row: sources.product,
      column: "status",
      updatedAt: sources.product.updated_at,
    }),
    field({
      code: "lifecycle.update_policy",
      value: "AUTHORIZED_RUNTIME_APPEND_ONLY",
      table: "products",
      row: sources.product,
      column: "id",
      sourceType: "PLATFORM_POLICY",
    }),
  );

  sortModules(modules);
  const generatedAt = sourceTimestamp(sources);
  const sourceTables = [
    ...SOURCE_TABLES,
    ...M4_SOURCE_TABLES,
    ...(sources.battery ? BATTERY_SOURCE_TABLES : []),
  ].sort();
  const profileVersion = text(sources.profile?.schema_version) || "v1";

  const snapshot: CanonicalPublicationSnapshot = {
    schema: "https://greanlean.com/schemas/dpp-publication/1.0",
    schemaVersion: "1.0.0",
    publication: {
      publicationId: null,
      productId: String(sources.product.id),
      dppId: text(sources.product.dpp_id) || "",
      version: null,
      status: "DRAFT",
      publishedAt: null,
      publishedBy: null,
      supersedesPublicationId: null,
      languageCoverage: languageCoverage(sources.product),
      subjectType: sources.subjectBatteryItem ? "BATTERY_ITEM" : "PRODUCT",
      subjectPublicKey: text(sources.subjectBatteryItem?.unique_product_identifier),
    },
    classification: {
      sectorCode: text(sources.product.sector_code) || "unclassified",
      profileKey: text(sources.product.dpp_profile_key) || "",
      profileVersion,
      productGranularity: sources.subjectBatteryItem
        ? "ITEM"
        : text(sources.product.granularity_level)?.toUpperCase() || "MODEL",
    },
    modules,
    evidenceIndex,
    audienceManifest: {
      PUBLIC: { fieldCount: 0, evidenceCount: 0 },
      LEGITIMATE_INTEREST: { fieldCount: 0, evidenceCount: 0 },
      AUTHORITY_ONLY: { fieldCount: 0, evidenceCount: 0 },
      INTERNAL: { fieldCount: 0, evidenceCount: 0 },
    },
    governance: {
      sourceFingerprint: sourceHash.hash,
      generatedAt,
      generatedBy: null,
      sourceTables,
      dynamicDataPolicy: {
        includedInSnapshot: false,
        projection: "AUTHORIZED_RUNTIME",
        applicable: Boolean(sources.battery),
      },
    },
    integrity: {
      algorithm: "SHA-256",
      canonicalization: "JCS",
      digest: "",
      generatedAt,
      anchorStatus: "NOT_CONFIGURED",
    },
  };
  snapshot.audienceManifest = audienceManifest(snapshot);

  const snapshotWithoutIntegrity = { ...snapshot } as Record<string, unknown>;
  delete snapshotWithoutIntegrity.integrity;
  const canonicalPayload = canonicalJson(snapshotWithoutIntegrity);
  const snapshotHash = canonicalHash(snapshotWithoutIntegrity).hash;
  snapshot.integrity.digest = snapshotHash;

  return {
    snapshot,
    canonicalPayload,
    snapshotHash,
    sourceFingerprint: sourceHash.hash,
  };
}

export async function buildDppPublicationCandidate(
  client: AdminClient,
  productId: string,
  options: { batteryItemId?: string | null } = {},
) {
  return buildDppPublicationCandidateFromSources(
    await loadDppPublicationSources(client, productId, options),
  );
}

export function finalizeDppPublicationCandidate(
  candidate: DppPublicationCandidate,
  finalization: DppPublicationFinalization,
): DppPublicationCandidate {
  if (!finalization.publicationId || finalization.version < 1) {
    throw new Error("DPP_PUBLICATION_FINALIZATION_INVALID");
  }
  const publishedAt = new Date(finalization.publishedAt);
  if (Number.isNaN(publishedAt.getTime())) {
    throw new Error("DPP_PUBLICATION_DATE_INVALID");
  }

  const snapshot = JSON.parse(
    JSON.stringify(candidate.snapshot),
  ) as CanonicalPublicationSnapshot;
  snapshot.publication = {
    ...snapshot.publication,
    publicationId: finalization.publicationId,
    version: finalization.version,
    status: "PUBLISHED",
    publishedAt: publishedAt.toISOString(),
    publishedBy: finalization.publishedBy,
    supersedesPublicationId: finalization.supersedesPublicationId,
  };
  snapshot.integrity.generatedAt = publishedAt.toISOString();
  snapshot.integrity.digest = "";

  const snapshotWithoutIntegrity = { ...snapshot } as Record<string, unknown>;
  delete snapshotWithoutIntegrity.integrity;
  const canonicalPayload = canonicalJson(snapshotWithoutIntegrity);
  const snapshotHash = canonicalHash(snapshotWithoutIntegrity).hash;
  snapshot.integrity.digest = snapshotHash;

  return {
    snapshot,
    canonicalPayload,
    snapshotHash,
    sourceFingerprint: candidate.sourceFingerprint,
  };
}

export function projectionForAudience(
  candidate: DppPublicationCandidate,
  audience: AccessLevel,
) {
  return projectCanonicalPublication(candidate.snapshot, audience);
}

export function projectionContainsRestrictedFields(
  snapshot: CanonicalPublicationSnapshot,
  audience: AccessLevel,
) {
  return CANONICAL_MODULE_CODES.some((code) => {
    const module = snapshot.modules[code];
    return module.fields.some((item) => !canProjectAccess(audience, item.accessLevel))
      || module.records.some((item) =>
        !canProjectAccess(audience, item.accessLevel)
        || item.fields.some((recordField) => !canProjectAccess(audience, recordField.accessLevel))
      );
  }) || snapshot.evidenceIndex.some((item) => !canProjectAccess(audience, item.accessLevel));
}
