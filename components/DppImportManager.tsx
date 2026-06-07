"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { createSupabaseClient } from "@/lib/supabase";
import { slugify } from "@/lib/slugify";

type ModuleKey =
  | "Products"
  | "DigitalIdentity"
  | "BOM"
  | "Materials"
  | "ChemicalCompliance"
  | "ProductPerformance"
  | "Traceability"
  | "ESG"
  | "Circularity"
  | "Certificates"
  | "ConsumerTransparency"
  | "Documents"
  | "DataGovernance";

type ImportModule = {
  key: ModuleKey;
  title: string;
  titleZh: string;
  description: string;
  descriptionZh: string;
  required: string[];
  columns: string[];
  sample: Record<string, string | number>;
};

type ParsedUpload = {
  fileName: string;
  moduleKey: ModuleKey;
  rows: Record<string, string>[];
};

type ValidationIssue = {
  moduleKey: ModuleKey;
  row: number;
  message: string;
};

type ImportStats = {
  products: number;
  digitalIdentity: number;
  bom: number;
  materials: number;
  chemicals: number;
  performance: number;
  traceability: number;
  esg: number;
  circularity: number;
  certificates: number;
  consumerTransparency: number;
  documents: number;
  governance: number;
};

const modules: ImportModule[] = [
  {
    key: "Products",
    title: "Products",
    titleZh: "产品基本信息",
    description: "Product identity, image URL, batch and public DPP basics.",
    descriptionZh: "产品身份、图片链接、批次和公开 DPP 基础信息。",
    required: ["sku", "product_name_en", "category"],
    columns: [
      "sku",
      "product_name_en",
      "product_name_zh",
      "brand",
      "category",
      "subcategory",
      "description_en",
      "description_zh",
      "main_image_url",
      "batch_id",
      "production_date",
      "origin_country",
      "status",
    ],
    sample: {
      sku: "GL-EARBUDS-001",
      product_name_en: "Wireless Bluetooth Earbuds",
      product_name_zh: "无线蓝牙耳机",
      brand: "greanlean",
      category: "Consumer Electronics",
      subcategory: "Wireless Earbuds",
      description_en: "Demo consumer electronics product for EU DPP, RoHS, REACH and WEEE data disclosure.",
      description_zh: "用于欧盟 DPP、RoHS、REACH 和 WEEE 数据披露的消费电子示例产品。",
      main_image_url: "/images/demo-wireless-earbuds.png",
      batch_id: "BATCH-AUDIO-2026-001",
      production_date: "2026-05-28",
      origin_country: "China",
      status: "published",
    },
  },
  {
    key: "DigitalIdentity",
    title: "Digital Identity",
    titleZh: "数字身份与数据载体",
    description: "GTIN, SGTIN, batch, serial, QR/NFC/RFID and digital link information.",
    descriptionZh: "GTIN、SGTIN、批次、序列号、二维码/NFC/RFID 与数字链接。",
    required: ["sku", "gtin", "batch_id"],
    columns: [
      "sku",
      "product_uuid",
      "gtin",
      "style_id",
      "batch_id",
      "serial_id",
      "digital_link_url",
      "qr_code_id",
      "nfc_id",
      "rfid_epc",
    ],
    sample: {
      sku: "GL-EARBUDS-001",
      product_uuid: "demo-earbuds-uuid-001",
      gtin: "06900000000128",
      style_id: "STYLE-AUDIO-001",
      batch_id: "BATCH-AUDIO-2026-001",
      serial_id: "EARBUDS-DEMO-0001",
      digital_link_url: "https://www.greanlean.com/p/DPP-AUDIO-DEMO-001",
      qr_code_id: "QR-DPP-EARBUDS-001",
      nfc_id: "NFC-EARBUDS-001",
      rfid_epc: "RFID-RESERVED",
    },
  },
  {
    key: "BOM",
    title: "BOM / Components",
    titleZh: "BOM / 零部件",
    description: "Product components, quantities, units and positions.",
    descriptionZh: "产品组件、数量、单位和位置。",
    required: ["sku", "component_name_en"],
    columns: [
      "sku",
      "component_name_en",
      "component_name_zh",
      "component_type_en",
      "component_type_zh",
      "quantity",
      "unit",
      "position",
    ],
    sample: {
      sku: "GL-EARBUDS-001",
      component_name_en: "Wireless earbud main unit",
      component_name_zh: "无线耳机主体",
      component_type_en: "Electronic assembly",
      component_type_zh: "电子组件",
      quantity: 2,
      unit: "pcs",
      position: "Left / Right earbuds",
    },
  },
  {
    key: "Materials",
    title: "Materials",
    titleZh: "材料组成与来源",
    description: "Material composition, source, recycled content and certification.",
    descriptionZh: "材料组成、来源、再生成分和材料认证。",
    required: ["sku", "material_name_en", "percentage"],
    columns: [
      "sku",
      "material_name_en",
      "material_name_zh",
      "material_type",
      "percentage",
      "origin_country",
      "supplier_name",
      "recycled_content",
      "chemical_info",
      "recyclability",
      "certification",
    ],
    sample: {
      sku: "GL-EARBUDS-001",
      material_name_en: "Recycled ABS / PC plastic",
      material_name_zh: "再生 ABS / PC 塑料",
      material_type: "Polymer",
      percentage: 45,
      origin_country: "China",
      supplier_name: "Demo Electronics Materials Supplier",
      recycled_content: 25,
      chemical_info: "RoHS restricted substances screened; REACH SVHC below 0.1% w/w",
      recyclability: "WEEE plastics stream after disassembly",
      certification: "RoHS / REACH supplier declaration",
    },
  },
  {
    key: "ChemicalCompliance",
    title: "Chemical / Restricted Substances",
    titleZh: "化学品与受限物质",
    description: "SVHC, RoHS/REACH, heavy metals, azo dyes and MSDS/report links.",
    descriptionZh: "SVHC、RoHS/REACH、重金属、偶氮染料和 MSDS/检测报告链接。",
    required: ["sku", "test_item"],
    columns: [
      "sku",
      "test_item",
      "result",
      "limit_or_criterion",
      "regulation",
      "report_url",
      "verification_status",
      "last_updated",
    ],
    sample: {
      sku: "GL-EARBUDS-001",
      test_item: "RoHS restricted substances",
      result: "Pass",
      limit_or_criterion: "Pb, Cd, Hg, Cr(VI), PBB, PBDE below RoHS limits",
      regulation: "RoHS / REACH",
      report_url: "/api/chemical-document?type=heavy-metals&product=DPP-AUDIO-DEMO-001",
      verification_status: "verified",
      last_updated: "2026-06-04",
    },
  },
  {
    key: "ProductPerformance",
    title: "Product Performance",
    titleZh: "产品性能",
    description: "Technical performance indicators used in the public DPP page.",
    descriptionZh: "公开 DPP 页面所需的技术性能指标。",
    required: ["sku", "metric_name", "metric_value"],
    columns: [
      "sku",
      "metric_name",
      "metric_value",
      "unit",
      "test_method",
      "report_url",
      "verification_status",
      "last_updated",
    ],
    sample: {
      sku: "GL-EARBUDS-001",
      metric_name: "Battery life",
      metric_value: "8",
      unit: "hours",
      test_method: "Playback at 50% volume",
      report_url: "/api/dpp-export?format=pdf&product=DPP-AUDIO-DEMO-001",
      verification_status: "verified",
      last_updated: "2026-06-04",
    },
  },
  {
    key: "Traceability",
    title: "Traceability",
    titleZh: "生产与运输追溯",
    description: "Production, facility and logistics events for each product.",
    descriptionZh: "每个产品的生产、设施和物流事件。",
    required: ["sku", "event_name_en", "event_type"],
    columns: [
      "sku",
      "event_type",
      "event_name_en",
      "event_name_zh",
      "event_date",
      "country",
      "city",
      "facility_name",
      "supplier_name",
      "transport_method",
      "verification_status",
      "notes",
    ],
    sample: {
      sku: "GL-EARBUDS-001",
      event_type: "manufacturing",
      event_name_en: "Final assembly and acoustic test",
      event_name_zh: "总装与声学测试",
      event_date: "2026-05-30",
      country: "China",
      city: "Dongguan",
      facility_name: "Demo Electronics Assembly Plant",
      supplier_name: "Demo Electronics EMS Partner",
      transport_method: "Truck",
      verification_status: "verified",
      notes: "Batch QA and acoustic test records uploaded.",
    },
  },
  {
    key: "ESG",
    title: "ESG",
    titleZh: "ESG 与循环性",
    description: "Carbon, energy, resources, waste and circularity metrics.",
    descriptionZh: "碳、能源、资源、废弃物和循环性指标。",
    required: ["sku"],
    columns: [
      "sku",
      "carbon_footprint",
      "carbon_unit",
      "water_usage",
      "energy_consumption",
      "waste_generation",
      "recycled_content",
      "recyclability_score",
      "repairability_score",
      "methodology",
      "verified_by",
    ],
    sample: {
      sku: "GL-EARBUDS-001",
      carbon_footprint: 6.8,
      carbon_unit: "kg CO2e",
      water_usage: 42,
      energy_consumption: 15.5,
      waste_generation: 0.22,
      recycled_content: 18,
      recyclability_score: 58,
      repairability_score: 64,
      methodology: "Screening LCA based on component BOM, battery data and logistics assumptions",
      verified_by: "SGS-CSTC Standards Technical Services Co., Ltd. (Demo)",
    },
  },
  {
    key: "Circularity",
    title: "Circularity / End of Life",
    titleZh: "循环性 / 生命周期结束",
    description: "Repairability, recyclability, take-back, resale, recycling and end-of-life instructions.",
    descriptionZh: "可维修性、可回收性、回收计划、转售、回收和生命周期结束说明。",
    required: ["sku"],
    columns: [
      "sku",
      "repairability_score",
      "recyclability_score",
      "take_back_program",
      "resale_supported",
      "remanufacturing_supported",
      "disassembly_guide",
      "recycling_instructions",
      "end_of_life_info",
    ],
    sample: {
      sku: "GL-EARBUDS-001",
      repairability_score: 64,
      recyclability_score: 58,
      take_back_program: "WEEE take-back through authorized collection points",
      resale_supported: "true",
      remanufacturing_supported: "false",
      disassembly_guide: "Remove ear tips and separate charging case before recycling",
      recycling_instructions: "Send electronics and battery-containing parts to WEEE stream",
      end_of_life_info: "Do not dispose with household waste; use WEEE collection.",
    },
  },
  {
    key: "Certificates",
    title: "Certificates",
    titleZh: "认证证书",
    description: "Certificate names, issuers, numbers, validity and links.",
    descriptionZh: "证书名称、签发方、编号、有效期和链接。",
    required: ["sku", "certificate_name"],
    columns: [
      "sku",
      "certificate_name",
      "certificate_type",
      "certificate_number",
      "issuer",
      "issue_date",
      "expiry_date",
      "certificate_url",
      "verification_status",
    ],
    sample: {
      sku: "GL-EARBUDS-001",
      certificate_name: "EU Declaration of Conformity",
      certificate_type: "DoC",
      certificate_number: "CE-DOC-AUDIO-2026-001",
      issuer: "Greanlean Electronics Demo Manufacturer",
      issue_date: "2026-06-04",
      expiry_date: "2027-06-03",
      certificate_url: "/api/declaration?product=DPP-AUDIO-DEMO-001",
      verification_status: "verified",
    },
  },
  {
    key: "ConsumerTransparency",
    title: "Consumer Transparency",
    titleZh: "消费者透明化",
    description: "Consumer-facing brand, sustainability, care and end-of-life notes.",
    descriptionZh: "面向消费者的品牌、可持续、护理和生命周期结束说明。",
    required: ["sku"],
    columns: [
      "sku",
      "brand_story_en",
      "brand_story_zh",
      "sustainability_story_en",
      "sustainability_story_zh",
      "care_instructions_en",
      "care_instructions_zh",
      "repair_guide_en",
      "repair_guide_zh",
      "packaging_info",
      "end_of_life_info",
      "consumer_notice_en",
      "consumer_notice_zh",
    ],
    sample: {
      sku: "GL-EARBUDS-001",
      brand_story_en: "Designed for traceable electronics exports to the EU.",
      brand_story_zh: "面向出口欧盟的可追溯消费电子产品。",
      sustainability_story_en: "Uses recycled plastic content, RoHS-screened components and WEEE end-of-life guidance.",
      sustainability_story_zh: "采用部分再生塑料、RoHS 筛查组件，并提供 WEEE 生命周期结束指引。",
      care_instructions_en: "Keep dry, clean ear tips regularly and avoid extreme heat.",
      care_instructions_zh: "保持干燥，定期清洁耳塞，避免高温环境。",
      repair_guide_en: "Replace ear tips and contact authorized service for battery or charging case repair.",
      repair_guide_zh: "可更换耳塞；电池或充电盒维修请联系授权服务商。",
      packaging_info: "FSC paper box with reduced plastic insert",
      end_of_life_info: "Do not dispose with household waste; send earbuds and charging case to WEEE collection.",
      consumer_notice_en: "Scan the QR code for the latest passport.",
      consumer_notice_zh: "扫描二维码查看最新产品护照。",
    },
  },
  {
    key: "Documents",
    title: "Documents / Evidence Files",
    titleZh: "证据文件",
    description: "LCA reports, MSDS, DoC, test reports, manuals and downloadable evidence files.",
    descriptionZh: "LCA、MSDS、符合性声明、检测报告、说明书和可下载证据文件。",
    required: ["sku", "document_name"],
    columns: [
      "sku",
      "document_name",
      "document_type",
      "file_url",
      "file_size",
      "language",
      "uploaded_by",
      "version",
    ],
    sample: {
      sku: "GL-EARBUDS-001",
      document_name: "EU Declaration of Conformity",
      document_type: "DoC",
      file_url: "/api/declaration?product=DPP-AUDIO-DEMO-001",
      file_size: "360 KB",
      language: "EN / ZH",
      uploaded_by: "greanlean admin",
      version: "v1.0",
    },
  },
  {
    key: "DataGovernance",
    title: "Data Governance",
    titleZh: "数据治理与验证",
    description: "Data source, owner, audit status, quality score, verifier and update date.",
    descriptionZh: "数据来源、负责人、审计状态、质量评分、验证机构和更新时间。",
    required: ["sku", "data_source"],
    columns: [
      "sku",
      "data_source",
      "data_owner",
      "audit_status",
      "data_quality_score",
      "verification_body",
      "verification_certificate",
      "verification_expiry",
      "last_updated",
    ],
    sample: {
      sku: "GL-EARBUDS-001",
      data_source: "Supplier declarations, RoHS report, battery specification and logistics records",
      data_owner: "greanlean admin",
      audit_status: "Third-party review completed",
      data_quality_score: 88,
      verification_body: "SGS-CSTC Standards Technical Services Co., Ltd. (Demo)",
      verification_certificate: "SGS-DPP-AUDIO-2026-018",
      verification_expiry: "2027-06-03",
      last_updated: "2026-06-04",
    },
  },
];

