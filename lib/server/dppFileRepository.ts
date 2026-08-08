import { createHash, randomUUID } from "node:crypto";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  canProjectAccess,
  normalizeAccessLevel,
} from "@/lib/dpp/canonicalPublication";
import type { AccessLevel } from "@/lib/schemaRegistry";
import { BATTERY_FIELD_CATALOG } from "@/lib/battery/catalog";
import { ApiError } from "./apiRoute";

type Client = SupabaseClient<any, "public", any>;

const EVIDENCE_BUCKET = "dpp-evidence";
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

function databaseError(
  error: { code?: string; message?: string } | null,
  code: string,
  message: string,
) {
  if (!error) return;
  throw new ApiError(500, code, message, {
    database: `${error.code || ""} ${error.message || ""}`.trim(),
  });
}

function safeFilename(value: string) {
  const normalized = value
    .normalize("NFKC")
    .replaceAll(/[^A-Za-z0-9._-]+/g, "-")
    .replaceAll(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  return normalized.slice(0, 180) || "evidence.bin";
}

function normalizedKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9._-]+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 160);
}

async function nextFileVersion(admin: Client, assetId: string) {
  const { data, error } = await admin
    .from("dpp_file_version")
    .select("version_number")
    .eq("asset_id", assetId)
    .order("version_number", { ascending: false })
    .limit(1);
  databaseError(error, "DPP_FILE_VERSION_LOOKUP_FAILED", "The next file version could not be determined.");
  return Number(data?.[0]?.version_number || 0) + 1;
}

export async function createDppFileVersion(
  admin: Client,
  user: User,
  input: {
    productId: string;
    assetKey: string;
    title: string;
    documentType: string;
    description?: string | null;
    accessLevel?: string | null;
    sourceDocumentId?: string | null;
    moduleCode?: string | null;
    fieldCode?: string | null;
    fieldLinks?: Array<{ moduleCode: string; fieldCode: string }>;
    claimValue?: unknown;
    verificationStatus?: string | null;
    file: File;
  },
) {
  const assetKey = normalizedKey(input.assetKey);
  const accessLevel = normalizeAccessLevel(input.accessLevel);
  if (assetKey.length < 2 || !input.title.trim() || !input.documentType.trim()) {
    throw new ApiError(400, "DPP_FILE_METADATA_INVALID", "File key, title, and document type are required.");
  }
  if (!input.file.size || input.file.size > MAX_UPLOAD_BYTES) {
    throw new ApiError(400, "DPP_FILE_SIZE_INVALID", "The evidence file must be between 1 byte and 25 MB.");
  }
  if (!input.file.type || !input.file.type.includes("/")) {
    throw new ApiError(400, "DPP_FILE_TYPE_INVALID", "The evidence file must include a valid MIME type.");
  }

  const bytes = Buffer.from(await input.file.arrayBuffer());
  const checksum = createHash("sha256").update(bytes).digest("hex");
  const { data: assetId, error: assetError } = await admin.rpc(
    "greanlean_create_file_asset",
    {
      target_product_id: input.productId,
      asset_key_value: assetKey,
      title_value: input.title,
      document_type_value: input.documentType,
      description_value: input.description || "",
      access_level_value: accessLevel,
      actor_user_id: user.id,
    },
  );
  databaseError(assetError, "DPP_FILE_ASSET_CREATE_FAILED", "The file asset could not be created.");
  if (!assetId) throw new ApiError(500, "DPP_FILE_ASSET_CREATE_FAILED", "The file asset returned no identifier.");

  const versionNumber = await nextFileVersion(admin, String(assetId));
  const filename = safeFilename(input.file.name);
  const objectPath = [
    input.productId,
    String(assetId),
    `v${versionNumber}`,
    randomUUID(),
    filename,
  ].join("/");
  const { error: uploadError } = await admin.storage
    .from(EVIDENCE_BUCKET)
    .upload(objectPath, bytes, {
      contentType: input.file.type,
      upsert: false,
      cacheControl: "31536000",
    });
  databaseError(uploadError, "DPP_FILE_UPLOAD_FAILED", "The evidence file could not be stored.");

  const { data: versionId, error: versionError } = await admin.rpc(
    "greanlean_append_file_version",
    {
      target_asset_id: assetId,
      version_number_value: versionNumber,
      storage_bucket_value: EVIDENCE_BUCKET,
      object_path_value: objectPath,
      original_filename_value: input.file.name,
      mime_type_value: input.file.type,
      byte_size_value: input.file.size,
      checksum_sha256_value: checksum,
      source_document_id_value: input.sourceDocumentId || null,
      actor_user_id: user.id,
    },
  );
  if (versionError || !versionId) {
    await admin.storage.from(EVIDENCE_BUCKET).remove([objectPath]);
    databaseError(versionError, "DPP_FILE_VERSION_CREATE_FAILED", "The immutable file version could not be recorded.");
    throw new ApiError(500, "DPP_FILE_VERSION_CREATE_FAILED", "The immutable file version returned no identifier.");
  }

  const requestedLinks = input.fieldLinks?.length
    ? input.fieldLinks
    : input.moduleCode && input.fieldCode
      ? [{ moduleCode: input.moduleCode, fieldCode: input.fieldCode }]
      : [];
  const uniqueLinks = Array.from(new Map(
    requestedLinks.map((link) => [
      `${link.moduleCode}:${link.fieldCode}`,
      link,
    ]),
  ).values());
  const evidenceLinkIds: string[] = [];
  for (const link of uniqueLinks) {
    const { data, error } = await admin.rpc("greanlean_link_file_evidence", {
      target_product_id: input.productId,
      target_file_version_id: versionId,
      module_code_value: link.moduleCode,
      field_code_value: link.fieldCode,
      claim_value_value: input.claimValue ?? null,
      access_level_value: accessLevel,
      verification_status_value: "PENDING",
      supersedes_link_id_value: null,
      actor_user_id: user.id,
    });
    databaseError(error, "DPP_FILE_EVIDENCE_LINK_FAILED", "The file was stored but could not be linked to the field.");
    if (data) evidenceLinkIds.push(String(data));
  }

  return {
    assetId: String(assetId),
    fileVersionId: String(versionId),
    versionNumber,
    checksumSha256: checksum,
    evidenceLinkId: evidenceLinkIds[0] || null,
    evidenceLinkIds,
  };
}

