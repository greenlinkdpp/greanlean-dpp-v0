import { createClient } from "@supabase/supabase-js";
import { compareLegacyAndCanonicalPublicDpp } from "../../lib/dpp/publicationComparison.ts";
import { loadLegacyPublicDppData } from "../../lib/dpp/publicDppRepository.ts";
import {
  buildDppPublicationCandidate,
  projectionForAudience,
  projectionContainsRestrictedFields,
} from "../../lib/server/dppPublicationCandidate.ts";

const PRODUCT_IDENTIFIERS = [
  "DPP-LMT-BAT-48V15AH",
  "DPP-GV-ESS-14K3-000001",
  "DPP-SFJK-31-1-REC",
  "DPP-CE-EARBUDS-001",
];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and server-only SUPABASE_SERVICE_ROLE_KEY are required.",
  );
}

async function main() {
  const admin = createClient(supabaseUrl!, serviceRoleKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const reports: Array<Record<string, unknown> & { passed: boolean }> = [];
  for (const identifier of PRODUCT_IDENTIFIERS) {
    const { data: product, error: productError } = await admin
      .from("products")
      .select("id,dpp_id")
      .eq("dpp_id", identifier)
      .maybeSingle();
    if (productError) throw productError;
    if (!product) {
      reports.push({ dppId: identifier, passed: false, reason: "PRODUCT_NOT_FOUND" });
      continue;
    }

    const [candidate, legacy] = await Promise.all([
      buildDppPublicationCandidate(admin, product.id),
      loadLegacyPublicDppData(admin, identifier, true),
    ]);
    if (!legacy) {
      reports.push({ dppId: identifier, passed: false, reason: "LEGACY_DPP_NOT_FOUND" });
      continue;
    }

    const publicProjection = projectionForAudience(candidate, "PUBLIC");
    const comparison = compareLegacyAndCanonicalPublicDpp(legacy, publicProjection);
    reports.push({
      ...comparison,
      sourceFingerprint: candidate.sourceFingerprint,
      snapshotHash: candidate.snapshotHash,
      publicProjectionRestrictedFieldLeak: projectionContainsRestrictedFields(
        publicProjection,
        "PUBLIC",
      ),
    });
  }

  const passed = reports.every((report) =>
    report.passed && report.publicProjectionRestrictedFieldLeak === false
  );
  process.stdout.write(`${JSON.stringify({ passed, reports }, null, 2)}\n`);
  if (!passed) process.exitCode = 1;
}

void main();
