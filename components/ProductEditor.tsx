"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase";
import { buildGs1DigitalLink, buildUniqueProductIdentifier, normalizeGtin, sha256Hex } from "@/lib/dppCompliance";
import { DPP_SECTOR_PROFILES, findDppSectorProfile, uniqueByCode } from "@/lib/dppSectorProfiles";
import { useLanguage } from "@/components/LanguageProvider";
import { ProductRelatedManager, type RelatedField } from "@/components/ProductRelatedManager";
import { SectorFieldManager } from "@/components/SectorFieldManager";
import { BatteryDppWorkspace } from "@/components/battery/BatteryDppWorkspace";
import { publicFeatureFlags } from "@/lib/featureFlags";

type Product = Record<string, any>;

const LIFECYCLE_STATUSES = ["draft", "review", "published", "updated", "archived", "expired"] as const;
const CHANGE_TYPES = ["initial_publish", "certificate_update", "carbon_update", "batch_change", "data_correction", "status_change"] as const;
const GRANULARITY_LEVELS = ["model", "batch", "item"] as const;
const REGISTRATION_STATUSES = ["not_registered", "ready", "submitted", "accepted", "rejected", "corrected", "withdrawn", "expired"] as const;

type SourceModuleConfig = {
  description: string;
  descriptionZh: string;
  displayFields: string[];
  fields: RelatedField[];
};

type SourceDataConfig = {
  materials: SourceModuleConfig;
  bom: SourceModuleConfig;
  esg: SourceModuleConfig;
  circularity: SourceModuleConfig;
};