export async function listDppFileAssets(
  admin: Client,
  productId: string,
) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productId)) {
    throw new ApiError(400, "PRODUCT_ID_INVALID", "A valid product identifier is required.");
  }
  const { data: product, error: productError } = await admin
    .from("products")
    .select("id,sector_code,dpp_profile_key")
    .eq("id", productId)
    .maybeSingle();
  databaseError(productError, "DPP_FILE_PRODUCT_LOOKUP_FAILED", "The evidence product could not be loaded.");
  if (!product) {
    throw new ApiError(404, "PRODUCT_NOT_FOUND", "The product was not found.");
  }

  const { data: assets, error: assetError } = await admin
    .from("dpp_file_asset")
    .select("id,asset_key,title,document_type,description,access_level_code,status,created_at,updated_at")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });
  databaseError(assetError, "DPP_FILE_ASSET_LIST_FAILED", "Evidence files could not be loaded.");

  const assetIds = (assets || []).map((asset) => String(asset.id));
  const versionResult = assetIds.length
    ? await admin
      .from("dpp_file_version")
      .select("id,asset_id,version_number,original_filename,mime_type,byte_size,access_level_code,checksum_sha256,hash_algorithm,created_at")
      .in("asset_id", assetIds)
      .order("version_number", { ascending: false })
    : { data: [], error: null };
  databaseError(versionResult.error, "DPP_FILE_VERSION_LIST_FAILED", "Evidence file versions could not be loaded.");

  const { data: links, error: linkError } = await admin
    .from("dpp_field_evidence_link")
    .select("id,file_version_id,module_code,field_code,verification_status,access_level_code,created_at")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });
  databaseError(linkError, "DPP_FILE_LINK_LIST_FAILED", "Evidence field links could not be loaded.");

  let supportedFields: Array<{
    fieldCode: string;
    moduleCode: string;
    labelEn: string;
    labelZh: string;
  }> = [];
  if (product.sector_code === "battery") {
    supportedFields = BATTERY_FIELD_CATALOG
      .filter((field) => field.evidenceRequired)
      .map((field) => ({
        fieldCode: field.fieldCode,
        moduleCode: "sector",
        labelEn: field.labelEn,
        labelZh: field.labelZh,
      }));
  } else if (product.dpp_profile_key) {
    const { data: templates, error: templateError } = await admin
      .from("dpp_field_templates")
      .select("field_key,field_label,field_label_zh")
      .eq("profile_key", product.dpp_profile_key)
      .eq("evidence_required", true)
      .order("sort_order");
    databaseError(templateError, "DPP_FILE_FIELD_LIST_FAILED", "Evidence field choices could not be loaded.");
    supportedFields = (templates || []).map((field) => ({
      fieldCode: String(field.field_key),
      moduleCode: "sector",
      labelEn: String(field.field_label || field.field_key),
      labelZh: String(field.field_label_zh || field.field_label || field.field_key),
    }));
  }

  const versionsByAsset = new Map<string, any[]>();
  for (const version of versionResult.data || []) {
    const key = String(version.asset_id);
    versionsByAsset.set(key, [...(versionsByAsset.get(key) || []), version]);
  }
  const linksByVersion = new Map<string, any[]>();
  for (const link of links || []) {
    const key = String(link.file_version_id);
    linksByVersion.set(key, [...(linksByVersion.get(key) || []), link]);
  }

  return {
    product: {
      sectorCode: product.sector_code,
      profileKey: product.dpp_profile_key,
    },
    supportedFields,
    assets: (assets || []).map((asset) => ({
      ...asset,
      versions: (versionsByAsset.get(String(asset.id)) || []).map((version) => ({
        ...version,
        links: linksByVersion.get(String(version.id)) || [],
      })),
    })),
  };
}

