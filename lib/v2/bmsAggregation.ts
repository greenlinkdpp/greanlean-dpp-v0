import { safeFingerprint } from "./connectorSecurity.ts";

export type BmsSample = {
  eventId: string;
  deviceId: string;
  itemId: string;
  timestamp: string;
  soc?: number;
  soh?: number;
  temperature?: number;
  voltage?: number;
  current?: number;
};

const metrics = ["soc", "soh", "temperature", "voltage", "current"] as const;

export function aggregateBmsSamples(samples: BmsSample[], options: {
  expectedDeviceId: string;
  expectedItemId: string;
  now?: number;
  replayToleranceMs?: number;
  thresholds?: Partial<Record<(typeof metrics)[number], { min?: number; max?: number }>>;
}) {
  if (!samples.length) throw new Error("CONNECTOR_CONFIG_INVALID");
  if (samples.some((sample) => sample.deviceId !== options.expectedDeviceId || sample.itemId !== options.expectedItemId)) {
    throw new Error("BMS_DEVICE_BINDING_INVALID");
  }
  if (new Set(samples.map((sample) => sample.eventId)).size !== samples.length) throw new Error("WEBHOOK_REPLAY_DETECTED");
  const now = options.now ?? Date.now();
  const tolerance = options.replayToleranceMs ?? 86_400_000;
  const times = samples.map((sample) => Date.parse(sample.timestamp));
  if (times.some((value) => !Number.isFinite(value) || value < now - tolerance || value > now + 300_000)) throw new Error("WEBHOOK_REPLAY_DETECTED");
  const aggregate: Record<string, unknown> = {};
  const events: Array<{ metric: string; rule: string; value: number; timestamp: string }> = [];
  for (const metric of metrics) {
    const values = samples.flatMap((sample) => typeof sample[metric] === "number" ? [{ value: sample[metric] as number, timestamp: sample.timestamp }] : []);
    if (!values.length) continue;
    const latest = values.reduce((a, b) => Date.parse(a.timestamp) >= Date.parse(b.timestamp) ? a : b);
    aggregate[metric] = { latest: latest.value, min: Math.min(...values.map((row) => row.value)), max: Math.max(...values.map((row) => row.value)), avg: values.reduce((sum, row) => sum + row.value, 0) / values.length };
    const threshold = options.thresholds?.[metric];
    for (const row of values) {
      if (threshold?.min !== undefined && row.value < threshold.min) events.push({ metric, rule: "BELOW_MIN", ...row });
      if (threshold?.max !== undefined && row.value > threshold.max) events.push({ metric, rule: "ABOVE_MAX", ...row });
    }
  }
  return {
    deviceId: options.expectedDeviceId,
    itemId: options.expectedItemId,
    windowStart: new Date(Math.min(...times)).toISOString(),
    windowEnd: new Date(Math.max(...times)).toISOString(),
    sampleCount: samples.length,
    aggregate,
    thresholdEvents: events,
    sourcePayloadHash: safeFingerprint(JSON.stringify(samples)),
    algorithmVersion: "bms-window-v1",
  };
}

export function bmsClaimCandidate(snapshot: ReturnType<typeof aggregateBmsSamples>, rule: { enabled: boolean; metric: keyof typeof snapshot.aggregate; fieldDefinitionId: string; schemaVersionId: string }) {
  if (!rule.enabled) return null;
  const value = snapshot.aggregate[rule.metric];
  if (!value) return null;
  return {
    fieldDefinitionId: rule.fieldDefinitionId,
    schemaVersionId: rule.schemaVersionId,
    resolutionState: "OVERRIDE",
    value,
    provenance: {
      deviceId: snapshot.deviceId,
      windowStart: snapshot.windowStart,
      windowEnd: snapshot.windowEnd,
      algorithmVersion: snapshot.algorithmVersion,
      sourcePayloadHash: snapshot.sourcePayloadHash,
    },
  };
}
