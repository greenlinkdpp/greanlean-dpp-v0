import { spawn, spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

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

function percentile(values, fraction) {
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.min(ordered.length - 1, Math.ceil(ordered.length * fraction) - 1)];
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(30_000) });
  const text = await response.text();
  if (!response.ok) throw new Error(`GET ${new URL(url).pathname} returned ${response.status}.`);
  return JSON.parse(text || "null");
}

async function main() {
  const outputIndex = process.argv.indexOf("--output");
  const envFile = process.env.DPP_VERIFICATION_ENV_FILE ?? ".env.development.local";
  const preproduction = envFile === ".env.preproduction.local";
  const outputPath = outputIndex >= 0
    ? process.argv[outputIndex + 1]
    : preproduction
      ? "docs/v2-implementation/phase-6b/evidence/preproduction-performance.json"
      : "docs/v2-implementation/phase-6/evidence/development-performance.json";
  const guardScript = preproduction
    ? "scripts/phase6b/assert-preproduction-target.mjs"
    : "scripts/assert-development-target.mjs";
  const guard = spawnSync(process.execPath, [guardScript, "--env-file", envFile, "--json"], { encoding: "utf8" });
  if (guard.status !== 0) throw new Error((guard.stderr || guard.stdout || "Environment guard failed").trim());
  const env = parseEnv(await readFile(envFile, "utf8"));
  const requiredFlags = ["FEATURE_V2_PUBLIC_READ", "FEATURE_V2_DPP_PASSPORT", "FEATURE_V2_DPP_PUBLICATION", "FEATURE_V2_RESOLVER", "FEATURE_V2_PUBLIC_PROJECTION"];
  if (requiredFlags.some((flag) => env[flag] !== "true")) throw new Error("Development public-read feature flags are not enabled.");
  const serviceHeaders = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };
  const pointer = (await fetchJson(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/dpp_current_pointer?select=passport_id&order=updated_at.desc&limit=1`, { headers: serviceHeaders }))[0];
  if (!pointer) throw new Error("No current published Passport pointer is available.");
  const primary = (await fetchJson(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/resolver_mapping?select=passport_id&passport_id=eq.${pointer.passport_id}&mapping_type=eq.PRIMARY&status=eq.ACTIVE&order=created_at.desc&limit=1`, { headers: serviceHeaders }))[0];
  if (!primary) throw new Error("No active primary Resolver mapping is available for the current Passport.");
  const passport = (await fetchJson(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/dpp_passport?select=passport_identifier&id=eq.${primary.passport_id}`, { headers: serviceHeaders }))[0];
  if (!passport?.passport_identifier) throw new Error("Development passport identifier is unavailable.");

  const port = 3032;
  const origin = `http://localhost:${port}`;
  const server = spawn(process.execPath, [`--env-file=${envFile}`, "node_modules/next/dist/bin/next", preproduction ? "start" : "dev", "-p", String(port)], {
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: preproduction ? "production" : "development", NODE_USE_ENV_PROXY: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  server.stdout.on("data", (chunk) => { log += chunk.toString(); });
  server.stderr.on("data", (chunk) => { log += chunk.toString(); });
  try {
    const endpoint = `${origin}/api/v2/resolver/${encodeURIComponent(passport.passport_identifier)}?format=json`;
    let ready = false;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      try {
        const response = await fetch(endpoint, { signal: AbortSignal.timeout(10_000) });
        await response.arrayBuffer();
        if (response.status === 200) { ready = true; break; }
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    if (!ready) throw new Error(`Development server did not become ready: ${log.slice(-1000)}`);
    let warmupSuccessful = 0;
    try {
      const warmup = await fetch(endpoint, { signal: AbortSignal.timeout(30_000) });
      await warmup.arrayBuffer();
      warmupSuccessful = warmup.status === 200 ? 1 : 0;
    } catch {}

    const requestCount = preproduction ? 60 : 18;
    const concurrency = preproduction ? 10 : 6;
    const latencies = [];
    const statuses = [];
    for (let offset = 0; offset < requestCount; offset += concurrency) {
      const batch = Array.from({ length: Math.min(concurrency, requestCount - offset) }, async () => {
        const started = performance.now();
        try {
          const response = await fetch(endpoint, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(30_000) });
          await response.arrayBuffer();
          latencies.push(performance.now() - started);
          statuses.push(response.status);
        } catch {
          latencies.push(performance.now() - started);
          statuses.push(0);
        }
      });
      await Promise.all(batch);
    }
    const successful = statuses.filter((status) => status === 200).length;
    const report = {
      generatedAt: new Date().toISOString(),
      classification: preproduction ? "PREPRODUCTION_BACKEND_LOCAL_RC" : "DEVELOPMENT_ONLY_INDICATIVE_NOT_PREPRODUCTION",
      workload: { route: "/api/v2/resolver/[identifier]?format=json", requestCount, concurrency, warmupRequests: 1, warmupSuccessful },
      results: {
        successful,
        failed: requestCount - successful,
        errorRate: Number(((requestCount - successful) / requestCount).toFixed(4)),
        latencyMs: {
          min: Number(Math.min(...latencies).toFixed(2)),
          p50: Number(percentile(latencies, 0.5).toFixed(2)),
          p95: Number(percentile(latencies, 0.95).toFixed(2)),
          p99: Number(percentile(latencies, 0.99).toFixed(2)),
          max: Number(Math.max(...latencies).toFixed(2)),
        },
      },
      limitations: [
        preproduction
          ? "Executed against a local production-mode Release Candidate connected to the isolated Pre-Production backend; no hosted Pre-Production frontend exists."
          : "Executed against a local Next.js development server, not an isolated Pre-Production deployment.",
        `Uses a single ${preproduction ? "Pre-Production" : "Development"} passport and does not establish Production-plan capacity or SLO compliance.`,
        "No Production traffic or write operation was performed.",
      ],
    };
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    process.stdout.write(`${JSON.stringify(report)}\n`);
  } finally {
    server.kill("SIGTERM");
  }
}

await main();
