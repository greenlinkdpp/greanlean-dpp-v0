import { createHash } from "node:crypto";

export type RegistryEnvironment = "TEST" | "PRODUCTION";
export type RegistryGranularity = "MODEL" | "BATCH" | "ITEM";
export type RegistryValidationSeverity = "INFO" | "WARNING" | "ERROR" | "BLOCKER";

export type RegistryValidationResult = {
  validationStage: "MAPPING" | "PRE_SUBMISSION" | "REGISTRY_RESPONSE";
  ruleCode: string;
  fieldCode: string | null;
  severity: RegistryValidationSeverity;
  jsonPointer: string | null;
  errorCode: string | null;
  messageEn: string;
  messageZh: string;
  source: "LOCAL" | "REGISTRY";
  passed: boolean;
};

export type BatteryRegistrySource = {
  environment: RegistryEnvironment;
  mappingVersion: string;
  operationalRuleVersion: string;
  registrySchemaVersion: string | null;
  mappingStatus: string;
  productStatus: string | null;
  passportId: string | null;
  upi: string | null;
  granularity: RegistryGranularity;
  modelIdentifier: string | null;
  batchIdentifier: string | null;
  itemIdentifier: string | null;
  commodityCode: string | null;
  dppUri: string | null;
  backupReference: string | null;
  dppVersion: string | null;
  dppVersionHash: string | null;
  enrolmentVerified: boolean;
  declarationPresent: boolean;
  generatedAt?: string;
};

export type BatteryRegistryArtifact = {
  metadata: {
    artifactType: "GREANLEAN_DPP_REGISTRY_TEST_MAPPING";
    environment: RegistryEnvironment;
    mappingVersion: string;
    operationalRuleVersion: string;
    registrySchemaVersion: string | null;
    generatedAt: string;
    officialBatterySemanticCatalogueAvailable: false;
    registrationCapable: false;
  };
  registrationRequests: Array<{
    productGroup: "battery";
    granularity: RegistryGranularity;
    uniqueIdentifiers: {
      passportId: string | null;
      upi: string | null;
      modelIdentifier: string | null;
      batchIdentifier: string | null;
      itemIdentifier: string | null;
    };
    commodityCode: string | null;
    dpp: {
      uri: string | null;
      backupReference: string | null;
      version: string | null;
      versionHash: string | null;
    };
  }>;
};

function validation(
  ruleCode: string,
  passed: boolean,
  severity: RegistryValidationSeverity,
  fieldCode: string | null,
  jsonPointer: string | null,
  messageEn: string,
  messageZh: string,
  errorCode: string | null = null,
): RegistryValidationResult {
  return {
    validationStage: "PRE_SUBMISSION",
    ruleCode,
    fieldCode,
    severity,
    jsonPointer,
    errorCode: passed ? null : errorCode || ruleCode,
    messageEn,
    messageZh,
    source: "LOCAL",
    passed,
  };
}

