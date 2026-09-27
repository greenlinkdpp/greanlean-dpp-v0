const origin = "https://greanlean-dpp-preprod.vercel.app";
const path = "/api/v2/resolver/DPP-P4-MUJEZBWJ140310?format=json";

function percentile(values, quantile) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * quantile) - 1)];
}

function parseTiming(value) {
  return Object.fromEntries((value || "").split(",").flatMap((part) => {
    const match = part.trim().match(/^([^;]+);dur=([0-9.]+)/u);
    return match ? [[match[1], Number(match[2])]] : [];
  }));
}

function timingStats(values) {
  if (!values.length) return null;
  return {
    minMs: Number(Math.min(...values).toFixed(2)),
    medianMs: Number(percentile(values, 0.5).toFixed(2)),
    p95Ms: Number(percentile(values, 0.95).toFixed(2)),
    maxMs: Number(Math.max(...values).toFixed(2)),
    sampleCount: values.length,
  };
}

async function run(label, requestCount, concurrency) {
  const durations = [];
  const statuses = [];
  const failures = [];
  const serverTimings = [];
  const cacheStates = [];
  const started = performance.now();
  for (let offset = 0; offset < requestCount; offset += concurrency) {
    const batch = Array.from({ length: Math.min(concurrency, requestCount - offset) }, async (_, index) => {
      const requestStarted = performance.now();
      try {
        const response = await fetch(`${origin}${path}&pilot_probe=${label}-${Date.now()}-${offset + index}`, {
          signal: AbortSignal.timeout(30_000),
        });
        await response.arrayBuffer();
        durations.push(performance.now() - requestStarted);
        statuses.push(response.status);
        serverTimings.push(parseTiming(response.headers.get("server-timing")));
        cacheStates.push(response.headers.get("x-vercel-cache") || "NONE");
      } catch (error) {
        failures.push(error instanceof Error ? error.name : "request-error");
      }
    });
    await Promise.all(batch);
  }
  const elapsedMs = performance.now() - started;
  const successDurations = durations.filter((_, index) => statuses[index] === 200);
  const failureCount = failures.length + statuses.filter((status) => status !== 200).length;
  const timingNames = [...new Set(serverTimings.flatMap((timing) => Object.keys(timing)))];
  return {
    label,
    requestCount,
    concurrency,
    statuses: Object.fromEntries([...new Set(statuses)].map((status) => [status, statuses.filter((candidate) => candidate === status).length])),
    transportFailures: failures.length,
    errorRate: Number((failureCount / requestCount).toFixed(4)),
    p50Ms: successDurations.length ? Number(percentile(successDurations, 0.50).toFixed(2)) : null,
    p95Ms: successDurations.length ? Number(percentile(successDurations, 0.95).toFixed(2)) : null,
    p99Ms: successDurations.length ? Number(percentile(successDurations, 0.99).toFixed(2)) : null,
    maxMs: successDurations.length ? Number(Math.max(...successDurations).toFixed(2)) : null,
    throughputRps: Number((requestCount / (elapsedMs / 1000)).toFixed(2)),
    cacheStates: Object.fromEntries([...new Set(cacheStates)].map((state) => [state, cacheStates.filter((candidate) => candidate === state).length])),
    serverTiming: Object.fromEntries(timingNames.map((name) => [name, timingStats(serverTimings.map((timing) => timing[name]).filter(Number.isFinite))])),
  };
}

const profiles = [
  await run("normal-concurrency-1", 30, 1),
  await run("normal-concurrency-3", 30, 3),
  await run("burst-concurrency-5", 30, 5),
];
const p95SloMs = 2500;
const errorRateSlo = 0.01;
const assessed = profiles.map((profile) => ({
  ...profile,
  latencyHeadroomMs: profile.p95Ms === null ? null : Number((p95SloMs - profile.p95Ms).toFixed(2)),
  latencyHeadroomPercent: profile.p95Ms === null ? null : Number((((p95SloMs - profile.p95Ms) / p95SloMs) * 100).toFixed(2)),
  pass: profile.p95Ms !== null && profile.p95Ms <= p95SloMs && profile.errorRate < errorRateSlo,
}));

process.stdout.write(`${JSON.stringify({
  generatedAt: new Date().toISOString(),
  origin,
  scope: {
    tenantCount: 1,
    modelLimit: 30,
    passportLimit: 5000,
    normalConcurrency: "1-3",
    burstConcurrency: 5,
    resolverP95SloMs: p95SloMs,
    errorRateSlo: "<1%",
    observationWindowDays: 7,
  },
  profiles: assessed,
  overallPass: assessed.every((profile) => profile.pass),
}, null, 2)}\n`);
