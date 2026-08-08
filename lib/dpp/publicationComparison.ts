import {
  CANONICAL_MODULE_CODES,
  type CanonicalField,
  type CanonicalPublicationSnapshot,
} from "./canonicalPublication.ts";

type ComparableFact = {
  key: string;
  legacy: unknown;
  canonical: unknown;
  matched: boolean;
};

function normalize(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value).trim();
}

function allFields(snapshot: CanonicalPublicationSnapshot) {
  return CANONICAL_MODULE_CODES.flatMap((code) => {
    const module = snapshot.modules[code];
    return [
      ...module.fields,
      ...module.records.flatMap((record) => record.fields),
    ];
  });
}

function canonicalField(
  snapshot: CanonicalPublicationSnapshot,
  code: string,
): CanonicalField | undefined {
  return allFields(snapshot).find((field) => field.code === code);
}

function legacyIdentity(data: any) {
  return Array.isArray(data?.digitalIdentity) ? data.digitalIdentity[0] || {} : {};
}

function compareFact(key: string, legacy: unknown, canonical: unknown): ComparableFact {
  return {
    key,
    legacy,
    canonical,
    matched: normalize(legacy) === normalize(canonical),
  };
}

export function compareLegacyAndCanonicalPublicDpp(
  legacy: any,
  canonical: CanonicalPublicationSnapshot,
) {
  const product = legacy?.product || {};
  const identity = legacyIdentity(legacy);
  const facts = [
    compareFact("dppId", product.dpp_id, canonicalField(canonical, "identity.dpp_id")?.value),
    compareFact("productName", product.name, canonicalField(canonical, "identity.product_name")?.value),
    compareFact("brand", product.brand, canonicalField(canonical, "identity.brand")?.value),
    compareFact("sku", product.sku, canonicalField(canonical, "identity.sku")?.value),
    compareFact("upi", identity.product_uuid || product.unique_product_identifier, canonicalField(canonical, "identity.upi")?.value),
    compareFact("gtin", identity.gtin, canonicalField(canonical, "identity.gtin")?.value),
    compareFact("batch", identity.batch_id, canonicalField(canonical, "identity.batch_id")?.value),
    compareFact("serial", identity.serial_id, canonicalField(canonical, "identity.serial_id")?.value),
  ];

  const moduleCounts = Object.fromEntries(
    CANONICAL_MODULE_CODES.map((code) => {
      const module = canonical.modules[code];
      return [
        code,
        module.fields.length
          + module.records.reduce((total, record) => total + record.fields.length, 0),
      ];
    }),
  );
  const differences = facts.filter((fact) => !fact.matched);

  return {
    productId: canonical.publication.productId,
    dppId: canonical.publication.dppId,
    matchedFacts: facts.length - differences.length,
    comparedFacts: facts.length,
    passed: differences.length === 0,
    differences,
    moduleCounts,
  };
}