function isHttpsUrl(value: string | null) {
  if (!value) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeRegistryGranularity(value: string | null | undefined): RegistryGranularity {
  const normalized = String(value || "MODEL").toUpperCase();
  if (normalized === "BATCH" || normalized === "ITEM") return normalized;
  return "MODEL";
}

export function validateBatteryRegistrySource(source: BatteryRegistrySource): RegistryValidationResult[] {
  const results = [
    validation("REGISTRY_TEST_ENVIRONMENT", source.environment === "TEST", "ERROR", "environment", "/metadata/environment", "Only the TEST environment is enabled for the current adapter.", "当前适配器仅开放测试环境。"),
    validation("MAPPING_PUBLISHED", source.mappingStatus === "published", "ERROR", "mapping_version", "/metadata/mappingVersion", "The Registry mapping must be published.", "Registry 映射必须处于已发布状态。"),
    validation("DPP_PUBLISHED", ["published", "updated", "expired"].includes(String(source.productStatus || "").toLowerCase()), "ERROR", "product_status", null, "The DPP must be published before a Registry mapping is prepared.", "生成 Registry 映射前，DPP 必须已发布。"),
    validation("PASSPORT_ID_PRESENT", Boolean(source.passportId?.trim()), "ERROR", "passport_id", "/registrationRequests/0/uniqueIdentifiers/passportId", "A DPP passport identifier is required.", "必须填写 DPP 护照标识。"),
    validation("UPI_HTTPS_FORMAT", isHttpsUrl(source.upi) && (source.upi?.length || 0) <= 50, "ERROR", "upi", "/registrationRequests/0/uniqueIdentifiers/upi", "The current TEST guide expects an HTTPS UPI of no more than 50 characters.", "当前测试指南要求 UPI 使用 HTTPS 地址且不超过 50 个字符。"),
    validation("DPP_URI_HTTPS_FORMAT", isHttpsUrl(source.dppUri), "ERROR", "registry_uri", "/registrationRequests/0/dpp/uri", "The public DPP URI must use HTTPS.", "公开 DPP 地址必须使用 HTTPS。"),
    validation("DPP_VERSION_PRESENT", Boolean(source.dppVersion?.trim()), "ERROR", "dpp_version", "/registrationRequests/0/dpp/version", "A published DPP version is required.", "必须存在已发布的 DPP 版本。"),
    validation("DPP_VERSION_HASH", /^[a-f0-9]{64}$/i.test(source.dppVersionHash || ""), "ERROR", "dpp_version_hash", "/registrationRequests/0/dpp/versionHash", "The published DPP version must have a SHA-256 hash.", "已发布的 DPP 版本必须包含 SHA-256 哈希。"),
    validation("MODEL_IDENTIFIER_RELATION", source.granularity === "ITEM" || Boolean(source.modelIdentifier?.trim()), "ERROR", "model_identifier", "/registrationRequests/0/uniqueIdentifiers/modelIdentifier", "Model and batch registrations require a model identifier.", "型号级和批次级注册必须填写型号标识。"),
    validation("BATCH_IDENTIFIER_RELATION", source.granularity !== "BATCH" || Boolean(source.batchIdentifier?.trim()), "ERROR", "batch_identifier", "/registrationRequests/0/uniqueIdentifiers/batchIdentifier", "Batch registration requires a batch identifier.", "批次级注册必须填写批次标识。"),
    validation("ITEM_IDENTIFIER_RELATION", source.granularity !== "ITEM" || Boolean(source.itemIdentifier?.trim()), "ERROR", "item_identifier", "/registrationRequests/0/uniqueIdentifiers/itemIdentifier", "Item registration requires an item or serial identifier.", "单体级注册必须填写单体或序列标识。"),
    validation("COMMODITY_CODE_PRESENT", Boolean(source.commodityCode?.trim()), "WARNING", "commodity_code", "/registrationRequests/0/commodityCode", "A commodity code is needed when the product enters a customs procedure for release for free circulation.", "产品进入自由流通海关程序时需要商品编码。"),
    validation("BACKUP_REFERENCE_PRESENT", Boolean(source.backupReference?.trim()), "WARNING", "backup_reference", "/registrationRequests/0/dpp/backupReference", "No independent DPP service-provider backup reference is recorded.", "尚未记录独立的 DPP 服务提供商备份引用。"),
    validation("ORGANISATION_ENROLMENT_VERIFIED", source.enrolmentVerified, "WARNING", "enrolment", null, "The organisation is not verified for this Registry environment.", "当前组织尚未在该 Registry 环境完成验证。"),
    validation("SIGNED_DECLARATION_PRESENT", source.declarationPresent, "WARNING", "declaration", null, "No signed or sealed organisation declaration is recorded.", "尚未记录完成签名或盖章的组织声明。"),
    validation("BATTERY_SEMANTIC_CATALOGUE_AVAILABLE", Boolean(source.registrySchemaVersion), "BLOCKER", "registry_schema_version", "/metadata/registrySchemaVersion", "The official battery semantic catalogue is not available; a battery registration cannot be reported as successful.", "官方电池语义目录尚未开放，不能将电池注册标记为成功。", "BATTERY_SEMANTIC_CATALOGUE_UNAVAILABLE"),
  ];
  return results;
}

export function buildBatteryRegistryArtifact(source: BatteryRegistrySource): BatteryRegistryArtifact {
  return {
    metadata: {
      artifactType: "GREANLEAN_DPP_REGISTRY_TEST_MAPPING",
      environment: source.environment,
      mappingVersion: source.mappingVersion,
      operationalRuleVersion: source.operationalRuleVersion,
      registrySchemaVersion: source.registrySchemaVersion,
      generatedAt: source.generatedAt || new Date().toISOString(),
      officialBatterySemanticCatalogueAvailable: false,
      registrationCapable: false,
    },
    registrationRequests: [{
      productGroup: "battery",
      granularity: source.granularity,
      uniqueIdentifiers: {
        passportId: source.passportId,
        upi: source.upi,
        modelIdentifier: source.modelIdentifier,
        batchIdentifier: source.batchIdentifier,
        itemIdentifier: source.itemIdentifier,
      },
      commodityCode: source.commodityCode,
      dpp: {
        uri: source.dppUri,
        backupReference: source.backupReference,
        version: source.dppVersion,
        versionHash: source.dppVersionHash,
      },
    }],
  };
}

export function registryPayloadHash(payload: unknown) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function isReadyForManualTest(results: RegistryValidationResult[]) {
  return !results.some((result) => !result.passed && result.severity === "ERROR");
}

const secretPattern = /(bearer\s+|api[_-]?key["'=:\s]+|token["'=:\s]+|secret["'=:\s]+)[^\s,;"}]+/gi;

export function parseRegistryError(input: unknown) {
  const object = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const rawMessage = String(object.message || object.error_description || object.error || input || "Registry rejected the submitted file.");
  const redactedMessage = rawMessage.replace(secretPattern, "$1[REDACTED]").slice(0, 2000);
  const errorCode = String(object.code || object.error_code || "REGISTRY_TEST_ERROR").slice(0, 120);
  const status = Number(object.status || object.http_status);
  const httpStatus = Number.isInteger(status) && status >= 100 && status <= 599 ? status : null;
  return {
    errorCategory: httpStatus && httpStatus >= 500 ? "REGISTRY_SERVICE" : "REGISTRY_VALIDATION",
    retryable: Boolean(object.retryable) || Boolean(httpStatus && (httpStatus === 429 || httpStatus >= 500)),
    httpStatus,
    errorCode,
    redactedMessage,
    correlationId: object.correlation_id ? String(object.correlation_id).slice(0, 200) : null,
    rawExcerpt: { code: errorCode, status: httpStatus, message: redactedMessage.slice(0, 500) },
  };
}
