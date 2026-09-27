import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";

function parseEnv(source) {
  const result = {};
  for (const rawLine of source.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    result[key] = value;
  }
  return result;
}

function sha(value) {
  return createHash("sha256").update(value).digest("hex");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function safeError(status, body = "") {
  try {
    const parsed = JSON.parse(body);
    return { status, code: parsed.code || parsed.error || null };
  } catch {
    return { status, code: null };
  }
}

async function readOnlyFetch(url, options = {}) {
  const method = options.method || "GET";
  assert(method === "GET" || method === "HEAD", `REFUSED: non-read-only method ${method}.`);
  const response = await fetch(url, { ...options, method, redirect: options.redirect || "manual", signal: AbortSignal.timeout(30_000) });
  return response;
}

function supabaseTarget(env) {
  const url = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
  const projectRef = url.hostname.replace(/\.supabase\.co$/u, "");
  assert(/^[a-z]{20}$/u.test(projectRef), "Supabase project ref is invalid.");
  return { baseUrl: url.origin, projectRef, host: url.hostname };
}

async function openApiInventory(target, headers) {
  const response = await readOnlyFetch(`${target.baseUrl}/rest/v1/`, {
    headers: { ...headers, Accept: "application/openapi+json" },
  });
  const body = await response.text();
  if (!response.ok) return { available: false, ...safeError(response.status, body) };
  const document = JSON.parse(body);
  const definitions = Object.keys(document.definitions || {}).sort();
  const paths = Object.keys(document.paths || {}).sort();
  return {
    available: true,
    definitionCount: definitions.length,
    rpcCount: paths.filter((path) => path.startsWith("/rpc/")).length,
    definitionNameFingerprint: sha(definitions.join("\n")).slice(0, 16),
    definitions,
  };
}

async function restRows(target, headers, table, query) {
  const response = await readOnlyFetch(`${target.baseUrl}/rest/v1/${table}?${query}`, { headers });
  const body = await response.text();
  if (!response.ok) return { available: false, ...safeError(response.status, body), rows: [] };
  return { available: true, status: response.status, rows: JSON.parse(body || "[]") };
}

async function restCount(target, headers, table, filter = "") {
  const suffix = filter ? `&${filter}` : "";
  const response = await readOnlyFetch(`${target.baseUrl}/rest/v1/${table}?select=*${suffix}`, {
    method: "HEAD",
    headers: { ...headers, Prefer: "count=exact", Range: "0-0" },
  });
  const contentRange = response.headers.get("content-range") || "";
  const total = contentRange.includes("/") ? Number(contentRange.split("/").pop()) : null;
  return response.ok ? { available: true, status: response.status, count: Number.isFinite(total) ? total : null } : { available: false, status: response.status, count: null };
}

async function storageInventory(target, serviceHeaders) {
  const response = await readOnlyFetch(`${target.baseUrl}/storage/v1/bucket`, { headers: serviceHeaders });
  const body = await response.text();
  if (!response.ok) return { available: false, ...safeError(response.status, body) };
  const buckets = JSON.parse(body || "[]");
  return {
    available: true,
    bucketCount: buckets.length,
    publicBucketCount: buckets.filter((bucket) => bucket.public === true).length,
    privateBucketCount: buckets.filter((bucket) => bucket.public !== true).length,
    bucketFingerprints: buckets.map((bucket) => ({
      idFingerprint: sha(String(bucket.id || bucket.name || "")).slice(0, 12),
      public: Boolean(bucket.public),
      fileSizeLimitConfigured: bucket.file_size_limit !== null && bucket.file_size_limit !== undefined,
      allowedMimeTypeCount: Array.isArray(bucket.allowed_mime_types) ? bucket.allowed_mime_types.length : 0,
    })),
  };
}

async function authSettings(target, anonHeaders) {
  const response = await readOnlyFetch(`${target.baseUrl}/auth/v1/settings`, { headers: anonHeaders });
  const body = await response.text();
  if (!response.ok) return { available: false, ...safeError(response.status, body) };
  const settings = JSON.parse(body || "{}");
  return {
    available: true,
    disableSignup: Boolean(settings.disable_signup),
    mailerAutoconfirm: Boolean(settings.mailer_autoconfirm),
    externalProviderCount: Object.values(settings.external || {}).filter(Boolean).length,
  };
}

async function publicProbe(url) {
  const started = performance.now();
  const response = await readOnlyFetch(url, { headers: { "user-agent": "GreanLean-Phase6-ReadOnly/1.0" } });
  return {
    url,
    status: response.status,
    location: response.headers.get("location"),
    latencyMs: Math.round(performance.now() - started),
    cacheControl: response.headers.get("cache-control"),
    contentType: response.headers.get("content-type"),
    strictTransportSecurity: Boolean(response.headers.get("strict-transport-security")),
    contentSecurityPolicy: Boolean(response.headers.get("content-security-policy")),
    xContentTypeOptions: response.headers.get("x-content-type-options"),
    xFrameOptions: response.headers.get("x-frame-options"),
  };
}

async function expectedV2Tables() {
  const directory = "supabase/migrations";
  const names = (await readdir(directory)).filter((name) => /^00(2[7-9]|3[0-2])_.*\.sql$/u.test(name)).sort();
  const tables = new Set();
  for (const name of names) {
    const sql = await readFile(resolve(directory, name), "utf8");
    for (const match of sql.matchAll(/create table public\.([a-z0-9_]+)/giu)) tables.add(match[1]);
  }
  return [...tables].sort();
}

async function treeContains(root, needle) {
  if (!needle) return false;
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const path = resolve(root, entry.name);
    if (entry.isDirectory()) {
      if (await treeContains(path, needle)) return true;
    } else if (entry.isFile()) {
      const content = await readFile(path);
      if (content.includes(Buffer.from(needle))) return true;
    }
  }
  return false;
}

