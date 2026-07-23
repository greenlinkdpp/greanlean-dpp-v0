"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import { useLanguage } from "@/components/LanguageProvider";

type FieldTemplate = {
  id: string;
  profile_key: string;
  module_key: string | null;
  field_key: string;
  field_label: string;
  field_label_zh: string | null;
  data_type: string | null;
  unit: string | null;
  required: boolean | null;
  evidence_required: boolean | null;
  visibility_level: string | null;
  validation_hint: string | null;
  requirement_level?: string | null;
  regulation_reference?: string | null;
  access_rights?: string | null;
  granularity_level?: string | null;
  sort_order: number | null;
};

type SectorFieldValue = {
  id?: string;
  field_key: string;
  field_value: string | null;
  evidence_status: string | null;
  source_type: string | null;
  visibility_level: string | null;
};

type Props = {
  productId: string;
  profileKey?: string | null;
  title: string;
};

const EVIDENCE_STATUSES = ["pending", "declared", "verified", "estimated", "not_applicable"];
const BATTERY_CORE_FIELDS: Array<Omit<FieldTemplate, "id" | "profile_key">> = [
  { module_key: "dpp_information", field_key: "dpp_schema_version", field_label: "DPP schema version", field_label_zh: "DPP Schema 版本", data_type: "text", unit: null, required: true, evidence_required: false, visibility_level: "public", requirement_level: "standard_ready", regulation_reference: "BatteryPass-Ready Longlist v1.3 / ESPR-JTC-24 readiness", access_rights: "public", granularity_level: "model", validation_hint: "Reference the DPP instance schema version used by this product passport.", sort_order: 1 },
  { module_key: "dpp_information", field_key: "dpp_status", field_label: "DPP status", field_label_zh: "DPP 状态", data_type: "text", unit: null, required: true, evidence_required: false, visibility_level: "public", requirement_level: "standard_ready", regulation_reference: "BatteryPass-Ready Longlist v1.3", access_rights: "public", granularity_level: "model", validation_hint: "Draft, active, withdrawn, archived or similar status used for the passport instance.", sort_order: 2 },
  { module_key: "identifiers", field_key: "unique_battery_passport_identifier", field_label: "Unique battery passport identifier", field_label_zh: "唯一电池护照标识", data_type: "text", unit: null, required: true, evidence_required: false, visibility_level: "public", requirement_level: "mandatory", regulation_reference: "Battery Regulation (EU) 2023/1542, battery passport identifier", access_rights: "public", granularity_level: "item", validation_hint: "Use the DPP ID or registered battery passport identifier.", sort_order: 10 },
  { module_key: "identifiers", field_key: "unique_battery_identifier", field_label: "Unique battery identifier", field_label_zh: "唯一电池标识 / UPI", data_type: "text", unit: null, required: true, evidence_required: false, visibility_level: "public", requirement_level: "mandatory", regulation_reference: "Battery Regulation (EU) 2023/1542, unique battery identifier", access_rights: "public", granularity_level: "item", validation_hint: "Usually derived from GTIN, batch and serial identifiers.", sort_order: 11 },
  { module_key: "identifiers", field_key: "battery_model_identifier", field_label: "Battery model identifier", field_label_zh: "电池型号标识", data_type: "text", unit: null, required: true, evidence_required: false, visibility_level: "public", requirement_level: "mandatory", regulation_reference: "BatteryPass-Ready Longlist v1.3 identifiers", access_rights: "public", granularity_level: "model", validation_hint: "Battery model identifier used by manufacturer or responsible economic operator.", sort_order: 12 },
  { module_key: "identifiers", field_key: "battery_serial_number", field_label: "Battery serial number", field_label_zh: "电池序列号", data_type: "text", unit: null, required: true, evidence_required: false, visibility_level: "public", requirement_level: "mandatory", regulation_reference: "BatteryPass-Ready Longlist v1.3 identifiers", access_rights: "public", granularity_level: "item", validation_hint: "Serial number for item-level battery passport.", sort_order: 13 },
  { module_key: "economic_operator", field_key: "economic_operator_information", field_label: "Economic operator information", field_label_zh: "经济运营者信息", data_type: "text", unit: null, required: true, evidence_required: false, visibility_level: "public", requirement_level: "mandatory", regulation_reference: "Battery Regulation (EU) 2023/1542 economic operator information", access_rights: "public", granularity_level: "model", validation_hint: "Responsible economic operator name, address and contact reference.", sort_order: 20 },
  { module_key: "economic_operator", field_key: "manufacturer_information", field_label: "Manufacturer information", field_label_zh: "制造商信息", data_type: "text", unit: null, required: true, evidence_required: false, visibility_level: "public", requirement_level: "mandatory", regulation_reference: "Battery Regulation (EU) 2023/1542 manufacturer information", access_rights: "public", granularity_level: "model", validation_hint: "Manufacturer legal name and relevant location information.", sort_order: 21 },
  { module_key: "economic_operator", field_key: "manufacturing_place", field_label: "Manufacturing place", field_label_zh: "制造地点", data_type: "text", unit: null, required: true, evidence_required: false, visibility_level: "public", requirement_level: "mandatory", regulation_reference: "BatteryPass-Ready Longlist v1.3 product data", access_rights: "public", granularity_level: "model", validation_hint: "Country, region, city and facility where available.", sort_order: 22 },
  { module_key: "product_data", field_key: "manufacturing_date", field_label: "Manufacturing date", field_label_zh: "制造日期", data_type: "date", unit: null, required: true, evidence_required: false, visibility_level: "public", requirement_level: "mandatory", regulation_reference: "BatteryPass-Ready Longlist v1.3 product data", access_rights: "public", granularity_level: "item", validation_hint: "Date of manufacture or production release.", sort_order: 30 },
  { module_key: "product_data", field_key: "warranty_period", field_label: "Warranty period of the battery", field_label_zh: "电池质保期", data_type: "text", unit: null, required: true, evidence_required: false, visibility_level: "public", requirement_level: "mandatory", regulation_reference: "BatteryPass-Ready Longlist v1.3 product data", access_rights: "public", granularity_level: "model", validation_hint: "Example: 8 years or 160,000 km; include condition where applicable.", sort_order: 31 },
  { module_key: "product_data", field_key: "battery_category", field_label: "Battery category", field_label_zh: "电池类别", data_type: "text", unit: null, required: true, evidence_required: false, visibility_level: "public", requirement_level: "mandatory", regulation_reference: "Battery Regulation (EU) 2023/1542 battery categories", access_rights: "public", granularity_level: "model", validation_hint: "EV, LMT, industrial, stationary industrial above 2 kWh, etc.", sort_order: 32 },
  { module_key: "product_data", field_key: "battery_mass", field_label: "Battery mass", field_label_zh: "电池质量", data_type: "number", unit: "kg", required: true, evidence_required: false, visibility_level: "public", requirement_level: "mandatory", regulation_reference: "BatteryPass-Ready Longlist v1.3 product data", access_rights: "public", granularity_level: "model", validation_hint: "Mass of the battery in kg.", sort_order: 33 },
  { module_key: "product_data", field_key: "battery_status", field_label: "Battery status", field_label_zh: "电池状态", data_type: "text", unit: null, required: true, evidence_required: false, visibility_level: "public", requirement_level: "mandatory", regulation_reference: "BatteryPass-Ready Longlist v1.3 product data", access_rights: "public", granularity_level: "item", validation_hint: "Example: original, reused, repurposed, remanufactured, waste.", sort_order: 34 },
  { module_key: "carbon_footprint", field_key: "carbon_footprint_per_kwh", field_label: "Carbon footprint per functional unit", field_label_zh: "单位功能碳足迹", data_type: "number", unit: "kgCO2-eq/kWh", required: true, evidence_required: true, visibility_level: "public", requirement_level: "mandatory", regulation_reference: "Battery Regulation (EU) 2023/1542 carbon footprint declaration", access_rights: "public", granularity_level: "model", validation_hint: "Battery carbon footprint per kWh; link LCA or carbon footprint declaration evidence.", sort_order: 40 },
  { module_key: "carbon_footprint", field_key: "carbon_footprint_per_lifecycle_stage", field_label: "Carbon footprint per lifecycle stage", field_label_zh: "各生命周期阶段碳足迹", data_type: "text", unit: "kgCO2-eq", required: true, evidence_required: true, visibility_level: "public", requirement_level: "mandatory", regulation_reference: "Battery Regulation (EU) 2023/1542 carbon footprint declaration", access_rights: "public", granularity_level: "model", validation_hint: "Manufacturing, distribution, use and end-of-life values where applicable.", sort_order: 41 },
  { module_key: "materials", field_key: "battery_chemistry", field_label: "Battery chemistry", field_label_zh: "电池化学体系", data_type: "text", unit: null, required: true, evidence_required: false, visibility_level: "public", requirement_level: "mandatory", regulation_reference: "BatteryPass-Ready Longlist v1.3 materials", access_rights: "public", granularity_level: "model", validation_hint: "Example: Li-ion NMC, LFP, LCO.", sort_order: 50 },
  { module_key: "materials", field_key: "critical_raw_materials", field_label: "Critical raw materials", field_label_zh: "关键原材料", data_type: "text", unit: null, required: true, evidence_required: true, visibility_level: "public", requirement_level: "mandatory", regulation_reference: "Battery Regulation (EU) 2023/1542 materials and composition", access_rights: "public", granularity_level: "model", validation_hint: "Declare relevant critical raw materials such as cobalt, lithium, nickel, natural graphite where applicable.", sort_order: 51 },
  { module_key: "materials", field_key: "hazardous_substances", field_label: "Hazardous substances", field_label_zh: "有害物质", data_type: "text", unit: null, required: true, evidence_required: true, visibility_level: "public", requirement_level: "mandatory", regulation_reference: "Battery Regulation (EU) 2023/1542 substance restrictions and information", access_rights: "public", granularity_level: "model", validation_hint: "Link test reports or supplier declarations for restricted and hazardous substances.", sort_order: 52 },
  { module_key: "performance_durability", field_key: "rated_capacity", field_label: "Rated capacity", field_label_zh: "额定容量", data_type: "number", unit: "Ah", required: true, evidence_required: true, visibility_level: "public", requirement_level: "mandatory", regulation_reference: "BatteryPass-Ready Longlist v1.3 performance and durability", access_rights: "public", granularity_level: "model", validation_hint: "Rated capacity. Use value plus unit.", sort_order: 60 },
  { module_key: "performance_durability", field_key: "rated_energy", field_label: "Rated energy", field_label_zh: "额定能量", data_type: "number", unit: "kWh", required: true, evidence_required: true, visibility_level: "public", requirement_level: "mandatory", regulation_reference: "BatteryPass-Ready Longlist v1.3 performance and durability", access_rights: "public", granularity_level: "model", validation_hint: "Rated battery energy in kWh.", sort_order: 61 },
  { module_key: "performance_durability", field_key: "expected_lifetime", field_label: "Expected lifetime", field_label_zh: "预期寿命", data_type: "text", unit: null, required: true, evidence_required: true, visibility_level: "public", requirement_level: "mandatory", regulation_reference: "Battery Regulation (EU) 2023/1542 performance and durability", access_rights: "public", granularity_level: "model", validation_hint: "Expected lifetime in cycles, years, km or equivalent category-specific unit.", sort_order: 62 },
  { module_key: "performance_durability", field_key: "state_of_health", field_label: "State of health SoH", field_label_zh: "健康状态 SoH", data_type: "number", unit: "%", required: false, evidence_required: false, visibility_level: "professional", requirement_level: "standard_ready", regulation_reference: "Battery Regulation (EU) 2023/1542 Annex XIII Part B(4)", access_rights: "legitimate-interest users only", granularity_level: "item", validation_hint: "Store item-level SoH as a timestamped restricted snapshot. Never expose it through the public passport.", sort_order: 63 },
  { module_key: "performance_durability", field_key: "state_of_charge", field_label: "State of charge SoC", field_label_zh: "荷电状态 SoC", data_type: "number", unit: "%", required: false, evidence_required: false, visibility_level: "professional", requirement_level: "standard_ready", regulation_reference: "Battery Regulation (EU) 2023/1542 Annex XIII Part B(4)", access_rights: "legitimate-interest users only", granularity_level: "item", validation_hint: "Store item-level SoC as a timestamped restricted snapshot. Never expose it through the public passport.", sort_order: 64 },
  { module_key: "circularity", field_key: "recycled_content_share", field_label: "Recycled content share", field_label_zh: "再生成分比例", data_type: "text", unit: "%", required: true, evidence_required: true, visibility_level: "public", requirement_level: "mandatory", regulation_reference: "Battery Regulation (EU) 2023/1542 recycled content declaration", access_rights: "public", granularity_level: "model", validation_hint: "Declare recycled cobalt, lithium, nickel and lead shares where applicable.", sort_order: 70 },
  { module_key: "circularity", field_key: "separate_collection_symbol", field_label: "Separate collection symbol", field_label_zh: "分类收集标识", data_type: "text", unit: null, required: true, evidence_required: true, visibility_level: "public", requirement_level: "mandatory", regulation_reference: "Battery Regulation (EU) 2023/1542 labelling and symbols", access_rights: "public", granularity_level: "model", validation_hint: "Reference label artwork or compliance declaration.", sort_order: 71 },
  { module_key: "circularity", field_key: "dismantling_and_removal_information", field_label: "Dismantling and removal information", field_label_zh: "拆解与移除信息", data_type: "text", unit: null, required: true, evidence_required: false, visibility_level: "public", requirement_level: "mandatory", regulation_reference: "Battery Regulation (EU) 2023/1542 circularity and end-of-life information", access_rights: "public", granularity_level: "model", validation_hint: "Instructions for safe removal, dismantling and treatment.", sort_order: 72 },
  { module_key: "due_diligence", field_key: "due_diligence_report", field_label: "Due diligence report", field_label_zh: "供应链尽调报告", data_type: "url", unit: null, required: true, evidence_required: true, visibility_level: "authority", requirement_level: "mandatory", regulation_reference: "Battery Regulation (EU) 2023/1542 supply chain due diligence", access_rights: "authority/restricted", granularity_level: "model", validation_hint: "Reference responsible sourcing / due diligence report URL or URN.", sort_order: 80 },
  { module_key: "conformity", field_key: "eu_declaration_of_conformity", field_label: "EU declaration of conformity", field_label_zh: "欧盟符合性声明", data_type: "url", unit: null, required: true, evidence_required: true, visibility_level: "public", requirement_level: "mandatory", regulation_reference: "Battery Regulation (EU) 2023/1542 conformity documentation", access_rights: "public", granularity_level: "model", validation_hint: "Link official declaration of conformity.", sort_order: 90 },
];

