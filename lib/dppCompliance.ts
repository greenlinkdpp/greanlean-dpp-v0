export type Gs1IdentityInput = {
  gtin?: string | null;
  batchId?: string | null;
  serialId?: string | null;
  baseUrl?: string | null;
};

function clean(value?: string | null) {
  const text = String(value || "").trim();
  return text || null;
}

export function normalizeGtin(value?: string | null) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return null;
  if (![8, 12, 13, 14].includes(digits.length)) return null;
  return digits.padStart(14, "0");
}

export function isValidGtin(value?: string | null) {
  const gtin = normalizeGtin(value);
  if (!gtin) return false;
  const checkDigit = Number(gtin.slice(-1));
  const body = gtin.slice(0, -1);
  const sum = body
    .split("")
    .reverse()
    .reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === checkDigit;
}

export function buildUniqueProductIdentifier(input: Gs1IdentityInput) {
  const gtin = normalizeGtin(input.gtin);
  if (!gtin) return null;
  const parts = [`01:${gtin}`];
  const batchId = clean(input.batchId);
  const serialId = clean(input.serialId);
  if (batchId) parts.push(`10:${batchId}`);
  if (serialId) parts.push(`21:${serialId}`);
  return parts.join("|");
}

export function buildGs1DigitalLink(input: Gs1IdentityInput) {
  const gtin = normalizeGtin(input.gtin);
  if (!gtin) return null;

  const base = clean(input.baseUrl) || "https://www.greanlean.com";
  const root = base.replace(/\/+$/, "");
  const path = [`01`, gtin];
  const batchId = clean(input.batchId);
  const serialId = clean(input.serialId);

  if (batchId) path.push("10", encodeURIComponent(batchId));
  if (serialId) path.push("21", encodeURIComponent(serialId));

  return `${root}/${path.join("/")}`;
}

export function parseGs1DigitalLinkSegments(gtin: string, segments: string[] = []) {
  const result: { gtin: string | null; batchId: string | null; serialId: string | null } = {
    gtin: normalizeGtin(gtin),
    batchId: null,
    serialId: null,
  };

  for (let index = 0; index < segments.length; index += 2) {
    const ai = segments[index];
    const value = segments[index + 1] ? decodeURIComponent(segments[index + 1]) : null;
    if (ai === "10") result.batchId = value;
    if (ai === "21") result.serialId = value;
  }

  return result;
}

export function stableStringify(value: any): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

export async function sha256Hex(value: any) {
  const payload = typeof value === "string" ? value : stableStringify(value);
  const bytes = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
