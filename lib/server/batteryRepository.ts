import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  BATTERY_CATALOG_METADATA,
  BATTERY_FIELD_CATALOG,
  classifyBattery,
  type BatteryClassificationInput,
  type BatteryFieldValue,
  type BatterySchemaCode,
} from "../battery/catalog.ts";
import { batteryDynamicValuesForWorkspace } from "../battery/batteryPass.ts";
import {
  operatingDataPolicyForBattery,
  validateOperatingMetricValue,
} from "../battery/operatingDataPolicy.ts";
import { calculateBatteryReadiness } from "../battery/readiness.ts";
import { projectBatteryFields } from "../battery/projection.ts";
import type { AccessLevel } from "../schemaRegistry.ts";
import { ApiError } from "./apiRoute";

type AdminClient = SupabaseClient<any, "public", any>;

const profileCodeBySchema: Record<BatterySchemaCode, string> = {
  "battery.ev": "battery.ev.default",
  "battery.lmt": "battery.lmt.default",
  "battery.industrial.without_bms": "battery.industrial.without_bms",
  "battery.industrial.non_stationary": "battery.industrial.non_stationary_above_2kwh",
  "battery.industrial.stationary": "battery.industrial.stationary_above_2kwh",
  "battery.portable": "battery.portable.reference",
  "battery.sli": "battery.sli.reference",
  "battery.other": "battery.other.reference",
};

const modelProfileFields = new Set([
  "battery_model_identifier",
  "rated_capacity_value",
  "rated_capacity_unit",
  "rated_energy_kwh",
  "battery_mass_kg",
  "battery_chemistry_code",
  "economic_operator_name",
  "manufacturer_name",
  "manufacturing_place",
  "warranty_description",
  "source_type",
  "verification_status",
]);

function databaseError(error: { message?: string } | null, code = "BATTERY_DATABASE_ERROR") {
  if (error) throw new ApiError(500, code, "Battery DPP data could not be processed.");
}

export async function requireBatteryProduct(admin: AdminClient, productId: string) {
  const { data, error } = await admin
    .from("products")
    .select("id,name,name_zh,dpp_id,public_slug,status,sector_code,dpp_profile_key,granularity_level,commodity_code,unique_product_identifier,updated_at")
    .eq("id", productId)
    .maybeSingle();
  databaseError(error);
  if (!data) throw new ApiError(404, "PRODUCT_NOT_FOUND", "The product was not found.");
  if (data.sector_code !== "battery" && !String(data.dpp_profile_key || "").startsWith("battery.")) {
    throw new ApiError(409, "NOT_A_BATTERY_PRODUCT", "The product is not classified as a battery.");
  }
  return data;
}

async function longlistFieldDefinitions(admin: AdminClient, fieldCodes?: string[]) {
  const { data: definition, error: definitionError } = await admin
    .from("schema_definition")
    .select("id")
    .eq("code", "battery.longlist")
    .maybeSingle();
  databaseError(definitionError);
  if (!definition) throw new ApiError(503, "BATTERY_SCHEMA_NOT_INSTALLED", "The battery field catalog migration has not been applied.");

  const { data: version, error: versionError } = await admin
    .from("schema_version")
    .select("id,version")
    .eq("schema_definition_id", definition.id)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  databaseError(versionError);
  if (!version) throw new ApiError(503, "BATTERY_SCHEMA_NOT_PUBLISHED", "The battery field catalog is not published.");

  let query = admin
    .from("field_definition")
    .select("id,field_code,access_level_code,data_behavior,data_granularity,unit_code")
    .eq("schema_version_id", version.id);
  if (fieldCodes?.length) query = query.in("field_code", fieldCodes);
  const { data, error } = await query;
  databaseError(error);
  return { version, fields: data || [] };
}

function valuesByFieldCode(rows: any[], definitions: any[]) {
  const codeById = new Map(definitions.map((field) => [field.id, field.field_code]));
  return Object.fromEntries(rows.flatMap((row) => {
    const fieldCode = codeById.get(row.field_definition_id);
    if (!fieldCode) return [];
    return [[fieldCode, {
      value: row.value_json,
      evidenceStatus: row.evidence_status,
      verificationStatus: row.verification_status,
      sourceType: row.data_source,
      observedAt: row.observed_at,
    } satisfies BatteryFieldValue]];
  }));
}

