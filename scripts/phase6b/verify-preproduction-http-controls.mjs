import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import http from "node:http";

const origin = process.env.PHASE6B_LOCAL_ORIGIN ?? "http://127.0.0.1:3040";
const evidencePath = "docs/v2-implementation/phase-6b/evidence/preproduction-http-controls.json";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function declaredOversizeProbe() {
  const body = Buffer.alloc(1_048_577, 0x61);
  return new Promise((resolve, reject) => {
    const request = http.request(`${origin}/api/v2/connectors`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": String(body.length),
      },
    }, (response) => {
      response.resume();
      response.on("end", () => resolve({ status: response.statusCode, headers: response.headers }));
    });
    request.setTimeout(10_000, () => request.destroy(new Error("Oversize probe timed out.")));
    request.on("error", reject);
    request.end(body);
  });
}

const headerResponse = await fetch(`${origin}/`, { redirect: "manual", signal: AbortSignal.timeout(15_000) });
await headerResponse.arrayBuffer();
const csp = headerResponse.headers.get("content-security-policy") ?? "";
const headers = {
  contentSecurityPolicy: Boolean(csp),
  cspNonce: /'nonce-[a-f0-9]+'/u.test(csp),
  cspStrictDynamic: csp.includes("'strict-dynamic'"),
  cspUnsafeEval: csp.includes("'unsafe-eval'"),
  hsts: headerResponse.headers.get("strict-transport-security"),
  nosniff: headerResponse.headers.get("x-content-type-options"),
  frameOptions: headerResponse.headers.get("x-frame-options"),
  referrerPolicy: headerResponse.headers.get("referrer-policy"),
  permissionsPolicy: headerResponse.headers.get("permissions-policy"),
};

assert(headerResponse.status === 200, "Header probe did not return 200.");
assert(headers.contentSecurityPolicy && headers.cspNonce && headers.cspStrictDynamic, "Production CSP is incomplete.");
assert(!headers.cspUnsafeEval, "Production CSP contains unsafe-eval.");
assert(Boolean(headers.hsts) && headers.nosniff === "nosniff" && headers.frameOptions === "DENY", "Required security headers are incomplete.");

const rateStatuses = [];
for (let index = 0; index < 31; index += 1) {
  const response = await fetch(`${origin}/api/qr?url=${encodeURIComponent("https://greanlean.com/")}`, {
    headers: { "x-vercel-forwarded-for": "198.51.100.77" },
    signal: AbortSignal.timeout(15_000),
  });
  await response.arrayBuffer();
  rateStatuses.push(response.status);
}
assert(rateStatuses.slice(0, 30).every((status) => status === 200), "QR requests were limited before the documented threshold.");
assert(rateStatuses[30] === 429, "The first request above the QR threshold was not limited.");

const limited = await fetch(`${origin}/api/qr?url=${encodeURIComponent("https://greanlean.com/")}`, {
  headers: { "x-vercel-forwarded-for": "198.51.100.77" },
  signal: AbortSignal.timeout(15_000),
});
await limited.arrayBuffer();
assert(limited.status === 429 && Number(limited.headers.get("retry-after")) >= 1, "Rate-limit response is missing Retry-After.");

const oversize = await declaredOversizeProbe();
assert(oversize.status === 413, "Declared oversized JSON body was not rejected.");

const evidence = {
  generatedAt: new Date().toISOString(),
  classification: "PREPRODUCTION_BACKEND_LOCAL_RC",
  runtime: { next: "15.5.26", nodeEnv: "production", backend: "isolated Pre-Production" },
  headers,
  rateLimit: {
    route: "/api/qr",
    documentedLimit: 30,
    successfulBeforeLimit: rateStatuses.filter((status) => status === 200).length,
    firstOverLimitStatus: rateStatuses[30],
    retryAfterPresent: Number(limited.headers.get("retry-after")) >= 1,
  },
  capacity: { declaredJsonBytes: 1_048_577, status: oversize.status },
  limitations: [
    "The application Release Candidate ran locally against the isolated Pre-Production backend; there is no hosted Pre-Production frontend deployment.",
    "The in-memory limiter is per process and is not evidence of distributed Production-plan capacity.",
    "Undeclared/chunked request bodies still require platform or streaming-parser enforcement.",
  ],
  productionWritePerformed: false,
  productionTrafficSwitched: false,
};
await mkdir(dirname(evidencePath), { recursive: true });
await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
console.log("PREPRODUCTION HTTP CONTROLS PASS");
