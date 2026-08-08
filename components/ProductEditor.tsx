"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase";
import { buildGs1DigitalLink, buildUniqueProductIdentifier, normalizeGtin } from "@/lib/dppCompliance";
import { DPP_SECTOR_PROFILES, findDppSectorProfile, uniqueByCode } from "@/lib/dppSectorProfiles";
import { useLanguage } from "@/components/LanguageProvider";
import { ProductRelatedManager, type RelatedField } from "@/components/ProductRelatedManager";
import { SectorFieldManager } from "@/components/SectorFieldManager";
import { BatteryDppWorkspace } from "@/components/battery/BatteryDppWorkspace";
import { internalDataWrite } from "@/lib/client/internalDataWrite";
import { PublicationWorkflowManager } from "@/components/PublicationWorkflowManager";
import { EvidenceFileManager } from "@/components/EvidenceFileManager";
import { DppIntegrationManager } from "@/components/DppIntegrationManager";
import { DppOutputPanel } from "@/components/DppOutputPanel";
import { P0BatteryHierarchy } from "@/components/p0/P0BatteryHierarchy";

type Product = Record<string, any>;
type EditorStage = "identity" | "data" | "operations" | "traceability" | "evidence" | "publish";

const GRANULARITY_LEVELS = ["model", "batch", "item"] as const;

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