const FALLBACK_FIELD_TEMPLATES: Record<string, Array<Omit<FieldTemplate, "id" | "profile_key">>> = {
  "battery.ev.unit.v1": BATTERY_CORE_FIELDS,
  "textile.fabric.woven.v1": [
    { module_key: "materials", field_key: "fiber_composition", field_label: "Fiber composition", field_label_zh: "纤维成分", data_type: "text", unit: null, required: true, evidence_required: true, visibility_level: "public", validation_hint: "Declare material percentages and link supplier or lab evidence.", sort_order: 10 },
    { module_key: "chemical_compliance", field_key: "restricted_substance_statement", field_label: "Restricted substance statement", field_label_zh: "受限物质声明", data_type: "text", unit: null, required: true, evidence_required: true, visibility_level: "public", validation_hint: "REACH/SVHC/RSL/PFAS statement or test report should be linked.", sort_order: 20 },
    { module_key: "performance", field_key: "durability_test_basis", field_label: "Durability test basis", field_label_zh: "耐久性测试依据", data_type: "text", unit: null, required: false, evidence_required: true, visibility_level: "public", validation_hint: "Reference abrasion, tensile, colour fastness or customer specification reports.", sort_order: 30 },
  ],
  "textile.apparel.garment.v1": [
    { module_key: "materials", field_key: "fiber_composition", field_label: "Fiber composition", field_label_zh: "纤维成分", data_type: "text", unit: null, required: true, evidence_required: true, visibility_level: "public", validation_hint: "Declare shell, lining and trims where applicable.", sort_order: 10 },
    { module_key: "circularity", field_key: "care_repair_reuse_route", field_label: "Care, repair and reuse route", field_label_zh: "护理、维修与再使用路径", data_type: "text", unit: null, required: true, evidence_required: false, visibility_level: "public", validation_hint: "Consumer-facing care and end-of-life route.", sort_order: 20 },
  ],
  "furniture.office.chair.v1": [
    { module_key: "performance", field_key: "durability_test", field_label: "Durability test", field_label_zh: "耐久性测试", data_type: "text", unit: null, required: true, evidence_required: true, visibility_level: "public", validation_hint: "Reference seating durability and stability reports.", sort_order: 10 },
    { module_key: "repair", field_key: "replaceable_parts", field_label: "Replaceable parts", field_label_zh: "可替换部件", data_type: "text", unit: null, required: true, evidence_required: false, visibility_level: "public", validation_hint: "List casters, gas lift, armrests, cushion or other service parts.", sort_order: 20 },
  ],
  "construction.material.wpc_decking.v1": [
    { module_key: "performance", field_key: "declaration_of_performance", field_label: "Declaration of performance", field_label_zh: "性能声明", data_type: "url", unit: null, required: true, evidence_required: true, visibility_level: "public", validation_hint: "Reference DoP or performance report.", sort_order: 10 },
    { module_key: "chemical_compliance", field_key: "voc_or_reach_evidence", field_label: "VOC / REACH evidence", field_label_zh: "VOC / REACH 证据", data_type: "url", unit: null, required: true, evidence_required: true, visibility_level: "public", validation_hint: "Reference VOC, formaldehyde, REACH or SVHC evidence.", sort_order: 20 },
  ],
  "consumer_electronics.audio_device.v1": [
    { module_key: "battery_readiness", field_key: "battery_safety_document", field_label: "Battery safety document", field_label_zh: "电池安全文件", data_type: "url", unit: null, required: false, evidence_required: true, visibility_level: "public", validation_hint: "Reference MSDS, UN38.3 or battery handling evidence.", sort_order: 10 },
    { module_key: "software", field_key: "firmware_security_update_policy", field_label: "Firmware security update policy", field_label_zh: "固件安全更新政策", data_type: "text", unit: null, required: false, evidence_required: false, visibility_level: "public", validation_hint: "Reserve field for connected electronics.", sort_order: 20 },
  ],
};

