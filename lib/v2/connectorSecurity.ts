import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export type ConnectorUrlPolicy = {
  allowedHosts: string[];
  allowLocalMock?: boolean;
  resolveHost?: (hostname: string) => Promise<string[]>;
};

const privateV4 = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^0\./,
];

export function isPrivateAddress(address: string) {
  const normalized = address.toLowerCase().replace(/^::ffff:/, "");
  if (isIP(normalized) === 4) return privateV4.some((pattern) => pattern.test(normalized));
  if (isIP(normalized) === 6) {
    return normalized === "::" || normalized === "::1" || normalized.startsWith("fc")
      || normalized.startsWith("fd") || normalized.startsWith("fe8")
      || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb");
  }
  return false;
}

function normalizedHosts(hosts: string[]) {
  return new Set(hosts.map((host) => host.trim().toLowerCase()).filter(Boolean));
}

export async function validateConnectorUrl(rawUrl: string, policy: ConnectorUrlPolicy) {
  let url: URL;
  try { url = new URL(rawUrl); } catch { throw new Error("CONNECTOR_HOST_NOT_ALLOWED"); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error("CONNECTOR_HOST_NOT_ALLOWED");
  const host = url.hostname.toLowerCase();
  if (!normalizedHosts(policy.allowedHosts).has(host)) throw new Error("CONNECTOR_HOST_NOT_ALLOWED");
  const local = host === "localhost" || host.endsWith(".localhost");
  if (url.protocol !== "https:" && !(policy.allowLocalMock && local)) throw new Error("CONNECTOR_HOST_NOT_ALLOWED");
  const resolver = policy.resolveHost || (async (hostname: string) => {
    const rows = await lookup(hostname, { all: true, verbatim: true });
    return rows.map((row) => row.address);
  });
  const addresses = isIP(host) ? [host] : await resolver(host);
  if (!addresses.length) throw new Error("CONNECTOR_HOST_NOT_ALLOWED");
  if (addresses.some(isPrivateAddress) && !(policy.allowLocalMock && local)) throw new Error("CONNECTOR_HOST_NOT_ALLOWED");
  return url;
}

export async function validateRedirectChain(urls: string[], policy: ConnectorUrlPolicy, maximum = 2) {
  if (urls.length > maximum + 1) throw new Error("CONNECTOR_HOST_NOT_ALLOWED");
  const validated: URL[] = [];
  for (const value of urls) validated.push(await validateConnectorUrl(value, policy));
  return validated;
}

export function assertSafeResponse(contentType: string | null, contentLength: number, maximumBytes = 1_048_576) {
  if (contentLength > maximumBytes) throw new Error("CONNECTOR_EXTERNAL_ERROR");
  const normalized = String(contentType || "").split(";", 1)[0].trim().toLowerCase();
  if (!['application/json', 'text/csv', 'text/plain'].includes(normalized)) throw new Error("CONNECTOR_EXTERNAL_ERROR");
}

export function safeFingerprint(value: string | Uint8Array) {
  return createHash("sha256").update(value).digest("hex");
}

export function verifyWebhookSignature(options: {
  rawBody: string;
  signature: string;
  timestamp: string;
  secret: string;
  now?: number;
  toleranceSeconds?: number;
}) {
  const timestamp = Number(options.timestamp);
  const now = options.now ?? Date.now();
  const tolerance = (options.toleranceSeconds ?? 300) * 1000;
  if (!Number.isFinite(timestamp) || Math.abs(now - timestamp * 1000) > tolerance) throw new Error("WEBHOOK_REPLAY_DETECTED");
  const expected = createHmac("sha256", options.secret).update(`${options.timestamp}.${options.rawBody}`).digest("hex");
  const provided = options.signature.replace(/^sha256=/i, "").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(provided) || !timingSafeEqual(Buffer.from(expected), Buffer.from(provided))) {
    throw new Error("WEBHOOK_SIGNATURE_INVALID");
  }
  return safeFingerprint(options.rawBody);
}

export function redactExternalResult(value: unknown): Record<string, unknown> {
  const secretKeys = /^(authorization|password|secret|token|api[_-]?key|private[_-]?key|credential)$/i;
  const walk = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.slice(0, 100).map(walk);
    if (input && typeof input === "object") {
      return Object.fromEntries(Object.entries(input as Record<string, unknown>)
        .filter(([key]) => !secretKeys.test(key))
        .map(([key, child]) => [key, walk(child)]));
    }
    if (typeof input === "string") return input.length > 2048 ? `${input.slice(0, 2048)}…` : input;
    return input;
  };
  const result = walk(value);
  return result && typeof result === "object" && !Array.isArray(result) ? result as Record<string, unknown> : { result };
}

