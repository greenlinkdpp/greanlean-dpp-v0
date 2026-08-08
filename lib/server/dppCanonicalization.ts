import { createHash } from "node:crypto";

function serializeNumber(value: number) {
  if (!Number.isFinite(value)) {
    throw new TypeError("Canonical JSON does not support non-finite numbers.");
  }
  return JSON.stringify(Object.is(value, -0) ? 0 : value);
}

export function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return serializeNumber(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const entries = Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`);
    return `{${entries.join(",")}}`;
  }
  throw new TypeError(`Canonical JSON does not support ${typeof value}.`);
}

export function sha256Hex(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function canonicalHash(value: unknown) {
  const payload = canonicalJson(value);
  return { payload, hash: sha256Hex(payload) };
}

export function sortSourceRows(rows: Array<Record<string, unknown>>) {
  return [...rows].sort((left, right) => {
    const leftKey = String(left.id || left.field_key || left.created_at || canonicalJson(left));
    const rightKey = String(right.id || right.field_key || right.created_at || canonicalJson(right));
    return leftKey.localeCompare(rightKey);
  });
}