["battery.lmt.unit.v1", "battery.industrial.without_bms.v1", "battery.industrial.other_above_2kwh.v1", "battery.industrial.stationary_above_2kwh.v1"].forEach((profileKey) => {
  FALLBACK_FIELD_TEMPLATES[profileKey] = FALLBACK_FIELD_TEMPLATES["battery.ev.unit.v1"].map((field) => ({
    ...field,
    validation_hint: field.field_key === "battery_model_identifier" ? "BatteryPass-Ready product category specific identifier." : field.validation_hint,
  }));
});

function fallbackTemplates(profileKey: string): FieldTemplate[] {
  return (FALLBACK_FIELD_TEMPLATES[profileKey] || []).map((field) => ({
    ...field,
    id: `fallback:${profileKey}:${field.field_key}`,
    profile_key: profileKey,
  }));
}

function mergeTemplates(profileKey: string, databaseTemplates: FieldTemplate[] = []) {
  const merged = new Map<string, FieldTemplate>();
  fallbackTemplates(profileKey).forEach((field) => merged.set(field.field_key, field));
  databaseTemplates.forEach((field) => merged.set(field.field_key, { ...merged.get(field.field_key), ...field }));
  return Array.from(merged.values()).sort((a, b) => Number(a.sort_order || 100) - Number(b.sort_order || 100));
}