export async function createDppFileDownload(
  admin: Client,
  authClient: Client | null,
  user: User | null,
  versionId: string,
  context: {
    purpose?: string | null;
    requestPath?: string | null;
    correlationId?: string | null;
    userAgent?: string | null;
  } = {},
) {
  const { data: version, error: versionError } = await admin
    .from("dpp_file_version")
    .select("*")
    .eq("id", versionId)
    .maybeSingle();
  databaseError(versionError, "DPP_FILE_LOOKUP_FAILED", "The file version could not be loaded.");
  if (!version) throw new ApiError(404, "DPP_FILE_NOT_FOUND", "The requested file version was not found.");

  const { data: asset, error: assetError } = await admin
    .from("dpp_file_asset")
    .select("*")
    .eq("id", version.asset_id)
    .maybeSingle();
  databaseError(assetError, "DPP_FILE_LOOKUP_FAILED", "The file asset could not be loaded.");
  if (!asset) throw new ApiError(404, "DPP_FILE_NOT_FOUND", "The requested file asset was not found.");

  const { data: product, error: productError } = await admin
    .from("products")
    .select("status")
    .eq("id", asset.product_id)
    .maybeSingle();
  databaseError(productError, "DPP_FILE_LOOKUP_FAILED", "The file product could not be loaded.");
  if (!product) throw new ApiError(404, "DPP_FILE_NOT_FOUND", "The requested file product was not found.");

  let grantedLevel: AccessLevel = "PUBLIC";
  if (user && authClient) {
    const { data, error } = await authClient.rpc("greanlean_product_access_level", {
      target_product_id: asset.product_id,
    });
    databaseError(error, "DPP_FILE_ACCESS_FAILED", "File access could not be resolved.");
    grantedLevel = normalizeAccessLevel(data);
  }
  const requiredLevel = normalizeAccessLevel(version.access_level_code);
  const productIsPublic = ["published", "updated", "expired"].includes(
    String(product.status || "").toLowerCase(),
  );
  const allowed = canProjectAccess(grantedLevel, requiredLevel)
    && (productIsPublic || grantedLevel === "INTERNAL");

  const { error: auditError } = await admin.from("dpp_access_audit").insert({
    product_id: asset.product_id,
    user_id: user?.id || null,
    requested_access_level: requiredLevel,
    granted_access_level: grantedLevel,
    decision: allowed ? "allowed" : "denied",
    reason_code: allowed ? "FILE_ACCESS_GRANTED" : "FILE_ACCESS_LEVEL_INSUFFICIENT",
    purpose: context.purpose || "evidence file download",
    request_path: context.requestPath || null,
    correlation_id: context.correlationId || null,
    user_agent: context.userAgent || null,
  });
  databaseError(auditError, "DPP_FILE_ACCESS_AUDIT_FAILED", "The file access decision could not be audited.");

  if (!allowed) {
    throw new ApiError(403, "DPP_FILE_ACCESS_DENIED", "This account is not authorised to download the requested evidence file.");
  }

  const { data: signed, error: signedError } = await admin.storage
    .from(version.storage_bucket)
    .createSignedUrl(version.object_path, 60, {
      download: safeFilename(version.original_filename),
    });
  databaseError(signedError, "DPP_FILE_SIGNING_FAILED", "A temporary file download could not be created.");
  if (!signed?.signedUrl) {
    throw new ApiError(500, "DPP_FILE_SIGNING_FAILED", "The file store returned no temporary download address.");
  }

  return {
    signedUrl: signed.signedUrl,
    filename: version.original_filename,
    mimeType: version.mime_type,
    expiresInSeconds: 60,
  };
}

export async function appendDppLifecycleEvent(
  admin: Client,
  user: User,
  input: Record<string, unknown>,
) {
  const productId = String(input.productId || "");
  const eventType = String(input.eventType || "").trim();
  if (!productId || !eventType) {
    throw new ApiError(400, "DPP_LIFECYCLE_EVENT_INVALID", "Product and lifecycle event type are required.");
  }

  const { data, error } = await admin.rpc("greanlean_append_lifecycle_event", {
    target_product_id: productId,
    scope_type_value: String(input.scopeType || "MODEL"),
    scope_identifier_value: String(input.scopeIdentifier || ""),
    event_type_value: eventType,
    event_time_value: input.eventTime || new Date().toISOString(),
    location_value: input.location && typeof input.location === "object" ? input.location : {},
    responsible_party_value: String(input.responsibleParty || ""),
    event_data_value: input.eventData && typeof input.eventData === "object" ? input.eventData : {},
    data_source_value: String(input.dataSource || "MANUAL"),
    verification_status_value: String(input.verificationStatus || "UNVERIFIED"),
    access_level_value: normalizeAccessLevel(input.accessLevel),
    file_version_id_value: input.fileVersionId || null,
    supersedes_event_id_value: input.supersedesEventId || null,
    previous_event_hash_value: String(input.previousEventHash || ""),
    actor_user_id: user.id,
  });
  databaseError(error, "DPP_LIFECYCLE_EVENT_CREATE_FAILED", "The lifecycle event could not be appended.");
  return { eventId: String(data) };
}