const SOURCE_DATA_FIELDS: Record<string, SourceDataConfig> = {
  battery: {
    materials: {
      description: "Capture active materials, critical raw materials and restricted substance evidence for the selected battery profile.",
      descriptionZh: "录入活性材料、关键原材料、再生成分和受限物质证据，支撑电池护照字段。",
      displayFields: ["material_name", "material_type", "percentage", "recycled_content"],
      fields: [
        { name: "material_name", label: "Material / substance name", labelZh: "材料 / 物质名称", required: true },
        { name: "material_type", label: "Battery material category", labelZh: "电池材料类别" },
        { name: "percentage", label: "Mass share (%)", labelZh: "质量占比 (%)", type: "number" },
        { name: "recycled_content", label: "Recycled content (%)", labelZh: "再生成分 (%)", type: "number" },
        { name: "origin_country", label: "Origin / source country", labelZh: "来源国家 / 产地" },
        { name: "chemical_info", label: "Hazardous substance declaration", labelZh: "有害物质声明", type: "textarea" },
        { name: "certification", label: "Supplier evidence / certificate", labelZh: "供应商证据 / 证书" },
      ],
    },
    bom: {
      description: "Define battery system parts at cell, module, pack, enclosure and BMS level where applicable.",
      descriptionZh: "按电芯、模组、电池包、外壳、BMS 等层级维护电池组成。",
      displayFields: ["component_name", "component_type", "quantity", "position"],
      fields: [
        { name: "component_name", label: "Battery component", labelZh: "电池组件", required: true },
        { name: "component_type", label: "Component level", labelZh: "组件层级" },
        { name: "quantity", label: "Quantity", labelZh: "数量", type: "number" },
        { name: "unit", label: "Unit", labelZh: "单位" },
        { name: "position", label: "Pack / module position", labelZh: "电池包 / 模组位置" },
      ],
    },
    esg: {
      description: "Keep carbon footprint, method, recycled content and due diligence verification data together.",
      descriptionZh: "集中维护碳足迹、核算方法、再生成分和尽责调查验证信息。",
      displayFields: ["carbon_footprint", "recycled_content", "methodology", "verified_by"],
      fields: [
        { name: "carbon_footprint", label: "Battery carbon footprint", labelZh: "电池碳足迹", type: "number" },
        { name: "energy_consumption", label: "Manufacturing energy use", labelZh: "制造能源消耗", type: "number" },
        { name: "recycled_content", label: "Recycled content claim", labelZh: "再生成分声明", type: "number" },
        { name: "chemical_management", label: "Due diligence / sourcing note", labelZh: "尽责调查 / 采购说明" },
        { name: "lca_report_url", label: "Carbon / LCA report URL", labelZh: "碳足迹 / LCA 报告 URL", type: "url" },
        { name: "methodology", label: "Calculation methodology", labelZh: "核算方法" },
        { name: "verified_by", label: "Verifier", labelZh: "验证方" },
      ],
    },
    circularity: {
      description: "Record removability, dismantling, recycled content and end-of-life handling information.",
      descriptionZh: "维护可拆卸性、拆解、回收利用和生命周期结束处理信息。",
      displayFields: ["recyclability_score", "take_back_program", "remanufacturing_supported", "end_of_life_info"],
      fields: [
        { name: "recyclability_score", label: "Recyclability score", labelZh: "可回收性评分", type: "number" },
        { name: "take_back_program", label: "Collection / take-back route", labelZh: "回收 / 退役回收路径" },
        { name: "remanufacturing_supported", label: "Repurposing supported", labelZh: "支持梯次利用", type: "checkbox" },
        { name: "disassembly_guide", label: "Dismantling instructions", labelZh: "拆解说明", type: "textarea" },
        { name: "recycling_instructions", label: "Recycling instructions", labelZh: "回收处理说明", type: "textarea" },
        { name: "end_of_life_info", label: "End-of-life safety information", labelZh: "生命周期结束安全信息", type: "textarea" },
      ],
    },
  },
  textile: {
    materials: {
      description: "Capture fibre composition, recycled content, origin and chemical compliance evidence.",
      descriptionZh: "录入纤维成分、再生成分、来源和化学合规证据。",
      displayFields: ["material_name", "percentage", "origin_country", "certification"],
      fields: [
        { name: "material_name", label: "Fibre / fabric component", labelZh: "纤维 / 面料成分", required: true },
        { name: "material_type", label: "Fibre / fabric type", labelZh: "纤维 / 面料类型" },
        { name: "percentage", label: "Composition share (%)", labelZh: "成分占比 (%)", type: "number" },
        { name: "recycled_content", label: "Recycled fibre (%)", labelZh: "再生纤维 (%)", type: "number" },
        { name: "origin_country", label: "Origin country", labelZh: "原产国" },
        { name: "chemical_info", label: "RSL / REACH chemical note", labelZh: "RSL / REACH 化学说明", type: "textarea" },
        { name: "certification", label: "Textile certificate", labelZh: "纺织认证" },
      ],
    },
    bom: {
      description: "Record textile parts such as shell fabric, lining, trims, labels and packaging.",
      descriptionZh: "维护面料、里料、辅料、标签和包装等纺织产品组成。",
      displayFields: ["component_name", "component_type", "quantity", "position"],
      fields: [
        { name: "component_name", label: "Textile part", labelZh: "纺织部件", required: true },
        { name: "component_type", label: "Part type", labelZh: "部件类型" },
        { name: "quantity", label: "Quantity / usage", labelZh: "数量 / 用量", type: "number" },
        { name: "unit", label: "Unit", labelZh: "单位" },
        { name: "position", label: "Garment / fabric position", labelZh: "服装 / 面料位置" },
      ],
    },
    esg: {
      description: "Keep product carbon, water, energy, chemical management and verification data.",
      descriptionZh: "维护产品碳、水、能源、化学品管理和验证信息。",
      displayFields: ["carbon_footprint", "water_usage", "chemical_management", "verified_by"],
      fields: [
        { name: "carbon_footprint", label: "Product carbon footprint", labelZh: "产品碳足迹", type: "number" },
        { name: "water_usage", label: "Water use", labelZh: "用水量", type: "number" },
        { name: "energy_consumption", label: "Energy use", labelZh: "能源消耗", type: "number" },
        { name: "chemical_management", label: "Chemical management", labelZh: "化学品管理" },
        { name: "lca_report_url", label: "LCA / test report URL", labelZh: "LCA / 测试报告 URL", type: "url" },
        { name: "methodology", label: "Methodology", labelZh: "方法学" },
        { name: "verified_by", label: "Verifier", labelZh: "验证方" },
      ],
    },
    circularity: {
      description: "Record durability, repair, reuse, recycling and end-of-life guidance for textile products.",
      descriptionZh: "维护耐用性、维修、再利用、回收和生命周期结束指引。",
      displayFields: ["repairability_score", "recyclability_score", "resale_supported", "take_back_program"],
      fields: [
        { name: "repairability_score", label: "Durability / repair score", labelZh: "耐用 / 可维修评分", type: "number" },
        { name: "recyclability_score", label: "Textile recyclability score", labelZh: "纺织可回收评分", type: "number" },
        { name: "take_back_program", label: "Take-back / collection program", labelZh: "回收 / 收集计划" },
        { name: "resale_supported", label: "Reuse / resale supported", labelZh: "支持再利用 / 转售", type: "checkbox" },
        { name: "recycling_instructions", label: "Recycling instructions", labelZh: "回收说明", type: "textarea" },
        { name: "end_of_life_info", label: "End-of-life information", labelZh: "生命周期结束信息", type: "textarea" },
      ],
    },
  },
  furniture: {
    materials: {
      description: "Capture wood, metal, plastic, foam and coating materials with source and compliance evidence.",
      descriptionZh: "录入木材、金属、塑料、泡棉、涂层等材料及来源和合规证据。",
      displayFields: ["material_name", "material_type", "percentage", "certification"],
      fields: [
        { name: "material_name", label: "Furniture material", labelZh: "家具材料", required: true },
        { name: "material_type", label: "Material class", labelZh: "材料类别" },
        { name: "percentage", label: "Mass share (%)", labelZh: "质量占比 (%)", type: "number" },
        { name: "recycled_content", label: "Recycled content (%)", labelZh: "再生成分 (%)", type: "number" },
        { name: "origin_country", label: "Source country", labelZh: "来源国家" },
        { name: "chemical_info", label: "Coating / restricted substance note", labelZh: "涂层 / 受限物质说明", type: "textarea" },
        { name: "certification", label: "FSC / PEFC / safety certificate", labelZh: "FSC / PEFC / 安全认证" },
      ],
    },
    bom: {
      description: "Define furniture parts such as frame, seat, upholstery, fittings and packaging.",
      descriptionZh: "维护框架、坐垫、面料、五金和包装等家具组成。",
      displayFields: ["component_name", "component_type", "quantity", "position"],
      fields: [
        { name: "component_name", label: "Furniture component", labelZh: "家具部件", required: true },
        { name: "component_type", label: "Component type", labelZh: "部件类型" },
        { name: "quantity", label: "Quantity", labelZh: "数量", type: "number" },
        { name: "unit", label: "Unit", labelZh: "单位" },
        { name: "position", label: "Assembly position", labelZh: "装配位置" },
      ],
    },
    esg: {
      description: "Keep carbon, material efficiency, chemical and verification information for furniture.",
      descriptionZh: "维护家具产品碳、材料效率、化学品和验证信息。",
      displayFields: ["carbon_footprint", "recycled_content", "methodology", "verified_by"],
      fields: [
        { name: "carbon_footprint", label: "Product carbon footprint", labelZh: "产品碳足迹", type: "number" },
        { name: "waste_generation", label: "Production waste", labelZh: "生产废弃物", type: "number" },
        { name: "recycled_content", label: "Recycled content", labelZh: "再生成分", type: "number" },
        { name: "chemical_management", label: "Chemical / VOC management", labelZh: "化学品 / VOC 管理" },
        { name: "lca_report_url", label: "LCA / EPD report URL", labelZh: "LCA / EPD 报告 URL", type: "url" },
        { name: "methodology", label: "Methodology", labelZh: "方法学" },
        { name: "verified_by", label: "Verifier", labelZh: "验证方" },
      ],
    },
    circularity: {
      description: "Record repairability, spare parts, disassembly, reuse and end-of-life routes.",
      descriptionZh: "维护可维修性、备件、拆解、再利用和生命周期结束路径。",
      displayFields: ["repairability_score", "recyclability_score", "resale_supported", "remanufacturing_supported"],
      fields: [
        { name: "repairability_score", label: "Repairability score", labelZh: "可维修性评分", type: "number" },
        { name: "recyclability_score", label: "Recyclability score", labelZh: "可回收性评分", type: "number" },
        { name: "take_back_program", label: "Take-back / spare parts program", labelZh: "回收 / 备件计划" },
        { name: "resale_supported", label: "Resale supported", labelZh: "支持二手转售", type: "checkbox" },
        { name: "remanufacturing_supported", label: "Refurbishment supported", labelZh: "支持翻新再制造", type: "checkbox" },
        { name: "disassembly_guide", label: "Disassembly guide", labelZh: "拆解指南", type: "textarea" },
        { name: "end_of_life_info", label: "End-of-life route", labelZh: "生命周期结束路径", type: "textarea" },
      ],
    },
  },
  construction: {
    materials: {
      description: "Capture composition, recycled content, origin, recyclability and EPD evidence for building materials.",
      descriptionZh: "录入建材组成、再生成分、来源、可回收性和 EPD 等证据。",
      displayFields: ["material_name", "material_type", "recycled_content", "recyclability"],
      fields: [
        { name: "material_name", label: "Construction material", labelZh: "建材组成", required: true },
        { name: "material_type", label: "Material class", labelZh: "材料类别" },
        { name: "percentage", label: "Mass share (%)", labelZh: "质量占比 (%)", type: "number" },
        { name: "recycled_content", label: "Recycled content (%)", labelZh: "再生成分 (%)", type: "number" },
        { name: "origin_country", label: "Source country", labelZh: "来源国家" },
        { name: "recyclability", label: "Recyclability note", labelZh: "可回收性说明" },
        { name: "certification", label: "EPD / standard certificate", labelZh: "EPD / 标准认证" },
      ],
    },
    bom: {
      description: "Define layers, accessories, packaging and installation-related components.",
      descriptionZh: "维护结构层、配件、包装和安装相关组件。",
      displayFields: ["component_name", "component_type", "quantity", "unit"],
      fields: [
        { name: "component_name", label: "Building product component", labelZh: "建材产品组件", required: true },
        { name: "component_type", label: "Layer / accessory type", labelZh: "结构层 / 配件类型" },
        { name: "quantity", label: "Quantity / coverage", labelZh: "数量 / 覆盖量", type: "number" },
        { name: "unit", label: "Unit", labelZh: "单位" },
        { name: "position", label: "Installation position", labelZh: "安装位置" },
      ],
    },
    esg: {
      description: "Keep embodied carbon, EPD methodology, recycled content and verification data.",
      descriptionZh: "维护隐含碳、EPD 方法、再生成分和验证信息。",
      displayFields: ["carbon_footprint", "recycled_content", "methodology", "verified_by"],
      fields: [
        { name: "carbon_footprint", label: "Embodied carbon", labelZh: "隐含碳", type: "number" },
        { name: "energy_consumption", label: "Manufacturing energy", labelZh: "制造能源消耗", type: "number" },
        { name: "waste_generation", label: "Production waste", labelZh: "生产废弃物", type: "number" },
        { name: "recycled_content", label: "Recycled content", labelZh: "再生成分", type: "number" },
        { name: "lca_report_url", label: "EPD / LCA report URL", labelZh: "EPD / LCA 报告 URL", type: "url" },
        { name: "methodology", label: "EPD / LCA methodology", labelZh: "EPD / LCA 方法" },
        { name: "verified_by", label: "Verifier", labelZh: "验证方" },
      ],
    },
    circularity: {
      description: "Record design-for-disassembly, reuse, recycling and construction waste handling routes.",
      descriptionZh: "维护可拆卸设计、再利用、回收和建筑废弃物处理路径。",
      displayFields: ["recyclability_score", "take_back_program", "remanufacturing_supported", "end_of_life_info"],
      fields: [
        { name: "recyclability_score", label: "Recyclability score", labelZh: "可回收性评分", type: "number" },
        { name: "take_back_program", label: "Construction waste recovery route", labelZh: "建筑废弃物回收路径" },
        { name: "remanufacturing_supported", label: "Reuse supported", labelZh: "支持再利用", type: "checkbox" },
        { name: "disassembly_guide", label: "Disassembly / removal guide", labelZh: "拆卸 / 移除指南", type: "textarea" },
        { name: "recycling_instructions", label: "Recycling instructions", labelZh: "回收说明", type: "textarea" },
        { name: "end_of_life_info", label: "End-of-life route", labelZh: "生命周期结束路径", type: "textarea" },
      ],
    },
  },
  consumer_electronics: {
    materials: {
      description: "Capture casing, metals, plastics, battery-related materials and restricted substance evidence.",
      descriptionZh: "录入外壳、金属、塑料、电池相关材料和受限物质证据。",
      displayFields: ["material_name", "material_type", "recycled_content", "chemical_info"],
      fields: [
        { name: "material_name", label: "Material / substance", labelZh: "材料 / 物质", required: true },
        { name: "material_type", label: "Material class", labelZh: "材料类别" },
        { name: "percentage", label: "Mass share (%)", labelZh: "质量占比 (%)", type: "number" },
        { name: "recycled_content", label: "Recycled content (%)", labelZh: "再生成分 (%)", type: "number" },
        { name: "origin_country", label: "Source country", labelZh: "来源国家" },
        { name: "chemical_info", label: "RoHS / REACH / SVHC note", labelZh: "RoHS / REACH / SVHC 说明", type: "textarea" },
        { name: "certification", label: "Compliance evidence", labelZh: "合规证据" },
      ],
    },
    bom: {
      description: "Define product assemblies such as PCB, battery, enclosure, sensors, cables and packaging.",
      descriptionZh: "维护 PCB、电池、外壳、传感器、线缆和包装等组件。",
      displayFields: ["component_name", "component_type", "quantity", "position"],
      fields: [
        { name: "component_name", label: "Electronic component", labelZh: "电子组件", required: true },
        { name: "component_type", label: "Component type", labelZh: "组件类型" },
        { name: "quantity", label: "Quantity", labelZh: "数量", type: "number" },
        { name: "unit", label: "Unit", labelZh: "单位" },
        { name: "position", label: "Assembly position", labelZh: "装配位置" },
      ],
    },
    esg: {
      description: "Keep carbon, energy efficiency, restricted substance and verification data.",
      descriptionZh: "维护碳足迹、能效、受限物质和验证信息。",
      displayFields: ["carbon_footprint", "energy_consumption", "chemical_management", "verified_by"],
      fields: [
        { name: "carbon_footprint", label: "Product carbon footprint", labelZh: "产品碳足迹", type: "number" },
        { name: "energy_consumption", label: "Energy consumption / efficiency", labelZh: "能耗 / 能效", type: "number" },
        { name: "recycled_content", label: "Recycled content", labelZh: "再生成分", type: "number" },
        { name: "chemical_management", label: "Restricted substance management", labelZh: "受限物质管理" },
        { name: "lca_report_url", label: "LCA / compliance report URL", labelZh: "LCA / 合规报告 URL", type: "url" },
        { name: "methodology", label: "Methodology", labelZh: "方法学" },
        { name: "verified_by", label: "Verifier", labelZh: "验证方" },
      ],
    },
    circularity: {
      description: "Record repairability, spare parts, software support, take-back and recycling guidance.",
      descriptionZh: "维护可维修性、备件、软件支持、回收计划和回收说明。",
      displayFields: ["repairability_score", "take_back_program", "resale_supported", "end_of_life_info"],
      fields: [
        { name: "repairability_score", label: "Repairability score", labelZh: "可维修性评分", type: "number" },
        { name: "recyclability_score", label: "Recyclability score", labelZh: "可回收性评分", type: "number" },
        { name: "take_back_program", label: "Take-back / WEEE program", labelZh: "回收 / WEEE 计划" },
        { name: "resale_supported", label: "Reuse / resale supported", labelZh: "支持再利用 / 转售", type: "checkbox" },
        { name: "disassembly_guide", label: "Repair / disassembly guide", labelZh: "维修 / 拆解指南", type: "textarea" },
        { name: "recycling_instructions", label: "Recycling instructions", labelZh: "回收说明", type: "textarea" },
        { name: "end_of_life_info", label: "Software support / end-of-life note", labelZh: "软件支持 / 生命周期结束说明", type: "textarea" },
      ],
    },
  },
};