function fieldInputType(dataType?: string | null) {
  if (dataType === "number") return "number";
  if (dataType === "url") return "url";
  if (dataType === "date") return "date";
  return "text";
}

function evidenceStatusLabel(status: string, locale: string) {
  const zh: Record<string, string> = {
    pending: "待补证据",
    declared: "企业声明",
    verified: "已验证",
    estimated: "估算值",
    not_applicable: "不适用",
  };
  const en: Record<string, string> = {
    pending: "Pending",
    declared: "Declared",
    verified: "Verified",
    estimated: "Estimated",
    not_applicable: "Not applicable",
  };
  return (locale === "zh" ? zh : en)[status] || status;
}

function granularityLabel(value: string, locale: string) {
  const zh: Record<string, string> = {
    model: "型号级",
    batch: "批次级",
    item: "单品级",
  };
  const en: Record<string, string> = {
    model: "Model",
    batch: "Batch",
    item: "Item",
  };
  return (locale === "zh" ? zh : en)[value] || value;
}

function moduleLabel(moduleKey: string, locale: string) {
  const zh: Record<string, string> = {
    dpp_information: "护照基础信息",
    identifiers: "标识信息",
    identity: "身份信息",
    economic_operator: "经济运营者与制造商",
    product_data: "产品数据",
    materials: "材料信息",
    chemical_compliance: "化学与受限物质",
    performance: "产品性能",
    performance_durability: "性能与耐久性",
    carbon_footprint: "碳足迹",
    traceability: "追溯信息",
    circularity: "循环性",
    due_diligence: "供应链尽调",
    conformity: "符合性",
    repair: "维修",
    disassembly: "拆解",
    installation: "安装",
    battery_readiness: "电池相关准备",
    software: "软件与更新",
    evidence: "证据",
  };
  const en: Record<string, string> = {
    dpp_information: "DPP information",
    identifiers: "Identifiers",
    identity: "Identity",
    economic_operator: "Economic operator and manufacturer",
    product_data: "Product data",
    materials: "Materials",
    chemical_compliance: "Chemical compliance",
    performance: "Performance",
    performance_durability: "Performance and durability",
    carbon_footprint: "Carbon footprint",
    traceability: "Traceability",
    circularity: "Circularity",
    due_diligence: "Due diligence",
    conformity: "Conformity",
    repair: "Repair",
    disassembly: "Disassembly",
    installation: "Installation",
    battery_readiness: "Battery readiness",
    software: "Software and updates",
    evidence: "Evidence",
  };
  return (locale === "zh" ? zh : en)[moduleKey] || moduleKey;
}

