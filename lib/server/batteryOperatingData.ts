import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  BATTERY_OPERATING_METRICS,
  validateOperatingMetricValue,
} from "@/lib/battery/operatingDataPolicy";
import { ApiError } from "./apiRoute";

type AdminClient = SupabaseClient<any, "public", any>;
type IntegrationScope = "metrics:write" | "events:write";
type HistoryRange = "24h" | "7d" | "30d" | "12m" | "all";

type IntegrationContext = {
  credential: any;
  device: any;
  requestTimestamp: string;
  idempotencyKey: string;
};

const METRIC_ALIAS: Record<string, string> = {
  FULL_CHARGE_CAPACITY_DEMO: "FULL_CHARGE_CAPACITY",
  FULL_EQUIVALENT_CYCLES_DEMO: "FULL_CYCLE_COUNT",
  CURRENT_INTERNAL_RESISTANCE_DEMO: "CURRENT_INTERNAL_RESISTANCE",
};

const EVENT_TYPES = new Set([
  "COMMISSIONING",
  "INSPECTION",
  "MAINTENANCE",
  "REPAIR",
  "FAULT",
  "SAFETY_EVENT",
  "BMS_REPLACEMENT",
  "REUSE",
  "REPURPOSE",
  "RETIREMENT",
  "RECYCLING",
]);

const metricDefinitionByCode = new Map(
  BATTERY_OPERATING_METRICS.map((metric) => [metric.code, metric]),
);

