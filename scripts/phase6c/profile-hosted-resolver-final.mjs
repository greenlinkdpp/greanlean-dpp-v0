const origin = "https://greanlean-dpp-preprod.vercel.app";
const cases = [
  ["dpp-id", "/api/v2/resolver/DPP-P4-MUJEZBWJ140310?format=json"],
  ["gtin", "/api/v2/resolver/7904891679884?format=json"],
  ["legacy-alias", "/api/v2/resolver/legacy-mujezbwj140310?format=json"],
  ["public-json", "/api/v2/public/passports/DPP-P4-MUJEZBWJ140310?format=json"],
  ["public-html", "/api/v2/resolver/DPP-P4-MUJEZBWJ140310?format=html"],
];

function percentile(values, quantile) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * quantile) - 1)];
}

function stats(values) {
  if (!values.length) return null;
  return {
    minMs: Number(Math.min(...values).toFixed(2)),
    medianMs: Number(percentile(values, 0.5).toFixed(2)),
    p95Ms: Number(percentile(values, 0.95).toFixed(2)),
    maxMs: Number(Math.max(...values).toFixed(2)),
    sampleCount: values.length,
  };
}

function parseTiming(value) {
  return Object.fromEntries((value || "").split(",").flatMap((part) => {
    const match = part.trim().match(/^([^;]+);dur=([0-9.]+)/u);
    return match ? [[match[1], Number(match[2])]] : [];
  }));
}

async function request(path, suffix) {
  const started = performance.now();
  const response = await fetch(`${origin}${path}${path.includes("?") ? "&" : "?"}profile=${suffix}`, {
    signal: AbortSignal.timeout(30_000),
  });
  const body = new Uint8Array(await response.arrayBuffer());
  const elapsedMs = performance.now() - started;
  const timing = parseTiming(response.headers.get("server-timing"));
  return {
    status: response.status,
    elapsedMs,
    timing,
    edgeProxyResidualMs: Math.max(0, elapsedMs - Number(timing["rate-limit-admission"] || 0) - Number(timing["route-total"] || 0)),
    bytes: body.length,
    contentEncoding: response.headers.get("content-encoding") || "identity",
    cache: response.headers.get("x-vercel-cache") || "NONE",
    queryCount: Number(response.headers.get("x-dpp-resolver-query-count") || 0),
  };
}

const results = [];
for (const [label, path] of cases) {
  const cold = await request(path, `cold-${Date.now()}`);
  const warm = [];
  for (let index = 0; index < 5; index += 1) warm.push(await request(path, `warm-${index}`));
  if (cold.status !== 200 || warm.some((sample) => sample.status !== 200)) throw new Error(`${label} profiling returned a non-200 response.`);
  const segmentNames = [...new Set(warm.flatMap((sample) => Object.keys(sample.timing)))];
  results.push({
    label,
    path,
    cold: {
      elapsedMs: Number(cold.elapsedMs.toFixed(2)),
      serverTiming: cold.timing,
      bytes: cold.bytes,
      contentEncoding: cold.contentEncoding,
      cache: cold.cache,
      queryCount: cold.queryCount,
    },
    warm: {
      clientTotal: stats(warm.map((sample) => sample.elapsedMs)),
      edgeProxyResidual: stats(warm.map((sample) => sample.edgeProxyResidualMs)),
      segments: Object.fromEntries(segmentNames.map((name) => [name, stats(warm.map((sample) => sample.timing[name]).filter(Number.isFinite))])),
      payloadBytes: [...new Set(warm.map((sample) => sample.bytes))],
      contentEncoding: [...new Set(warm.map((sample) => sample.contentEncoding))],
      cacheStates: Object.fromEntries([...new Set(warm.map((sample) => sample.cache))].map((state) => [state, warm.filter((sample) => sample.cache === state).length])),
      queryCounts: [...new Set(warm.map((sample) => sample.queryCount))],
    },
  });
}

process.stdout.write(`${JSON.stringify({ generatedAt: new Date().toISOString(), origin, samplesPerPath: 6, results }, null, 2)}\n`);