function fieldHint(field: FieldTemplate, locale: string) {
  if (locale !== "zh") return field.validation_hint;
  const zh: Record<string, string> = {
    dpp_schema_version: "填写本产品护照使用的数据模型或 Schema 版本。",
    dpp_status: "填写护照当前状态，例如草稿、有效、撤回或归档。",
    unique_battery_passport_identifier: "填写电池护照的唯一标识，可使用 DPP ID 或注册库返回的护照标识。",
    unique_battery_identifier: "填写唯一电池标识，通常由 GTIN、批次号、序列号组合生成。",
    battery_model_identifier: "填写制造商或责任经济运营者使用的电池型号标识。",
    battery_serial_number: "填写单品级电池序列号；如为型号级产品，可先记录序列号规则。",
    economic_operator_information: "填写责任经济运营者名称、地址、联系方式或企业识别信息。",
    manufacturer_information: "填写制造商法定名称及相关地址信息。",
    manufacturing_place: "填写制造国家、地区、城市和工厂信息；有工厂代码时一并记录。",
    manufacturing_date: "填写制造日期或生产放行日期。",
    warranty_period: "填写电池质保期，例如 8 年、160,000 km 或相应适用条件。",
    battery_category: "填写电池类别，例如 EV、LMT、工业电池、固定式工业电池等。",
    battery_mass: "填写电池质量，单位为 kg。",
    battery_status: "填写电池状态，例如原装、再使用、再制造、再利用或废弃。",
    carbon_footprint_per_kwh: "填写单位功能碳足迹，并关联 LCA 报告或碳足迹声明作为证据。",
    carbon_footprint_per_lifecycle_stage: "填写制造、分销、使用、生命周期结束等阶段的碳足迹数据。",
    battery_chemistry: "填写电池化学体系，例如 NMC、LFP、LCO 等。",
    critical_raw_materials: "填写适用的关键原材料，例如钴、锂、镍、天然石墨等，并关联证据。",
    hazardous_substances: "填写受限或有害物质信息，并关联检测报告或供应商声明。",
    rated_capacity: "填写额定容量，单位 Ah。",
    rated_energy: "填写额定能量，单位 kWh。",
    expected_lifetime: "填写预期寿命，可用循环次数、年限、里程或对应类别适用单位。",
    state_of_health: "填写健康状态 SoH；如无 BMS 或动态数据，可先留空或标记不适用。",
    state_of_charge: "填写荷电状态 SoC；如无动态数据，可先留空或标记不适用。",
    recycled_content_share: "填写再生成分比例，例如再生钴、锂、镍、铅等适用材料占比。",
    separate_collection_symbol: "填写或关联分类收集标识、标签图或符合性文件。",
    dismantling_and_removal_information: "填写安全移除、拆解、处理和回收说明。",
    due_diligence_report: "关联负责任采购或供应链尽调报告。",
    eu_declaration_of_conformity: "关联正式欧盟符合性声明文件。",
    fiber_composition: "填写材料或纤维组成比例，并关联供应商声明或实验室报告。",
    restricted_substance_statement: "填写 REACH/SVHC/RSL/PFAS 等受限物质声明或测试结论。",
    durability_test_basis: "填写耐磨、拉伸、色牢度或客户规范等耐久性测试依据。",
    care_repair_reuse_route: "填写面向消费者的护理、维修、再使用和回收路径。",
    durability_test: "关联家具耐久性、稳定性或强度测试报告。",
    replaceable_parts: "列出可替换部件，例如脚轮、气杆、扶手、坐垫等。",
    declaration_of_performance: "关联性能声明或性能测试报告。",
    voc_or_reach_evidence: "关联 VOC、甲醛、REACH 或 SVHC 等证据文件。",
    battery_safety_document: "关联 MSDS、UN38.3 或电池安全处理文件。",
    firmware_security_update_policy: "填写固件安全更新、支持期限和漏洞修复政策。",
  };
  return zh[field.field_key] || field.validation_hint;
}

