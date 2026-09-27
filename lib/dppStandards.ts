import baseline from "../config/dpp/eu-dpp-harmonised-standards-v2026.1.json" with { type: "json" };

export type DppStandardAssessmentStatus = "not_assessed" | "partial" | "verified";

export type DppStandardAssessment = {
  reference: string;
  title: string;
  status: DppStandardAssessmentStatus;
  evidence: string[];
  gaps: string[];
};

export const EU_DPP_STANDARDS_BASELINE = {
  baselineVersion: baseline.baselineVersion,
  decision: baseline.decision,
  decisionDate: baseline.decisionDate,
  officialJournalDate: baseline.officialJournalDate,
  officialUrl: baseline.officialUrl,
  assessmentDate: baseline.assessmentDate,
  claimPolicy: baseline.claimPolicy,
  standards: baseline.standards as DppStandardAssessment[],
};

export function dppStandardsReadiness() {
  const standards = EU_DPP_STANDARDS_BASELINE.standards;
  const verified = standards.filter((standard) => standard.status === "verified").length;
  const partial = standards.filter((standard) => standard.status === "partial").length;
  const notAssessed = standards.filter((standard) => standard.status === "not_assessed").length;
  const openGaps = standards.reduce((total, standard) => total + standard.gaps.length, 0);
  return {
    total: standards.length,
    verified,
    partial,
    notAssessed,
    openGaps,
    conformityClaimAllowed: standards.length > 0 && verified === standards.length && openGaps === 0,
  };
}
