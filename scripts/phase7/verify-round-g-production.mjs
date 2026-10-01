const origin = "https://www.greanlean.com";

async function request(path, init = {}) {
  const startedAt = performance.now();
  const response = await fetch(`${origin}${path}`, {
    redirect: init.redirect ?? "follow",
    headers: init.headers,
    signal: AbortSignal.timeout(30_000),
  });
  const body = await response.text();
  return {
    path,
    status: response.status,
    contentType: response.headers.get("content-type"),
    location: response.headers.get("location"),
    durationMs: Math.round(performance.now() - startedAt),
    body,
    headers: Object.fromEntries(response.headers),
  };
}

const catalogResponse = await request("/api/public/demo-showcase");
const catalog = JSON.parse(catalogResponse.body).entries;
const identifiers = catalog.map((entry) => entry.passportIdentifier);
const expectedOrder = [
  "DPP-GLR-LMT-000001",
  "DPP-GLR-LMT-000002",
  "DPP-GLR-LMT-000003",
  "DPP-DEMO-ESS-000001",
  "DPP-DEMO-TEX-000001",
  "DPP-DEMO-CE-000001",
  "DPP-DEMO-BLD-000001",
  "DPP-DEMO-HW-000001",
];

const pages = await Promise.all(
  ["/", "/?lang=en", "/login", "/demo", "/demo?lang=en"].map((path) => request(path)),
);

const passports = await Promise.all(identifiers.flatMap((identifier) => [
  request(`/p/${identifier}`),
  request(`/p/${identifier}?lang=en`),
]));
const resolvers = await Promise.all(identifiers.map((identifier) =>
  request(`/r/${identifier}`, { redirect: "manual" })));
const machineResolvers = await Promise.all(identifiers.map((identifier) =>
  request(`/api/v2/resolver/${identifier}?format=json`, {
    headers: { accept: "application/json" },
  })));
const qr = await Promise.all(identifiers.map((identifier) =>
  request(`/api/qr?data=${encodeURIComponent(`${origin}/r/${identifier}`)}`)));

const publicText = [...pages, ...passports].map((result) => result.body).join("\n");
const forbiddenPhrases = [
  "合成演示",
  "Reference Demo",
  "deterministic demo",
  "localhost",
  "preprod",
  "[object Object]",
];
const phraseHits = Object.fromEntries(forbiddenPhrases.map((phrase) => [
  phrase,
  (publicText.match(new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")) || []).length,
]));

const checks = {
  catalogCount: catalog.length === 8,
  catalogOrder: JSON.stringify(identifiers) === JSON.stringify(expectedOrder),
  corePages: pages.every((result) => result.status === 200),
  passportPages: passports.every((result) => result.status === 200),
  resolverRedirects: resolvers.every((result, index) =>
    result.status === 302 && result.location === `${origin}/p/${identifiers[index]}`),
  machineResolvers: machineResolvers.every((result) =>
    result.status === 200 && result.contentType?.includes("application/json")),
  qrImages: qr.every((result) =>
    result.status === 200 && result.contentType?.includes("image/png")),
  noForbiddenPublicCopy: Object.values(phraseHits).every((count) => count === 0),
  securityHeaders: pages.every((result) =>
    result.headers["x-content-type-options"] === "nosniff" &&
    Boolean(result.headers["content-security-policy"]) &&
    Boolean(result.headers["referrer-policy"])),
};

const result = {
  verifiedAt: new Date().toISOString(),
  origin,
  identifiers,
  phraseHits,
  checks,
  pass: Object.values(checks).every(Boolean),
  timings: {
    maxPageMs: Math.max(...pages.map((result) => result.durationMs)),
    maxPassportMs: Math.max(...passports.map((result) => result.durationMs)),
    maxResolverMs: Math.max(...resolvers.map((result) => result.durationMs)),
    maxMachineResolverMs: Math.max(...machineResolvers.map((result) => result.durationMs)),
    maxQrMs: Math.max(...qr.map((result) => result.durationMs)),
  },
  statuses: {
    pages: pages.map(({ path, status }) => ({ path, status })),
    passports: passports.map(({ path, status }) => ({ path, status })),
    resolvers: resolvers.map(({ path, status, location }) => ({ path, status, location })),
    machineResolvers: machineResolvers.map(({ path, status, contentType }) => ({ path, status, contentType })),
    qr: qr.map(({ path, status, contentType }) => ({ path, status, contentType })),
  },
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!result.pass) process.exitCode = 1;