function applyEvidenceLinks(
  values: Record<string, BatteryFieldValue>,
  links: any[],
) {
  const linkedValues = { ...values };
  for (const link of links) {
    const fieldCode = String(link.field_code || "");
    const current = linkedValues[fieldCode];
    if (!current) continue;
    const verified = ["VERIFIED", "MANUALLY_VERIFIED"].includes(
      String(link.verification_status || "").toUpperCase(),
    );
    linkedValues[fieldCode] = {
      ...current,
      evidenceStatus: verified ? "verified" : "uploaded",
      verificationStatus: verified
        ? "verified"
        : current.verificationStatus || "unverified",
    };
  }
  return linkedValues;
}

export async function loadBatteryWorkspace(admin: AdminClient, productId: string) {
  const product = await requireBatteryProduct(admin, productId);
  const { data: profile, error: profileError } = await admin
    .from("battery_model_profile")
    .select("*")
    .eq("product_id", productId)
    .maybeSingle();
  databaseError(profileError);

  const classification = classifyBattery({
    legalCategory: profile?.legal_category_code || "other",
    capacityKwh: profile?.rated_energy_kwh,
    stationary: profile?.stationary,
    bmsPresent: profile?.bms_present,
  });
  if (!profile) {
    return {
      product,
      profile: null,
      classification,
      operatingPolicy: operatingDataPolicyForBattery(classification),
      values: {},
      readiness: calculateBatteryReadiness(classification, {}),
      batches: [],
      items: [],
      metrics: [],
      metricTypes: [],
      lifecycleEvents: [],
      catalog: BATTERY_CATALOG_METADATA,
    };
  }

  const { fields } = await longlistFieldDefinitions(admin);
  const [fieldResult, batchResult, itemResult, metricResult, metricTypeResult, eventResult, evidenceLinkResult] = await Promise.all([
    admin.from("battery_field_value").select("*").eq("battery_model_profile_id", profile.id).is("battery_batch_id", null).is("battery_item_id", null),
    admin.from("battery_batch").select("*").eq("battery_model_profile_id", profile.id).order("created_at", { ascending: false }),
    admin.from("battery_item").select("*").eq("battery_model_profile_id", profile.id).order("created_at", { ascending: false }),
    admin.from("battery_operating_metric_latest").select("*").eq("product_id", productId).order("measured_at", { ascending: false }),
    admin.from("battery_metric_type").select("code,label_en,label_zh,default_unit,access_level_code").eq("status", "active").order("label_en"),
    admin.from("battery_lifecycle_event").select("*").eq("product_id", productId).order("event_time", { ascending: false }),
    admin.from("dpp_field_evidence_link").select("field_code,verification_status,created_at").eq("product_id", productId).order("created_at", { ascending: false }),
  ]);
  [fieldResult, batchResult, itemResult, metricResult, metricTypeResult, eventResult, evidenceLinkResult].forEach((result) => databaseError(result.error));
  const values = applyEvidenceLinks(
    valuesByFieldCode(fieldResult.data || [], fields),
    evidenceLinkResult.data || [],
  );
  const workspaceData = {
    product,
    profile,
    classification: { ...classification, applicability: profile.passport_applicability, reasonZh: profile.applicability_reason || classification.reasonZh },
    operatingPolicy: operatingDataPolicyForBattery({
      ...classification,
      applicability: profile.passport_applicability,
      reasonZh: profile.applicability_reason || classification.reasonZh,
    }),
    values,
    batches: batchResult.data || [],
    items: itemResult.data || [],
    metrics: metricResult.data || [],
    metricTypes: metricTypeResult.data || [],
    lifecycleEvents: eventResult.data || [],
  };
  const dynamicValues = batteryDynamicValuesForWorkspace(workspaceData, process.env.NEXT_PUBLIC_SITE_URL || "https://greanlean.com");
  return {
    ...workspaceData,
    values,
    dynamicValues,
    readiness: calculateBatteryReadiness(classification, { ...values, ...dynamicValues }),
    catalog: BATTERY_CATALOG_METADATA,
  };
}