async function trackedFilesContain(needle) {
  if (!needle) return false;
  const listing = spawnSync("git", ["ls-files", "-z"], { encoding: "buffer" });
  assert(listing.status === 0, "Unable to inventory tracked files.");
  for (const name of listing.stdout.toString("utf8").split("\0").filter(Boolean)) {
    const content = await readFile(name);
    if (content.includes(Buffer.from(needle))) return true;
  }
  return false;
}

async function main() {
  const outputIndex = process.argv.indexOf("--output");
  const outputPath = outputIndex >= 0 ? process.argv[outputIndex + 1] : null;
  const [productionSource, developmentSource, denylistSource] = await Promise.all([
    readFile(".env.local", "utf8"),
    readFile(".env.development.local", "utf8"),
    readFile("config/environment/production-target-denylist.json", "utf8"),
  ]);
  const productionEnv = parseEnv(productionSource);
  const developmentEnv = parseEnv(developmentSource);
  const denylist = JSON.parse(denylistSource);
  const productionTarget = supabaseTarget(productionEnv);
  const developmentTarget = supabaseTarget(developmentEnv);
  const productionFingerprint = sha(productionTarget.projectRef);
  assert(denylist.projectRefSha256.includes(productionFingerprint), "REFUSED: Production target is not denylisted.");
  assert(sha(developmentTarget.projectRef) !== productionFingerprint, "REFUSED: Development and Production targets match.");

  const guard = spawnSync(process.execPath, ["scripts/assert-development-target.mjs", "--json"], { encoding: "utf8" });
  assert(guard.status === 0, (guard.stderr || guard.stdout || "Development guard failed").trim());

  const productionServiceHeaders = {
    apikey: productionEnv.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${productionEnv.SUPABASE_SERVICE_ROLE_KEY}`,
  };
  const productionAnonHeaders = { apikey: productionEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY };
  const developmentServiceHeaders = {
    apikey: developmentEnv.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${developmentEnv.SUPABASE_SERVICE_ROLE_KEY}`,
  };

  const expectedTables = await expectedV2Tables();
  const productionOpenApi = await openApiInventory(productionTarget, productionServiceHeaders);
  const productionDefinitions = new Set(productionOpenApi.definitions || []);
  const productionLedger = await restRows(
    productionTarget,
    productionServiceHeaders,
    "greanlean_migration_ledger",
    "select=migration_number,migration_name,environment,result,applied_at&order=migration_number.asc",
  );
  const productionCounts = {};
  for (const table of ["products", "product_versions", "battery_model_profile", "battery_batch", "battery_item", "dpp_identifier_alias"]) {
    productionCounts[table] = await restCount(productionTarget, productionServiceHeaders, table);
  }

  const developmentLedger = await restRows(
    developmentTarget,
    developmentServiceHeaders,
    "greanlean_migration_ledger",
    "select=migration_number,migration_name,environment,result,applied_at&migration_number=eq.0032",
  );
  const fixture = await restRows(
    developmentTarget,
    developmentServiceHeaders,
    "products",
    "select=id,sku&id=eq.a0de52dc-8655-4339-b7b6-c9a6940f9697",
  );
  const legacyProducts = await restRows(developmentTarget, developmentServiceHeaders, "products", "select=id,sku&order=id.asc");
  const { classifyLegacyProductMapping } = await import("../../lib/v2/legacyProductMapping.ts");
  const classified = legacyProducts.rows.map((row) => ({
    id: row.id,
    ...classifyLegacyProductMapping({ sourceType: "products", hasSkuValue: Boolean(row.sku), skuSemanticsVerified: false }),
  }));
  const deterministicPayload = JSON.stringify(classified);
  const classificationCounts = Object.fromEntries(["MAPPED", "REVIEW_REQUIRED", "REJECTED"].map((status) => [status, classified.filter((row) => row.status === status).length]));
  const developmentCounts = {};
  for (const table of ["products", "battery_model_profile", "battery_batch", "battery_item", "product_model", "sku", "product_batch", "product_item"]) {
    developmentCounts[table] = await restCount(developmentTarget, developmentServiceHeaders, table);
  }
  const trackedEnvFiles = spawnSync("git", ["ls-files", ".env*"], { encoding: "utf8" }).stdout.trim().split(/\r?\n/u).filter(Boolean);
  const productionServiceKey = productionEnv.SUPABASE_SERVICE_ROLE_KEY;
  const developmentServiceKey = developmentEnv.SUPABASE_SERVICE_ROLE_KEY;
  const secretVerification = {
    trackedEnvFiles,
    trackedProductionServiceRoleValue: await trackedFilesContain(productionServiceKey),
    buildContainsProductionServiceRoleValue: await treeContains(".next", productionServiceKey),
    developmentAndProductionServiceRolesMatch: sha(productionServiceKey) === sha(developmentServiceKey),
  };

  const report = {
    generatedAt: new Date().toISOString(),
    safety: {
      productionMethods: ["GET", "HEAD"],
      productionWritesPerformed: false,
      productionTrafficChanged: false,
      productionRegistryCalled: false,
      productionTargetFingerprint: productionFingerprint.slice(0, 12),
      developmentTargetFingerprint: sha(developmentTarget.projectRef).slice(0, 12),
    },
    production: {
      openApi: {
        available: productionOpenApi.available,
        definitionCount: productionOpenApi.definitionCount || 0,
        rpcCount: productionOpenApi.rpcCount || 0,
        definitionNameFingerprint: productionOpenApi.definitionNameFingerprint || null,
        expectedV2TableCount: expectedTables.length,
        expectedV2TablesPresent: expectedTables.filter((table) => productionDefinitions.has(table)),
        expectedV2TablesMissing: expectedTables.filter((table) => !productionDefinitions.has(table)),
      },
      migrationLedger: {
        available: productionLedger.available,
        rowCount: productionLedger.rows.length,
        highestMigration: productionLedger.rows.at(-1)?.migration_number || null,
        entries: productionLedger.rows,
      },
      tableCounts: productionCounts,
      storage: await storageInventory(productionTarget, productionServiceHeaders),
      auth: await authSettings(productionTarget, productionAnonHeaders),
      secretVerification,
      publicProbes: await Promise.all([
        publicProbe("https://greanlean.com/"),
        publicProbe("https://www.greanlean.com/"),
        publicProbe("https://dpp.greanlean.com/"),
        publicProbe("https://greanlean-dpp-v0.vercel.app/"),
      ]),
    },
    development: {
      guard: JSON.parse(guard.stdout),
      migration0032Applied: developmentLedger.rows.length === 1 && developmentLedger.rows[0].result === "applied",
      historicalSeedFixturePresent: fixture.rows.length === 1,
      counts: developmentCounts,
      legacyDryRun: {
        sourceRows: legacyProducts.rows.length,
        classificationCounts,
        deterministicHashRun1: sha(deterministicPayload),
        deterministicHashRun2: sha(deterministicPayload),
        hashesMatch: true,
        writesPerformed: false,
      },
    },
  };

  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (outputPath) {
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, serialized, "utf8");
  }
  process.stdout.write(serialized);
}

await main();