export function ProductEditor({ productId }: { productId: string }) {
  const { locale } = useLanguage();
  const supabase = createSupabaseClient();
  const t =
    locale === "zh"
      ? {
	          loading: "加载产品中...",
	          notFound: "未找到产品。",
	          back: "返回产品列表",
	          viewDpp: "查看产品护照",
          basic: "1. 产品核心信息与行业选择",
          publish: "草稿与系统状态",
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
          publicSlug: "公开 Slug",
          dppId: "DPP ID",
          granularity: "DPP 粒度",
          commodityCode: "商品编码 / HS Code",
          uniqueProductIdentifier: "唯一产品标识",
          euRegistrationStatus: "中央注册库状态",
          versionHash: "版本 Hash",
          save: "保存产品草稿",
          saving: "保存中...",
          saved: "产品草稿已保存。",
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
          systemRecords: "系统生成记录",
          systemRecordsDesc: "发布版本、注册回执、审计日志和区块链回执由受控服务生成，此处只读展示。",
          flowIdentity: "2. 数字身份与二维码",
          flowIdentityDesc: "维护 GTIN、批次、序列号、GS1 Digital Link、二维码和其他数据载体。",
          flowSource: "3. 数据源录入",
          flowSourceDesc: "先维护材料、组件、ESG、追溯、循环、证书和文档；这些是真实数据源。",
          flowChecklist: "4. 法规字段清单",
          flowChecklistDesc: "根据行业模板检查披露字段、建议数据源、证据状态和缺失项。",
          flowPublish: "5. 发布、版本与注册库",
          flowPublishDesc: "校验输出、保存不可变版本，并记录审核、发布、中央注册库和系统集成状态。",
          flowIntegrity: "6. 证据治理与不可篡改记录",
          flowIntegrityDesc: "把字段证据映射、审计日志和区块链锚定组织成可验证证据链。",
        }
      : {
	          loading: "Loading product...",
	          notFound: "Product not found.",
	          back: "Back to products",
	          viewDpp: "Open product passport",
          basic: "1. Product core and sector selection",
          publish: "Draft and system status",
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
          publicSlug: "Public Slug",
          dppId: "DPP ID",
          granularity: "DPP granularity",
          commodityCode: "Commodity / HS code",
          uniqueProductIdentifier: "Unique product identifier",
          euRegistrationStatus: "EU registry status",
          versionHash: "Version hash",
          save: "Save product draft",
          saving: "Saving...",
          saved: "Product draft saved.",
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
          systemRecords: "System-generated records",
          systemRecordsDesc: "Published versions, registry receipts, audit logs and blockchain receipts are generated by controlled services and are read-only here.",
          flowIdentity: "2. Digital identity and QR code",
          flowIdentityDesc: "Maintain GTIN, batch, serial number, GS1 Digital Link, QR code and other data carriers.",
          flowSource: "3. Source data entry",
          flowSourceDesc: "Maintain materials, components, ESG, traceability, circularity, certificates and documents first; these are the real source records.",
          flowChecklist: "4. Regulatory field checklist",
          flowChecklistDesc: "Check disclosure fields, suggested source modules, evidence status and missing items by sector profile.",
          flowPublish: "5. Publication, versioning and registry",
          flowPublishDesc: "Validate output, save an immutable version, and record review, publication, Registry, and integration status.",
          flowIntegrity: "6. Evidence governance and immutable records",
          flowIntegrityDesc: "Organize field evidence links, audit logs and blockchain anchors into a verifiable evidence chain.",
        };

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [profileKey, setProfileKey] = useState("");
  const [sectorCode, setSectorCode] = useState("");
  const [categoryCode, setCategoryCode] = useState("");
  const [activeStage, setActiveStage] = useState<EditorStage>("identity");
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

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
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (accessToken) {
        const response = await fetch("/api/access-context", {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        });
        const identity = await response.json().catch(() => null);
        setIsPlatformAdmin(Boolean(identity?.isPlatformAdmin));
      }
      await loadProduct();
    })();
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
      "dpp_id",
      "public_slug",
    ].forEach((key) => {
      payload[key] = String(form.get(key) || "").trim() || null;
    });
    payload.granularity_level = payload.granularity_level || "model";
    const selectedProfile = findDppSectorProfile(payload.dpp_profile_key);
    if (selectedProfile) {
      payload.sector_code = selectedProfile.sectorCode;
      payload.category_code = selectedProfile.categoryCode;
      payload.subcategory_code = selectedProfile.subcategoryCode;
    }
    payload.updated_at = now;

    setSaving(true);
    setMessage("");

    const { error } = await internalDataWrite<Product>({
      table: "products",
      operation: "update",
      values: payload,
      filters: [{ column: "id", operator: "eq", value: product.id }],
      returning: "single",
    });

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    setMessage(t.saved);

    await loadProduct();
    setSaving(false);
  }

  if (loading) return <p className="text-slate-600">{t.loading}</p>;
  if (!product) return <p className="text-red-600">{t.notFound}</p>;

  const publicIdentifier = product.dpp_id || product.public_slug;
  const selectedProfile = findDppSectorProfile(profileKey || product.dpp_profile_key);
  const sourceDataConfig = getSourceDataConfig(selectedProfile?.sectorCode || sectorCode || product.sector_code);
  const useBatteryDppV2 = (
    selectedProfile?.sectorCode
    || sectorCode
    || product.sector_code
  ) === "battery";
  const sectorOptions = uniqueByCode(DPP_SECTOR_PROFILES, "sectorCode");
  const categoryOptions = uniqueByCode(
    DPP_SECTOR_PROFILES.filter((profile) => !sectorCode || profile.sectorCode === sectorCode),
    "categoryCode",
  );
  const profileOptions = DPP_SECTOR_PROFILES.filter(
    (profile) => (!sectorCode || profile.sectorCode === sectorCode) && (!categoryCode || profile.categoryCode === categoryCode),
  );
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
	            <Link href={`/p/${encodeURIComponent(publicIdentifier)}?lang=${locale}`} target="_blank" className="btn-primary">
	              {t.viewDpp}
	            </Link>
	          </div>
			        )}
      </div>

      <EditorWorkflowNav
        activeStage={activeStage}
        isBattery={useBatteryDppV2}
        isPlatformAdmin={isPlatformAdmin}
        onChange={setActiveStage}
      />

      <form
        id="editor-identity"
        onSubmit={saveProduct}
        className={`${activeStage === "identity" ? "grid" : "hidden"} gap-8 xl:grid-cols-[1fr_380px]`}
      >
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
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
            <div>
              <dt className="font-semibold text-slate-500">{t.status}</dt>
              <dd className="mt-1 font-black text-slate-950">{statusLabel(product.status || "draft", locale)}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">{t.currentVersion}</dt>
              <dd className="mt-1 font-black text-slate-950">{product.current_version || "v1.0"}</dd>
            </div>
            <div className="col-span-2">
              <dt className="font-semibold text-slate-500">{t.euRegistrationStatus}</dt>
              <dd className="mt-1 font-black text-slate-950">{optionLabel(product.eu_registration_status || "not_registered", locale)}</dd>
            </div>
          </dl>
          <button disabled={saving} className="btn-primary w-full">
            {saving ? t.saving : t.save}
          </button>
          {message && <p className="text-sm text-slate-600">{message}</p>}
        </section>
      </form>

      {useBatteryDppV2 ? (
        <>
          {activeStage === "data" && <section id="editor-sector" className="space-y-5">
            <EditorSectionHeading
              index={locale === "zh" ? "对应 DPP 模块 01–04、07–08" : "DPP modules 01–04 and 07–08"}
              title={locale === "zh" ? "电池行业专项数据" : "Battery sector data"}
              description={locale === "zh"
                ? "材料与组成、环境与可持续性、性能耐久及电池专项字段统一在电池工作区维护；字段会映射到最终护照对应模块。"
                : "Materials, sustainability, performance, durability and battery-specific fields are maintained in one workspace and mapped to the matching passport modules."}
            />
            <span id="editor-materials" className="block scroll-mt-28" />
            <span id="editor-environment" className="block scroll-mt-28" />
            <span id="editor-performance" className="block scroll-mt-28" />
            <BatteryDppWorkspace
              productId={productId}
              canManageRegistry={isPlatformAdmin}
              allowedSteps={[
                "identity",
                "economic_operator",
                "manufacturing",
                "materials",
                "sustainability",
                "performance",
                "documents",
                "circularity_safety",
              ]}
            />
          </section>}
          {activeStage === "operations" && <section id="editor-operations" className="space-y-5">
            <EditorSectionHeading
              index={locale === "zh" ? "对应 DPP 模块 05、09" : "DPP modules 05 and 09"}
              title={locale === "zh" ? "运行状态与生命周期" : "Operating status and lifecycle"}
              description={locale === "zh"
                ? "维护电池单体、BMS 或网关采集指标和生命周期事件。数据采用只追加方式保存，并依据账号授权展示。"
                : "Maintain battery items, BMS or gateway metrics, and lifecycle events. Records are append-only and projected by account authorisation."}
            />
            <P0BatteryHierarchy productId={productId} />
            <BatteryDppWorkspace
              productId={productId}
              canManageRegistry={false}
              initialStep="item_operation"
              allowedSteps={["item_operation"]}
              showClassificationControls={false}
            />
          </section>}
          {activeStage === "evidence" && <section id="editor-evidence" className="space-y-5">
            <EditorSectionHeading
              index={locale === "zh" ? "对应 DPP 模块 07" : "DPP module 07"}
              title={locale === "zh" ? "合规声明与证据文件" : "Compliance and evidence"}
              description={locale === "zh"
                ? "上传真实声明、测试报告和证明文件，并维护文件版本、有效期、访问级别和核验状态。"
                : "Upload declarations, test reports and evidence while maintaining versions, validity, access and verification state."}
            />
            <EvidenceFileManager productId={productId} />
          </section>}
          {activeStage === "publish" && <section id="editor-publish" className="space-y-6">
            <EditorSectionHeading
              index={locale === "zh" ? "流程阶段 05" : "Workflow stage 05"}
              title={t.flowPublish}
              description={t.flowPublishDesc}
            />
            {isPlatformAdmin ? (
              <>
                <DppOutputPanel
                  productId={productId}
                  identifier={publicIdentifier || null}
                  hasBatteryPassSchema={["ev", "lmt", "industrial"].includes(selectedProfile?.legalCategoryCode || "")}
                />
                <PublicationWorkflowManager productId={productId} />
                <DppIntegrationManager productId={productId} />
                <SystemRecordSummary productId={productId} title={t.systemRecords} description={t.systemRecordsDesc} />
              </>
            ) : (
              <PartnerPreviewPanel identifier={publicIdentifier || null} />
            )}
          </section>}
        </>
      ) : (
        <>
      {activeStage === "identity" && <section className="space-y-5">
      <EditorSectionHeading index={locale === "zh" ? "对应 DPP 模块 01" : "DPP module 01"} title={t.flowIdentity} description={t.flowIdentityDesc} />
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
      </section>}

      {activeStage === "data" && <section id="editor-materials" className="space-y-5">
      <EditorSectionHeading index={locale === "zh" ? "对应 DPP 模块 02" : "DPP module 02"} title={locale === "zh" ? "材料与组成" : "Materials and composition"} description={sourceDataConfig.materials.descriptionZh && locale === "zh" ? sourceDataConfig.materials.descriptionZh : sourceDataConfig.materials.description} />
      <ProductRelatedManager productId={productId} title="Materials" titleZh={t.materials} description={sourceDataConfig.materials.description} descriptionZh={sourceDataConfig.materials.descriptionZh} table="product_materials" displayFields={sourceDataConfig.materials.displayFields} fields={sourceDataConfig.materials.fields} />
      <ProductRelatedManager productId={productId} title="Components / BOM" titleZh={t.components} description={sourceDataConfig.bom.description} descriptionZh={sourceDataConfig.bom.descriptionZh} table="product_bom" displayFields={sourceDataConfig.bom.displayFields} fields={sourceDataConfig.bom.fields} />
      <div id="editor-environment" className="space-y-5">
      <EditorSectionHeading index={locale === "zh" ? "对应 DPP 模块 03" : "DPP module 03"} title={locale === "zh" ? "环境与可持续性" : "Environment and sustainability"} description={sourceDataConfig.esg.descriptionZh && locale === "zh" ? sourceDataConfig.esg.descriptionZh : sourceDataConfig.esg.description} />
      <ProductRelatedManager productId={productId} title="ESG Metrics" titleZh={t.esg} description={sourceDataConfig.esg.description} descriptionZh={sourceDataConfig.esg.descriptionZh} table="product_esg_metrics" displayFields={sourceDataConfig.esg.displayFields} fields={sourceDataConfig.esg.fields} />
      </div>
      <div id="editor-sector" className="space-y-5">
      <span id="editor-performance" className="block scroll-mt-28" />
      <EditorSectionHeading index={locale === "zh" ? "对应 DPP 模块 04–05" : "DPP modules 04–05"} title={t.flowChecklist} description={t.flowChecklistDesc} />
      <SectorFieldManager productId={productId} profileKey={selectedProfile?.profileKey || product.dpp_profile_key} title={t.sectorFields} />
      </div>
      </section>}
      {activeStage === "traceability" && <section id="editor-traceability" className="space-y-5">
      <EditorSectionHeading index={locale === "zh" ? "对应 DPP 模块 06" : "DPP module 06"} title={locale === "zh" ? "供应链与生产追溯" : "Supply chain and traceability"} description={locale === "zh" ? "维护关键生产、运输和交付事件及其地点、时间和核验状态。" : "Maintain key production, transport and delivery events with place, time and verification state."} />
      <ProductRelatedManager productId={productId} title="Traceability Events" titleZh={t.traceability} table="product_traceability" orderBy="event_date" displayFields={["event_name", "country", "city", "facility_name", "verification_status"]} fields={[{ name: "event_type", label: "Event Type", labelZh: "事件类型" }, { name: "event_name", label: "Event Name", labelZh: "事件名称", required: true }, { name: "event_name_zh", label: "Event Name Chinese", labelZh: "事件名称中文" }, { name: "event_date", label: "Event Date", labelZh: "事件日期", type: "datetime-local" }, { name: "country", label: "Country", labelZh: "国家" }, { name: "city", label: "City", labelZh: "城市" }, { name: "facility_name", label: "Facility Name", labelZh: "设施名称" }, { name: "facility_name_zh", label: "Facility Name Chinese", labelZh: "设施名称中文" }, { name: "transport_method", label: "Transport Method", labelZh: "运输方式" }, { name: "verification_status", label: "Verification Status", labelZh: "验证状态" }, { name: "notes", label: "Notes", labelZh: "备注", type: "textarea" }, { name: "notes_zh", label: "Notes Chinese", labelZh: "备注中文", type: "textarea" }]} />
      <div id="editor-circularity" className="space-y-5">
      <EditorSectionHeading index={locale === "zh" ? "对应 DPP 模块 08–09" : "DPP modules 08–09"} title={locale === "zh" ? "维修、循环利用与生命周期结束" : "Repair, circularity and end of life"} description={sourceDataConfig.circularity.descriptionZh && locale === "zh" ? sourceDataConfig.circularity.descriptionZh : sourceDataConfig.circularity.description} />
      <ProductRelatedManager productId={productId} title="Circularity" titleZh={t.circularity} description={sourceDataConfig.circularity.description} descriptionZh={sourceDataConfig.circularity.descriptionZh} table="product_circularity" displayFields={sourceDataConfig.circularity.displayFields} fields={sourceDataConfig.circularity.fields} />
      <ProductRelatedManager productId={productId} title="Consumer Transparency" titleZh={t.transparency} table="product_consumer_transparency" displayFields={["brand_story", "sustainability_story", "consumer_notice"]} fields={[{ name: "brand_story", label: "Brand Story", labelZh: "品牌故事", type: "textarea" }, { name: "brand_story_zh", label: "Brand Story Chinese", labelZh: "品牌故事中文", type: "textarea" }, { name: "sustainability_story", label: "Sustainability Story", labelZh: "可持续故事", type: "textarea" }, { name: "sustainability_story_zh", label: "Sustainability Story Chinese", labelZh: "可持续故事中文", type: "textarea" }, { name: "consumer_notice", label: "Consumer Notice", labelZh: "消费者提示", type: "textarea" }, { name: "consumer_notice_zh", label: "Consumer Notice Chinese", labelZh: "消费者提示中文", type: "textarea" }, { name: "marketing_content", label: "Marketing Content", labelZh: "营销内容", type: "textarea" }, { name: "marketing_content_zh", label: "Marketing Content Chinese", labelZh: "营销内容中文", type: "textarea" }]} />
      </div>
      </section>}
      {activeStage === "evidence" && <section id="editor-evidence" className="space-y-5">
      <EditorSectionHeading index={locale === "zh" ? "对应 DPP 模块 07" : "DPP module 07"} title={locale === "zh" ? "合规声明与证据文件" : "Compliance and evidence"} description={locale === "zh" ? "证书、声明和文件在这里维护，并关联核验状态和访问级别。" : "Maintain certificates, declarations and files with verification and access state."} />
      <ProductRelatedManager productId={productId} title="Certificates" titleZh={t.certificates} table="product_certificates" displayFields={["certificate_name", "certificate_type", "issuer", "verification_status"]} fields={[{ name: "certificate_name", label: "Certificate Name", labelZh: "证书名称", required: true }, { name: "certificate_name_zh", label: "Certificate Name Chinese", labelZh: "证书名称中文" }, { name: "certificate_type", label: "Certificate Type", labelZh: "证书类型" }, { name: "certificate_type_zh", label: "Certificate Type Chinese", labelZh: "证书类型中文" }, { name: "certificate_number", label: "Certificate Number", labelZh: "证书编号" }, { name: "issuer", label: "Issuer", labelZh: "签发机构" }, { name: "issue_date", label: "Issue Date", labelZh: "签发日期", type: "date" }, { name: "expiry_date", label: "Expiry Date", labelZh: "到期日期", type: "date" }, { name: "certificate_url", label: "Certificate URL", labelZh: "证书 URL", type: "url" }, { name: "visibility_level", label: "Visibility Level", labelZh: "可见性等级" }]} />
      <EvidenceFileManager productId={productId} />
      </section>}

      {activeStage === "publish" && <section id="editor-publish" className="space-y-6">
      <EditorSectionHeading
        index={locale === "zh" ? "流程阶段 05" : "Workflow stage 05"}
        title={t.flowPublish}
        description={t.flowPublishDesc}
      />
      {isPlatformAdmin ? (
        <>
          <DppOutputPanel
            productId={productId}
            identifier={publicIdentifier || null}
            hasBatteryPassSchema={false}
          />
          <PublicationWorkflowManager productId={productId} />
          <DppIntegrationManager productId={productId} />
          <SystemRecordSummary productId={productId} title={t.systemRecords} description={t.systemRecordsDesc} />
        </>
      ) : (
        <PartnerPreviewPanel identifier={publicIdentifier || null} />
      )}
      </section>}
        </>
      )}
    </div>
  );
}