export async function saveBatteryWorkspace(
  admin: AdminClient,
  productId: string,
  user: User,
  input: {
    classification: BatteryClassificationInput;
    profile?: Record<string, unknown>;
    values?: Record<string, BatteryFieldValue>;
  },
) {
  await requireBatteryProduct(admin, productId);
  if (!input.classification || !input.classification.legalCategory) {
    throw new ApiError(400, "BATTERY_CLASSIFICATION_REQUIRED", "Battery classification is required.");
  }
  const classification = classifyBattery(input.classification);
  const profileCode = profileCodeBySchema[classification.schemaCode];
  const { data: schemaProfile, error: schemaProfileError } = await admin
    .from("battery_schema_profile")
    .select("id,status")
    .eq("code", profileCode)
    .maybeSingle();
  databaseError(schemaProfileError);
  if (!schemaProfile) throw new ApiError(503, "BATTERY_PROFILE_NOT_INSTALLED", "The selected battery Schema profile is not installed.");

  const submittedProfile = input.profile || {};
  const profilePayload: Record<string, unknown> = {
    product_id: productId,
    schema_profile_id: schemaProfile.id,
    legal_category_code: classification.legalCategory,
    technical_variant_code: classification.technicalVariant,
    passport_applicability: classification.applicability,
    applicability_reason: classification.reasonZh,
    bms_present: input.classification.bmsPresent ?? null,
    stationary: input.classification.stationary ?? null,
    rated_energy_kwh: input.classification.capacityKwh ?? submittedProfile.rated_energy_kwh ?? null,
  };
  for (const [key, value] of Object.entries(submittedProfile)) {
    if (modelProfileFields.has(key)) profilePayload[key] = value === "" ? null : value;
  }
  const { data: profile, error: profileError } = await admin
    .from("battery_model_profile")
    .upsert(profilePayload, { onConflict: "product_id" })
    .select("*")
    .single();
  databaseError(profileError);

  const submittedValues = input.values || {};
  const catalogByCode = new Map(BATTERY_FIELD_CATALOG.map((field) => [field.fieldCode, field]));
  const unknown = Object.keys(submittedValues).filter((fieldCode) => !catalogByCode.has(fieldCode));
  if (unknown.length) throw new ApiError(400, "UNKNOWN_BATTERY_FIELDS", "One or more battery fields are not defined by the active catalog.", { fieldCodes: unknown });
  const dynamic = Object.keys(submittedValues).filter((fieldCode) => catalogByCode.get(fieldCode)?.dataBehavior === "DYNAMIC");
  if (dynamic.length) throw new ApiError(400, "DYNAMIC_FIELDS_APPEND_ONLY", "Dynamic values must be appended through metric or lifecycle event operations.", { fieldCodes: dynamic });

  if (Object.keys(submittedValues).length) {
    const { fields } = await longlistFieldDefinitions(admin, Object.keys(submittedValues));
    const definitionByCode = new Map(fields.map((field) => [field.field_code, field]));
    const { data: existing, error: existingError } = await admin
      .from("battery_field_value")
      .select("id,field_definition_id,evidence_status,verification_status")
      .eq("battery_model_profile_id", profile.id)
      .is("battery_batch_id", null)
      .is("battery_item_id", null);
    databaseError(existingError);
    const existingByDefinition = new Map((existing || []).map((row) => [row.field_definition_id, row]));

    for (const [fieldCode, value] of Object.entries(submittedValues)) {
      const definition = definitionByCode.get(fieldCode);
      if (!definition) throw new ApiError(409, "BATTERY_FIELD_NOT_INSTALLED", "A submitted field is missing from the database catalog.", { fieldCode });
      const payload = {
        product_id: productId,
        battery_model_profile_id: profile.id,
        field_definition_id: definition.id,
        value_json: value.value,
        unit_code: catalogByCode.get(fieldCode)?.unit || null,
        data_source: value.sourceType || "manual",
        evidence_status: existingByDefinition.get(definition.id)?.evidence_status || "missing",
        verification_status: existingByDefinition.get(definition.id)?.verification_status || "unverified",
        observed_at: value.observedAt || null,
        created_by: user.id,
      };
      const existingRow = existingByDefinition.get(definition.id);
      const result = existingRow
        ? await admin.from("battery_field_value").update(payload).eq("id", existingRow.id)
        : await admin.from("battery_field_value").insert(payload);
      databaseError(result.error);
    }
  }
  return loadBatteryWorkspace(admin, productId);
}

