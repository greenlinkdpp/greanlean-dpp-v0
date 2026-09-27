const origin = "https://greanlean-dpp-preprod.vercel.app";
const path = "/api/v2/resolver/DPP-P4-MUJEZBWJ140310?format=json";

function percentile(values, quantile) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * quantile) - 1)];
}

async function run(label, requestCount, concurrency, unique) {
  const values = [];
  const statuses = [];
  const started = performance.now();
  for (let offset = 0; offset < requestCount; offset += concurrency) {
    const batch = Array.from({ length: Math.min(concurrency, requestCount - offset) }, async (_, index) => {
      const suffix = unique ? `&cache_miss=${Date.now()}-${offset + index}` : "";
      const requestStarted = performance.now();
      const response = await fetch(`${origin}${path}${suffix}`, { signal: AbortSignal.timeout(30_000) });
      await response.arrayBuffer();
      values.push(performance.now() - requestStarted);
      statuses.push(response.status);
    });
    await Promise.all(batch);
  }
  const elapsedMs = performance.now() - started;
  return {
    label,
    requestCount,
    concurrency,
    statuses: Object.fromEntries([...new Set(statuses)].map((status) => [status, statuses.filter((candidate) => candidate === status).length])),
    minMs: Number(Math.min(...values).toFixed(2)),
    p50Ms: Number(percentile(values, 0.5).toFixed(2)),
    p95Ms: Number(percentile(values, 0.95).toFixed(2)),
    p99Ms: Number(percentile(values, 0.99).toFixed(2)),
    maxMs: Number(Math.max(...values).toFixed(2)),
    throughputRps: Number((requestCount / (elapsedMs / 1000)).toFixed(2)),
  };
}

const cacheHitBurst = await run("warm-shared-cache-key", 20, 10, false);
const cacheMissBurst = await run("unique-cache-miss", 10, 10, true);
if (cacheHitBurst.statuses[200] !== 20 || cacheMissBurst.statuses[200] !== 10) throw new Error("Hosted burst returned non-200 responses.");
process.stdout.write(`${JSON.stringify({ generatedAt: new Date().toISOString(), cacheHitBurst, cacheMissBurst }, null, 2)}\n`);
