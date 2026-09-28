export type BackofficeLocale = "en" | "zh";

export type BackofficeSection =
  | "dashboard"
  | "tenants"
  | "organisations"
  | "families"
  | "models"
  | "skus"
  | "batches"
  | "items"
  | "sources"
  | "imports"
  | "mappings"
  | "claims"
  | "validation"
  | "candidates"
  | "reviews"
  | "publications"
  | "passports"
  | "identifiers"
  | "documents"
  | "lifecycle"
  | "bms"
  | "audiences"
  | "integrations"
  | "registry"
  | "audit"
  | "settings";

export type BackofficeRow = Record<string, unknown>;

export type BackofficeContext = {
  tenantId: string;
  tenantCode: string;
  tenantName: string;
  tenantStatus: string;
  authorityType: "TENANT" | "PARTNER";
  authorityId: string;
  roleCode: string;
  roleName: string;
  capabilities: string[];
};

export type BackofficeSnapshot = {
  generatedAt: string;
  tenant: BackofficeRow;
  organisations: BackofficeRow[];
  memberships: BackofficeRow[];
  partnerAuthorizations: BackofficeRow[];
  families: BackofficeRow[];
  models: BackofficeRow[];
  skus: BackofficeRow[];
  batches: BackofficeRow[];
  batchSkuLinks: BackofficeRow[];
  items: BackofficeRow[];
  identifiers: BackofficeRow[];
  dataSources: BackofficeRow[];
  sourceRecords: BackofficeRow[];
  mappingProfiles: BackofficeRow[];
  mappingVersions: BackofficeRow[];
  mappingRules: BackofficeRow[];
  transformations: BackofficeRow[];
  provenance: BackofficeRow[];
  claims: BackofficeRow[];
  fields: BackofficeRow[];
  validationRules: BackofficeRow[];
  accessPolicies: BackofficeRow[];
  passports: BackofficeRow[];
  reviews: BackofficeRow[];
  versions: BackofficeRow[];
  currentPointers: BackofficeRow[];
  resolverMappings: BackofficeRow[];
  publicationAudit: BackofficeRow[];
  connectors: BackofficeRow[];
  connectorDefinitions: BackofficeRow[];
  connectorJobs: BackofficeRow[];
  connectorAttempts: BackofficeRow[];
  connectorReceipts: BackofficeRow[];
  deadLetters: BackofficeRow[];
  importSessions: BackofficeRow[];
  registrySubmissions: BackofficeRow[];
  bmsSnapshots: BackofficeRow[];
  connectorAudit: BackofficeRow[];
  policyAudit: BackofficeRow[];
};

export type NavigationItem = {
  section: BackofficeSection;
  label: { en: string; zh: string };
  group: "operate" | "data" | "publish" | "govern";
};

export const backofficeNavigation: NavigationItem[] = [
  { section: "dashboard", label: { en: "Operations overview", zh: "运营总览" }, group: "operate" },
  { section: "tenants", label: { en: "Tenants & access", zh: "租户与权限" }, group: "operate" },
  { section: "organisations", label: { en: "Organisations", zh: "组织" }, group: "operate" },
  { section: "families", label: { en: "Product families", zh: "产品族" }, group: "operate" },
  { section: "models", label: { en: "Product models", zh: "产品型号" }, group: "operate" },
  { section: "skus", label: { en: "SKUs", zh: "SKU" }, group: "operate" },
  { section: "batches", label: { en: "Batches", zh: "批次" }, group: "operate" },
  { section: "items", label: { en: "Individual items", zh: "单件产品" }, group: "operate" },
  { section: "sources", label: { en: "Data sources", zh: "数据源" }, group: "data" },
  { section: "imports", label: { en: "Import workspace", zh: "导入工作台" }, group: "data" },
  { section: "mappings", label: { en: "Field mapping", zh: "字段映射" }, group: "data" },
  { section: "claims", label: { en: "Canonical claims", zh: "规范化声明" }, group: "data" },
  { section: "validation", label: { en: "Data quality", zh: "数据质量" }, group: "data" },
  { section: "candidates", label: { en: "Candidates", zh: "候选版本" }, group: "publish" },
  { section: "reviews", label: { en: "Review & approval", zh: "审核与批准" }, group: "publish" },
  { section: "publications", label: { en: "Publication", zh: "发布" }, group: "publish" },
  { section: "passports", label: { en: "Passports & versions", zh: "护照与版本" }, group: "publish" },
  { section: "identifiers", label: { en: "Identifiers & resolver", zh: "标识符与解析器" }, group: "publish" },
  { section: "documents", label: { en: "Documents", zh: "文档" }, group: "publish" },
  { section: "lifecycle", label: { en: "Lifecycle", zh: "生命周期" }, group: "publish" },
  { section: "bms", label: { en: "BMS & dynamic data", zh: "BMS 与动态数据" }, group: "govern" },
  { section: "audiences", label: { en: "Audience policy", zh: "受众策略" }, group: "govern" },
  { section: "integrations", label: { en: "Integrations", zh: "集成" }, group: "govern" },
  { section: "registry", label: { en: "Registry", zh: "注册库" }, group: "govern" },
  { section: "audit", label: { en: "Audit activity", zh: "审计活动" }, group: "govern" },
  { section: "settings", label: { en: "Settings", zh: "设置" }, group: "govern" },
];