export async function createBatteryItem(admin: AdminClient, productId: string, input: Record<string, unknown>) {
  const workspace = await loadBatteryWorkspace(admin, productId);
  if (!workspace.profile) throw new ApiError(409, "BATTERY_PROFILE_REQUIRED", "Save the battery model profile before creating an item.");
  const serialIdentifier = String(input.serialIdentifier || "").trim();
  if (!serialIdentifier) throw new ApiError(400, "SERIAL_IDENTIFIER_REQUIRED", "A battery serial identifier is required.");
  const payload = {
    product_id: productId,
    battery_model_profile_id: workspace.profile.id,
    battery_batch_id: input.batchId || null,
    serial_identifier: serialIdentifier,
    unique_product_identifier: input.uniqueProductIdentifier || null,
    battery_status_code: input.batteryStatusCode || "original",
    manufacturing_date: input.manufacturingDate || null,
    commissioned_at: input.commissionedAt || null,
    verification_status: "unverified",
  };
  const { error } = await admin.from("battery_item").upsert(payload, { onConflict: "battery_model_profile_id,serial_identifier" });
  databaseError(error);
  return loadBatteryWorkspace(admin, productId);
}

export async function appendBatteryMetric(admin: AdminClient, productId: string, input: Record<string, unknown>) {
  const batteryItemId = String(input.batteryItemId || "");
  const metricType = String(input.metricType || "");
  const metricValue = Number(input.metricValue);
  if (!batteryItemId || !metricType || !Number.isFinite(metricValue)) {
    throw new ApiError(400, "INVALID_BATTERY_METRIC", "Battery item, metric type, and numeric value are required.");
  }
  const { data: item, error: itemError } = await admin.from("battery_item").select("id").eq("id", batteryItemId).eq("product_id", productId).maybeSingle();
  databaseError(itemError);
  if (!item) throw new ApiError(404, "BATTERY_ITEM_NOT_FOUND", "The battery item was not found for this product.");
  const workspace = await loadBatteryWorkspace(admin, productId);
  if (!validateOperatingMetricValue(metricType, metricValue)) {
    throw new ApiError(400, "BATTERY_METRIC_OUT_OF_RANGE", "The battery metric value is outside the accepted range.", { metricType });
  }
  const { data: metricDefinition, error: metricDefinitionError } = await admin.from("battery_metric_type").select("code,default_unit,access_level_code").eq("code", metricType).eq("status", "active").maybeSingle();
  databaseError(metricDefinitionError);
  if (!metricDefinition) throw new ApiError(400, "UNKNOWN_METRIC_TYPE", "The battery metric type is not active.");
  const measuredAt = new Date(String(input.measuredAt || new Date().toISOString()));
  if (Number.isNaN(measuredAt.getTime()) || measuredAt.getTime() > Date.now() + 5 * 60_000) {
    throw new ApiError(400, "INVALID_MEASUREMENT_TIME", "The measurement timestamp is invalid or too far in the future.");
  }
  const dataSource = String(input.dataSource || "manual");
  if (!["manual", "bms", "bms_gateway", "service", "import"].includes(dataSource)) {
    throw new ApiError(400, "INVALID_BATTERY_DATA_SOURCE", "The battery operating-data source is not supported.");
  }
  const sourceDevice = String(input.sourceDevice || "").trim();
  if (["bms", "bms_gateway"].includes(dataSource) && !sourceDevice) {
    throw new ApiError(400, "BATTERY_SOURCE_DEVICE_REQUIRED", "A source-device identifier is required for BMS measurements.");
  }
  if (!workspace.operatingPolicy.passportOperatingDataApplies && dataSource !== "manual" && dataSource !== "service") {
    throw new ApiError(409, "BATTERY_OPERATING_DATA_NOT_APPLICABLE", "Confirm the battery-passport classification before enabling automated operating-data ingestion.");
  }
  const { error } = await admin.from("battery_operating_metric").insert({
    product_id: productId,
    battery_item_id: batteryItemId,
    metric_type: metricType,
    metric_value: metricValue,
    unit: metricDefinition.default_unit,
    measured_at: measuredAt.toISOString(),
    data_source: dataSource,
    source_device: sourceDevice || null,
    verification_status: input.verificationStatus || "unverified",
    access_level_code: "LEGITIMATE_INTEREST",
    ingestion_key: input.ingestionKey || null,
  });
  databaseError(error);
  return loadBatteryWorkspace(admin, productId);
}

