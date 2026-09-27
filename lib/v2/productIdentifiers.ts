export type Phase2IdentifierType =
  | "INTERNAL"
  | "MODEL_CODE"
  | "SKU"
  | "GTIN"
  | "BATCH_NUMBER"
  | "SERIAL_NUMBER"
  | "UPI";

export function isValidGtin(value: string) {
  const digits = value.replace(/\D/g, "");
  if (![8, 12, 13, 14].includes(digits.length)) return false;
  let total = 0;
  for (let index = 0; index < digits.length - 1; index += 1) {
    const fromRight = digits.length - 1 - index;
    total += Number(digits[index]) * (fromRight % 2 === 1 ? 3 : 1);
  }
  return (10 - (total % 10)) % 10 === Number(digits.at(-1));
}

export function normalizeProductIdentifier(type: Phase2IdentifierType, value: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("IDENTIFIER_INVALID");
  }
  if (type === "GTIN") {
    const normalized = value.replace(/\D/g, "");
    if (!isValidGtin(normalized)) throw new Error("IDENTIFIER_INVALID");
    return normalized;
  }
  if (type === "UPI") {
    const normalized = value.trim();
    let parsed: URL;
    try {
      parsed = new URL(normalized);
    } catch {
      throw new Error("IDENTIFIER_INVALID");
    }
    if (parsed.protocol !== "https:" || !parsed.hostname) throw new Error("IDENTIFIER_INVALID");
    return normalized;
  }
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

export function identifierCollisionKey(input: {
  tenantId: string;
  type: Phase2IdentifierType;
  scheme: string;
  issuer?: string | null;
  value: string;
}) {
  const normalized = normalizeProductIdentifier(input.type, input.value);
  const global = input.type === "GTIN" || input.type === "UPI";
  return [
    global ? "GLOBAL" : input.tenantId,
    input.type,
    input.scheme.trim().toUpperCase(),
    (input.issuer || "").trim().toUpperCase(),
    normalized,
  ].join("|");
}