function regulationReferenceLabel(reference: string | null | undefined, locale: string) {
  if (!reference || locale !== "zh") return reference;
  return reference
    .replace("Battery Regulation (EU) 2023/1542", "欧盟电池法规 (EU) 2023/1542")
    .replace("BatteryPass-Ready Longlist v1.3", "BatteryPass-Ready 数据属性长清单 v1.3")
    .replace("ESPR-JTC-24 readiness", "ESPR / JTC-24 标准化准备")
    .replace("battery passport identifier", "电池护照标识")
    .replace("unique battery identifier", "唯一电池标识")
    .replace("identifiers", "标识信息")
    .replace("economic operator information", "经济运营者信息")
    .replace("manufacturer information", "制造商信息")
    .replace("product data", "产品数据")
    .replace("battery categories", "电池类别")
    .replace("carbon footprint declaration", "碳足迹声明")
    .replace("materials and composition", "材料与组成")
    .replace("substance restrictions and information", "物质限制与信息披露")
    .replace("performance and durability", "性能与耐久性")
    .replace("dynamic performance data", "动态性能数据")
    .replace("recycled content declaration", "再生成分声明")
    .replace("labelling and symbols", "标签与标识")
    .replace("circularity and end-of-life information", "循环性与生命周期结束信息")
    .replace("supply chain due diligence", "供应链尽职调查")
    .replace("conformity documentation", "符合性文件")
    .replace("materials", "材料信息");
}

function sourceModuleLabel(moduleKey: string | null | undefined, locale: string) {
  const key = moduleKey || "general";
  const zh: Record<string, string> = {
    dpp_information: "产品基础 / 版本",
    identifiers: "数字身份",
    economic_operator: "供应商库 / 产品基础",
    product_data: "产品基础 / 数字身份",
    carbon_footprint: "ESG 指标 / 碳报告",
    materials: "材料 / 证书",
    performance_durability: "性能报告 / 文档",
    circularity: "循环性 / 标签文件",
    due_diligence: "证书与文档",
    conformity: "证书与文档",
    chemical_compliance: "证书与文档",
    performance: "性能报告 / 文档",
    battery_readiness: "证书与文档",
    software: "产品基础 / 文档",
    repair: "循环性 / 文档",
    installation: "文档",
  };
  const en: Record<string, string> = {
    dpp_information: "Product core / versioning",
    identifiers: "Digital identity",
    economic_operator: "Supplier library / product core",
    product_data: "Product core / digital identity",
    carbon_footprint: "ESG metrics / carbon report",
    materials: "Materials / certificates",
    performance_durability: "Performance report / documents",
    circularity: "Circularity / label files",
    due_diligence: "Certificates and documents",
    conformity: "Certificates and documents",
    chemical_compliance: "Certificates and documents",
    performance: "Performance report / documents",
    battery_readiness: "Certificates and documents",
    software: "Product core / documents",
    repair: "Circularity / documents",
    installation: "Documents",
  };
  return (locale === "zh" ? zh : en)[key] || moduleLabel(key, locale);
}