export async function appendBatteryLifecycleEvent(admin: AdminClient, productId: string, input: Record<string, unknown>) {
  const batteryItemId = String(input.batteryItemId || "");
  const eventType = String(input.eventType || "").trim();
  if (!batteryItemId || !eventType) throw new ApiError(400, "INVALID_BATTERY_EVENT", "Battery item and event type are required.");
  const { data: item, error: itemError } = await admin.from("battery_item").select("id").eq("id", batteryItemId).eq("product_id", productId).maybeSingle();
  databaseError(itemError);
  if (!item) throw new ApiError(404, "BATTERY_ITEM_NOT_FOUND", "The battery item was not found for this product.");
  const { error } = await admin.from("battery_lifecycle_event").insert({
    product_id: productId,
    battery_item_id: batteryItemId,
    event_type: eventType,
    event_time: input.eventTime || new Date().toISOString(),
    event_data: input.eventData && typeof input.eventData === "object" ? input.eventData : {},
    data_source: input.dataSource || "manual",
    verification_status: input.verificationStatus || "unverified",
    access_level_code: input.accessLevel || "LEGITIMATE_INTEREST",
  });
  databaseError(error);
  return loadBatteryWorkspace(admin, productId);
}

export async function loadBatteryProjection(admin: AdminClient, identifier: string, viewerAccess: AccessLevel) {
  const { data: productByDpp, error: dppError } = await admin
    .from("products")
    .select("id,name,name_zh,dpp_id,public_slug,status,commodity_code,unique_product_identifier")
    .eq("dpp_id", identifier)
    .in("status", ["published", "updated", "expired"])
    .maybeSingle();
  databaseError(dppError);
  const { data: productBySlug, error: slugError } = productByDpp
    ? { data: null, error: null }
    : await admin
      .from("products")
      .select("id,name,name_zh,dpp_id,public_slug,status,commodity_code,unique_product_identifier")
      .eq("public_slug", identifier)
      .in("status", ["published", "updated", "expired"])
      .maybeSingle();
  databaseError(slugError);
  const product = productByDpp || productBySlug;
  if (!product) throw new ApiError(404, "PUBLISHED_BATTERY_NOT_FOUND", "The published battery DPP was not found.");
  const { data: profile, error: profileError } = await admin.from("battery_model_profile").select("*").eq("product_id", product.id).maybeSingle();
  databaseError(profileError);
  if (!profile) throw new ApiError(404, "BATTERY_PROFILE_NOT_FOUND", "The battery profile was not found.");
  const classification = classifyBattery({ legalCategory: profile.legal_category_code, capacityKwh: profile.rated_energy_kwh, stationary: profile.stationary, bmsPresent: profile.bms_present });
  const { fields } = await longlistFieldDefinitions(admin);
  const { data: rows, error: rowError } = await admin.from("battery_field_value").select("*").eq("battery_model_profile_id", profile.id).is("battery_batch_id", null).is("battery_item_id", null);
  databaseError(rowError);
  const values = valuesByFieldCode(rows || [], fields);
  return {
    product,
    profile: {
      legalCategory: profile.legal_category_code,
      technicalVariant: profile.technical_variant_code,
      passportApplicability: profile.passport_applicability,
      batteryModelIdentifier: profile.battery_model_identifier,
      ratedEnergyKwh: profile.rated_energy_kwh,
      batteryMassKg: profile.battery_mass_kg,
      chemistry: profile.battery_chemistry_code,
    },
    fields: projectBatteryFields(classification, values, viewerAccess),
    readiness: calculateBatteryReadiness(classification, values),
    catalogVersion: BATTERY_CATALOG_METADATA.catalogVersion,
    accessLevel: viewerAccess,
  };
}
