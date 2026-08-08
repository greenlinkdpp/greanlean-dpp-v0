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

export type ApplicabilityPresentation = {
  ruleVersion: string;
  result: string;
  reason: string;
  tasks: Array<ApplicabilityTask & {
    displayTitle: string;
    displayDescription: string;
    displayPriority: string;
  }>;
};

const zhTaskCopy: Record<string, { title: string; description: string }> = {
  "Confirm the legal battery category.": {
    title: "确认法定电池类别",
    description: "在采用初步适用性结果前，请确认产品所属的法定电池类别。",
  },
  "Confirm the battery intended use.": {
    title: "确认电池预期用途",
    description: "请补充电池的目标设备、使用场景及主要用途。",
  },
  "Confirm the rated energy in kWh.": {
    title: "确认额定能量",
    description: "请按千瓦时补充并核实产品的额定能量。",
  },
  "Confirm whether the product will be placed on the EU market.": {
    title: "确认欧盟市场投放状态",
    description: "请确认产品是否已经或计划投放欧盟市场。",
  },
  "Confirm the economic operator placing the product on the market.": {
    title: "确认市场投放责任主体",
    description: "请确认负责将产品投放市场的经济运营者身份。",
  },
  "Provide the model BOM and material composition": {
    title: "提供型号物料清单和材料组成",
    description: "请提供型号级物料清单、材料名称及组成比例。",
  },
  "Provide the rated technical specification": {
    title: "提供额定技术规格",
    description: "请提供额定电压、容量、能量及其他适用技术参数。",
  },
  "Complete the economic operator profile": {
    title: "完善经济运营者档案",
    description: "请补充责任主体的法定名称、角色、注册地址和联系方式。",
  },
};

function localizedCategory(category: string, locale: "zh" | "en") {
  const labels = locale === "zh"
    ? {
        LMT: "轻型交通工具电池（LMT）",
        EV: "电动汽车电池（EV）",
        INDUSTRIAL: "工业电池",
        PORTABLE: "便携式电池",
        SLI: "启动、照明和点火电池（SLI）",
      }
    : {
        LMT: "Light means of transport (LMT)",
        EV: "Electric vehicle (EV)",
        INDUSTRIAL: "Industrial",
        PORTABLE: "Portable",
        SLI: "Starting, lighting and ignition (SLI)",
      };
  return labels[category as keyof typeof labels] || category;
}

export function presentBatteryApplicability(
  assessment: ApplicabilityResult,
  locale: "zh" | "en",
): ApplicabilityPresentation {
  const category = normalizedCategory(assessment.input.batteryCategory);
  const categoryLabel = localizedCategory(category, locale);
  const status = locale === "zh"
    ? {
        PRELIMINARY_APPLICABLE: "初步判断适用",
        NOT_APPLICABLE: "初步判断不适用",
        PENDING: "待进一步确认",
        INSUFFICIENT: "信息不足",
      }
    : {
        PRELIMINARY_APPLICABLE: "Preliminarily applicable",
        NOT_APPLICABLE: "Preliminarily not applicable",
        PENDING: "Further confirmation required",
        INSUFFICIENT: "Insufficient information",
      };

  let reason = assessment.reason;
  if (locale === "zh") {
    if (assessment.result === "NOT_APPLICABLE") {
      reason = "根据已填写的信息，该产品不投放欧盟市场，因此本次初步判断为不适用。";
    } else if (assessment.result === "INSUFFICIENT") {
      reason = "当前产品信息不足，暂时无法形成适用性初步判断。";
    } else if (assessment.result === "PRELIMINARY_APPLICABLE" && category === "INDUSTRIAL") {
      reason = "该工业电池的额定能量超过 2 千瓦时，初步纳入电池护照适用范围。";
    } else if (assessment.result === "PRELIMINARY_APPLICABLE") {
      reason = `${categoryLabel}面向欧盟市场投放，初步纳入电池护照适用范围。`;
    } else if (category === "INDUSTRIAL") {
      reason = "额定能量不超过 2 千瓦时的工业电池仍需进一步确认，平台不会自动认定其承担强制护照义务。";
    } else {
      reason = "便携式电池、启动照明和点火电池及其他类别，在当前规则版本下仍需进一步确认。";
    }
  }

  return {
    ruleVersion: locale === "zh"
      ? "规则版本：2026.08（电池适用性初评）"
      : "Rule version: 2026.08 (battery applicability assessment)",
    result: status[assessment.result],
    reason,
    tasks: assessment.tasks.map((task) => {
      const translated = zhTaskCopy[task.title];
      return {
        ...task,
        displayTitle: locale === "zh" && translated ? translated.title : task.title,
        displayDescription: locale === "zh" && translated
          ? translated.description
          : task.description,
        displayPriority: locale === "zh"
          ? { CRITICAL: "紧急", HIGH: "高", MEDIUM: "中" }[task.priority]
          : { CRITICAL: "Critical", HIGH: "High", MEDIUM: "Medium" }[task.priority],
      };
    }),
  };
}

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
