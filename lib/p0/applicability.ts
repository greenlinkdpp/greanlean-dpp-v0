export const P0_APPLICABILITY_RULE_VERSION = "battery-p0-applicability-2026.08";
export const P0_APPLICABILITY_DISCLAIMER =
  "This is a preliminary product-scope assessment based on the supplied facts and configured rule version. It is not legal certification and must be confirmed against the applicable final legal act and product facts.";

export type ApplicabilityInput = {
  batteryCategory?: string;
  intendedUse?: string;
  ratedEnergyKwh?: number | null;
  euMarketStatus?: "YES" | "NO" | "PLANNED" | "UNKNOWN";
  placingOperatorRole?: string;
  availableEvidence?: string[];
  disclaimerAcknowledged?: boolean;
};

export type ApplicabilityTask = {
  taskType: "APPLICABILITY" | "DATA_GAP" | "EVIDENCE";
  title: string;
  description: string;
  priority: "MEDIUM" | "HIGH" | "CRITICAL";
  responsibleDepartment: string;
};

export type ApplicabilityResult = {
  ruleVersion: string;
  input: ApplicabilityInput;
  result: "PRELIMINARY_APPLICABLE" | "NOT_APPLICABLE" | "PENDING" | "INSUFFICIENT";
  reason: string;
  pendingQuestions: string[];
  disclaimer: string;
  disclaimerAcknowledged: boolean;
  tasks: ApplicabilityTask[];
};

function normalizedCategory(value?: string) {
  return String(value || "").trim().toUpperCase();
}

export function assessBatteryApplicability(input: ApplicabilityInput): ApplicabilityResult {
  const category = normalizedCategory(input.batteryCategory);
  const pendingQuestions: string[] = [];
  const tasks: ApplicabilityTask[] = [];
  const euMarket = input.euMarketStatus || "UNKNOWN";

  if (!category) pendingQuestions.push("Confirm the legal battery category.");
  if (!input.intendedUse?.trim()) pendingQuestions.push("Confirm the battery intended use.");
  if (["INDUSTRIAL", "OTHER"].includes(category) && !(Number(input.ratedEnergyKwh) > 0)) {
    pendingQuestions.push("Confirm the rated energy in kWh.");
  }
  if (euMarket === "UNKNOWN") pendingQuestions.push("Confirm whether the product will be placed on the EU market.");
  if (!input.placingOperatorRole?.trim()) pendingQuestions.push("Confirm the economic operator placing the product on the market.");

  let result: ApplicabilityResult["result"] = "PENDING";
  let reason = "The product scope requires confirmation against the final applicable requirements.";
  if (euMarket === "NO") {
    result = "NOT_APPLICABLE";
    reason = "The supplied scope states that the product is not placed on the EU market.";
  } else if (!category || !input.intendedUse?.trim() || euMarket === "UNKNOWN") {
    result = "INSUFFICIENT";
    reason = "The supplied facts are insufficient for a preliminary scope result.";
  } else if (["LMT", "EV"].includes(category) && ["YES", "PLANNED"].includes(euMarket)) {
    result = "PRELIMINARY_APPLICABLE";
    reason = `${category} batteries in the stated EU-market scope are treated as a preliminary battery-passport pilot scope.`;
  } else if (category === "INDUSTRIAL" && Number(input.ratedEnergyKwh) > 2 && ["YES", "PLANNED"].includes(euMarket)) {
    result = "PRELIMINARY_APPLICABLE";
    reason = "The stated industrial battery rated energy is above 2 kWh and is treated as a preliminary battery-passport pilot scope.";
  } else if (category === "INDUSTRIAL") {
    result = "PENDING";
    reason = "Industrial battery scope at or below 2 kWh requires confirmation; the platform does not infer a mandatory passport duty.";
  } else {
    result = "PENDING";
    reason = "Portable, SLI and other categories remain pending in this configured pilot rule set.";
  }

  for (const question of pendingQuestions) {
    tasks.push({
      taskType: "APPLICABILITY",
      title: question,
      description: "Resolve this input before relying on the preliminary applicability result.",
      priority: result === "INSUFFICIENT" ? "CRITICAL" : "HIGH",
      responsibleDepartment: "Compliance",
    });
  }
  const evidence = new Set((input.availableEvidence || []).map((value) => value.toUpperCase()));
  for (const [code, title] of [
    ["BOM", "Provide the model BOM and material composition"],
    ["TECHNICAL_SPEC", "Provide the rated technical specification"],
    ["OPERATOR_PROFILE", "Complete the economic operator profile"],
  ] as const) {
    if (!evidence.has(code)) {
      tasks.push({
        taskType: code === "OPERATOR_PROFILE" ? "DATA_GAP" : "EVIDENCE",
        title,
        description: `Required pilot input is missing: ${code}.`,
        priority: "HIGH",
        responsibleDepartment: code === "OPERATOR_PROFILE" ? "Compliance" : "Engineering",
      });
    }
  }

  return {
    ruleVersion: P0_APPLICABILITY_RULE_VERSION,
    input,
    result,
    reason,
    pendingQuestions,
    disclaimer: P0_APPLICABILITY_DISCLAIMER,
    disclaimerAcknowledged: Boolean(input.disclaimerAcknowledged),
    tasks,
  };
}

export function validateBatteryTechnicalValues(input: {
  nominalVoltageV?: number | null;
  ratedCapacityAh?: number | null;
  ratedEnergyKwh?: number | null;
  componentPercentages?: number[];
}) {
  const errors: Array<{ code: string; message: string }> = [];
  const voltage = Number(input.nominalVoltageV);
  const capacity = Number(input.ratedCapacityAh);
  const energy = Number(input.ratedEnergyKwh);
  if (voltage > 0 && capacity > 0 && energy > 0) {
    const calculated = voltage * capacity / 1000;
    const difference = Math.abs(calculated - energy) / calculated;
    if (difference > 0.05) {
      errors.push({ code: "BAT-001", message: "Rated energy differs from voltage × capacity by more than 5%." });
    }
  }
  if ([voltage, capacity, energy].some((value) => Number.isFinite(value) && value < 0)) {
    errors.push({ code: "BAT-002", message: "Battery technical values cannot be negative." });
  }
  const percentages = input.componentPercentages || [];
  if (percentages.some((value) => value < 0 || value > 100)) {
    errors.push({ code: "MAT-001", message: "Material percentages must be between 0 and 100%." });
  } else if (percentages.reduce((sum, value) => sum + value, 0) > 100.01) {
    errors.push({ code: "MAT-001", message: "Material percentages cannot exceed 100%." });
  }
  return errors;
}