export function SectorFieldManager({ productId, profileKey, title }: Props) {
  const { locale } = useLanguage();
  const supabase = createSupabaseClient();
  const t =
    locale === "zh"
      ? {
          loading: "加载行业字段中...",
          noProfile: "请先在上方选择并保存行业模板。",
          noTemplate: "当前模板还没有配置字段。",
          records: "个模板字段",
          roleTitle: "这个区域不是重复录入材料或 ESG 数据",
          roleDesc: "这里是法规要求的披露清单，用来确认每个字段是否已有数据源和证据。真实明细仍在下方材料、组件、ESG、证书和文档模块维护。",
          sourceFlow: "推荐流程：先录入真实数据源 → 再回到这里确认披露值 → 最后关联证据并发布。",
          required: "必填",
          optional: "选填",
          evidenceRequired: "需要证据",
          mandatory: "法规强制",
          standardReady: "标准化准备",
          recommended: "推荐补充",
          regulationReference: "法规依据",
          granularity: "粒度",
          unit: "单位",
          source: "来源",
          sourceModule: "建议数据源",
          evidenceStatus: "证据状态",
          visibility: "可见性",
          fieldCode: "字段代码",
          save: "保存行业字段",
          saving: "保存中...",
          saved: "行业字段已保存。",
          readiness: "字段完整度",
          requiredFields: "必填字段",
          evidenceFields: "需证据字段",
        }
      : {
          loading: "Loading sector fields...",
          noProfile: "Select and save a sector profile first.",
          noTemplate: "No fields are configured for this profile yet.",
          records: "template fields",
          roleTitle: "This area is not a duplicate materials or ESG entry form",
          roleDesc: "It is the regulatory disclosure checklist for confirming whether each field has source data and evidence. Detailed source records remain in the materials, BOM, ESG, certificates and documents modules below.",
          sourceFlow: "Recommended flow: enter source records first, confirm disclosure values here, then link evidence and publish.",
          required: "Required",
          optional: "Optional",
          evidenceRequired: "Evidence required",
          mandatory: "Regulatory mandatory",
          standardReady: "Standardization ready",
          recommended: "Recommended",
          regulationReference: "Regulation reference",
          granularity: "Granularity",
          unit: "Unit",
          source: "Source",
          sourceModule: "Suggested source",
          evidenceStatus: "Evidence status",
          visibility: "Visibility",
          fieldCode: "Field code",
          save: "Save sector fields",
          saving: "Saving...",
          saved: "Sector fields saved.",
          readiness: "Field readiness",
          requiredFields: "Required fields",
          evidenceFields: "Evidence fields",
        };

  const [templates, setTemplates] = useState<FieldTemplate[]>([]);
  const [values, setValues] = useState<Record<string, SectorFieldValue>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    if (!profileKey) {
      setTemplates([]);
      setValues({});
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage("");
    const [{ data: templateRows, error: templateError }, { data: valueRows, error: valueError }] = await Promise.all([
      supabase
        .from("dpp_field_templates")
        .select("*")
        .eq("profile_key", profileKey)
        .order("sort_order", { ascending: true }),
      supabase.from("product_sector_field_values").select("*").eq("product_id", productId).eq("profile_key", profileKey),
    ]);

    if (templateError || valueError) {
      setMessage(templateError?.message || valueError?.message || "");
      setTemplates([]);
      setValues({});
    } else {
      const byFieldKey = Object.fromEntries((valueRows || []).map((row: any) => [row.field_key, row]));
      setTemplates(mergeTemplates(profileKey, templateRows || []));
      setValues(byFieldKey);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, profileKey]);

  const groupedTemplates = useMemo(() => {
    const groups: Record<string, FieldTemplate[]> = {};
    templates.forEach((field) => {
      const moduleKey = field.module_key || "general";
      groups[moduleKey] = [...(groups[moduleKey] || []), field];
    });
    return Object.entries(groups);
  }, [templates]);

  const requiredTemplates = templates.filter((field) => field.required);
  const evidenceTemplates = templates.filter((field) => field.evidence_required);
  const filledRequired = requiredTemplates.filter((field) => values[field.field_key]?.field_value).length;
  const verifiedEvidence = evidenceTemplates.filter((field) => values[field.field_key]?.evidence_status === "verified").length;

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profileKey || !templates.length) return;

    const form = new FormData(event.currentTarget);
    const rows = templates.map((field) => {
      const rawValue = String(form.get(`value:${field.field_key}`) || "").trim();
      const evidenceStatus = String(form.get(`evidence:${field.field_key}`) || values[field.field_key]?.evidence_status || "pending");
      return {
        product_id: productId,
        profile_key: profileKey,
        module_key: field.module_key,
        field_key: field.field_key,
        field_label: field.field_label,
        field_label_zh: field.field_label_zh,
        field_value: rawValue || null,
        field_value_json: null,
        unit: field.unit,
        evidence_status: evidenceStatus,
        source_type: values[field.field_key]?.source_type || "manual",
        visibility_level: field.visibility_level || values[field.field_key]?.visibility_level || "public",
      };
    });

    setSaving(true);
    setMessage("");
    const { error } = await supabase.from("product_sector_field_values").upsert(rows, { onConflict: "product_id,field_key" });
    if (error) setMessage(error.message);
    else {
      setMessage(t.saved);
      await load();
    }
    setSaving(false);
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {templates.length} {t.records}
          </p>
        </div>
        <div className="grid gap-2 text-right text-xs font-bold text-slate-600 sm:grid-cols-3 sm:text-left">
          <span className="rounded-full bg-slate-100 px-3 py-2">
            {t.readiness}: {templates.length ? Math.round((Object.values(values).filter((item) => item.field_value).length / templates.length) * 100) : 0}%
          </span>
          <span className="rounded-full bg-amber-50 px-3 py-2 text-amber-700">
            {t.requiredFields}: {filledRequired}/{requiredTemplates.length}
          </span>
          <span className="rounded-full bg-green-50 px-3 py-2 text-green-700">
            {t.evidenceFields}: {verifiedEvidence}/{evidenceTemplates.length}
          </span>
        </div>
      </div>

      {loading && <p className="mt-5 text-sm text-slate-500">{t.loading}</p>}
      {!loading && !profileKey && <p className="mt-5 rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">{t.noProfile}</p>}
      {!loading && profileKey && !templates.length && <p className="mt-5 rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">{t.noTemplate}</p>}
      {message && <p className="mt-4 text-sm text-slate-600">{message}</p>}

      {!!templates.length && (
        <form onSubmit={save} className="mt-6 space-y-5">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
            <p className="text-sm font-black text-blue-950">{t.roleTitle}</p>
            <p className="mt-2 text-sm leading-6 text-blue-900">{t.roleDesc}</p>
            <p className="mt-2 text-xs font-bold text-blue-700">{t.sourceFlow}</p>
          </div>
          {groupedTemplates.map(([moduleKey, fields]) => (
            <div key={moduleKey} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <h3 className="text-base font-black text-slate-950">{moduleLabel(moduleKey, locale)}</h3>
              <div className="mt-4 grid gap-4">
                {fields.map((field) => {
                  const value = values[field.field_key];
                  const label = locale === "zh" ? field.field_label_zh || field.field_label : field.field_label;
                  const inputType = fieldInputType(field.data_type);
                  const hint = fieldHint(field, locale);
                  const reference = regulationReferenceLabel(field.regulation_reference, locale);
                  return (
                    <div key={field.field_key} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <label className="label" htmlFor={`sector-${field.field_key}`}>
                            {label}
                          </label>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                            <span className={field.required ? "rounded-full bg-red-50 px-2 py-1 text-red-700" : "rounded-full bg-slate-100 px-2 py-1 text-slate-500"}>
                              {field.required
                                ? field.requirement_level === "standard_ready"
                                  ? t.standardReady
                                  : t.mandatory
                                : field.requirement_level === "recommended"
                                  ? t.recommended
                                  : t.optional}
                            </span>
                            {field.evidence_required && <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">{t.evidenceRequired}</span>}
                            {field.unit && <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">{t.unit}: {field.unit}</span>}
                            {field.granularity_level && <span className="rounded-full bg-purple-50 px-2 py-1 text-purple-700">{t.granularity}: {granularityLabel(field.granularity_level, locale)}</span>}
                            <span className="rounded-full bg-green-50 px-2 py-1 text-green-700">{t.sourceModule}: {sourceModuleLabel(field.module_key, locale)}</span>
                          </div>
                        </div>
                        <select name={`evidence:${field.field_key}`} defaultValue={value?.evidence_status || "pending"} className="input w-full sm:w-52">
                          {EVIDENCE_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {evidenceStatusLabel(status, locale)}
                            </option>
                          ))}
                        </select>
                      </div>
                      {(hint || reference) && (
                        <div className="mt-3 space-y-1 text-xs leading-5 text-slate-500">
                          {hint && <p>{hint}</p>}
                          {reference && (
                            <p>
                              <span className="font-bold text-slate-600">{t.regulationReference}: </span>
                              {reference}
                            </p>
                          )}
                        </div>
                      )}
                      {inputType === "text" ? (
                        <textarea
                          id={`sector-${field.field_key}`}
                          name={`value:${field.field_key}`}
                          defaultValue={value?.field_value || ""}
                          required={Boolean(field.required)}
                          className="input mt-3 min-h-24"
                        />
                      ) : (
                        <input
                          id={`sector-${field.field_key}`}
                          name={`value:${field.field_key}`}
                          type={inputType}
                          defaultValue={value?.field_value || ""}
                          required={Boolean(field.required)}
                          className="input mt-3"
                        />
                      )}
                      <p className="mt-2 break-all text-xs font-semibold text-slate-400">
                        {t.fieldCode}: {moduleKey}.{field.field_key}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <button disabled={saving} className="btn-primary w-full" type="submit">
            {saving ? t.saving : t.save}
          </button>
        </form>
      )}
    </section>
  );
}
