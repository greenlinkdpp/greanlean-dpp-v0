import { readFile } from "node:fs/promises";

const origin = "https://greanlean-dpp-preprod.vercel.app";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) throw new Error("PreProd Supabase environment is required.");

const resolver = await fetch(`${origin}/api/v2/resolver/DPP-P4-MUJEZBWJ140310?format=json&signal_probe=${Date.now()}`, {
  signal: AbortSignal.timeout(30_000),
});
await resolver.arrayBuffer();
const headers = {
  serverTiming: resolver.headers.get("server-timing"),
  rateLimitBackend: resolver.headers.get("x-ratelimit-backend"),
  rateLimitRemaining: resolver.headers.get("x-ratelimit-remaining"),
  vercelRequestIdPresent: Boolean(resolver.headers.get("x-vercel-id")),
};

const serviceHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Prefer: "count=exact" };
async function countSignal(resource, column = "id") {
  const response = await fetch(`${supabaseUrl}/rest/v1/${resource}?select=${column}&limit=1`, {
    headers: serviceHeaders,
    signal: AbortSignal.timeout(30_000),
  });
  await response.arrayBuffer();
  return { status: response.status, available: response.ok, contentRange: response.headers.get("content-range") };
}

const [rateCounter, publicationAudit, connectorDeadLetter] = await Promise.all([
  countSignal("v2_public_rate_limit_counter", "surface"),
  countSignal("dpp_publication_audit"),
  countSignal("connector_dead_letter"),
]);
const rehearsal = JSON.parse(await readFile("docs/v2-implementation/phase-6b/evidence/preproduction-observability-rehearsal.json", "utf8"));
const backup = JSON.parse(await readFile("docs/v2-implementation/phase-6b/evidence/production-pro-managed-backup-evidence.json", "utf8"));

const checks = {
  hostedResolverStatus: resolver.status,
  serverTimingPresent: Boolean(headers.serverTiming?.includes("resolve-total")),
  platformRequestIdPresent: headers.vercelRequestIdPresent,
  distributedRateLimitSignalPresent: headers.rateLimitBackend === "distributed" && headers.rateLimitRemaining !== null,
  rateCounterSignalAvailable: rateCounter.available,
  publicationAuditSignalAvailable: publicationAudit.available,
  deadLetterSignalAvailable: connectorDeadLetter.available,
  structuredLoggingRehearsed: rehearsal.structuredLogging?.correlationIdRoundTrip === true && rehearsal.structuredLogging?.statusRecorded === true,
  alertDeliveryRehearsed: rehearsal.syntheticAlert?.delivered === true && rehearsal.syntheticAlert?.acknowledged === true,
  managedBackupEvidencePresent: Boolean(backup.generatedAt || backup.production || backup.backups),
};
const hostedSignalsExist = Object.values(checks).every((value) => value === true || value === 200);

process.stdout.write(`${JSON.stringify({
  generatedAt: new Date().toISOString(),
  origin,
  checks,
  signalDetails: { headers, database: { rateCounter, publicationAudit, connectorDeadLetter } },
  acceptedNotificationModel: {
    primary: "GreanLean Platform Owner direct notification",
    businessEscalation: "GreanLean Platform Owner + Orintent business contact",
    technicalEvidence: "platform logs / monitoring / audit records",
    externalAutomatedOnCallPlatform: "NOT YET REQUIRED FOR INVITED PILOT",
  },
  hostedSignalsExist,
}, null, 2)}\n`);