const numericColumns = new Set([
  "percentage",
  "quantity",
  "recycled_content",
  "carbon_footprint",
  "water_usage",
  "energy_consumption",
  "waste_generation",
  "recyclability_score",
  "repairability_score",
  "data_quality_score",
]);

const dateColumns = new Set(["production_date", "event_date", "issue_date", "expiry_date", "last_updated", "verification_expiry"]);
const urlColumns = new Set(["main_image_url", "certificate_url", "digital_link_url", "report_url", "file_url"]);
const knownColumns = new Map(modules.map((moduleConfig) => [moduleConfig.key, new Set(moduleConfig.columns)]));

function clean(value: string | undefined) {
  const trimmed = String(value || "").trim();
  return trimmed || null;
}

function numberOrNull(value: string | undefined) {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function booleanValue(value: string | undefined) {
  return ["true", "yes", "1", "是", "支持"].includes(String(value || "").trim().toLowerCase());
}

function makeDppId(sku: string) {
  const safeSku = sku.replace(/[^a-zA-Z0-9]+/g, "-").replace(/(^-|-$)+/g, "").toUpperCase();
  return `DPP-${safeSku || Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

function escapeCsv(value: string | number) {
  const raw = String(value ?? "");
  return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

function escapeXml(value: string | number) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function columnName(index: number) {
  let value = "";
  let current = index + 1;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    value = String.fromCharCode(65 + remainder) + value;
    current = Math.floor((current - 1) / 26);
  }
  return value;
}

let crcTable: number[] | null = null;

function crc32(bytes: Uint8Array) {
  if (!crcTable) {
    crcTable = Array.from({ length: 256 }, (_, index) => {
      let c = index;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      return c >>> 0;
    });
  }

  let crc = 0xffffffff;
  bytes.forEach((byte) => {
    crc = (crc >>> 8) ^ crcTable![(crc ^ byte) & 0xff];
  });
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16(bytes: Uint8Array, offset: number, value: number) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
}

function writeUint32(bytes: Uint8Array, offset: number, value: number) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
  bytes[offset + 2] = (value >>> 16) & 0xff;
  bytes[offset + 3] = (value >>> 24) & 0xff;
}

function concatBytes(parts: Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });
  return output;
}

function createZip(files: Array<{ name: string; content: string }>) {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let localOffset = 0;

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const contentBytes = encoder.encode(file.content);
    const checksum = crc32(contentBytes);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    writeUint32(localHeader, 0, 0x04034b50);
    writeUint16(localHeader, 4, 20);
    writeUint16(localHeader, 6, 0);
    writeUint16(localHeader, 8, 0);
    writeUint16(localHeader, 10, 0);
    writeUint16(localHeader, 12, 0);
    writeUint32(localHeader, 14, checksum);
    writeUint32(localHeader, 18, contentBytes.length);
    writeUint32(localHeader, 22, contentBytes.length);
    writeUint16(localHeader, 26, nameBytes.length);
    writeUint16(localHeader, 28, 0);
    localHeader.set(nameBytes, 30);
    localParts.push(localHeader, contentBytes);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    writeUint32(centralHeader, 0, 0x02014b50);
    writeUint16(centralHeader, 4, 20);
    writeUint16(centralHeader, 6, 20);
    writeUint16(centralHeader, 8, 0);
    writeUint16(centralHeader, 10, 0);
    writeUint16(centralHeader, 12, 0);
    writeUint16(centralHeader, 14, 0);
    writeUint32(centralHeader, 16, checksum);
    writeUint32(centralHeader, 20, contentBytes.length);
    writeUint32(centralHeader, 24, contentBytes.length);
    writeUint16(centralHeader, 28, nameBytes.length);
    writeUint16(centralHeader, 30, 0);
    writeUint16(centralHeader, 32, 0);
    writeUint16(centralHeader, 34, 0);
    writeUint16(centralHeader, 36, 0);
    writeUint32(centralHeader, 38, 0);
    writeUint32(centralHeader, 42, localOffset);
    centralHeader.set(nameBytes, 46);
    centralParts.push(centralHeader);

    localOffset += localHeader.length + contentBytes.length;
  });

  const central = concatBytes(centralParts);
  const end = new Uint8Array(22);
  writeUint32(end, 0, 0x06054b50);
  writeUint16(end, 8, files.length);
  writeUint16(end, 10, files.length);
  writeUint32(end, 12, central.length);
  writeUint32(end, 16, localOffset);
  writeUint16(end, 20, 0);

  return concatBytes([...localParts, central, end]);
}

function sheetXml(moduleConfig: ImportModule) {
  const rows = [moduleConfig.columns, moduleConfig.columns.map((column) => String(moduleConfig.sample[column] ?? ""))];
  const xmlRows = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((value, columnIndex) => {
          const ref = `${columnName(columnIndex)}${rowIndex + 1}`;
          return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${xmlRows}</sheetData></worksheet>`;
}

function createWorkbookTemplate() {
  const sheetEntries = modules.map((moduleConfig, index) => ({
    moduleConfig,
    path: `xl/worksheets/sheet${index + 1}.xml`,
    relId: `rId${index + 1}`,
  }));

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
${sheetEntries.map((sheet, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}
</Types>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${sheetEntries.map((sheet, index) => `<sheet name="${escapeXml(sheet.moduleConfig.key)}" sheetId="${index + 1}" r:id="${sheet.relId}"/>`).join("")}</sheets>
</workbook>`;

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${sheetEntries.map((sheet, index) => `<Relationship Id="${sheet.relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("")}
</Relationships>`;

  return createZip([
    { name: "[Content_Types].xml", content: contentTypes },
    { name: "_rels/.rels", content: rootRels },
    { name: "xl/workbook.xml", content: workbook },
    { name: "xl/_rels/workbook.xml.rels", content: workbookRels },
    ...sheetEntries.map((sheet) => ({ name: sheet.path, content: sheetXml(sheet.moduleConfig) })),
  ]);
}

function parseDelimited(text: string) {
  const delimiter = text.includes("\t") ? "\t" : ",";
  const rows: string[][] = [];
  let cell = "";
  let row: string[] = [];
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell.trim());
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell.trim());
  if (row.some((value) => value !== "")) rows.push(row);

  const [headers = [], ...body] = rows;
  return body.map((values) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (header) record[header] = values[index] || "";
    });
    return record;
  });
}

function readUint16(view: DataView, offset: number) {
  return view.getUint16(offset, true);
}

function readUint32(view: DataView, offset: number) {
  return view.getUint32(offset, true);
}

async function inflateRaw(bytes: Uint8Array) {
  if (!("DecompressionStream" in window)) {
    throw new Error("This browser cannot read compressed XLSX files yet. Please use the downloaded template or CSV.");
  }
  const payload = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const stream = new Blob([payload]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function unzipXlsx(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let endOffset = -1;
  for (let index = bytes.length - 22; index >= Math.max(0, bytes.length - 65558); index -= 1) {
    if (readUint32(view, index) === 0x06054b50) {
      endOffset = index;
      break;
    }
  }
  if (endOffset < 0) throw new Error("Invalid XLSX file.");

  const totalEntries = readUint16(view, endOffset + 10);
  const centralOffset = readUint32(view, endOffset + 16);
  const decoder = new TextDecoder();
  const files = new Map<string, Uint8Array>();
  let pointer = centralOffset;

  for (let entry = 0; entry < totalEntries; entry += 1) {
    if (readUint32(view, pointer) !== 0x02014b50) break;
    const method = readUint16(view, pointer + 10);
    const compressedSize = readUint32(view, pointer + 20);
    const fileNameLength = readUint16(view, pointer + 28);
    const extraLength = readUint16(view, pointer + 30);
    const commentLength = readUint16(view, pointer + 32);
    const localOffset = readUint32(view, pointer + 42);
    const fileName = decoder.decode(bytes.slice(pointer + 46, pointer + 46 + fileNameLength));

    const localNameLength = readUint16(view, localOffset + 26);
    const localExtraLength = readUint16(view, localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(dataStart, dataStart + compressedSize);
    const content = method === 0 ? compressed : method === 8 ? await inflateRaw(compressed) : null;
    if (content) files.set(fileName, content);
    pointer += 46 + fileNameLength + extraLength + commentLength;
  }

  return files;
}

function textContent(node: Element | null) {
  return node?.textContent || "";
}

function cellColumnIndex(ref: string) {
  const letters = (ref.match(/[A-Z]+/i)?.[0] || "").toUpperCase();
  if (!letters) return -1;
  return letters.split("").reduce((sum, char) => sum * 26 + char.charCodeAt(0) - 64, 0) - 1;
}

function parseWorksheetXml(xml: string, sharedStrings: string[]) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const rows = Array.from(doc.getElementsByTagName("row")).map((rowNode) => {
    const cells: string[] = [];
    Array.from(rowNode.getElementsByTagName("c")).forEach((cellNode, fallbackIndex) => {
      const parsedIndex = cellColumnIndex(cellNode.getAttribute("r") || "");
      const index = parsedIndex >= 0 ? parsedIndex : fallbackIndex;
      const type = cellNode.getAttribute("t");
      let value = "";
      if (type === "s") {
        value = sharedStrings[Number(textContent(cellNode.getElementsByTagName("v")[0]))] || "";
      } else if (type === "inlineStr") {
        value = textContent(cellNode.getElementsByTagName("t")[0]);
      } else {
        value = textContent(cellNode.getElementsByTagName("v")[0]);
      }
      cells[index] = value.trim();
    });
    return cells;
  });

  const [headers = [], ...body] = rows.filter((row) => row.some(Boolean));
  return body
    .map((values) => {
      const record: Record<string, string> = {};
      headers.forEach((header, index) => {
        if (header) record[header] = values[index] || "";
      });
      return record;
    })
    .filter((record) => Object.values(record).some(Boolean));
}

function moduleFromSheetName(sheetName: string, fallback: ModuleKey) {
  const normalized = sheetName.toLowerCase().replace(/[\s/_-]+/g, "");
  return (
    modules.find((moduleConfig) => {
      const values = [moduleConfig.key, moduleConfig.title, moduleConfig.titleZh].map((value) =>
        value.toLowerCase().replace(/[\s/_-]+/g, "")
      );
      return values.includes(normalized);
    })?.key || fallback
  );
}

async function parseXlsx(file: File, fallback: ModuleKey): Promise<ParsedUpload[]> {
  const files = await unzipXlsx(new Uint8Array(await file.arrayBuffer()));
  const decoder = new TextDecoder();
  const workbookXml = files.get("xl/workbook.xml");
  const relsXml = files.get("xl/_rels/workbook.xml.rels");
  if (!workbookXml || !relsXml) throw new Error("Workbook metadata was not found.");

  const workbookDoc = new DOMParser().parseFromString(decoder.decode(workbookXml), "application/xml");
  const relsDoc = new DOMParser().parseFromString(decoder.decode(relsXml), "application/xml");
  const relTarget = new Map<string, string>();
  Array.from(relsDoc.getElementsByTagName("Relationship")).forEach((relationship) => {
    const id = relationship.getAttribute("Id");
    const target = relationship.getAttribute("Target");
    if (id && target) relTarget.set(id, target.startsWith("xl/") ? target : `xl/${target}`);
  });

  const sharedStringsXml = files.get("xl/sharedStrings.xml");
  const sharedStrings = sharedStringsXml
    ? Array.from(new DOMParser().parseFromString(decoder.decode(sharedStringsXml), "application/xml").getElementsByTagName("si")).map((node) =>
        Array.from(node.getElementsByTagName("t"))
          .map((textNode) => textNode.textContent || "")
          .join("")
      )
    : [];

  return Array.from(workbookDoc.getElementsByTagName("sheet"))
    .map((sheet) => {
      const sheetName = sheet.getAttribute("name") || file.name;
      const relId = sheet.getAttribute("r:id") || sheet.getAttribute("id") || "";
      const target = relTarget.get(relId);
      if (!target || !files.has(target)) return null;
      const rows = parseWorksheetXml(decoder.decode(files.get(target)!), sharedStrings);
      if (!rows.length) return null;
      return {
        fileName: `${file.name} / ${sheetName}`,
        moduleKey: moduleFromSheetName(sheetName, fallback),
        rows,
      };
    })
    .filter(Boolean) as ParsedUpload[];
}

function isValidDate(value: string) {
  if (!value) return true;
  return !Number.isNaN(Date.parse(value));
}

function isValidUrl(value: string) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function detectModule(fileName: string, fallback: ModuleKey) {
  const normalized = fileName.toLowerCase();
  return modules.find((module) => normalized.includes(module.key.toLowerCase()))?.key || fallback;
}

function validateUploads(uploads: ParsedUpload[]) {
  const issues: ValidationIssue[] = [];
  const productSkus = new Set<string>();
  const seenSkus = new Set<string>();
  const materialTotals = new Map<string, number>();

  uploads
    .filter((upload) => upload.moduleKey === "Products")
    .forEach((upload) => {
      upload.rows.forEach((row) => {
        const sku = row.sku?.trim();
        if (sku) productSkus.add(sku);
      });
    });

  uploads.forEach((upload) => {
    const moduleConfig = modules.find((item) => item.key === upload.moduleKey);
    if (!moduleConfig) return;

    upload.rows.forEach((row, index) => {
      const rowNumber = index + 2;

      Object.keys(row).forEach((field) => {
        if (field && !knownColumns.get(upload.moduleKey)?.has(field)) {
          issues.push({
            moduleKey: upload.moduleKey,
            row: rowNumber,
            message: `Unknown column: ${field}`,
          });
        }
      });

      moduleConfig.required.forEach((field) => {
        if (!row[field]?.trim()) {
          issues.push({
            moduleKey: upload.moduleKey,
            row: rowNumber,
            message: `Missing required field: ${field}`,
          });
        }
      });

      if (upload.moduleKey === "Products" && row.sku?.trim()) {
        const sku = row.sku.trim();
        if (seenSkus.has(sku)) {
          issues.push({
            moduleKey: upload.moduleKey,
            row: rowNumber,
            message: `Duplicate SKU in Products sheet: ${sku}`,
          });
        }
        seenSkus.add(sku);
      }

      if (upload.moduleKey !== "Products" && row.sku && productSkus.size > 0 && !productSkus.has(row.sku)) {
        issues.push({
          moduleKey: upload.moduleKey,
          row: rowNumber,
          message: `SKU does not exist in Products: ${row.sku}`,
        });
      }

      Object.entries(row).forEach(([field, value]) => {
        if (numericColumns.has(field) && value && Number.isNaN(Number(value))) {
          issues.push({
            moduleKey: upload.moduleKey,
            row: rowNumber,
            message: `Expected a number in ${field}`,
          });
        }

        if (dateColumns.has(field) && !isValidDate(value)) {
          issues.push({
            moduleKey: upload.moduleKey,
            row: rowNumber,
            message: `Invalid date in ${field}`,
          });
        }

        if (urlColumns.has(field) && !isValidUrl(value)) {
          issues.push({
            moduleKey: upload.moduleKey,
            row: rowNumber,
            message: `Invalid URL in ${field}`,
          });
        }
      });

      if (upload.moduleKey === "Materials" && row.sku) {
        const current = materialTotals.get(row.sku) || 0;
        materialTotals.set(row.sku, current + Number(row.percentage || 0));
      }
    });
  });

  materialTotals.forEach((total, sku) => {
    if (Math.abs(total - 100) > 1) {
      issues.push({
        moduleKey: "Materials",
        row: 0,
        message: `Material percentages for ${sku} total ${total}, expected about 100`,
      });
    }
  });

  return issues;
}

function rowsFor(uploads: ParsedUpload[], moduleKey: ModuleKey) {
  return uploads.filter((upload) => upload.moduleKey === moduleKey).flatMap((upload) => upload.rows);
}

async function clearExistingRows(
  supabase: ReturnType<typeof createSupabaseClient>,
  uploads: ParsedUpload[],
  productIds: Map<string, string>
) {
  const importedModules = new Set(uploads.map((upload) => upload.moduleKey));
  const affectedProductIds = Array.from(
    new Set(
      uploads
        .flatMap((upload) => upload.rows.map((row) => (row.sku ? productIds.get(row.sku) : null)))
        .filter(Boolean) as string[]
    )
  );

  if (!affectedProductIds.length) return;

  const tablesToClear = new Set<string>();
  if (importedModules.has("DigitalIdentity")) tablesToClear.add("product_digital_identity");
  if (importedModules.has("BOM")) tablesToClear.add("product_bom");
  if (importedModules.has("Materials")) tablesToClear.add("product_materials");
  if (importedModules.has("Traceability")) tablesToClear.add("product_traceability");
  if (importedModules.has("ESG")) tablesToClear.add("product_esg_metrics");
  const esgIncludesCircularity = rowsFor(uploads, "ESG").some((row) => row.recyclability_score || row.repairability_score);
  if (esgIncludesCircularity) tablesToClear.add("product_circularity");
  if (importedModules.has("Circularity")) tablesToClear.add("product_circularity");
  if (importedModules.has("Certificates")) tablesToClear.add("product_certificates");
  if (importedModules.has("ConsumerTransparency")) tablesToClear.add("product_consumer_transparency");
  if (importedModules.has("DataGovernance")) tablesToClear.add("product_data_governance");
  if (importedModules.has("ChemicalCompliance") || importedModules.has("ProductPerformance") || importedModules.has("Documents")) {
    tablesToClear.add("product_documents");
  }

  for (const table of Array.from(tablesToClear)) {
    const { error } = await supabase.from(table).delete().in("product_id", affectedProductIds);
    if (error) throw error;
  }
}

function stringRecord(record: Record<string, string | number>) {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, String(value ?? "")]));
}

function buildDemoUploads(): ParsedUpload[] {
  return modules.map((moduleConfig) => {
    const rows = [stringRecord(moduleConfig.sample)];

    if (moduleConfig.key === "Materials") {
      rows.push(
        {
          ...stringRecord(moduleConfig.sample),
          material_name_en: "Lithium-ion battery",
          material_name_zh: "锂离子电池",
          material_type: "Battery",
          percentage: "18",
          recycled_content: "0",
          chemical_info: "Battery MSDS and UN38.3 transport test available",
          recyclability: "Battery recycling stream",
          certification: "UN38.3 / IEC 62133",
        },
        {
          ...stringRecord(moduleConfig.sample),
          material_name_en: "PCB and electronic components",
          material_name_zh: "PCB 与电子元件",
          material_type: "Electronics",
          percentage: "22",
          recycled_content: "0",
          chemical_info: "RoHS compliant solder and components",
          recyclability: "WEEE electronics stream",
          certification: "RoHS",
        },
        {
          ...stringRecord(moduleConfig.sample),
          material_name_en: "Silicone ear tips and copper magnets",
          material_name_zh: "硅胶耳塞与铜磁件",
          material_type: "Accessories",
          percentage: "15",
          recycled_content: "0",
          chemical_info: "Skin-contact materials screened for restricted substances",
          recyclability: "Manual separation recommended",
          certification: "REACH",
        }
      );
    }

    if (moduleConfig.key === "BOM") {
      rows.push(
        {
          ...stringRecord(moduleConfig.sample),
          component_name_en: "Charging case",
          component_name_zh: "充电盒",
          component_type_en: "Battery-containing accessory",
          component_type_zh: "含电池配件",
          quantity: "1",
          unit: "pc",
          position: "Packaging set",
        },
        {
          ...stringRecord(moduleConfig.sample),
          component_name_en: "USB-C charging cable",
          component_name_zh: "USB-C 充电线",
          component_type_en: "Accessory",
          component_type_zh: "配件",
          quantity: "1",
          unit: "pc",
          position: "Packaging set",
        }
      );
    }

    if (moduleConfig.key === "ChemicalCompliance") {
      rows.push(
        {
          ...stringRecord(moduleConfig.sample),
          test_item: "REACH SVHC candidate list",
          result: "Not detected above 0.1% w/w",
          limit_or_criterion: "Candidate list substances below reporting threshold",
          regulation: "REACH",
          report_url: "/api/chemical-document?type=svhc&product=DPP-AUDIO-DEMO-001",
        },
        {
          ...stringRecord(moduleConfig.sample),
          test_item: "Battery MSDS",
          result: "Available",
          limit_or_criterion: "Material safety and transport handling information disclosed",
          regulation: "Battery safety / transport",
          report_url: "/api/chemical-document?type=msds&product=DPP-AUDIO-DEMO-001",
        }
      );
    }

    if (moduleConfig.key === "ProductPerformance") {
      rows.push(
        {
          ...stringRecord(moduleConfig.sample),
          metric_name: "Charge cycles",
          metric_value: "500",
          unit: "cycles",
          test_method: "Battery capacity retention screening",
        },
        {
          ...stringRecord(moduleConfig.sample),
          metric_name: "Ingress protection",
          metric_value: "IPX4",
          unit: "",
          test_method: "Splash resistance declaration",
        }
      );
    }

    return {
      fileName: `${moduleConfig.key}_demo.csv`,
      moduleKey: moduleConfig.key,
      rows,
    };
  });
}

function collectSkus(uploads: ParsedUpload[]) {
  const skus = new Set<string>();
  uploads.forEach((upload) => {
    upload.rows.forEach((row) => {
      if (row.sku?.trim()) skus.add(row.sku.trim());
    });
  });
  return Array.from(skus);
}

async function findOrCreateSupplierId(supabase: ReturnType<typeof createSupabaseClient>, supplierName: string | null) {
  if (!supplierName) return null;

  const { data: existing } = await supabase
    .from("product_suppliers")
    .select("id")
    .eq("supplier_name", supplierName)
    .limit(1)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from("product_suppliers")
    .insert({ supplier_name: supplierName })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

async function ensureProducts(
  supabase: ReturnType<typeof createSupabaseClient>,
  uploads: ParsedUpload[],
  stats: ImportStats
) {
  const productRows = rowsFor(uploads, "Products");
  const allSkus = collectSkus(uploads);
  const productIds = new Map<string, string>();

  for (const row of productRows) {
    const sku = clean(row.sku);
    const name = clean(row.product_name_en);
    if (!sku || !name) continue;

    const { data: existing, error: lookupError } = await supabase
      .from("products")
      .select("id, public_slug, dpp_id")
      .eq("sku", sku)
      .limit(1)
      .maybeSingle();

    if (lookupError) throw lookupError;

    const payload = {
      name,
      name_zh: clean(row.product_name_zh),
      sku,
      brand: clean(row.brand),
      category: clean(row.category),
      subcategory: clean(row.subcategory),
      description: clean(row.description_en),
      description_zh: clean(row.description_zh),
      main_image: clean(row.main_image_url),
      status: clean(row.status) || "published",
      public_slug: existing?.public_slug || slugify(`${name}-${sku}`),
      dpp_id: existing?.dpp_id || makeDppId(sku),
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      const { error } = await supabase.from("products").update(payload).eq("id", existing.id);
      if (error) throw error;
      productIds.set(sku, existing.id);
    } else {
      const { data, error } = await supabase.from("products").insert(payload).select("id").single();
      if (error) throw error;
      productIds.set(sku, data.id as string);
    }

    stats.products += 1;
  }

  const missingSkus = allSkus.filter((sku) => !productIds.has(sku));
  if (missingSkus.length) {
    const { data, error } = await supabase.from("products").select("id, sku").in("sku", missingSkus);
    if (error) throw error;
    (data || []).forEach((product: { id: string; sku: string | null }) => {
      if (product.sku) productIds.set(product.sku, product.id);
    });
  }

  return productIds;
}

async function importUploadsToSupabase(uploads: ParsedUpload[]) {
  const supabase = createSupabaseClient();
  const stats: ImportStats = {
    products: 0,
    digitalIdentity: 0,
    bom: 0,
    materials: 0,
    chemicals: 0,
    performance: 0,
    traceability: 0,
    esg: 0,
    circularity: 0,
    certificates: 0,
    consumerTransparency: 0,
    documents: 0,
    governance: 0,
  };

  const productIds = await ensureProducts(supabase, uploads, stats);
  await clearExistingRows(supabase, uploads, productIds);

  for (const row of rowsFor(uploads, "DigitalIdentity")) {
    const productId = row.sku ? productIds.get(row.sku) : null;
    if (!productId) continue;

    const { error } = await supabase.from("product_digital_identity").insert({
      product_id: productId,
      product_uuid: clean(row.product_uuid),
      gtin: clean(row.gtin),
      style_id: clean(row.style_id),
      batch_id: clean(row.batch_id),
      serial_id: clean(row.serial_id),
      digital_link_url: clean(row.digital_link_url),
      qr_code_id: clean(row.qr_code_id),
      nfc_id: clean(row.nfc_id),
      rfid_epc: clean(row.rfid_epc),
    });

    if (error) throw error;
    stats.digitalIdentity += 1;
  }

  for (const row of rowsFor(uploads, "BOM")) {
    const productId = row.sku ? productIds.get(row.sku) : null;
    if (!productId) continue;

    const { error } = await supabase.from("product_bom").insert({
      product_id: productId,
      component_name: clean(row.component_name_en),
      component_name_zh: clean(row.component_name_zh),
      component_type: clean(row.component_type_en),
      component_type_zh: clean(row.component_type_zh),
      quantity: numberOrNull(row.quantity),
      unit: clean(row.unit),
      position: clean(row.position),
    });

    if (error) throw error;
    stats.bom += 1;
  }

  for (const row of rowsFor(uploads, "Materials")) {
    const productId = row.sku ? productIds.get(row.sku) : null;
    if (!productId) continue;
    const supplierId = await findOrCreateSupplierId(supabase, clean(row.supplier_name));

    const { error } = await supabase.from("product_materials").insert({
      product_id: productId,
      supplier_id: supplierId,
      material_name: clean(row.material_name_en),
      material_name_zh: clean(row.material_name_zh),
      material_type: clean(row.material_type),
      percentage: numberOrNull(row.percentage),
      recycled_content: numberOrNull(row.recycled_content),
      origin_country: clean(row.origin_country),
      chemical_info: clean(row.chemical_info),
      recyclability: clean(row.recyclability),
      certification: clean(row.certification),
    });

    if (error) throw error;
    stats.materials += 1;
  }

  for (const row of rowsFor(uploads, "ChemicalCompliance")) {
    const productId = row.sku ? productIds.get(row.sku) : null;
    if (!productId) continue;

    const { error } = await supabase.from("product_documents").insert({
      product_id: productId,
      document_name: clean(row.test_item),
      document_type: clean(row.regulation) || "Chemical compliance",
      file_url: clean(row.report_url),
      file_size: null,
      language: "EN / ZH",
      uploaded_by: clean(row.verification_status) || "uploaded",
      version: clean(row.last_updated),
    });

    if (error) throw error;
    stats.chemicals += 1;
  }

  for (const row of rowsFor(uploads, "ProductPerformance")) {
    const productId = row.sku ? productIds.get(row.sku) : null;
    if (!productId) continue;

    const { error } = await supabase.from("product_documents").insert({
      product_id: productId,
      document_name: [row.metric_name, row.metric_value, row.unit].filter(Boolean).join(" "),
      document_type: clean(row.test_method) || "Product performance",
      file_url: clean(row.report_url),
      file_size: null,
      language: "EN / ZH",
      uploaded_by: clean(row.verification_status) || "uploaded",
      version: clean(row.last_updated),
    });

    if (error) throw error;
    stats.performance += 1;
  }

  for (const row of rowsFor(uploads, "Traceability")) {
    const productId = row.sku ? productIds.get(row.sku) : null;
    if (!productId) continue;

    const { error } = await supabase.from("product_traceability").insert({
      product_id: productId,
      event_type: clean(row.event_type),
      event_name: clean(row.event_name_en),
      event_name_zh: clean(row.event_name_zh),
      event_date: clean(row.event_date),
      country: clean(row.country),
      city: clean(row.city),
      facility_name: clean(row.facility_name),
      transport_method: clean(row.transport_method),
      verification_status: clean(row.verification_status),
      notes: [row.notes, row.supplier_name ? `Supplier: ${row.supplier_name}` : ""].filter(Boolean).join("\n") || null,
    });

    if (error) throw error;
    stats.traceability += 1;
  }

  for (const row of rowsFor(uploads, "ESG")) {
    const productId = row.sku ? productIds.get(row.sku) : null;
    if (!productId) continue;

    const { error } = await supabase.from("product_esg_metrics").insert({
      product_id: productId,
      carbon_footprint: numberOrNull(row.carbon_footprint),
      water_usage: numberOrNull(row.water_usage),
      energy_consumption: numberOrNull(row.energy_consumption),
      waste_generation: numberOrNull(row.waste_generation),
      recycled_content: numberOrNull(row.recycled_content),
      methodology: clean(row.methodology) || clean(row.carbon_unit),
      verified_by: clean(row.verified_by),
    });

    if (error) throw error;
    stats.esg += 1;

    if (row.recyclability_score || row.repairability_score) {
      const { error: circularityError } = await supabase.from("product_circularity").insert({
        product_id: productId,
        repairability_score: numberOrNull(row.repairability_score),
        recyclability_score: numberOrNull(row.recyclability_score),
      });

      if (circularityError) throw circularityError;
      stats.circularity += 1;
    }
  }

  for (const row of rowsFor(uploads, "Circularity")) {
    const productId = row.sku ? productIds.get(row.sku) : null;
    if (!productId) continue;

    const { error } = await supabase.from("product_circularity").insert({
      product_id: productId,
      repairability_score: numberOrNull(row.repairability_score),
      recyclability_score: numberOrNull(row.recyclability_score),
      take_back_program: clean(row.take_back_program),
      resale_supported: booleanValue(row.resale_supported),
      remanufacturing_supported: booleanValue(row.remanufacturing_supported),
      disassembly_guide: clean(row.disassembly_guide),
      recycling_instructions: clean(row.recycling_instructions),
      end_of_life_info: clean(row.end_of_life_info),
    });

    if (error) throw error;
    stats.circularity += 1;
  }

  for (const row of rowsFor(uploads, "Certificates")) {
    const productId = row.sku ? productIds.get(row.sku) : null;
    if (!productId) continue;

    const { error } = await supabase.from("product_certificates").insert({
      product_id: productId,
      certificate_name: clean(row.certificate_name),
      certificate_type: clean(row.certificate_type),
      certificate_number: clean(row.certificate_number),
      issuer: clean(row.issuer),
      issue_date: clean(row.issue_date),
      expiry_date: clean(row.expiry_date),
      certificate_url: clean(row.certificate_url),
      verification_status: clean(row.verification_status) || "pending",
    });

    if (error) throw error;
    stats.certificates += 1;
  }

  for (const row of rowsFor(uploads, "ConsumerTransparency")) {
    const productId = row.sku ? productIds.get(row.sku) : null;
    if (!productId) continue;

    const { error: productError } = await supabase
      .from("products")
      .update({
        care_instructions: clean(row.care_instructions_en),
        care_instructions_zh: clean(row.care_instructions_zh),
        repair_instructions: clean(row.repair_guide_en),
        repair_instructions_zh: clean(row.repair_guide_zh),
        end_of_life_instructions: clean(row.end_of_life_info),
        updated_at: new Date().toISOString(),
      })
      .eq("id", productId);

    if (productError) throw productError;

    const { error } = await supabase.from("product_consumer_transparency").insert({
      product_id: productId,
      brand_story: clean(row.brand_story_en),
      brand_story_zh: clean(row.brand_story_zh),
      sustainability_story: clean(row.sustainability_story_en),
      sustainability_story_zh: clean(row.sustainability_story_zh),
      consumer_notice: [row.consumer_notice_en, row.packaging_info ? `Packaging: ${row.packaging_info}` : ""]
        .filter(Boolean)
        .join("\n") || null,
      consumer_notice_zh: clean(row.consumer_notice_zh),
    });

    if (error) throw error;
    stats.consumerTransparency += 1;
  }

  for (const row of rowsFor(uploads, "Documents")) {
    const productId = row.sku ? productIds.get(row.sku) : null;
    if (!productId) continue;

    const { error } = await supabase.from("product_documents").insert({
      product_id: productId,
      document_name: clean(row.document_name),
      document_type: clean(row.document_type),
      file_url: clean(row.file_url),
      file_size: clean(row.file_size),
      language: clean(row.language),
      uploaded_by: clean(row.uploaded_by),
      version: clean(row.version),
    });

    if (error) throw error;
    stats.documents += 1;
  }

  for (const row of rowsFor(uploads, "DataGovernance")) {
    const productId = row.sku ? productIds.get(row.sku) : null;
    if (!productId) continue;
    const auditStatus = [
      row.audit_status,
      row.verification_body ? `Verifier: ${row.verification_body}` : "",
      row.verification_certificate ? `Certificate: ${row.verification_certificate}` : "",
      row.verification_expiry ? `Valid until: ${row.verification_expiry}` : "",
      row.last_updated ? `Last updated: ${row.last_updated}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const { error } = await supabase.from("product_data_governance").insert({
      product_id: productId,
      data_source: clean(row.data_source),
      data_owner: clean(row.data_owner),
      audit_status: clean(auditStatus),
      data_quality_score: numberOrNull(row.data_quality_score),
    });

    if (error) throw error;
    stats.governance += 1;
  }

  return stats;
}

export function DppImportManager() {
  const { locale } = useLanguage();
  const [selectedModule, setSelectedModule] = useState<ModuleKey>("Products");
  const [uploads, setUploads] = useState<ParsedUpload[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [importResult, setImportResult] = useState<ImportStats | null>(null);

  const t =
    locale === "zh"
      ? {
          title: "批量导入中心",
          subtitle: "按当前 DPP 展示页的数据结构导入产品、数字身份、BOM、材料、合规、性能、追溯、ESG、循环、证书、消费者与数据治理信息。",
          module: "导入模块",
          download: "下载当前 CSV 模板",
          downloadWorkbook: "下载完整 XLSX 模板",
          loadSample: "加载演示数据",
          upload: "上传 CSV / XLSX",
          xlsxNote: "XLSX 模板按 Sheet 分组；CSV 适合单个模块快速导入。",
          required: "必填字段",
          columns: "字段",
          rows: "行",
          noUploads: "还没有上传数据。",
          preview: "数据预览",
          issues: "校验结果",
          noIssues: "未发现明显问题，可以进入下一步确认入库。",
          clear: "清空",
          confirmImport: "确认导入",
          importing: "导入中...",
          importHint: "确认后会写入 Supabase。产品按 SKU 更新或创建，其他模块会关联到对应产品。",
          importBlocked: "请先修复校验问题再导入。",
          imported: "导入完成",
          importFailed: "导入失败",
          unsupported: "当前文件格式暂不支持，请上传 CSV、TSV 或 XLSX。",
        }
      : {
          title: "Bulk Import Center",
          subtitle: "Import the current DPP display data model: product identity, digital carrier, BOM, materials, compliance, performance, traceability, ESG, circularity, certificates, consumer information and governance.",
          module: "Import module",
          download: "Download Current CSV Template",
          downloadWorkbook: "Download Full XLSX Template",
          loadSample: "Load Demo Data",
          upload: "Upload CSV / XLSX",
          xlsxNote: "The XLSX template is grouped by sheet; CSV is best for quick single-module imports.",
          required: "Required fields",
          columns: "Columns",
          rows: "rows",
          noUploads: "No uploaded data yet.",
          preview: "Data Preview",
          issues: "Validation",
          noIssues: "No obvious issues found. Ready for the next import step.",
          clear: "Clear",
          confirmImport: "Confirm Import",
          importing: "Importing...",
          importHint: "After confirmation, data will be written to Supabase. Products are updated or created by SKU; other modules are linked to matching products.",
          importBlocked: "Please fix validation issues before importing.",
          imported: "Import complete",
          importFailed: "Import failed",
          unsupported: "This file format is not supported yet. Please upload CSV, TSV or XLSX.",
        };

  const issues = useMemo(() => validateUploads(uploads), [uploads]);
  const selectedConfig = modules.find((module) => module.key === selectedModule) || modules[0];

  useEffect(() => {
    if (window.location.search.includes("demo=1")) {
      setUploads(buildDemoUploads());
    }
  }, []);

  function downloadTemplate(moduleConfig: ImportModule) {
    const csv = [
      moduleConfig.columns.join(","),
      moduleConfig.columns.map((column) => escapeCsv(moduleConfig.sample[column] || "")).join(","),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${moduleConfig.key}_dpp_template.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function downloadWorkbookTemplate() {
    const workbook = createWorkbookTemplate();
    const blob = new Blob([workbook], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "greanlean_dpp_full_template.xlsx";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const parsed: ParsedUpload[] = [];

    for (const file of files) {
      const lower = file.name.toLowerCase();
      if (lower.endsWith(".xlsx")) {
        try {
          parsed.push(...(await parseXlsx(file, selectedModule)));
        } catch (error) {
          setMessage(`${t.unsupported} ${error instanceof Error ? error.message : ""}`);
        }
        continue;
      }

      if (!lower.endsWith(".csv") && !lower.endsWith(".tsv")) {
        setMessage(t.unsupported);
        continue;
      }

      const text = await file.text();
      parsed.push({
        fileName: file.name,
        moduleKey: detectModule(file.name, selectedModule),
        rows: parseDelimited(text),
      });
    }

    if (parsed.length) {
      setUploads((current) => [...current, ...parsed]);
      setImportResult(null);
      setMessage("");
    }

    event.target.value = "";
  }

  async function handleImport() {
    if (!uploads.length) return;
    if (issues.length) {
      setMessage(t.importBlocked);
      return;
    }

    setSaving(true);
    setMessage("");
    setImportResult(null);

    try {
      const stats = await importUploadsToSupabase(uploads);
      setImportResult(stats);
      setMessage(t.imported);
    } catch (error) {
      setMessage(`${t.importFailed}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">{t.title}</h1>
          <p className="mt-2 max-w-3xl text-slate-600">{t.subtitle}</p>
        </div>
        <button
          className="btn-secondary"
          onClick={() => {
            setUploads([]);
            setImportResult(null);
            setMessage("");
          }}
          type="button"
        >
          {t.clear}
        </button>
      </div>

      <section className="card">
        <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
          <label>
            <span className="label">{t.module}</span>
            <select
              className="input mt-1"
              value={selectedModule}
              onChange={(event) => setSelectedModule(event.target.value as ModuleKey)}
            >
              {modules.map((module) => (
                <option key={module.key} value={module.key}>
                  {locale === "zh" ? module.titleZh : module.title}
                </option>
              ))}
            </select>
          </label>

          <div>
            <h2 className="text-xl font-black text-slate-950">
              {locale === "zh" ? selectedConfig.titleZh : selectedConfig.title}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {locale === "zh" ? selectedConfig.descriptionZh : selectedConfig.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {selectedConfig.required.map((field) => (
                <span key={field} className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                  {t.required}: {field}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button className="btn-primary" onClick={downloadWorkbookTemplate} type="button">
            {t.downloadWorkbook}
          </button>
          <button className="btn-primary" onClick={() => downloadTemplate(selectedConfig)} type="button">
            {t.download}
          </button>
          <Link className="btn-secondary" href="/dashboard/import?demo=1">
            {t.loadSample}
          </Link>
          <label className="btn-secondary cursor-pointer">
            {t.upload}
            <input accept=".csv,.tsv,.xlsx" className="hidden" multiple onChange={handleFileUpload} type="file" />
          </label>
        </div>

        <p className="mt-4 text-sm text-slate-500">{t.xlsxNote}</p>
        {message && <p className="mt-4 text-sm font-semibold text-red-600">{message}</p>}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="text-xl font-black">{t.columns}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedConfig.columns.map((column) => (
              <span key={column} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {column}
              </span>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-black">{t.issues}</h2>
          {issues.length ? (
            <div className="mt-4 max-h-64 space-y-2 overflow-auto">
              {issues.map((issue, index) => (
                <div key={`${issue.moduleKey}-${issue.row}-${index}`} className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  <span className="font-bold">{issue.moduleKey}</span>
                  {issue.row ? ` row ${issue.row}: ` : ": "}
                  {issue.message}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-2xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">{t.noIssues}</p>
          )}
        </div>
      </section>

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">{t.preview}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {uploads.reduce((sum, upload) => sum + upload.rows.length, 0)} {t.rows}
            </p>
          </div>
          <button
            disabled={!uploads.length || saving || issues.length > 0}
            className="btn-primary disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
            onClick={handleImport}
            type="button"
          >
            {saving ? t.importing : t.confirmImport}
          </button>
        </div>
        <p className="mt-3 text-sm text-slate-500">{t.importHint}</p>
        {importResult && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(importResult).map(([key, value]) => (
              <div key={key} className="rounded-2xl bg-brand-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase text-brand-700">{key}</p>
                <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
              </div>
            ))}
          </div>
        )}

        {!uploads.length ? (
          <p className="py-10 text-center text-sm text-slate-500">{t.noUploads}</p>
        ) : (
          <div className="mt-6 space-y-6">
            {uploads.map((upload, uploadIndex) => {
              const headers = Object.keys(upload.rows[0] || {});
              return (
                <div key={`${upload.fileName}-${uploadIndex}`} className="overflow-hidden rounded-2xl border border-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 px-4 py-3">
                    <div>
                      <p className="font-bold text-slate-950">{upload.fileName}</p>
                      <p className="text-sm text-slate-500">
                        {upload.moduleKey} · {upload.rows.length} {t.rows}
                      </p>
                    </div>
                  </div>
                  <div className="overflow-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-white text-xs uppercase text-slate-500">
                        <tr>
                          {headers.map((header) => (
                            <th key={header} className="whitespace-nowrap px-4 py-3 font-bold">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {upload.rows.slice(0, 8).map((row, rowIndex) => (
                          <tr key={rowIndex}>
                            {headers.map((header) => (
                              <td key={header} className="max-w-64 truncate px-4 py-3 text-slate-700">
                                {row[header] || "—"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