function databaseError(
  error: { message?: string; code?: string } | null,
  code: string,
  message: string,
): never | void {
  if (!error) return;
  throw new ApiError(500, code, message, {
    databaseCode: error.code,
  });
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function apiKeyFromRequest(request: Request) {
  const direct = request.headers.get("x-api-key")?.trim();
  if (direct) return direct;
  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^ApiKey\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

export function requireBatteryIntegrationCredential(request: Request) {
  const apiKey = apiKeyFromRequest(request);
  const [keyPrefix] = apiKey.split(".");
  if (!apiKey || !/^gln_bat_[a-z0-9]{8,32}$/.test(keyPrefix || "")) {
    throw new ApiError(401, "INVALID_INTEGRATION_CREDENTIAL", "The battery integration credential is invalid.");
  }
  return apiKey;
}

function idempotencyKeyFromRequest(request: Request, body: any) {
  const value = (
    request.headers.get("x-idempotency-key")
    || body?.idempotencyKey
    || ""
  ).trim();
  if (value.length < 8 || value.length > 200) {
    throw new ApiError(
      400,
      "INVALID_IDEMPOTENCY_KEY",
      "An idempotency key between 8 and 200 characters is required.",
    );
  }
  return value;
}

function requestTimestampFromRequest(request: Request) {
  const value = request.headers.get("x-greanlean-timestamp")?.trim() || "";
  const parsed = new Date(value);
  if (!value || Number.isNaN(parsed.getTime())) {
    throw new ApiError(
      400,
      "INVALID_REQUEST_TIMESTAMP",
      "A valid x-greanlean-timestamp header is required.",
    );
  }
  if (Math.abs(Date.now() - parsed.getTime()) > 5 * 60_000) {
    throw new ApiError(
      401,
      "REQUEST_TIMESTAMP_OUTSIDE_WINDOW",
      "The integration request timestamp is outside the five-minute replay-protection window.",
    );
  }
  return parsed.toISOString();
}

function normalizeRelation(value: any) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizedMetricCode(value: unknown) {
  const code = String(value || "").trim().toUpperCase();
  return METRIC_ALIAS[code] || code;
}

function normalizedDataSource(value: unknown) {
  const source = String(value || "").toUpperCase();
  if (["SYNTHETIC_DEMO", "SYNTHETIC_TEST", "INITIAL_DATASET"].includes(source)) {
    return "INITIAL_DATASET";
  }
  if (["BMS", "EMS", "GATEWAY", "SERVICE_SYSTEM", "IMPORT_SYSTEM"].includes(source)) {
    return source;
  }
  return source || "INITIAL_DATASET";
}

function normalizedSourceDevice(row: any) {
  const source = normalizedDataSource(row?.data_source);
  if (source === "INITIAL_DATASET") return "INITIAL-IMPORT";
  const device = String(row?.source_device || "").trim();
  if (/demo|synthetic|test fixture/i.test(device)) return "INITIAL-IMPORT";
  return device || "UNSPECIFIED";
}

function normalizedVerification(value: unknown) {
  const status = String(value || "").toUpperCase();
  if (status === "VERIFIED") return "MANUALLY_VERIFIED";
  if (status === "DEVICE_REPORTED") return status;
  return "UNVERIFIED";
}

function normalizedQuality(value: unknown) {
  const quality = String(value || "").toUpperCase();
  return ["VALID", "SUSPECT", "INVALID"].includes(quality) ? quality : "UNKNOWN";
}

function normalizedCollectionMode(value: unknown, fallback: string) {
  const mode = String(value || fallback).toUpperCase();
  const allowed = new Set([
    "DAILY_SNAPSHOT",
    "EVENT_DRIVEN",
    "SERVICE_SNAPSHOT",
    "MANUAL_VERIFIED_IMPORT",
  ]);
  return allowed.has(mode) ? mode : fallback;
}

function measuredAt(value: unknown) {
  const date = new Date(String(value || ""));
  if (Number.isNaN(date.getTime()) || date.getTime() > Date.now() + 5 * 60_000) {
    throw new ApiError(
      400,
      "INVALID_MEASUREMENT_TIME",
      "A valid measurement timestamp that is not in the future is required.",
    );
  }
  return date.toISOString();
}

function ensurePayloadSize(rawBody: string) {
  if (Buffer.byteLength(rawBody, "utf8") > 128 * 1024) {
    throw new ApiError(
      413,
      "BATTERY_INGESTION_PAYLOAD_TOO_LARGE",
      "The integration payload exceeds the 128 KB limit.",
    );
  }
}

export function parseBatteryIntegrationPayload(rawBody: string) {
  ensurePayloadSize(rawBody);
  try {
    const body = JSON.parse(rawBody);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new Error("object required");
    }
    return body;
  } catch {
    throw new ApiError(
      400,
      "INVALID_JSON",
      "A JSON object request body is required.",
    );
  }
}

export async function authenticateBatteryIntegration(
  admin: AdminClient,
  request: Request,
  body: any,
  batteryItemId: string,
  scope: IntegrationScope,
): Promise<IntegrationContext> {
  const apiKey = requireBatteryIntegrationCredential(request);
  const [keyPrefix] = apiKey.split(".");

  const { data, error } = await admin
    .from("battery_integration_credential")
    .select(`
      id,
      organisation_id,
      source_device_id,
      key_prefix,
      secret_hash,
      scopes,
      status,
      valid_from,
      valid_until,
      rate_limit_per_minute,
      source_device:battery_source_device!inner(
        id,
        organisation_id,
        product_id,
        battery_item_id,
        device_identifier,
        source_system,
        status
      )
    `)
    .eq("key_prefix", keyPrefix)
    .eq("secret_hash", sha256(apiKey))
    .maybeSingle();
  databaseError(error, "INTEGRATION_CREDENTIAL_LOOKUP_FAILED", "The integration credential could not be checked.");
  const device = normalizeRelation(data?.source_device);
  const now = Date.now();
  if (
    !data
    || !device
    || data.status !== "ACTIVE"
    || device.status !== "ACTIVE"
    || new Date(data.valid_from).getTime() > now
    || (data.valid_until && new Date(data.valid_until).getTime() <= now)
    || !Array.isArray(data.scopes)
    || !data.scopes.includes(scope)
  ) {
    throw new ApiError(401, "INTEGRATION_CREDENTIAL_INACTIVE", "The battery integration credential is not active for this operation.");
  }
  if (device.battery_item_id !== batteryItemId) {
    throw new ApiError(403, "DEVICE_ITEM_BINDING_MISMATCH", "The credential is not bound to this battery item.");
  }

  const requestTimestamp = requestTimestampFromRequest(request);
  const idempotencyKey = idempotencyKeyFromRequest(request, body);
  const minuteAgo = new Date(Date.now() - 60_000).toISOString();
  const { count, error: rateError } = await admin
    .from("battery_ingestion_request")
    .select("id", { head: true, count: "exact" })
    .eq("credential_id", data.id)
    .gte("received_at", minuteAgo);
  databaseError(rateError, "INTEGRATION_RATE_LIMIT_CHECK_FAILED", "The integration rate limit could not be checked.");
  if ((count || 0) >= Number(data.rate_limit_per_minute || 120)) {
    throw new ApiError(429, "INTEGRATION_RATE_LIMITED", "The integration request rate limit has been reached.");
  }
  return { credential: data, device, requestTimestamp, idempotencyKey };
}

function metricRows(body: any, context: IntegrationContext) {
  const submitted = Array.isArray(body.metrics) ? body.metrics : [body];
  if (submitted.length < 1 || submitted.length > 100) {
    throw new ApiError(400, "INVALID_METRIC_BATCH_SIZE", "Submit between 1 and 100 battery metrics per request.");
  }
  const seen = new Set<string>();
  return submitted.map((row: any) => {
    const metricType = normalizedMetricCode(row.metricCode || row.metricType);
    const definition = metricDefinitionByCode.get(metricType);
    const metricValue = Number(row.value ?? row.metricValue);
    if (!definition || !Number.isFinite(metricValue)) {
      throw new ApiError(400, "INVALID_BATTERY_METRIC", "Every metric requires an active metric code and numeric value.", { metricType });
    }
    if (seen.has(metricType)) {
      throw new ApiError(400, "DUPLICATE_METRIC_CODE", "A metric batch cannot contain the same metric code twice.", { metricType });
    }
    seen.add(metricType);
    if (!validateOperatingMetricValue(metricType, metricValue)) {
      throw new ApiError(400, "BATTERY_METRIC_OUT_OF_RANGE", "The battery metric value is outside the accepted range.", { metricType });
    }
    const unit = String(row.unit || definition.defaultUnit).trim();
    if (unit !== definition.defaultUnit) {
      throw new ApiError(400, "BATTERY_METRIC_UNIT_MISMATCH", "The metric unit does not match the active metric definition.", {
        metricType,
        expectedUnit: definition.defaultUnit,
      });
    }
    const dataSource = context.device.source_system;
    return {
      metricType,
      metricValue,
      unit,
      measuredAt: measuredAt(row.measuredAt),
      dataSource,
      sourceDevice: context.device.device_identifier,
      qualityStatus: normalizedQuality(row.qualityStatus || "VALID"),
      verificationStatus: ["BMS", "EMS", "GATEWAY"].includes(dataSource)
        ? "DEVICE_REPORTED"
        : row.verificationStatus === "MANUALLY_VERIFIED"
          ? "MANUALLY_VERIFIED"
          : "UNVERIFIED",
      collectionMode: normalizedCollectionMode(
        row.collectionMode,
        dataSource === "SERVICE_SYSTEM" ? "SERVICE_SNAPSHOT" : "DAILY_SNAPSHOT",
      ),
    };
  });
}

function eventRows(body: any, context: IntegrationContext) {
  const submitted = Array.isArray(body.events) ? body.events : [body];
  if (submitted.length < 1 || submitted.length > 100) {
    throw new ApiError(400, "INVALID_EVENT_BATCH_SIZE", "Submit between 1 and 100 battery events per request.");
  }
  const seen = new Set<string>();
  return submitted.map((row: any) => {
    const eventType = String(row.eventType || "").trim().toUpperCase();
    if (!EVENT_TYPES.has(eventType) || seen.has(eventType)) {
      throw new ApiError(400, "INVALID_BATTERY_EVENT", "Every event requires a supported, non-duplicated event type.", { eventType });
    }
    seen.add(eventType);
    const eventData = row.eventData && typeof row.eventData === "object" && !Array.isArray(row.eventData)
      ? row.eventData
      : {};
    const dataSource = context.device.source_system;
    return {
      eventType,
      eventTime: measuredAt(row.eventTime),
      eventData,
      dataSource,
      qualityStatus: normalizedQuality(row.qualityStatus || "VALID"),
      verificationStatus: ["BMS", "EMS", "GATEWAY"].includes(dataSource)
        ? "DEVICE_REPORTED"
        : row.verificationStatus === "MANUALLY_VERIFIED"
          ? "MANUALLY_VERIFIED"
          : "UNVERIFIED",
      collectionMode: normalizedCollectionMode(
        row.collectionMode,
        dataSource === "SERVICE_SYSTEM" ? "SERVICE_SNAPSHOT" : "EVENT_DRIVEN",
      ),
    };
  });
}

async function markIntegrationSeen(admin: AdminClient, context: IntegrationContext) {
  const now = new Date().toISOString();
  await Promise.all([
    admin
      .from("battery_integration_credential")
      .update({ last_used_at: now })
      .eq("id", context.credential.id),
    admin
      .from("battery_source_device")
      .update({ last_seen_at: now })
      .eq("id", context.device.id),
  ]);
}

export async function ingestBatteryMetrics(
  admin: AdminClient,
  request: Request,
  rawBody: string,
  batteryItemId: string,
  correlationId: string,
) {
  const body = parseBatteryIntegrationPayload(rawBody);
  const context = await authenticateBatteryIntegration(admin, request, body, batteryItemId, "metrics:write");
  const metrics = metricRows(body, context);
  const { data, error } = await admin.rpc("greanlean_ingest_battery_metrics", {
    target_credential_id: context.credential.id,
    target_source_device_id: context.device.id,
    target_battery_item_id: context.device.battery_item_id,
    target_product_id: context.device.product_id,
    target_idempotency_key: context.idempotencyKey,
    target_request_timestamp: context.requestTimestamp,
    target_payload_hash: sha256(rawBody),
    target_correlation_id: correlationId,
    target_metrics: metrics,
  });
  databaseError(error, "BATTERY_METRIC_INGESTION_FAILED", "The battery metrics could not be appended.");
  await markIntegrationSeen(admin, context);
  return data;
}

export async function ingestBatteryEvents(
  admin: AdminClient,
  request: Request,
  rawBody: string,
  batteryItemId: string,
  correlationId: string,
) {
  const body = parseBatteryIntegrationPayload(rawBody);
  const context = await authenticateBatteryIntegration(admin, request, body, batteryItemId, "events:write");
  const events = eventRows(body, context);
  const { data, error } = await admin.rpc("greanlean_ingest_battery_events", {
    target_credential_id: context.credential.id,
    target_source_device_id: context.device.id,
    target_battery_item_id: context.device.battery_item_id,
    target_product_id: context.device.product_id,
    target_idempotency_key: context.idempotencyKey,
    target_request_timestamp: context.requestTimestamp,
    target_payload_hash: sha256(rawBody),
    target_correlation_id: correlationId,
    target_events: events,
  });
  databaseError(error, "BATTERY_EVENT_INGESTION_FAILED", "The battery lifecycle events could not be appended.");
  await markIntegrationSeen(admin, context);
  return data;
}

export async function createBatteryIntegrationCredential(
  admin: AdminClient,
  user: User,
  input: {
    organisationId: string;
    productId: string;
    batteryItemId: string;
    deviceIdentifier: string;
    sourceSystem: string;
    displayName?: string;
    rotateCredentialId?: string;
    rateLimitPerMinute?: number;
  },
) {
  const sourceSystem = input.sourceSystem.toUpperCase();
  if (!["BMS", "EMS", "GATEWAY", "SERVICE_SYSTEM", "IMPORT_SYSTEM"].includes(sourceSystem)) {
    throw new ApiError(400, "INVALID_SOURCE_SYSTEM", "The battery source system is not supported.");
  }
  const { data: item, error: itemError } = await admin
    .from("battery_item")
    .select("id,product_id")
    .eq("id", input.batteryItemId)
    .eq("product_id", input.productId)
    .maybeSingle();
  databaseError(itemError, "BATTERY_ITEM_LOOKUP_FAILED", "The battery item could not be checked.");
  if (!item) throw new ApiError(404, "BATTERY_ITEM_NOT_FOUND", "The battery item was not found for this product.");

  const { data: device, error: deviceError } = await admin
    .from("battery_source_device")
    .upsert({
      organisation_id: input.organisationId,
      product_id: input.productId,
      battery_item_id: input.batteryItemId,
      device_identifier: input.deviceIdentifier.trim(),
      source_system: sourceSystem,
      display_name: input.displayName?.trim() || null,
      status: "ACTIVE",
      created_by: user.id,
    }, { onConflict: "organisation_id,device_identifier" })
    .select("*")
    .single();
  databaseError(deviceError, "BATTERY_DEVICE_SAVE_FAILED", "The battery source device could not be saved.");

  let rotatedFromId: string | null = null;
  if (input.rotateCredentialId) {
    const { data: existing, error: existingError } = await admin
      .from("battery_integration_credential")
      .select("id,source_device_id,status")
      .eq("id", input.rotateCredentialId)
      .maybeSingle();
    databaseError(existingError, "BATTERY_CREDENTIAL_LOOKUP_FAILED", "The battery integration credential could not be checked.");
    if (!existing || existing.source_device_id !== device.id || existing.status !== "ACTIVE") {
      throw new ApiError(409, "CREDENTIAL_ROTATION_INVALID", "Only an active credential for the same device can be rotated.");
    }
    const { error: rotateError } = await admin
      .from("battery_integration_credential")
      .update({
        status: "ROTATED",
        valid_until: new Date().toISOString(),
        revoked_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    databaseError(rotateError, "BATTERY_CREDENTIAL_ROTATION_FAILED", "The existing integration credential could not be rotated.");
    rotatedFromId = existing.id;
  }

  const keyPrefix = `gln_bat_${randomBytes(8).toString("hex")}`;
  const plaintextKey = `${keyPrefix}.${randomBytes(32).toString("base64url")}`;
  const { data: credential, error: credentialError } = await admin
    .from("battery_integration_credential")
    .insert({
      organisation_id: input.organisationId,
      source_device_id: device.id,
      key_prefix: keyPrefix,
      secret_hash: sha256(plaintextKey),
      status: "ACTIVE",
      rate_limit_per_minute: Math.min(10000, Math.max(1, Number(input.rateLimitPerMinute || 120))),
      rotated_from_id: rotatedFromId,
      created_by: user.id,
    })
    .select("id,key_prefix,scopes,status,valid_from,valid_until,rate_limit_per_minute")
    .single();
  databaseError(credentialError, "BATTERY_CREDENTIAL_CREATE_FAILED", "The integration credential could not be created.");

  return {
    credential,
    device: {
      id: device.id,
      deviceIdentifier: device.device_identifier,
      sourceSystem: device.source_system,
      batteryItemId: device.battery_item_id,
    },
    apiKey: plaintextKey,
    notice: "This API key is returned once. Store it in a secret manager.",
  };
}

function historyStart(range: HistoryRange, now = new Date()) {
  if (range === "all") return null;
  const milliseconds = {
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
    "12m": 365 * 24 * 60 * 60 * 1000,
  }[range];
  return new Date(now.getTime() - milliseconds).toISOString();
}

function normalizedMetricRow(row: any, labels: Map<string, any>) {
  const metricType = normalizedMetricCode(row.metric_type);
  const definition = labels.get(metricType) || metricDefinitionByCode.get(metricType);
  return {
    id: row.id,
    metricType,
    labelEn: definition?.label_en || definition?.labelEn || metricType,
    labelZh: definition?.label_zh || definition?.labelZh || metricType,
    value: Number(row.metric_value),
    unit: row.unit,
    measuredAt: row.measured_at,
    receivedAt: row.received_at || row.created_at,
    dataSource: normalizedDataSource(row.data_source),
    sourceDevice: normalizedSourceDevice(row),
    qualityStatus: normalizedQuality(row.quality_status),
    verificationStatus: normalizedVerification(row.verification_status),
    collectionMode: normalizedCollectionMode(row.collection_mode, "DAILY_SNAPSHOT"),
  };
}

function normalizedEventRow(row: any) {
  const rawType = String(row.event_type || "").toUpperCase();
  const legacyType = /accident/i.test(rawType) ? "SAFETY_EVENT" : rawType;
  return {
    id: row.id,
    eventType: legacyType,
    eventTime: row.event_time,
    eventData: row.event_data || {},
    dataSource: normalizedDataSource(row.data_source),
    sourceDevice: normalizedSourceDevice(row),
    qualityStatus: normalizedQuality(row.quality_status),
    verificationStatus: normalizedVerification(row.verification_status),
    collectionMode: normalizedCollectionMode(row.collection_mode, "EVENT_DRIVEN"),
  };
}

export async function loadBatteryOperatingProjection(
  admin: AdminClient,
  productId: string,
  options: {
    batteryItemId?: string;
    range?: HistoryRange;
    metricCodes?: string[];
  } = {},
) {
  let itemQuery = admin
    .from("battery_item")
    .select("id,serial_identifier,unique_product_identifier,battery_status_code,commissioned_at,updated_at,created_at")
    .eq("product_id", productId)
    .order("updated_at", { ascending: false })
    .limit(1);
  if (options.batteryItemId) itemQuery = itemQuery.eq("id", options.batteryItemId);
  const { data: items, error: itemError } = await itemQuery;
  databaseError(itemError, "BATTERY_ITEM_LOOKUP_FAILED", "The battery item could not be loaded.");
  const item = items?.[0];
  if (!item) return null;

  const requestedCodes = (options.metricCodes || [])
    .map(normalizedMetricCode)
    .filter((code) => metricDefinitionByCode.has(code));
  const aliasesForRequested = requestedCodes.flatMap((code) => [
    code,
    ...Object.entries(METRIC_ALIAS).flatMap(([legacy, canonical]) => canonical === code ? [legacy] : []),
  ]);
  const range = options.range || "30d";
  const start = historyStart(range);
  let historyQuery = admin
    .from("battery_operating_metric")
    .select("*")
    .eq("battery_item_id", item.id)
    .order("measured_at", { ascending: true })
    .limit(2000);
  if (start) historyQuery = historyQuery.gte("measured_at", start);
  if (aliasesForRequested.length) historyQuery = historyQuery.in("metric_type", aliasesForRequested);

  const [latestResult, historyResult, typeResult, eventResult] = await Promise.all([
    admin
      .from("battery_operating_metric_latest")
      .select("*")
      .eq("battery_item_id", item.id)
      .order("measured_at", { ascending: false }),
    historyQuery,
    admin
      .from("battery_metric_type")
      .select("code,label_en,label_zh,default_unit")
      .eq("status", "active"),
    admin
      .from("battery_lifecycle_event")
      .select("*")
      .eq("battery_item_id", item.id)
      .order("event_time", { ascending: false })
      .limit(100),
  ]);
  for (const result of [latestResult, historyResult, typeResult, eventResult]) {
    databaseError(result.error, "BATTERY_OPERATING_DATA_LOAD_FAILED", "The battery operating data could not be loaded.");
  }
  const labels = new Map((typeResult.data || []).map((row: any) => [row.code, row]));
  const latestByCode = new Map<string, any>();
  for (const row of latestResult.data || []) {
    const normalized = normalizedMetricRow(row, labels);
    const existing = latestByCode.get(normalized.metricType);
    if (!existing || new Date(normalized.measuredAt).getTime() > new Date(existing.measuredAt).getTime()) {
      latestByCode.set(normalized.metricType, normalized);
    }
  }
  const latest = Array.from(latestByCode.values()).sort(
    (left, right) => new Date(right.measuredAt).getTime() - new Date(left.measuredAt).getTime(),
  );
  const history = (historyResult.data || []).map((row: any) => normalizedMetricRow(row, labels));
  const events = (eventResult.data || []).map(normalizedEventRow);
  const latestMeasuredAt = latest[0]?.measuredAt || null;
  const ageHours = latestMeasuredAt
    ? Math.max(0, (Date.now() - new Date(latestMeasuredAt).getTime()) / 3_600_000)
    : null;
  const freshnessStatus = ageHours === null
    ? "MISSING"
    : ageHours <= 24
      ? "CURRENT"
      : ageHours <= 48
        ? "DUE"
        : "OVERDUE";

  return {
    item: {
      id: item.id,
      serialIdentifier: item.serial_identifier,
      uniqueProductIdentifier: item.unique_product_identifier,
      lifecycleStatus: item.battery_status_code,
      commissionedAt: item.commissioned_at,
    },
    latest,
    history,
    events,
    summary: {
      latestMeasuredAt,
      receivedAt: latest[0]?.receivedAt || null,
      sourceDevice: latest[0]?.sourceDevice || null,
      dataSource: latest[0]?.dataSource || null,
      qualityStatus: latest[0]?.qualityStatus || "UNKNOWN",
      verificationStatus: latest[0]?.verificationStatus || "UNVERIFIED",
      freshnessStatus,
      ageHours,
      range,
      updateMode: latest[0]?.collectionMode || "DAILY_SNAPSHOT",
    },
  };
}