function getSourceDataConfig(sectorCode?: string | null) {
  return SOURCE_DATA_FIELDS[sectorCode || ""] || SOURCE_DATA_FIELDS.textile;
}

function nextPatchVersion(version: string | null | undefined) {
  const match = String(version || "v1.0").match(/^v(\d+)\.(\d+)$/);
  if (!match) return "v1.1";
  return `v${match[1]}.${Number(match[2]) + 1}`;
}

function statusLabel(status: string, locale: string) {
  const zh: Record<string, string> = {
    draft: "草稿",
    review: "待审核",
    published: "已发布",
    updated: "已更新",
    archived: "已归档",
    expired: "证书过期",
  };
  const en: Record<string, string> = {
    draft: "Draft",
    review: "In review",
    published: "Published",
    updated: "Updated",
    archived: "Archived",
    expired: "Certificate expired",
  };
  return (locale === "zh" ? zh : en)[status] || status;
}

function changeTypeLabel(type: string, locale: string) {
  const zh: Record<string, string> = {
    initial_publish: "v1.0 初始发布",
    certificate_update: "更新证书",
    carbon_update: "更新碳足迹",
    batch_change: "产品批次变更",
    data_correction: "数据修正",
    status_change: "状态变更",
  };
  const en: Record<string, string> = {
    initial_publish: "Initial publish",
    certificate_update: "Certificate update",
    carbon_update: "Carbon footprint update",
    batch_change: "Product batch change",
    data_correction: "Data correction",
    status_change: "Status change",
  };
  return (locale === "zh" ? zh : en)[type] || type;
}

function optionLabel(value: string, locale: string) {
  const zh: Record<string, string> = {
    model: "型号级",
    batch: "批次级",
    item: "单品级",
    not_registered: "未注册",
    ready: "准备提交",
    submitted: "已提交",
    accepted: "已接受",
    rejected: "已驳回",
    corrected: "已更正",
    withdrawn: "已撤回",
    expired: "已过期",
  };
  const en: Record<string, string> = {
    model: "Model level",
    batch: "Batch level",
    item: "Item level",
    not_registered: "Not registered",
    ready: "Ready",
    submitted: "Submitted",
    accepted: "Accepted",
    rejected: "Rejected",
    corrected: "Corrected",
    withdrawn: "Withdrawn",
    expired: "Expired",
  };
  return (locale === "zh" ? zh : en)[value] || value;
}

function parseJsonField(value: any) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return { raw: value };
  }
}

