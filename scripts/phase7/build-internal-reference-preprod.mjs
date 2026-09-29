import { createHash, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const envFile = process.env.DPP_PREPROD_ENV_FILE || ".env.preproduction.local";
const fixturePath = process.env.REFERENCE_FIXTURE_PATH
  || fileURLToPath(new URL("../../fixtures/internal-reference/GreanLean_Reference_Ebike_Catalog_From_EN50604.json", import.meta.url));
const expectedRef = "efhiaufukjchxqhbmpvq";
const protectedRefs = new Set(["lpxdbysgmdsjhxrjzhly", "qlrbrwrpvtnlphajvqao"]);
const siteUrl = "https://greanlean-dpp-preprod.vercel.app";
const tenantCode = "greanlean-reference-mobility";
const actorEmails = {
  author: "reference-author@preprod.greanlean.invalid",
  reviewer: "reference-reviewer@preprod.greanlean.invalid",
  publisher: "reference-publisher@preprod.greanlean.invalid",
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parseEnv(source) {
  return Object.fromEntries(source.split(/\r?\n/u).flatMap((raw) => {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) return [];
    const at = line.indexOf("=");
    let value = line.slice(at + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    return [[line.slice(0, at).trim(), value]];
  }));
}

function hash(value) {
  return createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
}

function validateFixture(fixture) {
  assert(fixture.fixture_classification === "INTERNAL_SYNTHETIC_REFERENCE", "Fixture classification is not INTERNAL_SYNTHETIC_REFERENCE.");
  assert(fixture.customer_verified === false, "Fixture must not be customer verified.");
  assert(fixture.registry_submission_allowed === false && fixture.regulatory_submission_allowed === false, "Fixture must forbid registry/regulatory submission.");
  assert(fixture.source_file === "EN-50604(3).xlsx", "Unexpected source filename.");
  assert(fixture.virtual_tenant?.name === "GreanLean Reference Mobility", "Unexpected Tenant name.");
  assert(fixture.virtual_tenant?.brand === "GreanLean Reference", "Unexpected public brand.");
  assert(fixture.models?.length === 8, "Expected 8 Models.");
  const variants = fixture.models.flatMap((model) => model.variants.map((variant) => ({ model, variant })));
  assert(variants.length === 22, "Expected 22 SKU variants.");
  const expectedCodes = ["GLR-P25A", "GLR-P25B", "GLR-E36A", "GLR-E36B", "GLR-P36A", "GLR-Y36A", "GLR-S24B", "GLR-S36B"];
  assert(JSON.stringify(fixture.models.map((model) => model.synthetic_model_code)) === JSON.stringify(expectedCodes), "Model code set/order does not match the approved fixture.");
  for (const { model, variant } of variants) {
    const match = /^(\d+)S(\d+)P$/u.exec(model.configuration);
    assert(match, `Invalid configuration for ${model.synthetic_model_code}.`);
    const series = Number(match[1]);
    const parallel = Number(match[2]);
    assert(model.series_count === series && model.parallel_count === parallel && model.cell_count === series * parallel, `Derived cell configuration mismatch for ${model.synthetic_model_code}.`);
    assert(Math.abs(variant.rated_energy_wh_derived - model.voltage_v * variant.capacity_ah) < 0.001, `Rated energy mismatch for ${variant.synthetic_sku}.`);
    assert(variant.synthetic_sku.startsWith(`${model.synthetic_model_code}-`), `SKU does not belong to Model: ${variant.synthetic_sku}.`);
    assert(variant.synthetic_batch === `DEMO-2026-${model.synthetic_model_code}`, `Batch mismatch for ${variant.synthetic_sku}.`);
    assert(!("gtin" in variant) && !("registry_id" in variant), `Forbidden identifier in ${variant.synthetic_sku}.`);
    assert(Object.values(variant.source_provenance).every((value) => ["SOURCE_SPREADSHEET", "DERIVED_ARITHMETIC"].includes(value)), `Invalid provenance bucket in ${variant.synthetic_sku}.`);
  }
  for (const key of ["synthetic_sku", "synthetic_serial", "synthetic_dpp_id"]) {
    assert(new Set(variants.map(({ variant }) => variant[key])).size === 22, `Duplicate ${key}.`);
  }
  assert(new Set(fixture.models.map((model) => model.variants[0].synthetic_batch)).size === 8, "Expected 8 Model-owned batches.");
  return variants;
}

const env = parseEnv(await readFile(envFile, "utf8"));
const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
const variants = validateFixture(fixture);
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const projectRef = new URL(supabaseUrl).hostname.replace(/\.supabase\.co$/u, "");
assert(env.DPP_ENVIRONMENT === "preproduction", "REFUSED: environment is not PreProd.");
assert(projectRef === expectedRef && env.PREPROD_SUPABASE_PROJECT_REF === expectedRef, "REFUSED: unexpected PreProd project.");
assert(!protectedRefs.has(projectRef), "REFUSED: protected Production/Development project detected.");
assert(anonKey && serviceKey, "PreProd credentials are incomplete.");

if (process.argv.includes("--validate-only")) {
  console.log(JSON.stringify({ status: "PASS", fixtureHash: hash(await readFile(fixturePath, "utf8")), models: 8, skus: 22, batches: 8, individuals: 22, passports: 22 }, null, 2));
  process.exit(0);
}

const serviceHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
const anonHeaders = { apikey: anonKey };

async function request(url, { method = "GET", headers = {}, body, expected = [200] } = {}) {
  let response;
  let lastError;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      response = await fetch(url, {
        method,
        headers: { ...headers, ...(body === undefined ? {} : { "content-type": "application/json" }) },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(90_000),
      });
      break;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  if (!response) throw lastError;
  const text = await response.text();
  let json = null;
  if (text) try { json = JSON.parse(text); } catch {}
  if (!expected.includes(response.status)) {
    const safe = json ? { code: json.error?.code || json.code, message: json.error?.message || json.message } : text.slice(0, 400);
    throw new Error(`${method} ${new URL(url).pathname} returned ${response.status}: ${JSON.stringify(safe)}`);
  }
  return { status: response.status, json, text, headers: response.headers };
}

function query(params) {
  const result = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) if (value !== undefined && value !== null) result.set(key, String(value));
  return result.toString();
}

async function rest(table, { method = "GET", params, body, headers = serviceHeaders, expected = [200], prefer } = {}) {
  const suffix = params ? `?${query(params)}` : "";
  return request(`${supabaseUrl}/rest/v1/${table}${suffix}`, {
    method,
    headers: { ...headers, ...(prefer ? { Prefer: prefer } : {}) },
    body,
    expected,
  });
}

async function first(table, params) {
  return (await rest(table, { params: { ...params, limit: 1 } })).json?.[0] || null;
}

async function insert(table, body) {
  return (await rest(table, { method: "POST", body, prefer: "return=representation", expected: [200, 201] })).json?.[0];
}

async function upsert(table, body, onConflict = "id") {
  return (await rest(table, {
    method: "POST",
    params: { on_conflict: onConflict },
    body,
    prefer: "resolution=merge-duplicates,return=representation",
    expected: [200, 201],
  })).json;
}

async function patch(table, params, body) {
  return (await rest(table, { method: "PATCH", params, body, prefer: "return=representation" })).json;
}

async function api(path, token, tenantId, { method = "GET", body, key, expected = [200] } = {}) {
  return request(`${siteUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "x-tenant-id": tenantId,
      "x-correlation-id": `reference-${hash(`${path}:${key || "read"}`).slice(0, 20)}`,
      ...(key ? { "Idempotency-Key": key } : {}),
    },
    body,
    expected,
  });
}

const ledger = (await rest("greanlean_migration_ledger", { params: { select: "migration_number", order: "migration_number.desc", limit: 1 } })).json;
assert(ledger?.[0]?.migration_number === "0035", "Hosted PreProd migration head is not 0035.");

const fixtureHash = hash(await readFile(fixturePath, "utf8"));
let tenant = await first("tenant", { select: "*", code: `eq.${tenantCode}` });
if (!tenant) {
  tenant = await insert("tenant", {
    code: tenantCode,
    name: fixture.virtual_tenant.name,
    status: "ACTIVE",
    residency_policy: {
      classification: fixture.fixture_classification,
      virtualTenantClassification: fixture.virtual_tenant.classification,
      customerVerified: false,
      defaultDemo: true,
      sourceFixtureSha256: fixtureHash,
    },
  });
} else {
  [tenant] = await patch("tenant", { id: `eq.${tenant.id}` }, {
    name: fixture.virtual_tenant.name,
    status: "ACTIVE",
    residency_policy: { ...(tenant.residency_policy || {}), classification: fixture.fixture_classification, customerVerified: false, defaultDemo: true, sourceFixtureSha256: fixtureHash },
  });
}

const soodoo = await first("tenant", { select: "*", code: "eq.soodoo-e-bike" });
if (soodoo) {
  await patch("tenant", { id: `eq.${soodoo.id}` }, {
    residency_policy: { ...(soodoo.residency_policy || {}), defaultDemo: false, demoStatus: "DEPRECATED_FOR_DEFAULT_DEMO", retainedForRegression: true },
  });
}

let organisation = await first("organisation_v2", { select: "*", tenant_id: `eq.${tenant.id}`, legal_name: `eq.${fixture.virtual_tenant.organisation_name}` });
if (!organisation) {
  organisation = await insert("organisation_v2", {
    tenant_id: tenant.id,
    organisation_type: "MANUFACTURER",
    legal_name: fixture.virtual_tenant.organisation_name,
    trading_name: fixture.virtual_tenant.brand,
    country: "GB",
    address: { classification: "SYNTHETIC_DEMO", customer_verified: false },
    status: "ACTIVE",
  });
}

const password = `Reference-${randomBytes(24).toString("base64url")}!`;
const userPage = await request(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1000`, { headers: serviceHeaders });
const existingUsers = userPage.json?.users || [];
const actors = {};
const tokens = {};
for (const [label, email] of Object.entries(actorEmails)) {
  const existing = existingUsers.find((user) => user.email === email);
  const body = { email, password, email_confirm: true, user_metadata: { synthetic: true, fixture: "greanlean-reference-mobility", role: label } };
  const response = existing
    ? await request(`${supabaseUrl}/auth/v1/admin/users/${existing.id}`, { method: "PUT", headers: serviceHeaders, body })
    : await request(`${supabaseUrl}/auth/v1/admin/users`, { method: "POST", headers: serviceHeaders, body, expected: [200, 201] });
  actors[label] = response.json?.id || existing?.id;
  const signIn = await request(`${supabaseUrl}/auth/v1/token?grant_type=password`, { method: "POST", headers: anonHeaders, body: { email, password } });
  tokens[label] = signIn.json?.access_token;
  assert(actors[label] && tokens[label], `Synthetic ${label} identity unavailable.`);
}

const roles = (await rest("role", { params: { select: "id,code", tenant_id: `eq.${tenant.id}` } })).json;
for (const [label, code] of Object.entries({ author: "dpp_manager", reviewer: "reviewer", publisher: "publisher" })) {
  const role = roles.find((row) => row.code === code);
  assert(role, `Tenant role ${code} is missing.`);
  await upsert("tenant_membership", { tenant_id: tenant.id, user_id: actors[label], role_id: role.id, status: "ACTIVE" }, "tenant_id,user_id");
}

if (process.argv.includes("--acceptance-only")) {
  const context = (await api("/api/v2/backoffice/context", tokens.author, tenant.id)).json?.data || [];
  const selected = context.find((row) => row.tenantId === tenant.id);
  assert(selected?.tenantName === fixture.virtual_tenant.name && selected.authorityType === "TENANT", "Backoffice did not expose the reference Tenant context.");
  const snapshot = (await api("/api/v2/backoffice/snapshot", tokens.author, tenant.id)).json?.data;
  assert(snapshot?.tenant?.id === tenant.id, "Backoffice snapshot selected the wrong Tenant.");
  const expected = { families: 1, models: 8, skus: 22, batches: 8, batchSkuLinks: 22, items: 22, dataSources: 1, sourceRecords: 22, transformations: 22, claims: 374, passports: 22, reviews: 22, versions: 22, currentPointers: 22, resolverMappings: 22, bmsSnapshots: 22 };
  const backofficeCounts = Object.fromEntries(Object.entries(expected).map(([key]) => [key, snapshot[key]?.length ?? -1]));
  for (const [key, value] of Object.entries(expected)) assert(backofficeCounts[key] === value, `Backoffice ${key}: expected ${value}, got ${backofficeCounts[key]}.`);
  assert(snapshot.registrySubmissions.length === 0, "Reference Tenant unexpectedly contains a Registry submission.");
  const html = await request(`${siteUrl}/p/DPP-GLR-EBIKE-000001`);
  for (const text of ["GreanLean Reference", "SYNTHETIC DEMO DATA", "NOT CUSTOMER VERIFIED", "NOT FOR REGULATORY DECLARATION", "DPP-GLR-EBIKE-000001"]) assert(html.text.includes(text), `Productized UI HTML is missing: ${text}.`);
  assert(!html.text.includes("TL-EB-"), "Productized UI leaked a source model code.");
  const qr = await request(`${siteUrl}/api/v2/resolver/DPP-GLR-EBIKE-000001?format=qr`);
  assert(qr.headers.get("content-type") === "image/png" && qr.text.length > 100, "QR format did not return a PNG payload.");
  console.log(JSON.stringify({ status: "PASS", tenantId: tenant.id, tenantName: tenant.name, backofficeCounts, registrySubmissions: 0, productizedUi: "PASS", qr: "PASS", productionWritePerformed: false }, null, 2));
  process.exit(0);
}

let family = await first("product_family", { select: "*", tenant_id: `eq.${tenant.id}`, code: `eq.${fixture.family.code.toLowerCase()}` });
if (!family) family = await insert("product_family", { tenant_id: tenant.id, code: fixture.family.code.toLowerCase(), name: fixture.family.name, description: "Internal synthetic reference family; not customer or regulatory evidence.", status: "ACTIVE", created_by: actors.author });

const models = new Map();
const skus = new Map();
const batches = new Map();
const items = new Map();
for (const modelFixture of fixture.models) {
  let model = await first("product_model", { select: "*", tenant_id: `eq.${tenant.id}`, model_code: `eq.${modelFixture.synthetic_model_code}` });
  if (!model) model = await insert("product_model", { tenant_id: tenant.id, family_id: family.id, manufacturer_organisation_id: organisation.id, model_code: modelFixture.synthetic_model_code, name: `${fixture.virtual_tenant.brand} ${modelFixture.synthetic_model_code}`, description: "Internal synthetic e-bike battery reference model.", product_category: "E-BIKE_BATTERY_PACK", sector: "BATTERY", status: "ACTIVE", created_by: actors.author });
  models.set(modelFixture.synthetic_model_code, model);
  let batch = await first("product_batch", { select: "*", tenant_id: `eq.${tenant.id}`, model_id: `eq.${model.id}`, batch_number: `eq.${modelFixture.variants[0].synthetic_batch}` });
  if (!batch) batch = await insert("product_batch", { tenant_id: tenant.id, model_id: model.id, batch_number: modelFixture.variants[0].synthetic_batch, manufacturing_organisation_id: organisation.id, production_date: "2026-01-15", status: "ACTIVE", created_by: actors.author });
  batches.set(modelFixture.synthetic_model_code, batch);
  for (const variant of modelFixture.variants) {
    let sku = await first("sku", { select: "*", tenant_id: `eq.${tenant.id}`, sku_code: `eq.${variant.synthetic_sku}` });
    if (!sku) sku = await insert("sku", { tenant_id: tenant.id, model_id: model.id, sku_code: variant.synthetic_sku, name: `${modelFixture.synthetic_model_code} ${variant.capacity_ah} Ah`, market: "INTERNAL_REFERENCE", configuration_json: { classification: "SYNTHETIC_DEMO", capacity_ah: variant.capacity_ah, cell_capacity_mah: variant.cell_capacity_mah }, status: "ACTIVE", created_by: actors.author });
    skus.set(variant.synthetic_sku, sku);
    const existingLink = await first("batch_sku_link", { select: "*", tenant_id: `eq.${tenant.id}`, batch_id: `eq.${batch.id}`, sku_id: `eq.${sku.id}` });
    if (!existingLink) await insert("batch_sku_link", { tenant_id: tenant.id, model_id: model.id, batch_id: batch.id, sku_id: sku.id, status: "ACTIVE", created_by: actors.author });
    let item = await first("product_item", { select: "*", tenant_id: `eq.${tenant.id}`, serial_number: `eq.${variant.synthetic_serial}` });
    if (!item) item = await insert("product_item", { tenant_id: tenant.id, model_id: model.id, sku_id: sku.id, batch_id: batch.id, serial_number: variant.synthetic_serial, enforce_batch_sku_link: true, status: "ACTIVE", created_by: actors.author });
    items.set(variant.synthetic_sku, item);
  }
}

const identifierSpecs = [];
for (const modelFixture of fixture.models) {
  const model = models.get(modelFixture.synthetic_model_code);
  const batch = batches.get(modelFixture.synthetic_model_code);
  identifierSpecs.push(["MODEL", model.id, "MODEL_CODE", modelFixture.synthetic_model_code, "GREANLEAN_REFERENCE_MODEL"]);
  identifierSpecs.push(["BATCH", batch.id, "BATCH_NUMBER", modelFixture.variants[0].synthetic_batch, "GREANLEAN_REFERENCE_BATCH"]);
  for (const variant of modelFixture.variants) {
    identifierSpecs.push(["SKU", skus.get(variant.synthetic_sku).id, "SKU", variant.synthetic_sku, "GREANLEAN_REFERENCE_SKU"]);
    identifierSpecs.push(["ITEM", items.get(variant.synthetic_sku).id, "SERIAL_NUMBER", variant.synthetic_serial, "GREANLEAN_REFERENCE_SERIAL"]);
  }
}
for (const [subjectType, subjectId, identifierType, value, scheme] of identifierSpecs) {
  const existing = await first("product_subject_identifier", { select: "id", tenant_id: `eq.${tenant.id}`, subject_type: `eq.${subjectType}`, subject_id: `eq.${subjectId}`, identifier_type: `eq.${identifierType}`, status: "eq.ACTIVE" });
  if (!existing) await insert("product_subject_identifier", { tenant_id: tenant.id, subject_type: subjectType, subject_id: subjectId, identifier_type: identifierType, value, normalized_value: value, issuer: "GreanLean Reference", scheme, is_primary: true, status: "ACTIVE", created_by: actors.author });
}

const schemaCode = "greanlean.reference.ebike-battery";
let schema = await first("schema_definition", { select: "*", code: `eq.${schemaCode}` });
if (!schema) schema = await insert("schema_definition", { code: schemaCode, sector_code: "battery", source_name: "GreanLean Internal Reference", name_en: "GreanLean Reference E-bike Battery", name_zh: "GreanLean 电动自行车电池参考模式", description_en: "Internal synthetic reference schema; not customer or regulatory evidence.", description_zh: "内部合成参考模式；非客户或监管证据。", status: "draft", owner_type: "TENANT_EXTENSION", tenant_id: tenant.id, created_by: actors.author });

let schemaVersion = await first("schema_version", { select: "*", schema_definition_id: `eq.${schema.id}`, version: "eq.1.0.0" });
if (!schemaVersion) schemaVersion = await insert("schema_version", { schema_definition_id: schema.id, version: "1.0.0", source_version: `fixture:${fixtureHash.slice(0, 16)}`, json_schema: { type: "object", title: "GreanLean Internal Synthetic Reference DPP" }, status: "draft", created_by: actors.author });

const fieldSpecs = [
  ["demo.warning", "Demo classification", "演示数据分类", "object", "PUBLIC", true],
  ["identity.product", "Product information", "产品信息", "object", "PUBLIC", true],
  ["identity.item", "Item identity", "产品实例标识", "object", "PUBLIC", true],
  ["technical.specification", "Technical specifications", "技术规格", "object", "PUBLIC", true],
  ["performance.durability", "Performance and durability", "性能与耐久性", "object", "PUBLIC", false],
  ["sustainability.carbon-footprint", "Carbon footprint demo", "碳足迹演示", "object", "PUBLIC", false],
  ["sustainability.recycled-content", "Recycled content demo", "再生成分演示", "object", "PUBLIC", false],
  ["sustainability.materials", "Materials demo", "材料演示", "object", "PUBLIC", false],
  ["compliance.synthetic", "Compliance metadata", "合规元数据", "object", "PUBLIC", false],
  ["repair.service", "Repair and service", "维修与服务", "object", "LEGITIMATE_INTEREST", false],
  ["repair.disassembly", "Disassembly", "拆解", "object", "LEGITIMATE_INTEREST", false],
  ["end-of-life", "End of life", "报废与循环利用", "object", "PUBLIC", false],
  ["warranty.demo", "Warranty demo", "质保演示", "object", "PUBLIC", false],
  ["lifecycle.events", "Lifecycle events", "生命周期事件", "array", "PUBLIC", false],
  ["provenance.synthetic", "Data provenance", "数据来源", "object", "PUBLIC", true],
  ["bms.snapshot", "Latest synthetic BMS snapshot", "最新合成 BMS 快照", "object", "LEGITIMATE_INTEREST", false],
  ["access.policy-demo", "Audience policy", "受众策略", "object", "INTERNAL", false],
];
const fields = new Map();
for (let index = 0; index < fieldSpecs.length; index += 1) {
  const [code, labelEn, labelZh, dataType, access, mandatory] = fieldSpecs[index];
  let field = await first("field_definition", { select: "*", schema_version_id: `eq.${schemaVersion.id}`, field_code: `eq.${code}` });
  if (!field) field = await insert("field_definition", { schema_version_id: schemaVersion.id, field_code: code, json_pointer: `/${code.replaceAll(".", "/")}`, label_en: labelEn, label_zh: labelZh, data_type: dataType, data_behavior: code === "bms.snapshot" ? "DYNAMIC" : "STATIC", data_granularity: "ITEM", access_level_code: access, requirement_status: mandatory ? "CONFIRMED_MANDATORY" : "VOLUNTARY", evidence_requirement: {}, sort_order: (index + 1) * 10, semantic_name: `https://schema.greanlean.example/reference/${code}`, semantic_uri: `https://schema.greanlean.example/reference/${code}`, cardinality: "SINGLE", subject_levels: ["ITEM"], verification_requirement: { verified: false, customer_confirmed: false, regulatory_evidence: false }, display_metadata: { order: index + 1, synthetic: true }, resolution_policy: "ITEM_PREFERRED" });
  fields.set(code, field);
}

let dataSource = await first("data_source", { select: "*", tenant_id: `eq.${tenant.id}`, name: "eq.EN-50604(3).xlsx" });
if (!dataSource) dataSource = await insert("data_source", { tenant_id: tenant.id, source_type: "EXCEL", name: "EN-50604(3).xlsx", provider_organisation_id: organisation.id, system_identifier: `sha256:${fixtureHash}`, trust_level: "UNVERIFIED", status: "ACTIVE", residency_classification: "INTERNAL_SYNTHETIC_REFERENCE", connector_reference: "deterministic-json-fixture", created_by: actors.author });

let profile = await first("mapping_profile", { select: "*", tenant_id: `eq.${tenant.id}`, name: "eq.EN-50604 semantic reference mapping" });
if (!profile) profile = await insert("mapping_profile", { tenant_id: tenant.id, data_source_id: dataSource.id, target_schema_definition_id: schema.id, name: "EN-50604 semantic reference mapping", status: "ACTIVE", created_by: actors.author });
let mapping = await first("mapping_version", { select: "*", tenant_id: `eq.${tenant.id}`, mapping_profile_id: `eq.${profile.id}`, version: "eq.1.0.0" });
if (!mapping) {
  const rulesForHash = fieldSpecs.map(([code]) => ({ source_pointer: `/${code}`, target: fields.get(code).id, transform_type: "IDENTITY" }));
  mapping = await insert("mapping_version", { tenant_id: tenant.id, mapping_profile_id: profile.id, version: "1.0.0", status: "DRAFT", content_hash: hash(rulesForHash), created_by: actors.author });
  for (let index = 0; index < fieldSpecs.length; index += 1) {
    const code = fieldSpecs[index][0];
    await insert("mapping_rule", { tenant_id: tenant.id, mapping_version_id: mapping.id, source_pointer: `/${code}`, target_field_definition_id: fields.get(code).id, transform_type: "IDENTITY", transform_config: {}, condition_config: {}, null_policy: "ERROR", lossiness: "LOSSLESS", sort_order: (index + 1) * 10 });
  }
  [mapping] = await patch("mapping_version", { id: `eq.${mapping.id}` }, { status: "ACTIVE", activated_at: new Date().toISOString() });
}

function sourcePayload(model, variant, ordinal) {
  const warning = { classification: "SYNTHETIC_DEMO", customer_verified: false, customer_confirmed: false, regulatory_evidence: false, notices: ["SYNTHETIC DEMO DATA", "NOT CUSTOMER VERIFIED", "NOT FOR REGULATORY DECLARATION"] };
  return {
    "demo.warning": warning,
    "identity.product": { brand: fixture.virtual_tenant.brand, productName: `${model.synthetic_model_code} E-bike Battery Pack`, modelCode: model.synthetic_model_code, sku: variant.synthetic_sku, manufacturer: fixture.virtual_tenant.organisation_name, classification: fixture.fixture_classification },
    "identity.item": { dpp_id: variant.synthetic_dpp_id, serial_number: variant.synthetic_serial, batch_number: variant.synthetic_batch, identifier_status: "SYNTHETIC_NOT_REGISTERED", gtin: "NOT_ASSIGNED", registry_id: "ABSENT" },
    "technical.specification": { product_category: "E-bike battery pack", model_code: model.synthetic_model_code, source_model_code_internal_only: "REDACTED_FROM_PUBLIC_SOURCE", nominal_voltage_v: model.voltage_v, rated_capacity_ah: variant.capacity_ah, rated_capacity_wh: variant.rated_energy_wh_derived, battery_type: model.battery_type, chemistry: "Lithium-ion", specific_chemistry: "UNKNOWN", cell_format: model.cell_format, configuration: model.configuration, series_count: model.series_count, parallel_count: model.parallel_count, cell_count: model.cell_count, cell_capacity_mah: variant.cell_capacity_mah },
    "performance.durability": { classification: "SYNTHETIC_DEMO", cycle_life_reference: 500 + ordinal * 5, verification_status: "UNVERIFIED", customer_confirmed: false },
    "sustainability.carbon-footprint": { classification: "SYNTHETIC_DEMO", value_kg_co2e: Number((variant.rated_energy_wh_derived * 0.075).toFixed(2)), method: "DETERMINISTIC_DEMO_FORMULA_NOT_LCA", verified: false, warning: "Not a real LCA claim" },
    "sustainability.recycled-content": { classification: "SYNTHETIC_DEMO", cobalt_pct: 0, lithium_pct: 0, nickel_pct: 0, lead_pct: 0, status: "UNVERIFIED_PLACEHOLDER", verified: false },
    "sustainability.materials": { classification: "SYNTHETIC_DEMO", chemistry: "Lithium-ion", specific_chemistry: "UNKNOWN", source: "NOT_CUSTOMER_PROVIDED" },
    "compliance.synthetic": { classification: "SYNTHETIC_DEMO", en_50604_1: "UNVERIFIED", ce: "UNVERIFIED", un_38_3: "UNVERIFIED", iec_62133_2: "UNVERIFIED", files: [], customer_confirmed: false, regulatory_evidence: false, note: "Catalog filename and specification rows are not conformity evidence." },
    "repair.service": { classification: "SYNTHETIC_DEMO", serviceability: "TRAINED_PERSONNEL_ONLY", electrical_isolation_required: true, verified: false },
    "repair.disassembly": { classification: "SYNTHETIC_DEMO", instructions: "Isolate, inspect and dismantle only in an authorised synthetic training workflow.", verified: false },
    "end-of-life": { classification: "SYNTHETIC_DEMO", collection: "Use an authorised battery collection route", landfill: "DO_NOT_DISPOSE_IN_HOUSEHOLD_WASTE", verified: false },
    "warranty.demo": { classification: "SYNTHETIC_DEMO", warranty_months: 24, customer_confirmed: false, binding_offer: false },
    "lifecycle.events": [
      { type: "MANUFACTURED", at: "2026-01-15T00:00:00.000Z", classification: "SYNTHETIC_DEMO" },
      { type: "QUALITY_CHECKED", at: "2026-01-16T00:00:00.000Z", classification: "SYNTHETIC_DEMO" },
      { type: "REFERENCE_DATA_PUBLISHED", at: "2026-09-28T00:00:00.000Z", classification: "SYNTHETIC_DEMO" },
    ],
    "provenance.synthetic": { classification: "INTERNAL_SYNTHETIC_REFERENCE", source_file: fixture.source_file, source_rows: model.source_rows, direct_fields: Object.entries(variant.source_provenance).filter(([, value]) => value === "SOURCE_SPREADSHEET").map(([key]) => key), derived_fields: Object.entries(variant.source_provenance).filter(([, value]) => value === "DERIVED_ARITHMETIC").map(([key]) => key), source_vendor_public: false, verified: false },
    "bms.snapshot": { classification: "SYNTHETIC_DEMO", captured_at: "2026-09-28T12:00:00.000Z", soc_pct: 70 + (ordinal % 21), soh_pct: 91 + (ordinal % 7), cycle_count: 40 + ordinal * 3, pack_voltage_v: Number((model.voltage_v * (0.96 + (ordinal % 5) * 0.01)).toFixed(2)), restricted: true, verified: false },
    "access.policy-demo": { public_excludes: ["source_vendor", "raw_source_record", "internal_provenance", "bms.snapshot"], audiences: ["PUBLIC", "REPAIRER", "RECYCLER", "MANUFACTURER", "AUTHORITY"], classification: "SYNTHETIC_DEMO" },
    internal_source: { source_model_code: model.source_model_code, source_rows: model.source_rows, source_vendor_identity: "RETAINED_IN_INTERNAL_SOURCE_ONLY" },
  };
}

const sourceRecords = new Map();
for (let ordinal = 0; ordinal < variants.length; ordinal += 1) {
  const { model, variant } = variants[ordinal];
  const payload = sourcePayload(model, variant, ordinal + 1);
  let record = await first("source_record", { select: "*", tenant_id: `eq.${tenant.id}`, data_source_id: `eq.${dataSource.id}`, external_record_id: `eq.${variant.synthetic_sku}` });
  if (!record) record = await insert("source_record", { tenant_id: tenant.id, data_source_id: dataSource.id, external_record_id: variant.synthetic_sku, subject_type: "ITEM", subject_id: items.get(variant.synthetic_sku).id, subject_hint: { modelCode: model.synthetic_model_code, sku: variant.synthetic_sku, sourceRows: model.source_rows }, payload_mode: "RAW_STORED", payload_json: payload, payload_hash: hash(payload), observed_at: "2026-09-28T00:00:00.000Z", classification: "INTERNAL", status: "RECEIVED", created_by: actors.author });
  sourceRecords.set(variant.synthetic_sku, record);
  const existingTransformation = await first("transformation_result", { select: "id", tenant_id: `eq.${tenant.id}`, source_record_id: `eq.${record.id}`, mapping_version_id: `eq.${mapping.id}`, status: "eq.SUCCESS" });
  if (!existingTransformation) {
    const dryRun = await api(`/api/v2/mapping-versions/${mapping.id}/dry-run`, tokens.author, tenant.id, { method: "POST", body: { source_record_id: record.id }, expected: [200] });
    assert(dryRun.json?.data?.errors?.length === 0, `Mapping dry-run failed for ${variant.synthetic_sku}.`);
    const commit = await api(`/api/v2/mapping-versions/${mapping.id}/commit`, tokens.author, tenant.id, { method: "POST", key: `glr-map-${ordinal + 1}`, body: { source_record_id: record.id, subject_type: "ITEM", subject_id: items.get(variant.synthetic_sku).id, schema_version_id: schemaVersion.id, accept_warnings: true }, expected: [201] });
    assert(commit.json?.data?.claims?.length === fieldSpecs.length, `Mapping commit claim count failed for ${variant.synthetic_sku}.`);
    await patch("source_record", { id: `eq.${record.id}` }, { status: "PROCESSED" });
  }
}

const passports = new Map();
for (let ordinal = 0; ordinal < variants.length; ordinal += 1) {
  const { variant } = variants[ordinal];
  let passport = await first("dpp_passport", { select: "*", tenant_id: `eq.${tenant.id}`, passport_identifier: `eq.${variant.synthetic_dpp_id}` });
  if (!passport) {
    const response = await api("/api/v2/passports", tokens.author, tenant.id, { method: "POST", key: `glr-passport-${ordinal + 1}`, body: { subject_type: "ITEM", subject_id: items.get(variant.synthetic_sku).id, passport_profile_code: "PRIMARY", passport_identifier: variant.synthetic_dpp_id, schema_definition_id: schema.id, issuer: "GreanLean Reference", scheme: "GREANLEAN_INTERNAL_REFERENCE_DPP" }, expected: [201] });
    passport = response.json?.data;
  }
  passports.set(variant.synthetic_sku, passport);
  let current = await first("dpp_current_pointer", { select: "*", tenant_id: `eq.${tenant.id}`, passport_id: `eq.${passport.id}` });
  if (!current) {
    const review = (await api("/api/v2/passport-reviews", tokens.author, tenant.id, { method: "POST", key: `glr-review-${ordinal + 1}`, body: { passport_id: passport.id, schema_version_id: schemaVersion.id }, expected: [201] })).json?.data;
    assert(review?.status === "IN_REVIEW" && review.validation_summary?.status === "PASS", `Candidate/review failed for ${variant.synthetic_dpp_id}.`);
    const approved = (await api(`/api/v2/passport-reviews/${review.id}/approve`, tokens.reviewer, tenant.id, { method: "POST", key: `glr-approve-${ordinal + 1}`, body: {}, expected: [200] })).json?.data;
    assert(approved?.status === "APPROVED", `Approval failed for ${variant.synthetic_dpp_id}.`);
    const version = (await api("/api/v2/publications", tokens.publisher, tenant.id, { method: "POST", key: `glr-publish-${ordinal + 1}`, body: { review_task_id: review.id }, expected: [201] })).json?.data;
    assert(version?.version_number === 1 && version.publication_state === "PUBLISHED", `Publication failed for ${variant.synthetic_dpp_id}.`);
    current = await first("dpp_current_pointer", { select: "*", tenant_id: `eq.${tenant.id}`, passport_id: `eq.${passport.id}` });
  }
  const dppIdentifier = await first("product_subject_identifier", { select: "id", tenant_id: `eq.${tenant.id}`, subject_type: "eq.PASSPORT", subject_id: `eq.${passport.id}`, identifier_type: "eq.DPP_ID" });
  const path = `/p/${variant.synthetic_dpp_id}`;
  const mappingRow = await first("resolver_mapping", { select: "id", host: "eq.greanlean-dpp-preprod.vercel.app", normalized_path: `eq.${path}` });
  if (!mappingRow) await api("/api/v2/resolver-mappings", tokens.publisher, tenant.id, { method: "POST", key: `glr-resolver-${ordinal + 1}`, body: { identifier_id: dppIdentifier.id, host: "greanlean-dpp-preprod.vercel.app", normalized_path: path, passport_id: passport.id, mapping_type: "PRIMARY" }, expected: [201] });
}

const bmsDefinition = await first("connector_definition", { select: "id", code: "eq.BMS_AGGREGATION", status: "eq.ACTIVE" });
let bmsConnector = await first("connector_instance", { select: "*", tenant_id: `eq.${tenant.id}`, name: "eq.GreanLean Reference Synthetic BMS" });
if (!bmsConnector) bmsConnector = await insert("connector_instance", { tenant_id: tenant.id, connector_definition_id: bmsDefinition.id, name: "GreanLean Reference Synthetic BMS", environment: "MOCK", status: "ACTIVE", config_json: { synthetic: true, externalWrites: false }, rate_limit_profile: { perMinute: 120, burst: 20 }, retry_profile: { maxAttempts: 1, baseDelayMs: 1000, maxDelayMs: 1000, backoffMode: "FIXED" }, created_by: actors.author });
for (let ordinal = 0; ordinal < variants.length; ordinal += 1) {
  const { model, variant } = variants[ordinal];
  const item = items.get(variant.synthetic_sku);
  const payload = sourcePayload(model, variant, ordinal + 1)["bms.snapshot"];
  const existing = await first("bms_aggregation_snapshot", { select: "id", tenant_id: `eq.${tenant.id}`, connector_instance_id: `eq.${bmsConnector.id}`, device_external_id: `eq.${variant.synthetic_serial}` });
  if (!existing) await insert("bms_aggregation_snapshot", { tenant_id: tenant.id, connector_instance_id: bmsConnector.id, item_id: item.id, device_external_id: variant.synthetic_serial, window_start: "2026-09-28T11:55:00.000Z", window_end: "2026-09-28T12:00:00.000Z", algorithm_version: "synthetic-reference-v1", sample_count: 5, aggregate_json: payload, source_payload_hash: hash(payload), threshold_events: [] });
}

async function count(table, extra = {}) {
  const response = await rest(table, { params: { select: "id", tenant_id: `eq.${tenant.id}`, ...extra }, prefer: "count=exact" });
  return response.json?.length || 0;
}

const counts = {
  family: await count("product_family"),
  models: await count("product_model"),
  skus: await count("sku"),
  batches: await count("product_batch"),
  batchSkuLinks: await count("batch_sku_link"),
  individuals: await count("product_item"),
  sourceRecords: await count("source_record", { data_source_id: `eq.${dataSource.id}` }),
  transformations: await count("transformation_result"),
  claims: await count("canonical_claim"),
  passports: await count("dpp_passport"),
  versions: await count("dpp_version"),
  currentPointers: (await rest("dpp_current_pointer", { params: { select: "passport_id", tenant_id: `eq.${tenant.id}` } })).json?.length || 0,
  bmsSnapshots: await count("bms_aggregation_snapshot"),
};
for (const [key, expected] of Object.entries({ family: 1, models: 8, skus: 22, batches: 8, batchSkuLinks: 22, individuals: 22, sourceRecords: 22, transformations: 22, passports: 22, versions: 22, currentPointers: 22, bmsSnapshots: 22 })) assert(counts[key] === expected, `${key}: expected ${expected}, got ${counts[key]}.`);
assert(counts.claims === 22 * fieldSpecs.length, `Expected ${22 * fieldSpecs.length} canonical claims, got ${counts.claims}.`);

const resolverChecks = [];
for (const { variant } of variants) {
  const response = await request(`${siteUrl}/api/v2/resolver/${encodeURIComponent(variant.synthetic_dpp_id)}`, { expected: [200] });
  const projection = response.json;
  assert(projection?.passportIdentifier === variant.synthetic_dpp_id, `Resolver identity mismatch for ${variant.synthetic_dpp_id}.`);
  assert(projection.fields?.some((field) => field.fieldCode === "demo.warning"), `Synthetic warning missing for ${variant.synthetic_dpp_id}.`);
  assert(!JSON.stringify(projection).includes("TL-"), `Source model/vendor information leaked publicly for ${variant.synthetic_dpp_id}.`);
  assert(!projection.fields?.some((field) => ["bms.snapshot", "access.policy-demo"].includes(field.fieldCode)), `Restricted field leaked publicly for ${variant.synthetic_dpp_id}.`);
  resolverChecks.push({ dppId: variant.synthetic_dpp_id, status: response.status, version: projection.version, payloadHash: projection.payloadHash });
}

const final = {
  status: "PASS",
  environment: "HOSTED_PREPROD",
  projectRefFingerprint: hash(projectRef).slice(0, 12),
  migrationHead: ledger[0].migration_number,
  fixturePath,
  fixtureSha256: fixtureHash,
  tenantId: tenant.id,
  tenantName: tenant.name,
  organisationId: organisation.id,
  dataSourceId: dataSource.id,
  mappingVersionId: mapping.id,
  schemaDefinitionId: schema.id,
  schemaVersionId: schemaVersion.id,
  counts,
  resolverChecks,
  soodoo: { retained: Boolean(soodoo), defaultDemo: false, hardDeleted: false },
  registrySubmissionPerformed: false,
  productionWritePerformed: false,
  productionDeploymentChanged: false,
  productionTrafficSwitched: false,
};
console.log(JSON.stringify(final, null, 2));
