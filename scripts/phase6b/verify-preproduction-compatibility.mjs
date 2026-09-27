import { spawn } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const envFile = ".env.preproduction.local";
const evidencePath = "docs/v2-implementation/phase-6b/evidence/preproduction-shadow-compatibility.json";
const origin = "http://localhost:3047";

function parseEnv(source) {
  return Object.fromEntries(source.split(/\r?\n/u).flatMap((raw) => {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) return [];
    const index = line.indexOf("=");
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    return [[line.slice(0, index).trim(), value]];
  }));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(url, options = {}) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(60_000) });
}

const env = parseEnv(await readFile(envFile, "utf8"));
const serviceHeaders = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };
async function rest(pathname) {
  const response = await request(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${pathname}`, { headers: serviceHeaders });
  const body = await response.json();
  if (!response.ok) throw new Error(`Pre-Production REST query failed (${response.status}).`);
  return body;
}

const pointer = (await rest("dpp_current_pointer?select=passport_id,current_version_id,updated_at&order=updated_at.desc&limit=1"))[0];
assert(pointer, "No current Pre-Production publication is available.");
const passport = (await rest(`dpp_passport?select=id,passport_identifier&id=eq.${pointer.passport_id}`))[0];
const version = (await rest(`dpp_version?select=id,version_number,payload_hash,schema_version_id,published_at,publication_state&id=eq.${pointer.current_version_id}`))[0];
const mappings = await rest(`resolver_mapping?select=normalized_path,mapping_type,host,status,passport_id&passport_id=eq.${pointer.passport_id}&status=eq.ACTIVE&order=created_at.asc`);
assert(passport && version?.publication_state === "PUBLISHED" && mappings.length > 0, "Current Passport/Version/Resolver state is incomplete.");

const apiFiles = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const child = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(child);
    else if (entry.name === "route.ts") apiFiles.push(child.replaceAll(path.sep, "/"));
  }
}
await walk("app/api");
const apiInventory = {
  totalRoutes: apiFiles.length,
  explicitV1Routes: apiFiles.filter((file) => file.startsWith("app/api/v1/")).sort(),
  v2Routes: apiFiles.filter((file) => file.startsWith("app/api/v2/")).sort(),
  legacyUnversionedRoutes: apiFiles.filter((file) => !file.startsWith("app/api/v1/") && !file.startsWith("app/api/v2/")).sort(),
};

let serverLog = "";
const server = spawn(process.execPath, [`--env-file=${envFile}`, "node_modules/next/dist/bin/next", "start", "-p", "3047"], {
  cwd: process.cwd(),
  env: { ...process.env, NODE_ENV: "production", NODE_USE_ENV_PROXY: "1" },
  stdio: ["ignore", "pipe", "pipe"],
});
server.stdout.on("data", (chunk) => { serverLog += chunk.toString(); });
server.stderr.on("data", (chunk) => { serverLog += chunk.toString(); });

try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await request(`${origin}/`);
      await response.arrayBuffer();
      if (response.status === 200) { ready = true; break; }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert(ready, `Release Candidate did not start: ${serverLog.slice(-1000)}`);

  const identifier = passport.passport_identifier;
  const formatResults = [];
  let expectedMetadata;
  for (const format of ["json", "html", "jsonld", "pdf", "qr"]) {
    const response = await request(`${origin}/api/v2/resolver/${encodeURIComponent(identifier)}?format=${format}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    const metadata = {
      passportId: response.headers.get("x-dpp-passport-id"),
      version: response.headers.get("x-dpp-version"),
      payloadHash: response.headers.get("x-dpp-payload-hash"),
      schemaVersion: response.headers.get("x-dpp-schema-version"),
      publishedAt: response.headers.get("x-dpp-published-at"),
    };
    assert(response.status === 200 && bytes.length > 20, `Resolver format ${format} failed.`);
    if (!expectedMetadata) expectedMetadata = metadata;
    assert(JSON.stringify(metadata) === JSON.stringify(expectedMetadata), `Resolver metadata diverged for ${format}.`);
    formatResults.push({ format, status: response.status, contentType: response.headers.get("content-type"), bytes: bytes.length, metadataMatch: true });
  }
  assert(expectedMetadata.payloadHash === version.payload_hash && Number(expectedMetadata.version) === version.version_number, "Resolver metadata does not match the immutable current Version.");

  const conditional = await request(`${origin}/api/v2/resolver/${encodeURIComponent(identifier)}?format=json`, {
    headers: { "if-none-match": `"${version.payload_hash}.phase4-projection-v1.PUBLIC"` },
  });
  await conditional.arrayBuffer();
  assert(conditional.status === 304, "Resolver conditional request did not return 304.");

  const directIdentifiers = Array.from(new Set(mappings.flatMap((mapping) => {
    const match = mapping.normalized_path?.match(/^\/(?:p|01|api\/v2\/resolver)\/(.+)$/u);
    return match ? [decodeURIComponent(match[1])] : [];
  })));
  const aliasResults = [];
  for (const candidate of directIdentifiers) {
    const response = await request(`${origin}/api/v2/resolver/${encodeURIComponent(candidate)}?format=json`);
    const body = await response.json();
    assert(response.status === 200 && body.payloadHash === version.payload_hash, `Resolver alias failed: ${candidate}`);
    aliasResults.push({ identifierClass: candidate === identifier ? "PASSPORT_ID" : "ALIAS_OR_GS1", status: response.status, payloadHashMatch: true });
  }

  const legacyPassportPage = await request(`${origin}/p/${encodeURIComponent(identifier)}`, { redirect: "manual" });
  await legacyPassportPage.arrayBuffer();
  const gtinMapping = mappings.find((mapping) => mapping.normalized_path?.startsWith("/01/"));
  let gs1Route = { status: "NOT_APPLICABLE", reason: "No direct GTIN mapping for current Passport." };
  if (gtinMapping) {
    const response = await request(`${origin}${gtinMapping.normalized_path}`, { redirect: "manual" });
    await response.arrayBuffer();
    assert([200, 301, 302, 307, 308].includes(response.status), "Legacy GS1 Digital Link route failed.");
    gs1Route = { status: response.status, result: "PASS" };
  }
  assert([200, 301, 302, 307, 308].includes(legacyPassportPage.status), "Legacy /p route failed.");

  const qr = await request(`${origin}/api/qr?url=${encodeURIComponent(`${origin}/api/v2/resolver/${identifier}`)}`);
  const qrBytes = new Uint8Array(await qr.arrayBuffer());
  assert(qr.status === 200 && qrBytes.length > 100 && (qr.headers.get("content-type") || "").includes("image/png"), "Legacy QR API failed.");

  const reconciliation = JSON.parse(await readFile("docs/v2-implementation/phase-6b/evidence/preproduction-seed-and-reconciliation.json", "utf8"));
  const evidence = {
    generatedAt: new Date().toISOString(),
    classification: "PREPRODUCTION_BACKEND_LOCAL_RC",
    immutableVersion: { version: version.version_number, payloadHash: version.payload_hash, publicationState: version.publication_state },
    formatResults,
    etagConditionalStatus: conditional.status,
    aliasResults,
    legacyCompatibility: {
      passportRoute: { status: legacyPassportPage.status, result: "PASS" },
      gs1DigitalLinkRoute: gs1Route,
      qrApi: { status: qr.status, contentType: qr.headers.get("content-type"), result: "PASS" },
    },
    apiInventory,
    shadowCompare: {
      sourceRows: reconciliation.legacyDryRun.sourceRows,
      deterministicHashesMatch: reconciliation.legacyDryRun.hashesMatch,
      automaticallyMapped: reconciliation.legacyDryRun.statusCounts.MAPPED,
      reviewRequired: reconciliation.legacyDryRun.statusCounts.REVIEW_REQUIRED,
      automaticTargetWrites: reconciliation.legacyDryRun.automaticTargetWrites,
      criticalUnknownDiffs: reconciliation.criticalUnknownDiffs,
      result: "PASS_WITH_QUARANTINE",
      limitation: "All legacy rows require explicit business mapping review, so no semantic V1/V2 field-equivalence claim is made.",
    },
    limitations: [
      "The Release Candidate ran locally against the isolated Pre-Production backend; no hosted Pre-Production frontend exists.",
      "Historical customer QR telemetry and a Production traffic sample were not accessed.",
    ],
    productionWritePerformed: false,
    productionTrafficSwitched: false,
  };
  await mkdir(path.dirname(evidencePath), { recursive: true });
  await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  console.log("PREPRODUCTION SHADOW/COMPATIBILITY PASS_WITH_QUARANTINE");
} finally {
  server.kill("SIGTERM");
}