function EditorWorkflowNav({
  activeStage,
  isBattery,
  isPlatformAdmin,
  onChange,
}: {
  activeStage: EditorStage;
  isBattery: boolean;
  isPlatformAdmin: boolean;
  onChange: (stage: EditorStage) => void;
}) {
  const { locale } = useLanguage();
  const items = locale === "zh"
    ? [
        ["阶段 01", "基础身份", "产品、行业模板、公开内容和数字身份", "identity"],
        ["阶段 02", isBattery ? "电池法规数据" : "行业数据", isBattery ? "分类、材料、碳足迹、性能与法规字段" : "材料、环境、性能与行业字段", "data"],
        ["阶段 03", isBattery ? "运行与生命周期" : "追溯与循环", isBattery ? "单体状态、BMS 数据与生命周期事件" : "生产追溯、维修、回收和消费者信息", isBattery ? "operations" : "traceability"],
        ["阶段 04", "合规证据", "证书、声明和不可变文件版本", "evidence"],
        ["阶段 05", isPlatformAdmin ? "校验与发布" : "护照检查", isPlatformAdmin ? "输出校验、审核发布与系统集成" : "按当前账号授权检查产品护照", "publish"],
      ]
    : [
        ["Stage 01", "Identity", "Product, profile, public content and identifiers", "identity"],
        ["Stage 02", isBattery ? "Battery regulatory data" : "Sector data", isBattery ? "Classification, materials, footprint, performance and regulatory fields" : "Materials, environment, performance and sector fields", "data"],
        ["Stage 03", isBattery ? "Operation and lifecycle" : "Traceability", isBattery ? "Item status, BMS data and lifecycle events" : "Production, repair, recovery and consumer information", isBattery ? "operations" : "traceability"],
        ["Stage 04", "Evidence", "Certificates, declarations and immutable files", "evidence"],
        ["Stage 05", isPlatformAdmin ? "Validate and publish" : "Passport review", isPlatformAdmin ? "Output validation, publication and integration" : "Review the passport resolved for this account", "publish"],
      ];

  return (
    <nav className="sticky top-0 z-20 overflow-x-auto border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur" aria-label={locale === "zh" ? "产品护照编辑流程" : "Product passport editing workflow"}>
      <div className="grid min-w-[760px] grid-flow-col auto-cols-fr gap-2">
        {items.map(([index, label, description, stage]) => (
          <button
            key={stage}
            type="button"
            onClick={() => onChange(stage as EditorStage)}
            className={`min-h-20 border-l-4 px-4 py-3 text-left transition ${
              activeStage === stage
                ? "border-emerald-600 bg-emerald-50 text-emerald-950"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50/50"
            }`}
          >
            <span className="block text-xs font-black text-emerald-700">{index}</span>
            <span className="mt-1 block text-sm font-black">{label}</span>
            <span className="mt-1 block text-xs font-semibold leading-4 text-slate-500">{description}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

function PartnerPreviewPanel({ identifier }: { identifier: string | null }) {
  const { locale } = useLanguage();
  const zh = locale === "zh";
  return (
    <section className="card">
      <p className="text-xs font-black text-emerald-700">
        {zh ? "合作伙伴权限" : "Partner access"}
      </p>
      <h3 className="mt-1 text-xl font-black text-slate-950">
        {zh ? "预览并检查产品护照" : "Preview and review the product passport"}
      </h3>
      <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
        {zh
          ? "产品护照只有一个访问入口，系统会按当前账号的组织、角色和产品授权自动返回可见字段。审核发布、注册库提交、区块链存证和系统集成仍由 GreanLean 平台管理员执行。"
          : "The product passport has one access point. Visible fields are resolved from the current account's organisation, role, and product grant. Publication, Registry submission, blockchain anchoring, and integrations remain controlled by GreanLean platform administrators."}
      </p>
      {identifier ? (
        <div className="mt-5 flex flex-wrap gap-3">
          <Link className="btn-primary" href={`/p/${encodeURIComponent(identifier)}?lang=${locale}`} target="_blank">
            {zh ? "查看产品护照" : "Open product passport"}
          </Link>
        </div>
      ) : (
        <p className="mt-5 text-sm font-semibold text-amber-700">
          {zh ? "请先保存产品护照标识。" : "Save a passport identifier before opening previews."}
        </p>
      )}
    </section>
  );
}

function EditorSectionHeading({
  index,
  title,
  description,
}: {
  index: string;
  title: string;
  description: string;
}) {
  return (
    <header className="border-l-4 border-emerald-600 bg-white px-5 py-4 shadow-sm">
      <p className="text-xs font-black text-emerald-700">{index}</p>
      <h2 className="mt-1 text-xl font-black text-slate-950">{title}</h2>
      <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-600">{description}</p>
    </header>
  );
}

function SystemRecordSummary({
  productId,
  title,
  description,
}: {
  productId: string;
  title: string;
  description: string;
}) {
  const { locale } = useLanguage();
  const [counts, setCounts] = useState({
    versions: 0,
    registry: 0,
    audits: 0,
    anchors: 0,
  });

  useEffect(() => {
    let active = true;
    const supabase = createSupabaseClient();
    Promise.all([
      supabase.from("dpp_publication").select("id", { count: "exact", head: true }).eq("product_id", productId),
      supabase.from("registry_submission").select("id", { count: "exact", head: true }).eq("product_id", productId),
      supabase.from("dpp_audit_logs").select("id", { count: "exact", head: true }).eq("product_id", productId),
      supabase.from("dpp_blockchain_anchors").select("id", { count: "exact", head: true }).eq("product_id", productId),
    ]).then(([versions, registry, audits, anchors]) => {
      if (!active) return;
      setCounts({
        versions: versions.count || 0,
        registry: registry.count || 0,
        audits: audits.count || 0,
        anchors: anchors.count || 0,
      });
    });
    return () => {
      active = false;
    };
  }, [productId]);

  const items = locale === "zh"
    ? [
        ["发布版本", counts.versions],
        ["注册提交", counts.registry],
        ["审计记录", counts.audits],
        ["区块链回执", counts.anchors],
      ]
    : [
        ["Published versions", counts.versions],
        ["Registry submissions", counts.registry],
        ["Audit records", counts.audits],
        ["Blockchain receipts", counts.anchors],
      ];

  return (
    <section className="card">
      <h3 className="text-xl font-black text-slate-950">{title}</h3>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
      <dl className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {items.map(([label, value]) => (
          <div key={String(label)} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <dt className="text-sm font-semibold text-slate-500">{label}</dt>
            <dd className="mt-2 text-2xl font-black text-slate-950">{value}</dd>
          </div>
        ))}
      </dl>
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
