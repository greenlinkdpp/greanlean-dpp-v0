import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

function parseEnv(source) {
  return Object.fromEntries(source.split(/\r?\n/u).flatMap((raw) => {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) return [];
    const separator = line.indexOf("=");
    return [[line.slice(0, separator).trim(), line.slice(separator + 1).trim().replace(/^(['"])(.*)\1$/u, "$2")]];
  }));
}

function sha(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function readOnlyFetch(url, options = {}) {
  const method = options.method || "GET";
  if (method !== "GET" && method !== "HEAD") throw new Error(`REFUSED: ${method} is not read-only.`);
  return fetch(url, { ...options, method, redirect: options.redirect || "manual", signal: AbortSignal.timeout(45_000) });
}

async function count(baseUrl, headers, table) {
  const response = await readOnlyFetch(`${baseUrl}/rest/v1/${table}?select=*`, {
    method: "HEAD",
    headers: { ...headers, Prefer: "count=exact", Range: "0-0" },
  });
  const range = response.headers.get("content-range") || "";
  const raw = range.includes("/") ? range.split("/").at(-1) : "";
  return { status: response.status, count: /^\d+$/u.test(raw) ? Number(raw) : null };
}

async function publicProbe(url) {
  const response = await readOnlyFetch(url, { headers: { "user-agent": "GreanLean-Phase6B-Stage1-ReadOnly/1.0" } });
  const bytes = Buffer.from(await response.arrayBuffer());
  return {
    url,
    status: response.status,
    location: response.headers.get("location"),
    contentType: response.headers.get("content-type"),
    contentLength: bytes.byteLength,
    bodyFingerprint: sha(bytes).slice(0, 16),
  };
}

async function main() {
  const outputIndex = process.argv.indexOf("--output");
  const output = outputIndex >= 0 ? process.argv[outputIndex + 1] : "docs/v2-implementation/phase-6b/evidence/stage1-production-baseline.json";
  const planIndex = process.argv.indexOf("--organization-plan");
  const organizationPlan = planIndex >= 0 ? process.argv[planIndex + 1] : "UNKNOWN";
  if (!/^(FREE|PRO|TEAM|ENTERPRISE|UNKNOWN)$/u.test(organizationPlan)) throw new Error("Invalid organization plan.");
  const [envSource, denylistSource] = await Promise.all([
    readFile(".env.local", "utf8"),
    readFile("config/environment/production-target-denylist.json", "utf8"),
  ]);
  const env = parseEnv(envSource);
  const projectUrl = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
  const projectRef = projectUrl.hostname.replace(/\.supabase\.co$/u, "");
  const denylist = JSON.parse(denylistSource);
  const projectFingerprint = sha(projectRef);
  if (!denylist.projectRefSha256.includes(projectFingerprint)) throw new Error("REFUSED: target is not the denylisted Production project.");
  const serviceHeaders = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };
  const anonHeaders = { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY };

  const ledgerResponse = await readOnlyFetch(`${projectUrl.origin}/rest/v1/greanlean_migration_ledger?select=migration_number,migration_name,environment,result,applied_at&order=migration_number.asc`, { headers: serviceHeaders });
  const ledger = ledgerResponse.ok ? await ledgerResponse.json() : [];
  const storageResponse = await readOnlyFetch(`${projectUrl.origin}/storage/v1/bucket`, { headers: serviceHeaders });
  const buckets = storageResponse.ok ? await storageResponse.json() : [];
  const authResponse = await readOnlyFetch(`${projectUrl.origin}/auth/v1/settings`, { headers: anonHeaders });
  const auth = authResponse.ok ? await authResponse.json() : {};

  const counts = {};
  for (const table of ["products", "product_versions", "battery_model_profile", "battery_batch", "battery_item", "dpp_identifier_alias"]) {
    counts[table] = await count(projectUrl.origin, serviceHeaders, table);
  }
  const publicSmoke = await Promise.all([
    publicProbe("https://www.greanlean.com/"),
    publicProbe("https://www.greanlean.com/p/DPP-LMT-BAT-48V15AH"),
    publicProbe("https://www.greanlean.com/api/battery-dpp/public/DPP-LMT-BAT-48V15AH"),
    publicProbe("https://www.greanlean.com/01/06900000014336"),
    publicProbe("https://dpp.greanlean.com/login"),
  ]);
  const report = {
    generatedAt: new Date().toISOString(),
    production: {
      projectDisplayName: "greanlen-dpp",
      organization: "GreanLean",
      organizationPlan,
      projectRefFingerprint: projectFingerprint.slice(0, 12),
      projectHostFingerprint: sha(projectUrl.hostname).slice(0, 12),
      region: "ap-southeast-1",
      ledgerStatus: ledgerResponse.status,
      migrationHead: ledger.at(-1)?.migration_number || null,
      ledgerFingerprint: sha(JSON.stringify(ledger)).slice(0, 16),
      counts,
      storage: {
        status: storageResponse.status,
        bucketCount: buckets.length,
        publicBucketCount: buckets.filter((bucket) => bucket.public === true).length,
        privateBucketCount: buckets.filter((bucket) => bucket.public !== true).length,
        inventoryFingerprint: sha(JSON.stringify(buckets.map((bucket) => ({ id: bucket.id, public: bucket.public, file_size_limit: bucket.file_size_limit, allowed_mime_types: bucket.allowed_mime_types })).sort((a, b) => String(a.id).localeCompare(String(b.id))))).slice(0, 16),
      },
      auth: {
        status: authResponse.status,
        settingsPresent: authResponse.ok,
        disableSignup: Boolean(auth.disable_signup),
        mailerAutoconfirm: Boolean(auth.mailer_autoconfirm),
        externalProviderCount: Object.values(auth.external || {}).filter(Boolean).length,
      },
      publicSmoke,
    },
    safety: {
      methods: ["GET", "HEAD"],
      productionWritesPerformed: false,
      productionProjectTransferred: false,
      productionProjectPaused: false,
      productionTrafficSwitched: false,
    },
  };
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

await main();