export const backofficeCopy = {
  en: {
    productName: "V2 Operations Console",
    synthetic: "Synthetic PreProd",
    verifiedBoundary: "Customer verification pending",
    search: "Search this workspace",
    refresh: "Refresh data",
    noData: "No records in this Tenant",
    loading: "Loading authorised Tenant data…",
    accessDenied: "No V2 Tenant authority is available for this account.",
    operational: "Operational",
    needsAttention: "Needs attention",
    notSubmitted: "Not submitted",
    metadataOnly: "Metadata only",
    details: "Technical details",
    open: "Open",
    create: "Create",
    status: "Status",
    updated: "Last updated",
  },
  zh: {
    productName: "V2 运营控制台",
    synthetic: "PreProd 合成数据",
    verifiedBoundary: "客户核验待完成",
    search: "搜索当前工作区",
    refresh: "刷新数据",
    noData: "此租户暂无记录",
    loading: "正在加载已授权租户数据…",
    accessDenied: "此账户没有可用的 V2 租户授权。",
    operational: "运行正常",
    needsAttention: "需要处理",
    notSubmitted: "未提交",
    metadataOnly: "仅元数据",
    details: "技术详情",
    open: "打开",
    create: "创建",
    status: "状态",
    updated: "最近更新",
  },
} as const;

function text(row: BackofficeRow, key: string) {
  const value = row[key];
  return typeof value === "string" ? value : "";
}

export function dashboardMetrics(snapshot: BackofficeSnapshot) {
  const published = snapshot.versions.filter((row) => text(row, "publication_state") === "PUBLISHED").length;
  const reviewCounts = snapshot.reviews.reduce<Record<string, number>>((counts, row) => {
    const status = text(row, "status") || "UNKNOWN";
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});
  const validationIssues = snapshot.reviews.reduce((total, row) => {
    const summary = row.validation_summary;
    if (!summary || typeof summary !== "object" || Array.isArray(summary)) return total;
    const record = summary as Record<string, unknown>;
    const errors = Number(record.errorCount || record.errors || 0);
    const blockers = Number(record.blockerCount || record.blockers || 0);
    return total + (Number.isFinite(errors) ? errors : 0) + (Number.isFinite(blockers) ? blockers : 0);
  }, 0);
  return {
    tenants: snapshot.tenant.id ? 1 : 0,
    models: snapshot.models.length,
    skus: snapshot.skus.length,
    batches: snapshot.batches.length,
    items: snapshot.items.length,
    passports: snapshot.passports.length,
    published,
    draft: snapshot.passports.filter((row) => text(row, "status") === "DRAFT").length,
    review: reviewCounts.IN_REVIEW || 0,
    rejected: (reviewCounts.REJECTED || 0) + (reviewCounts.CHANGES_REQUESTED || 0),
    validationIssues,
    connectors: snapshot.connectors.length,
    registrySubmitted: snapshot.registrySubmissions.length,
  };
}

export function modelRelationships(snapshot: BackofficeSnapshot, modelId: string) {
  return {
    skus: snapshot.skus.filter((row) => row.model_id === modelId),
    batches: snapshot.batches.filter((row) => row.model_id === modelId),
    items: snapshot.items.filter((row) => row.model_id === modelId),
  };
}

export function readinessForPassport(snapshot: BackofficeSnapshot, passport: BackofficeRow) {
  const passportId = String(passport.id || "");
  const review = snapshot.reviews.find((row) => row.passport_id === passportId);
  const version = snapshot.versions.find((row) => row.passport_id === passportId);
  if (version?.publication_state === "WITHDRAWN") return "WITHDRAWN";
  if (version?.publication_state === "PUBLISHED") return "PUBLISHED";
  if (!review) return "NEEDS_DATA";
  if (review.status === "IN_REVIEW") return "READY_FOR_REVIEW";
  if (review.status === "APPROVED") return "READY_TO_PUBLISH";
  if (review.status === "REJECTED" || review.status === "CHANGES_REQUESTED") return "BLOCKED";
  return "NEEDS_APPROVAL";
}

export function mappingStatus(rule: BackofficeRow | undefined) {
  if (!rule) return "UNMAPPED";
  const status = text(rule, "status").toUpperCase();
  if (["MAPPED", "UNMAPPED", "REVIEW_REQUIRED", "INVALID"].includes(status)) return status;
  if (status === "ACTIVE" || status === "COMMITTED") return "MAPPED";
  if (status === "DRAFT") return "REVIEW_REQUIRED";
  return "UNMAPPED";
}

export function isBackofficeSection(value: string): value is BackofficeSection {
  return backofficeNavigation.some((item) => item.section === value);
}
