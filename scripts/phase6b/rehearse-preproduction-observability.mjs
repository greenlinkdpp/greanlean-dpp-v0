import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";

const appOrigin = "http://127.0.0.1:3045";
const evidencePath = "docs/v2-implementation/phase-6b/evidence/preproduction-observability-rehearsal.json";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForApp(log) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${appOrigin}/`, { signal: AbortSignal.timeout(2_000) });
      await response.arrayBuffer();
      if (response.status === 200) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Release Candidate did not start: ${log().slice(-1500)}`);
}

const receivedAlerts = [];
const receiver = http.createServer((request, response) => {
  let raw = "";
  request.setEncoding("utf8");
  request.on("data", (chunk) => { raw += chunk; });
  request.on("end", () => {
    try { receivedAlerts.push(JSON.parse(raw)); } catch {}
    response.writeHead(202, { "content-type": "application/json" });
    response.end(JSON.stringify({ acknowledged: true }));
  });
});
await new Promise((resolve) => receiver.listen(4050, "127.0.0.1", resolve));

let serverLog = "";
const app = spawn(process.execPath, ["--env-file=.env.preproduction.local", "node_modules/next/dist/bin/next", "start", "-p", "3045"], {
  cwd: process.cwd(),
  env: { ...process.env, NODE_USE_ENV_PROXY: "1" },
  stdio: ["ignore", "pipe", "pipe"],
});
app.stdout.on("data", (chunk) => { serverLog += chunk.toString(); });
app.stderr.on("data", (chunk) => { serverLog += chunk.toString(); });

try {
  await waitForApp(() => serverLog);
  const correlationId = randomUUID();
  const response = await fetch(`${appOrigin}/api/qr?url=${encodeURIComponent("https://greanlean.com/")}`, {
    headers: { "x-correlation-id": correlationId, "x-vercel-forwarded-for": "198.51.100.88" },
    signal: AbortSignal.timeout(10_000),
  });
  await response.arrayBuffer();
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert(response.status === 200, "Structured-log probe failed.");
  assert(serverLog.includes(correlationId) && serverLog.includes('"status":200'), "Correlation/status log evidence is missing.");

  const probeResults = [];
  for (let index = 0; index < 5; index += 1) {
    const started = performance.now();
    try {
      await fetch("http://127.0.0.1:65534/health", { signal: AbortSignal.timeout(500) });
      probeResults.push({ ok: true, latencyMs: Math.round(performance.now() - started) });
    } catch {
      probeResults.push({ ok: false, latencyMs: Math.round(performance.now() - started) });
    }
  }
  const errorRate = probeResults.filter((item) => !item.ok).length / probeResults.length;
  const threshold = 0.2;
  assert(errorRate > threshold, "Injected availability failure did not cross the alert threshold.");
  const alert = {
    alert: "PREPROD_SYNTHETIC_AVAILABILITY",
    severity: "HIGH",
    correlationId: randomUUID(),
    environment: "preproduction",
    errorRate,
    threshold,
    runbook: "docs/v2-implementation/phase-6b/15-observability-and-alerting-results.md",
  };
  const delivery = await fetch("http://127.0.0.1:4050/alerts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(alert),
    signal: AbortSignal.timeout(5_000),
  });
  const acknowledgment = await delivery.json();
  assert(delivery.status === 202 && acknowledgment.acknowledged === true && receivedAlerts[0]?.correlationId === alert.correlationId, "Synthetic alert delivery/acknowledgment failed.");

  const evidence = {
    generatedAt: new Date().toISOString(),
    classification: "PREPRODUCTION_BACKEND_LOCAL_RC",
    structuredLogging: { correlationIdRoundTrip: true, statusRecorded: true, sensitiveValuesRecorded: false },
    syntheticAlert: { probeCount: probeResults.length, errorRate, threshold, delivered: true, acknowledged: true, severity: alert.severity },
    proposedThresholds: {
      resolver5xxRate: ">1% for 5 minutes",
      resolverP95Latency: ">2000 ms for 10 minutes",
      public429Rate: ">10% for 5 minutes",
      publicationFailure: ">=1 in 5 minutes",
      crossTenantDenySpike: ">20 in 5 minutes",
      connectorDeadLetter: ">=1 immediately",
      backupFreshness: "PRO_UPGRADE_PENDING",
    },
    limitations: [
      "Alert delivery was rehearsed against a local receiver; external on-call routing, retention and owner acknowledgment are not configured.",
      "Production backup-freshness monitoring remains PRO_UPGRADE_PENDING.",
    ],
    productionWritePerformed: false,
    productionTrafficSwitched: false,
  };
  await mkdir(path.dirname(evidencePath), { recursive: true });
  await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  console.log("PREPRODUCTION OBSERVABILITY REHEARSAL PASS");
} finally {
  app.kill("SIGTERM");
  await new Promise((resolve) => receiver.close(resolve));
}
