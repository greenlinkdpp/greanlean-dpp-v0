import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const envFile = ".env.preproduction.local";
const evidencePath = "docs/v2-implementation/phase-6b/evidence/preproduction-kill-switch-rehearsal.json";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitFor(origin, log) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${origin}/`, { signal: AbortSignal.timeout(2_000) });
      await response.arrayBuffer();
      if (response.status === 200) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Release Candidate did not start: ${log().slice(-1500)}`);
}

async function exercise({ name, flag, port, method = "GET", route, body, headers = {} }) {
  const origin = `http://127.0.0.1:${port}`;
  let serverLog = "";
  const server = spawn(process.execPath, [`--env-file=${envFile}`, "node_modules/next/dist/bin/next", "start", "-p", String(port)], {
    cwd: process.cwd(),
    env: { ...process.env, NODE_USE_ENV_PROXY: "1", [flag]: "false" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", (chunk) => { serverLog += chunk.toString(); });
  server.stderr.on("data", (chunk) => { serverLog += chunk.toString(); });
  try {
    await waitFor(origin, () => serverLog);
    const v1 = await fetch(`${origin}/api/qr?url=${encodeURIComponent("https://greanlean.com/")}`, { signal: AbortSignal.timeout(10_000) });
    await v1.arrayBuffer();
    const response = await fetch(`${origin}${route}`, {
      method,
      headers: body === undefined ? headers : { "content-type": "application/json", ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    const responseBody = await response.json().catch(() => null);
    assert(v1.status === 200, `${name}: V1 compatibility route failed while V2 was disabled.`);
    assert(response.status === 404 && responseBody?.error?.code === "V2_FEATURE_DISABLED", `${name}: V2 did not fail closed.`);
    return { name, flag, v1Status: v1.status, v2Status: response.status, v2Code: responseBody.error.code, result: "PASS" };
  } finally {
    server.kill("SIGTERM");
    await new Promise((resolve) => setTimeout(resolve, 250));
    if (!server.killed) server.kill("SIGKILL");
  }
}

const rehearsals = [];
rehearsals.push(await exercise({
  name: "public-read",
  flag: "FEATURE_V2_PUBLIC_READ",
  port: 3041,
  route: "/api/v2/resolver/kill-switch-fixture",
}));
rehearsals.push(await exercise({
  name: "tenant-api",
  flag: "FEATURE_V2_TENANT_API",
  port: 3042,
  route: "/api/v2/resolver/kill-switch-fixture",
}));
rehearsals.push(await exercise({
  name: "publication-write",
  flag: "FEATURE_V2_PUBLICATION_WRITE",
  port: 3043,
  method: "POST",
  route: "/api/v2/publications",
  headers: { "idempotency-key": "phase6b-kill-switch-publication" },
  body: { review_task_id: "11111111-1111-4111-8111-111111111111" },
}));
rehearsals.push(await exercise({
  name: "connector-execution",
  flag: "FEATURE_V2_CONNECTOR_EXECUTION",
  port: 3044,
  method: "POST",
  route: "/api/v2/connectors/11111111-1111-4111-8111-111111111111/test",
  body: {},
}));

const evidence = {
  generatedAt: new Date().toISOString(),
  classification: "PREPRODUCTION_BACKEND_LOCAL_RC",
  rehearsals,
  allFailClosed: rehearsals.every((item) => item.result === "PASS"),
  v1RemainedAvailable: rehearsals.every((item) => item.v1Status === 200),
  productionWritePerformed: false,
  productionTrafficSwitched: false,
};
await mkdir(path.dirname(evidencePath), { recursive: true });
await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
console.log("PREPRODUCTION KILL-SWITCH REHEARSAL PASS");
