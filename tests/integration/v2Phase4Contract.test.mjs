import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const tenantRoutes = [
  "app/api/v2/passports/route.ts",
  "app/api/v2/passports/[id]/route.ts",
  "app/api/v2/passports/[id]/integrity/route.ts",
  "app/api/v2/passports/[id]/versions/route.ts",
  "app/api/v2/passports/[id]/versions/[version]/route.ts",
  "app/api/v2/passport-reviews/route.ts",
  "app/api/v2/passport-reviews/[id]/route.ts",
  "app/api/v2/publications/route.ts",
  "app/api/v2/publications/[id]/withdraw/route.ts",
  "app/api/v2/resolver-mappings/route.ts",
];

test("Phase 4 tenant APIs are PDP and feature gated", async () => {
  for (const path of tenantRoutes) {
    const source = await readFile(path, "utf8");
    if (/phase4Routes/.test(source)) continue;
    assert.match(source, /requireV2PolicyContext/, path);
    assert.doesNotMatch(source, /createSupabaseAdminClient/, path);
    assert.match(source, /(?:passport|review|publication|resolver)Feature: true/, path);
  }
  const shared = await readFile("lib/server/v2/phase4Routes.ts", "utf8");
  assert.match(shared, /requireV2PolicyContext/);
  assert.match(shared, /executeIdempotentWrite/);
});

test("Phase 4 writes use persistent idempotency and explicit capabilities", async () => {
  const [routes, repository, approve, reject, publish, withdraw] = await Promise.all([
    readFile("lib/server/v2/phase4Routes.ts", "utf8"),
    readFile("lib/server/v2/phase4Repository.ts", "utf8"),
    readFile("app/api/v2/passport-reviews/[id]/approve/route.ts", "utf8"),
    readFile("app/api/v2/passport-reviews/[id]/reject/route.ts", "utf8"),
    readFile("app/api/v2/publications/route.ts", "utf8"),
    readFile("app/api/v2/publications/[id]/withdraw/route.ts", "utf8"),
  ]);
  for (const capability of ["dpp.create", "dpp.submit_review", "identifier.manage"]) assert.match(routes, new RegExp(capability.replace(".", "\\.")));
  assert.match(approve, /dpp\.approve/);
  assert.match(reject, /dpp\.reject/);
  assert.match(publish, /dpp\.publish/);
  assert.match(withdraw, /dpp\.withdraw/);
  assert.match(repository, /v2_publish_approved_review/);
  assert.match(repository, /REVIEW_APPROVAL_STALE/);
  assert.match(repository, /publication_source !== "V2"/);
  assert.match(repository, /assertVerifiedPolicyContext/);
});

test("public Resolver is immutable-version backed and exposes all required formats", async () => {
  const [source, repository, gs1Compatibility] = await Promise.all([
    readFile("app/api/v2/resolver/[identifier]/route.ts", "utf8"),
    readFile("lib/server/v2/phase4Repository.ts", "utf8"),
    readFile("app/01/[gtin]/[[...segments]]/route.ts", "utf8"),
  ]);
  assert.match(source, /resolvePublicPassport/);
  assert.match(source, /PUBLIC_PROJECTION_DENIED/);
  assert.match(source, /publicHtml/);
  assert.match(source, /publicJsonLd/);
  assert.match(source, /publicPdf/);
  assert.match(source, /QRCode\.toBuffer/);
  assert.match(source, /X-DPP-Payload-Hash/);
  assert.doesNotMatch(source, /canonical_claim|product_model|loadPublicDppData/);
  assert.match(repository, /v2_phase6c_resolve_public_passport/);
  assert.match(repository, /databaseQueryCount: 1/);
  assert.match(repository, /duplicateQueryCount: 0/);
  assert.match(gs1Compatibility, /v2PublicResolverEnabled/);
  assert.match(gs1Compatibility, /\/api\/v2\/resolver\/\$\{encodeURIComponent\(identity\.gtin\)\}/);
});

test("Phase 4 feature flags and errors are declared", async () => {
  const [example, errors] = await Promise.all([readFile(".env.example", "utf8"), readFile("lib/v2/phase4Errors.ts", "utf8")]);
  for (const flag of ["FEATURE_V2_DPP_PASSPORT", "FEATURE_V2_DPP_REVIEW", "FEATURE_V2_DPP_PUBLICATION", "FEATURE_V2_RESOLVER", "FEATURE_V2_PUBLIC_PROJECTION"]) assert.match(example, new RegExp(flag + "=false"));
  for (const code of ["PASSPORT_NOT_FOUND", "CANDIDATE_HASH_MISMATCH", "REVIEW_APPROVAL_STALE", "VERSION_IMMUTABLE", "CURRENT_POINTER_INVALID", "RESOLVER_AMBIGUOUS", "RESOLVER_ALIAS_CYCLE", "PUBLIC_PROJECTION_DENIED", "WITHDRAWN_PASSPORT"]) assert.match(errors, new RegExp(code));
});
