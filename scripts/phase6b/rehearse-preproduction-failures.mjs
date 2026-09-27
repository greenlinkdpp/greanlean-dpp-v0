import { createHash, randomUUID } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const mode = process.argv[2] ?? "application";
const projectRef = "efhiaufukjchxqhbmpvq";
const protectedRefs = new Set(["lpxdbysgmdsjhxrjzhly", "qlrbrwrpvtnlphajvqao"]);
const evidencePath = "docs/v2-implementation/phase-6b/evidence/preproduction-failure-injection.json";
const appOrigin = "http://127.0.0.1:3046";

if (!new Set(["application", "database"]).has(mode)) {
  throw new Error("Usage: rehearse-preproduction-failures.mjs [application|database]");
}
if (protectedRefs.has(projectRef)) throw new Error("REFUSED: protected target.");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function existingEvidence() {
  try {
    return JSON.parse(await readFile(evidencePath, "utf8"));
  } catch {
    return {};
  }
}

async function save(section, value) {
  const previous = await existingEvidence();
  const evidence = {
    ...previous,
    generatedAt: new Date().toISOString(),
    target: {
      environment: "preproduction",
      projectRefFingerprint: createHash("sha256").update(projectRef).digest("hex").slice(0, 12),
      protectedTarget: false,
    },
    [section]: value,
    productionWritePerformed: false,
    productionTrafficSwitched: false,
  };
  await mkdir(path.dirname(evidencePath), { recursive: true });
  await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
}

async function applicationFailure() {
  let serverLog = "";
  const app = spawn(
    process.execPath,
    ["--env-file=.env.preproduction.local", "node_modules/next/dist/bin/next", "start", "-p", "3046"],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_USE_ENV_PROXY: "1",
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:65534",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  app.stdout.on("data", (chunk) => { serverLog += chunk.toString(); });
  app.stderr.on("data", (chunk) => { serverLog += chunk.toString(); });

  try {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      try {
        const ready = await fetch(`${appOrigin}/`, { signal: AbortSignal.timeout(2_000) });
        await ready.arrayBuffer();
        if (ready.status === 200) break;
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (attempt === 59) throw new Error(`Release Candidate did not start: ${serverLog.slice(-1000)}`);
    }

    const correlationId = randomUUID();
    const failed = await fetch(`${appOrigin}/api/v2/resolver/failure-injection`, {
      headers: { "x-correlation-id": correlationId, "x-vercel-forwarded-for": "198.51.100.89" },
      signal: AbortSignal.timeout(15_000),
    });
    const bodyText = await failed.text();
    let body;
    try { body = JSON.parse(bodyText); } catch { body = null; }
    assert(failed.status === 500, "Unavailable backend did not fail closed with HTTP 500.");
    assert(body?.error?.code === "RESOLVER_LOOKUP_FAILED", "Unavailable backend exposed an unexpected error contract.");
    assert(body?.error?.message === "The Phase 4 data operation could not be completed.", "Unavailable backend exposed internal details.");
    assert(body?.error?.correlation_id === correlationId, "Failure response lost the correlation ID.");
    assert(!/stack|service.?role|supabase|127\.0\.0\.1:65534|fetch failed/iu.test(bodyText), "Failure response leaked implementation details.");

    const legacy = await fetch(`${appOrigin}/api/qr?url=${encodeURIComponent("https://greanlean.com/")}`, {
      headers: { "x-vercel-forwarded-for": "198.51.100.90" },
      signal: AbortSignal.timeout(15_000),
    });
    await legacy.arrayBuffer();
    assert(legacy.status === 200, "Legacy V1 QR surface did not remain available during V2 backend failure.");

    await save("applicationBackendUnavailable", {
      injectedCondition: "V2 backend connection refused",
      v2Status: failed.status,
      genericErrorContract: true,
      correlationIdPreserved: true,
      sensitiveDetailsExposed: false,
      legacyQrStatus: legacy.status,
      result: "PASS",
    });
    console.log("PREPRODUCTION APPLICATION FAILURE INJECTION PASS");
  } finally {
    app.kill("SIGTERM");
  }
}

function accessToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN;
  if (process.platform !== "darwin") throw new Error("SUPABASE_ACCESS_TOKEN is required outside macOS.");
  return execFileSync("security", ["find-generic-password", "-s", "Supabase CLI", "-a", "supabase", "-w"], { encoding: "utf8" }).trim();
}

async function databaseFailure() {
  const token = accessToken();
  async function query(sql, readOnly = false, expectFailure = false) {
    const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ query: sql, read_only: readOnly }),
      signal: AbortSignal.timeout(180_000),
    });
    const raw = await response.text();
    let body;
    try { body = raw ? JSON.parse(raw) : null; } catch { body = null; }
    if (expectFailure) return { failed: !response.ok, status: response.status };
    if (!response.ok) throw new Error(`Database query failed (${response.status}): ${String(body?.message ?? body?.error ?? "unknown").slice(0, 300)}`);
    return body;
  }

  const head = (await query("select coalesce(max(migration_number),'') as head from public.greanlean_migration_ledger where result='applied'", true))?.[0]?.head;
  assert(head === "0033", "REFUSED: database failure rehearsal requires migration head 0033.");
  const injected = await query(
    "begin; create table public.phase6b_failure_probe(id integer primary key); select 1/0; commit;",
    false,
    true,
  );
  assert(injected.failed, "Partial migration injection unexpectedly succeeded.");
  const check = (await query("select to_regclass('public.phase6b_failure_probe') is null as rolled_back", true))?.[0];
  assert(check?.rolled_back === true, "Failed transaction left a partial schema mutation.");

  await save("partialMigrationFailure", {
    injectedCondition: "Transactional DDL followed by division-by-zero",
    managementApiStatus: injected.status,
    transactionFailed: true,
    partialTableAbsent: true,
    migrationHeadAfterFailure: head,
    result: "PASS",
  });
  console.log("PREPRODUCTION DATABASE FAILURE INJECTION PASS");
}

if (mode === "application") await applicationFailure();
else await databaseFailure();