export function ProductEditor({ productId }: { productId: string }) {
  const { locale } = useLanguage();
  const supabase = createSupabaseClient();
  const t =
    locale === "zh"
      ? {
	          loading: "加载产品中...",
	          notFound: "未找到产品。",
	          back: "返回产品列表",
	          consumerView: "消费者版 DPP",
	          professionalView: "专业版 DPP",
	          auditView: "审计版 DPP",
          basic: "1. 产品核心信息与行业选择",
          publish: "保存草稿与发布状态",
          registryReadiness: "中央注册库对接字段",
          publicContent: "公开 DPP 展示内容",
          name: "产品名称（英文）",
          nameZh: "产品名称（中文）",
          sku: "SKU",
          brand: "品牌",
          category: "分类",
          subcategory: "子分类",
          sectorTemplate: "行业模板",
          sector: "行业",
          categoryLevel: "产品类别",
          profileLevel: "细分模板",
          sectorCode: "行业代码",
          categoryCode: "大类代码",
          subcategoryCode: "细分类代码",
          dppProfile: "DPP 字段模板",
          regulationBasis: "法规依据",
          sectorFields: "法规字段清单",
          season: "季节 / 系列",
          description: "描述（英文）",
          descriptionZh: "描述（中文）",
          mainImage: "主图 URL",
          care: "护理说明（英文）",
          careZh: "护理说明（中文）",
          repair: "维修说明（英文）",
          repairZh: "维修说明（中文）",
          eol: "生命周期结束说明（英文）",
          eolZh: "生命周期结束说明（中文）",
          status: "生命周期状态",
          currentVersion: "当前版本",
          nextVersion: "本次保存版本号",
          changeType: "变更类型",
          changeSummary: "变更说明",
          publicSlug: "公开 Slug",
          dppId: "DPP ID",
          granularity: "DPP 粒度",
          commodityCode: "商品编码 / HS Code",
          uniqueProductIdentifier: "唯一产品标识",
          euRegistrationStatus: "中央注册库状态",
          versionHash: "版本 Hash",
          save: "保存产品并记录版本",
          saving: "保存中...",
          saved: "产品已保存，并已记录版本。",
          versionNote: "示例：v1.0 初始发布、v1.1 更新证书、v1.2 更新碳足迹、v2.0 产品批次变更。",
          components: "组件 / BOM",
          materials: "材料",
          esg: "ESG 指标",
          certificates: "证书",
          traceability: "供应链追踪",
          circularity: "循环性",
          transparency: "消费者透明度",
          identity: "数字身份",
          documents: "文档",
          versions: "版本历史",
          registrySubmissions: "中央注册库提交",
          registrationProofs: "注册证明",
          evidenceLinks: "证据字段映射",
          auditLogs: "审计日志",
          blockchainAnchors: "区块链锚定",
          flowIdentity: "2. 数字身份与二维码",
          flowIdentityDesc: "维护 GTIN、批次、序列号、GS1 Digital Link、二维码和其他数据载体。",
          flowSource: "3. 数据源录入",
          flowSourceDesc: "先维护材料、组件、ESG、追溯、循环、证书和文档；这些是真实数据源。",
          flowChecklist: "4. 法规字段清单",
          flowChecklistDesc: "根据行业模板检查披露字段、建议数据源、证据状态和缺失项。",
          flowPublish: "5. 发布、版本与注册库",
          flowPublishDesc: "保存版本、生成 Hash，并记录中央注册库提交、注册证明和发布状态。",
          flowIntegrity: "6. 证据治理与不可篡改记录",
          flowIntegrityDesc: "把字段证据映射、审计日志和区块链锚定组织成可验证证据链。",
        }
      : {
	          loading: "Loading product...",
	          notFound: "Product not found.",
	          back: "Back to products",
	          consumerView: "Consumer DPP",
	          professionalView: "Professional DPP",
	          auditView: "Audit DPP",
          basic: "1. Product core and sector selection",
          publish: "Draft and publication status",
          registryReadiness: "Central registry fields",
          publicContent: "Public DPP display content",
          name: "Product name (English)",
          nameZh: "Product name (Chinese)",
          sku: "SKU",
          brand: "Brand",
          category: "Category",
          subcategory: "Subcategory",
          sectorTemplate: "Sector template",
          sector: "Sector",
          categoryLevel: "Product category",
          profileLevel: "Detailed profile",
          sectorCode: "Sector code",
          categoryCode: "Category code",
          subcategoryCode: "Subcategory code",
          dppProfile: "DPP field profile",
          regulationBasis: "Regulation basis",
          sectorFields: "Regulatory field checklist",
          season: "Season / Collection",
          description: "Description (English)",
          descriptionZh: "Description (Chinese)",
          mainImage: "Main image URL",
          care: "Care instructions (English)",
          careZh: "Care instructions (Chinese)",
          repair: "Repair instructions (English)",
          repairZh: "Repair instructions (Chinese)",
          eol: "End-of-life instructions (English)",
          eolZh: "End-of-life instructions (Chinese)",
          status: "Lifecycle status",
          currentVersion: "Current version",
          nextVersion: "Version for this save",
          changeType: "Change type",
          changeSummary: "Change summary",
          publicSlug: "Public Slug",
          dppId: "DPP ID",
          granularity: "DPP granularity",
          commodityCode: "Commodity / HS code",
          uniqueProductIdentifier: "Unique product identifier",
          euRegistrationStatus: "EU registry status",
          versionHash: "Version hash",
          save: "Save Product and Record Version",
          saving: "Saving...",
          saved: "Product saved and version recorded.",
          versionNote: "Examples: v1.0 initial publish, v1.1 certificate update, v1.2 carbon update, v2.0 product batch change.",
          components: "Components / BOM",
          materials: "Materials",
          esg: "ESG Metrics",
          certificates: "Certificates",
          traceability: "Supply Chain Traceability",
          circularity: "Circularity",
          transparency: "Consumer Transparency",
          identity: "Digital Identity",
          documents: "Documents",
          versions: "Version history",
          registrySubmissions: "EU Registry Submissions",
          registrationProofs: "Registration Proofs",
          evidenceLinks: "Evidence Field Links",
          auditLogs: "Audit Logs",
          blockchainAnchors: "Blockchain Anchors",
          flowIdentity: "2. Digital identity and QR code",
          flowIdentityDesc: "Maintain GTIN, batch, serial number, GS1 Digital Link, QR code and other data carriers.",
          flowSource: "3. Source data entry",
          flowSourceDesc: "Maintain materials, components, ESG, traceability, circularity, certificates and documents first; these are the real source records.",
          flowChecklist: "4. Regulatory field checklist",
          flowChecklistDesc: "Check disclosure fields, suggested source modules, evidence status and missing items by sector profile.",
          flowPublish: "5. Publication, versioning and registry",
          flowPublishDesc: "Save versions, generate hashes, and record central registry submissions, proofs and lifecycle status.",
          flowIntegrity: "6. Evidence governance and immutable records",
          flowIntegrityDesc: "Organize field evidence links, audit logs and blockchain anchors into a verifiable evidence chain.",
        };

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [versionRefreshKey, setVersionRefreshKey] = useState(0);
  const [profileKey, setProfileKey] = useState("");
  const [sectorCode, setSectorCode] = useState("");
  const [categoryCode, setCategoryCode] = useState("");

  async function loadProduct() {
    setLoading(true);
    const { data, error } = await supabase.from("products").select("*").eq("id", productId).single();
    if (error) setMessage(error.message);
    else {
      setProduct(data);
      const savedProfile = findDppSectorProfile(data?.dpp_profile_key);
      setProfileKey(savedProfile?.profileKey || data?.dpp_profile_key || "");
      setSectorCode(savedProfile?.sectorCode || data?.sector_code || "");
      setCategoryCode(savedProfile?.categoryCode || data?.category_code || "");
    }
    setLoading(false);
  }

  useEffect(() => {
    loadProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function saveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!product) return;

    const form = new FormData(event.currentTarget);
    const now = new Date().toISOString();
    const payload: Record<string, any> = {};
    [
      "name",
      "name_zh",
      "sku",
      "brand",
      "category",
      "subcategory",
      "sector_code",
      "category_code",
      "subcategory_code",
      "dpp_profile_key",
      "season",
      "description",
      "description_zh",
      "main_image",
      "care_instructions",
      "care_instructions_zh",
      "repair_instructions",
      "repair_instructions_zh",
      "end_of_life_instructions",
      "end_of_life_instructions_zh",
      "granularity_level",
      "commodity_code",
      "unique_product_identifier",
      "eu_registration_status",
      "dpp_id",
      "public_slug",
      "status",
      "current_version",
    ].forEach((key) => {
      payload[key] = String(form.get(key) || "").trim() || null;
    });
    payload.status = payload.status || "draft";
    payload.current_version = payload.current_version || "v1.0";
    payload.granularity_level = payload.granularity_level || "model";
    payload.eu_registration_status = payload.eu_registration_status || "not_registered";
    const selectedProfile = findDppSectorProfile(payload.dpp_profile_key);
    if (selectedProfile) {
      payload.sector_code = selectedProfile.sectorCode;
      payload.category_code = selectedProfile.categoryCode;
      payload.subcategory_code = selectedProfile.subcategoryCode;
    }
    payload.updated_at = now;

    const version = String(form.get("version") || payload.current_version || "v1.0").trim();
    const changeType = String(form.get("change_type") || "data_correction").trim();
    const changeSummary = String(form.get("change_summary") || "").trim();

    setSaving(true);
    setMessage("");

    const { data: updatedProduct, error } = await supabase
      .from("products")
      .update(payload)
      .eq("id", product.id)
      .select("*")
      .single();

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    const snapshot = {
      product: updatedProduct,
      saved_at: now,
    };
    const dataHash = await sha256Hex(snapshot);

    const { error: versionError } = await supabase.from("product_versions").upsert(
      {
        product_id: product.id,
        version,
        lifecycle_status: payload.status,
        change_type: changeType,
        change_summary: changeSummary || changeTypeLabel(changeType, locale),
        changed_by: "greanlean admin",
        snapshot,
        data_hash: dataHash,
        hash_algorithm: "SHA-256",
      },
      { onConflict: "product_id,version" },
    );

    if (versionError) setMessage(versionError.message);
    else setMessage(t.saved);

    await loadProduct();
    setVersionRefreshKey((key) => key + 1);
    setSaving(false);
  }

  if (loading) return <p className="text-slate-600">{t.loading}</p>;
  if (!product) return <p className="text-red-600">{t.notFound}</p>;

  const publicIdentifier = product.dpp_id || product.public_slug;
  const suggestedVersion = product.current_version ? nextPatchVersion(product.current_version) : "v1.0";
  const selectedProfile = findDppSectorProfile(profileKey || product.dpp_profile_key);
  const sourceDataConfig = getSourceDataConfig(selectedProfile?.sectorCode || sectorCode || product.sector_code);
  const useBatteryDppV2 = publicFeatureFlags.batteryDppV2
    && (selectedProfile?.sectorCode || sectorCode || product.sector_code) === "battery";
  const sectorOptions = uniqueByCode(DPP_SECTOR_PROFILES, "sectorCode");
  const categoryOptions = uniqueByCode(
    DPP_SECTOR_PROFILES.filter((profile) => !sectorCode || profile.sectorCode === sectorCode),
    "categoryCode",
  );
  const profileOptions = DPP_SECTOR_PROFILES.filter(
    (profile) => (!sectorCode || profile.sectorCode === sectorCode) && (!categoryCode || profile.categoryCode === categoryCode),
  );
  const prepareEvidencePayload = async (payload: Record<string, any>) => ({
    ...payload,
    evidence_hash: payload.evidence_hash || (await sha256Hex(payload)),
    hash_algorithm: payload.hash_algorithm || "SHA-256",
    visibility_level: payload.visibility_level || "public",
  });
  const prepareRegistryPayload = (payload: Record<string, any>) => ({
    ...payload,
    submitted_payload: parseJsonField(payload.submitted_payload),
    registry_response: parseJsonField(payload.registry_response),
    visibility_level: payload.visibility_level || "internal",
  });
  const prepareBlockchainPayload = async (payload: Record<string, any>) => {
    const anchoredHash = payload.anchored_hash || (await sha256Hex({ product_id: productId, version: payload.version, created_at: new Date().toISOString() }));
    const txHash = payload.transaction_hash || `0x${await sha256Hex({ anchoredHash, chain: payload.chain_name, network: payload.network })}`;
    return {
      ...payload,
      anchored_hash: anchoredHash,
      hash_algorithm: payload.hash_algorithm || "SHA-256",
      transaction_hash: txHash,
      anchor_status: payload.anchor_status || "pending",
      visibility_level: payload.visibility_level || "public",
    };
  };
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/dashboard/products" className="text-sm font-semibold text-brand-700">
            ← {t.back}
          </Link>
          <h1 className="mt-3 text-3xl font-black">{locale === "zh" && product.name_zh ? product.name_zh : product.name}</h1>
          <p className="mt-2 text-slate-500">
            {t.dppId}: {product.dpp_id || "—"} · {t.currentVersion}: {product.current_version || "v1.0"} · {statusLabel(product.status || "draft", locale)}
          </p>
        </div>
	        {publicIdentifier && (
	          <div className="flex flex-wrap gap-2">
	            <Link href={`/p/${encodeURIComponent(publicIdentifier)}?preview=1&lang=${locale}&view=consumer`} target="_blank" className="btn-secondary">
	              {t.consumerView}
	            </Link>
	            <Link href={`/p/${encodeURIComponent(publicIdentifier)}?preview=1&lang=${locale}&view=professional`} target="_blank" className="btn-primary">
	              {t.professionalView}
	            </Link>
	            <Link href={`/p/${encodeURIComponent(publicIdentifier)}?preview=1&lang=${locale}&view=audit`} target="_blank" className="btn-secondary">
	              {t.auditView}
	            </Link>
	          </div>
	        )}
      </div>

      <form onSubmit={saveProduct} className="grid gap-8 xl:grid-cols-[1fr_380px]">
        <section className="card space-y-5">
          <h2 className="text-xl font-bold">{t.basic}</h2>
          <input className="input" name="name" defaultValue={product.name || ""} placeholder={t.name} required />
          <input className="input" name="name_zh" defaultValue={product.name_zh || ""} placeholder={t.nameZh} />
          <div className="grid gap-4 md:grid-cols-3">
            <input className="input" name="sku" defaultValue={product.sku || ""} placeholder={t.sku} />
            <input className="input" name="brand" defaultValue={product.brand || ""} placeholder={t.brand} />
            <input className="input" name="category" defaultValue={product.category || ""} placeholder={t.category} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <input className="input" name="subcategory" defaultValue={product.subcategory || ""} placeholder={t.subcategory} />
            <input className="input" name="season" defaultValue={product.season || ""} placeholder={t.season} />
          </div>

          <div className="rounded-2xl border border-brand-100 bg-brand-50/40 p-4">
            <h3 className="text-base font-black text-slate-950">{t.sectorTemplate}</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label>
                <span className="label">{t.sector}</span>
                <select
                  className="input mt-1"
                  value={sectorCode}
                  onChange={(event) => {
                    const nextSector = event.target.value;
                    const nextCategory = DPP_SECTOR_PROFILES.find((profile) => profile.sectorCode === nextSector)?.categoryCode || "";
                    const nextProfile = DPP_SECTOR_PROFILES.find((profile) => profile.sectorCode === nextSector && profile.categoryCode === nextCategory);
                    setSectorCode(nextSector);
                    setCategoryCode(nextCategory);
                    setProfileKey(nextProfile?.profileKey || "");
                  }}
                >
                  <option value="">-</option>
                  {sectorOptions.map((profile) => (
                    <option key={profile.sectorCode} value={profile.sectorCode}>
                      {locale === "zh" ? profile.sectorNameZh : profile.sectorName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="label">{t.categoryLevel}</span>
                <select
                  className="input mt-1"
                  value={categoryCode}
                  onChange={(event) => {
                    const nextCategory = event.target.value;
                    const nextProfile = DPP_SECTOR_PROFILES.find((profile) => profile.sectorCode === sectorCode && profile.categoryCode === nextCategory);
                    setCategoryCode(nextCategory);
                    setProfileKey(nextProfile?.profileKey || "");
                  }}
                >
                  <option value="">-</option>
                  {categoryOptions.map((profile) => (
                    <option key={profile.categoryCode} value={profile.categoryCode}>
                      {locale === "zh" ? profile.categoryNameZh : profile.categoryName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="md:col-span-2">
                <span className="label">{t.profileLevel}</span>
                <select
                  className="input mt-1"
                  name="dpp_profile_key"
                  value={profileKey}
                  onChange={(event) => {
                    const nextProfile = findDppSectorProfile(event.target.value);
                    setProfileKey(event.target.value);
                    if (nextProfile) {
                      setSectorCode(nextProfile.sectorCode);
                      setCategoryCode(nextProfile.categoryCode);
                    }
                  }}
                >
                  <option value="">-</option>
                  {profileOptions.map((profile) => (
                    <option key={profile.profileKey} value={profile.profileKey}>
                      {locale === "zh" ? profile.subcategoryNameZh : profile.subcategoryName}
                    </option>
                  ))}
                </select>
              </label>
              <input type="hidden" name="sector_code" value={selectedProfile?.sectorCode || product.sector_code || ""} />
              <input type="hidden" name="category_code" value={selectedProfile?.categoryCode || product.category_code || ""} />
              <input type="hidden" name="subcategory_code" value={selectedProfile?.subcategoryCode || product.subcategory_code || ""} />
              <Info label={t.sectorCode} value={selectedProfile?.sectorCode || product.sector_code} />
              <Info label={t.categoryCode} value={selectedProfile?.categoryCode || product.category_code} />
              <Info label={t.subcategoryCode} value={selectedProfile?.subcategoryCode || product.subcategory_code} />
              <Info label={t.regulationBasis} value={selectedProfile?.regulationBasis} />
            </div>
          </div>

          <div className="border-t border-slate-200 pt-5">
            <h3 className="text-base font-black text-slate-950">{t.publicContent}</h3>
          </div>
          <textarea className="input min-h-28" name="description" defaultValue={product.description || ""} placeholder={t.description} />
          <textarea className="input min-h-28" name="description_zh" defaultValue={product.description_zh || ""} placeholder={t.descriptionZh} />
          <input className="input" name="main_image" defaultValue={product.main_image || ""} placeholder={t.mainImage} />
          <textarea className="input min-h-24" name="care_instructions" defaultValue={product.care_instructions || ""} placeholder={t.care} />
          <textarea className="input min-h-24" name="care_instructions_zh" defaultValue={product.care_instructions_zh || ""} placeholder={t.careZh} />
          <textarea className="input min-h-24" name="repair_instructions" defaultValue={product.repair_instructions || ""} placeholder={t.repair} />
          <textarea className="input min-h-24" name="repair_instructions_zh" defaultValue={product.repair_instructions_zh || ""} placeholder={t.repairZh} />
          <textarea className="input min-h-24" name="end_of_life_instructions" defaultValue={product.end_of_life_instructions || ""} placeholder={t.eol} />
          <textarea className="input min-h-24" name="end_of_life_instructions_zh" defaultValue={product.end_of_life_instructions_zh || ""} placeholder={t.eolZh} />
        </section>

        <section className="card h-fit space-y-5">
          <h2 className="text-xl font-bold">{t.publish}</h2>
          <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
            <h3 className="text-base font-black text-slate-950">{t.registryReadiness}</h3>
            <div className="mt-4 space-y-4">
              <input className="input" name="dpp_id" defaultValue={product.dpp_id || ""} placeholder={t.dppId} />
              <input className="input" name="public_slug" defaultValue={product.public_slug || ""} placeholder={t.publicSlug} />
              <label>
                <span className="label">{t.granularity}</span>
                <select className="input mt-1" name="granularity_level" defaultValue={product.granularity_level || "model"}>
                  {GRANULARITY_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {optionLabel(level, locale)}
                    </option>
                  ))}
                </select>
              </label>
              <input className="input" name="commodity_code" defaultValue={product.commodity_code || ""} placeholder={t.commodityCode} />
              <input className="input" name="unique_product_identifier" defaultValue={product.unique_product_identifier || ""} placeholder={t.uniqueProductIdentifier} />
              <label>
                <span className="label">{t.euRegistrationStatus}</span>
                <select className="input mt-1" name="eu_registration_status" defaultValue={product.eu_registration_status || "not_registered"}>
                  {REGISTRATION_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {optionLabel(status, locale)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <label>
            <span className="label">{t.status}</span>
            <select className="input mt-1" name="status" defaultValue={product.status || "draft"}>
              {LIFECYCLE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status, locale)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">{t.currentVersion}</span>
            <input className="input mt-1" name="current_version" defaultValue={product.current_version || "v1.0"} placeholder="v1.0" />
          </label>
          <label>
            <span className="label">{t.nextVersion}</span>
            <input className="input mt-1" name="version" defaultValue={suggestedVersion} placeholder="v1.1" />
          </label>
          <label>
            <span className="label">{t.changeType}</span>
            <select className="input mt-1" name="change_type" defaultValue="data_correction">
              {CHANGE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {changeTypeLabel(type, locale)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">{t.changeSummary}</span>
            <textarea className="input mt-1 min-h-24" name="change_summary" placeholder={t.versionNote} />
          </label>
          <button disabled={saving} className="btn-primary w-full">
            {saving ? t.saving : t.save}
          </button>
          {message && <p className="text-sm text-slate-600">{message}</p>}
        </section>
      </form>

      {useBatteryDppV2 ? (
        <>
          <BatteryDppWorkspace productId={productId} />
          <SectionHeading title={t.flowPublish} description={t.flowPublishDesc} />
          <ProductVersionHistory productId={productId} refreshKey={versionRefreshKey} title={t.versions} />
        </>
      ) : (
        <>
      <SectionHeading title={t.flowIdentity} description={t.flowIdentityDesc} />
      <ProductRelatedManager productId={productId} title="Digital Identity" titleZh={t.identity} table="product_digital_identity" displayFields={["gtin", "batch_id", "serial_id", "digital_link_url"]} preparePayload={(payload) => {
        const gtin = normalizeGtin(payload.gtin);
        const baseUrl = typeof window !== "undefined" ? window.location.origin : null;
        const digitalLink = buildGs1DigitalLink({ gtin, batchId: payload.batch_id, serialId: payload.serial_id, baseUrl });
        return {
          ...payload,
          gtin: gtin || payload.gtin,
          digital_link_url: payload.digital_link_url || digitalLink,
          data_carrier_type: payload.data_carrier_type || "qr",
          data_carrier_url: payload.data_carrier_url || payload.digital_link_url || digitalLink,
          product_uuid: payload.product_uuid || buildUniqueProductIdentifier({ gtin, batchId: payload.batch_id, serialId: payload.serial_id }),
        };
      }} fields={[{ name: "product_uuid", label: "Product UUID / UPI", labelZh: "产品 UUID / UPI" }, { name: "gtin", label: "GTIN", labelZh: "GTIN" }, { name: "style_id", label: "Style ID", labelZh: "款式 ID" }, { name: "batch_id", label: "Batch ID", labelZh: "批次 ID" }, { name: "serial_id", label: "Serial ID", labelZh: "序列号" }, { name: "digital_link_url", label: "GS1 Digital Link URL", labelZh: "GS1 数字链接 URL", type: "url" }, { name: "data_carrier_type", label: "Data Carrier Type", labelZh: "数据载体类型" }, { name: "data_carrier_url", label: "Data Carrier URL", labelZh: "数据载体 URL", type: "url" }, { name: "qr_code_id", label: "QR Code ID", labelZh: "二维码 ID" }, { name: "nfc_id", label: "NFC ID", labelZh: "NFC ID" }, { name: "rfid_epc", label: "RFID EPC", labelZh: "RFID EPC" }]} />

      <SectionHeading title={t.flowSource} description={t.flowSourceDesc} />
      <ProductRelatedManager productId={productId} title="Materials" titleZh={t.materials} description={sourceDataConfig.materials.description} descriptionZh={sourceDataConfig.materials.descriptionZh} table="product_materials" displayFields={sourceDataConfig.materials.displayFields} fields={sourceDataConfig.materials.fields} />
      <ProductRelatedManager productId={productId} title="Components / BOM" titleZh={t.components} description={sourceDataConfig.bom.description} descriptionZh={sourceDataConfig.bom.descriptionZh} table="product_bom" displayFields={sourceDataConfig.bom.displayFields} fields={sourceDataConfig.bom.fields} />
      <ProductRelatedManager productId={productId} title="ESG Metrics" titleZh={t.esg} description={sourceDataConfig.esg.description} descriptionZh={sourceDataConfig.esg.descriptionZh} table="product_esg_metrics" displayFields={sourceDataConfig.esg.displayFields} fields={sourceDataConfig.esg.fields} />
      <ProductRelatedManager productId={productId} title="Traceability Events" titleZh={t.traceability} table="product_traceability" orderBy="event_date" displayFields={["event_name", "country", "city", "facility_name", "verification_status"]} fields={[{ name: "event_type", label: "Event Type", labelZh: "事件类型" }, { name: "event_name", label: "Event Name", labelZh: "事件名称", required: true }, { name: "event_name_zh", label: "Event Name Chinese", labelZh: "事件名称中文" }, { name: "event_date", label: "Event Date", labelZh: "事件日期", type: "datetime-local" }, { name: "country", label: "Country", labelZh: "国家" }, { name: "city", label: "City", labelZh: "城市" }, { name: "facility_name", label: "Facility Name", labelZh: "设施名称" }, { name: "facility_name_zh", label: "Facility Name Chinese", labelZh: "设施名称中文" }, { name: "transport_method", label: "Transport Method", labelZh: "运输方式" }, { name: "verification_status", label: "Verification Status", labelZh: "验证状态" }, { name: "notes", label: "Notes", labelZh: "备注", type: "textarea" }, { name: "notes_zh", label: "Notes Chinese", labelZh: "备注中文", type: "textarea" }]} />
      <ProductRelatedManager productId={productId} title="Circularity" titleZh={t.circularity} description={sourceDataConfig.circularity.description} descriptionZh={sourceDataConfig.circularity.descriptionZh} table="product_circularity" displayFields={sourceDataConfig.circularity.displayFields} fields={sourceDataConfig.circularity.fields} />
      <ProductRelatedManager productId={productId} title="Consumer Transparency" titleZh={t.transparency} table="product_consumer_transparency" displayFields={["brand_story", "sustainability_story", "consumer_notice"]} fields={[{ name: "brand_story", label: "Brand Story", labelZh: "品牌故事", type: "textarea" }, { name: "brand_story_zh", label: "Brand Story Chinese", labelZh: "品牌故事中文", type: "textarea" }, { name: "sustainability_story", label: "Sustainability Story", labelZh: "可持续故事", type: "textarea" }, { name: "sustainability_story_zh", label: "Sustainability Story Chinese", labelZh: "可持续故事中文", type: "textarea" }, { name: "consumer_notice", label: "Consumer Notice", labelZh: "消费者提示", type: "textarea" }, { name: "consumer_notice_zh", label: "Consumer Notice Chinese", labelZh: "消费者提示中文", type: "textarea" }, { name: "marketing_content", label: "Marketing Content", labelZh: "营销内容", type: "textarea" }, { name: "marketing_content_zh", label: "Marketing Content Chinese", labelZh: "营销内容中文", type: "textarea" }]} />
      <ProductRelatedManager productId={productId} title="Certificates" titleZh={t.certificates} table="product_certificates" displayFields={["certificate_name", "certificate_type", "issuer", "verification_status"]} preparePayload={prepareEvidencePayload} fields={[{ name: "certificate_name", label: "Certificate Name", labelZh: "证书名称", required: true }, { name: "certificate_name_zh", label: "Certificate Name Chinese", labelZh: "证书名称中文" }, { name: "certificate_type", label: "Certificate Type", labelZh: "证书类型" }, { name: "certificate_type_zh", label: "Certificate Type Chinese", labelZh: "证书类型中文" }, { name: "certificate_number", label: "Certificate Number", labelZh: "证书编号" }, { name: "issuer", label: "Issuer", labelZh: "签发机构" }, { name: "issue_date", label: "Issue Date", labelZh: "签发日期", type: "date" }, { name: "expiry_date", label: "Expiry Date", labelZh: "到期日期", type: "date" }, { name: "certificate_url", label: "Certificate URL", labelZh: "证书 URL", type: "url" }, { name: "verification_status", label: "Verification Status", labelZh: "验证状态" }, { name: "evidence_hash", label: "Evidence Hash", labelZh: "证据 Hash" }, { name: "hash_algorithm", label: "Hash Algorithm", labelZh: "Hash 算法" }, { name: "visibility_level", label: "Visibility Level", labelZh: "可见性等级" }]} />
      <ProductRelatedManager productId={productId} title="Documents" titleZh={t.documents} table="product_documents" displayFields={["document_name", "document_type", "language", "version"]} preparePayload={prepareEvidencePayload} fields={[{ name: "document_name", label: "Document Name", labelZh: "文档名称", required: true }, { name: "document_type", label: "Document Type", labelZh: "文档类型" }, { name: "file_url", label: "File URL", labelZh: "文件 URL", type: "url" }, { name: "file_size", label: "File Size", labelZh: "文件大小" }, { name: "language", label: "Language", labelZh: "语言" }, { name: "uploaded_by", label: "Uploaded By", labelZh: "上传者" }, { name: "version", label: "Version", labelZh: "版本" }, { name: "evidence_hash", label: "Evidence Hash", labelZh: "证据 Hash" }, { name: "hash_algorithm", label: "Hash Algorithm", labelZh: "Hash 算法" }, { name: "visibility_level", label: "Visibility Level", labelZh: "可见性等级" }]} />

      <SectionHeading title={t.flowChecklist} description={t.flowChecklistDesc} />
      <SectorFieldManager productId={productId} profileKey={selectedProfile?.profileKey || product.dpp_profile_key} title={t.sectorFields} />

      <SectionHeading title={t.flowPublish} description={t.flowPublishDesc} />
      <ProductVersionHistory productId={productId} refreshKey={versionRefreshKey} title={t.versions} />
      <ProductRelatedManager productId={productId} title="EU Registry Submissions" titleZh={t.registrySubmissions} table="dpp_registry_submissions" displayFields={["submission_status", "eu_registration_identifier", "submitted_version", "submitted_hash"]} preparePayload={prepareRegistryPayload} fields={[{ name: "submission_status", label: "Submission Status", labelZh: "提交状态" }, { name: "registry_environment", label: "Registry Environment", labelZh: "注册库环境" }, { name: "eu_registration_identifier", label: "EU Registration Identifier", labelZh: "欧盟注册 ID" }, { name: "commodity_code", label: "Commodity Code", labelZh: "商品编码" }, { name: "submitted_version", label: "Submitted Version", labelZh: "提交版本" }, { name: "submitted_hash", label: "Submitted Hash", labelZh: "提交 Hash" }, { name: "semantic_model_version", label: "Semantic Model Version", labelZh: "语义模型版本" }, { name: "submitted_payload", label: "Submitted Payload JSON", labelZh: "提交载荷 JSON", type: "textarea" }, { name: "registry_response", label: "Registry Response JSON", labelZh: "注册库响应 JSON", type: "textarea" }, { name: "submitted_at", label: "Submitted At", labelZh: "提交时间", type: "datetime-local" }, { name: "accepted_at", label: "Accepted At", labelZh: "接受时间", type: "datetime-local" }, { name: "rejected_reason", label: "Rejected Reason", labelZh: "驳回原因", type: "textarea" }, { name: "visibility_level", label: "Visibility Level", labelZh: "可见性等级" }]} />
      <ProductRelatedManager productId={productId} title="Registration Proofs" titleZh={t.registrationProofs} table="dpp_registration_proofs" displayFields={["proof_type", "proof_hash", "qualified_seal_status", "expires_at"]} preparePayload={prepareEvidencePayload} fields={[{ name: "proof_type", label: "Proof Type", labelZh: "证明类型" }, { name: "submission_id", label: "Submission ID", labelZh: "提交记录 ID" }, { name: "proof_url", label: "Proof URL", labelZh: "证明文件 URL", type: "url" }, { name: "proof_hash", label: "Proof Hash", labelZh: "证明文件 Hash" }, { name: "hash_algorithm", label: "Hash Algorithm", labelZh: "Hash 算法" }, { name: "qualified_seal_status", label: "Qualified Seal Status", labelZh: "合格电子签章状态" }, { name: "qualified_timestamp", label: "Qualified Timestamp", labelZh: "合格时间戳" }, { name: "generated_at", label: "Generated At", labelZh: "生成时间", type: "datetime-local" }, { name: "expires_at", label: "Expires At", labelZh: "过期时间", type: "datetime-local" }, { name: "visibility_level", label: "Visibility Level", labelZh: "可见性等级" }]} />

      <SectionHeading title={t.flowIntegrity} description={t.flowIntegrityDesc} />
      <ProductRelatedManager productId={productId} title="Evidence Field Links" titleZh={t.evidenceLinks} table="dpp_evidence_links" displayFields={["evidence_type", "supported_field", "verification_status", "visibility_level"]} fields={[{ name: "evidence_type", label: "Evidence Type", labelZh: "证据类型", required: true }, { name: "evidence_ref_id", label: "Evidence Ref ID", labelZh: "证据记录 ID" }, { name: "supported_field", label: "Supported Field", labelZh: "支持字段", required: true }, { name: "supported_module", label: "Supported Module", labelZh: "支持模块" }, { name: "claim_value", label: "Claim Value", labelZh: "声明值", type: "textarea" }, { name: "verification_status", label: "Verification Status", labelZh: "验证状态" }, { name: "visibility_level", label: "Visibility Level", labelZh: "可见性等级" }]} />
      <ProductRelatedManager productId={productId} title="Audit Logs" titleZh={t.auditLogs} table="dpp_audit_logs" displayFields={["action_type", "actor_name", "target_table", "new_hash"]} fields={[{ name: "actor_name", label: "Actor Name", labelZh: "操作人" }, { name: "actor_role", label: "Actor Role", labelZh: "操作角色" }, { name: "action_type", label: "Action Type", labelZh: "操作类型", required: true }, { name: "target_table", label: "Target Table", labelZh: "目标表" }, { name: "target_id", label: "Target ID", labelZh: "目标记录 ID" }, { name: "previous_hash", label: "Previous Hash", labelZh: "前 Hash" }, { name: "new_hash", label: "New Hash", labelZh: "新 Hash" }, { name: "ip_context", label: "IP / Context", labelZh: "IP / 上下文" }, { name: "notes", label: "Notes", labelZh: "备注", type: "textarea" }, { name: "visibility_level", label: "Visibility Level", labelZh: "可见性等级" }]} />
      <ProductRelatedManager productId={productId} title="Blockchain Anchors" titleZh={t.blockchainAnchors} table="dpp_blockchain_anchors" displayFields={["version", "chain_name", "anchor_status", "transaction_hash"]} preparePayload={prepareBlockchainPayload} fields={[{ name: "version", label: "DPP Version", labelZh: "DPP 版本" }, { name: "anchored_hash", label: "Anchored Hash", labelZh: "锚定 Hash" }, { name: "hash_algorithm", label: "Hash Algorithm", labelZh: "Hash 算法" }, { name: "chain_name", label: "Chain Name", labelZh: "区块链名称" }, { name: "chain_id", label: "Chain ID", labelZh: "链 ID" }, { name: "network", label: "Network", labelZh: "网络" }, { name: "contract_address", label: "Contract Address", labelZh: "合约地址" }, { name: "transaction_hash", label: "Transaction Hash", labelZh: "交易 Hash" }, { name: "block_number", label: "Block Number", labelZh: "区块高度" }, { name: "anchor_status", label: "Anchor Status", labelZh: "锚定状态" }, { name: "anchored_at", label: "Anchored At", labelZh: "锚定时间", type: "datetime-local" }, { name: "explorer_url", label: "Explorer URL", labelZh: "区块浏览器 URL", type: "url" }, { name: "notes", label: "Notes", labelZh: "备注", type: "textarea" }, { name: "visibility_level", label: "Visibility Level", labelZh: "可见性等级" }]} />
        </>
      )}
    </div>
  );
}

function ProductVersionHistory({ productId, refreshKey, title }: { productId: string; refreshKey: number; title: string }) {
  const { locale } = useLanguage();
  const supabase = createSupabaseClient();
  const [rows, setRows] = useState<any[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("product_versions")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });
      if (error) setMessage(error.message);
      else setRows(data || []);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, refreshKey]);

  const emptyText = locale === "zh" ? "暂无版本记录。保存产品后会自动生成。" : "No version records yet. Saving the product will create one.";

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{rows.length} records</p>
        </div>
      </div>
      {message && <p className="mt-4 text-sm text-red-600">{message}</p>}
      <div className="mt-5 grid gap-3">
        {rows.map((row) => (
          <article key={row.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-black text-slate-950">{row.version}</p>
                <p className="mt-1 text-sm text-slate-500">{new Date(row.created_at).toLocaleString(locale === "zh" ? "zh-CN" : "en-US")}</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-slate-700 shadow-sm">
                {statusLabel(row.lifecycle_status || "draft", locale)}
              </span>
            </div>
            <p className="mt-3 text-sm font-bold text-slate-700">{changeTypeLabel(row.change_type || "data_correction", locale)}</p>
            {row.change_summary && <p className="mt-2 text-sm leading-6 text-slate-600">{row.change_summary}</p>}
            {row.data_hash && <p className="mt-3 break-all rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-500">SHA-256: {row.data_hash}</p>}
          </article>
        ))}
        {!rows.length && <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">{emptyText}</p>}
      </div>
    </section>
  );
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
      <p className="text-xs font-black uppercase text-brand-200">DPP Backoffice Layer</p>
      <h2 className="mt-2 text-2xl font-black">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-300">{description}</p>
    </section>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 break-all font-bold text-slate-950">{value || "—"}</p>
    </div>
  );
}
