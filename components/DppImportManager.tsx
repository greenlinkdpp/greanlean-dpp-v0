"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { createSupabaseClient } from "@/lib/supabase";
import { slugify } from "@/lib/slugify";

type ModuleKey =
  | "Products"
  | "Materials"
  | "Traceability"
  | "ESG"
  | "Certificates"
  | "ConsumerTransparency";

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
  materials: number;
  traceability: number;
  esg: number;
  circularity: number;
  certificates: number;
  consumerTransparency: number;
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
      sku: "GL-TEX-001",
      product_name_en: "Organic Cotton T-Shirt",
      product_name_zh: "有机棉 T 恤",
      brand: "GreenLean",
      category: "Textile",
      subcategory: "Apparel",
      description_en: "Demo apparel product for EU DPP.",
      description_zh: "用于欧盟 DPP 的示例服装产品。",
      main_image_url: "https://example.com/product.jpg",
      batch_id: "BATCH-2026-001",
      production_date: "2026-05-20",
      origin_country: "China",
      status: "published",
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
      sku: "GL-TEX-001",
      material_name_en: "Organic cotton",
      material_name_zh: "有机棉",
      material_type: "Fiber",
      percentage: 95,
      origin_country: "China",
      supplier_name: "Demo Textile Mill",
      recycled_content: 0,
      chemical_info: "Low-impact dyeing",
      recyclability: "Recyclable",
      certification: "GOTS",
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
      sku: "GL-TEX-001",
      event_type: "manufacturing",
      event_name_en: "Cut and sew",
      event_name_zh: "裁剪缝制",
      event_date: "2026-05-22",
      country: "China",
      city: "Ningbo",
      facility_name: "Demo Garment Factory",
      supplier_name: "Demo Textile Mill",
      transport_method: "Truck",
      verification_status: "verified",
      notes: "Factory production record uploaded.",
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
      sku: "GL-TEX-001",
      carbon_footprint: 3.2,
      carbon_unit: "kg CO2e",
      water_usage: 120,
      energy_consumption: 8.5,
      waste_generation: 0.4,
      recycled_content: 0,
      recyclability_score: 75,
      repairability_score: 60,
      methodology: "Internal LCA estimate",
      verified_by: "GreenLean review",
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
      sku: "GL-TEX-001",
      certificate_name: "GOTS Scope Certificate",
      certificate_type: "Material",
      certificate_number: "GOTS-DEMO-001",
      issuer: "Demo Certifier",
      issue_date: "2026-01-01",
      expiry_date: "2027-01-01",
      certificate_url: "https://example.com/certificate.pdf",
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
      sku: "GL-TEX-001",
      brand_story_en: "Made for transparent global trade.",
      brand_story_zh: "为透明的全球贸易而设计。",
      sustainability_story_en: "Uses certified cotton and traceable production.",
      sustainability_story_zh: "使用认证棉并提供可追溯生产信息。",
      care_instructions_en: "Wash cold and line dry.",
      care_instructions_zh: "冷水洗涤，自然晾干。",
      repair_guide_en: "Repair small tears with textile patch.",
      repair_guide_zh: "小破损可使用布贴修补。",
      packaging_info: "Recyclable paper packaging",
      end_of_life_info: "Donate, repair or recycle through textile collection.",
      consumer_notice_en: "Scan the QR code for the latest passport.",
      consumer_notice_zh: "扫描二维码查看最新产品护照。",
    },
  },
];

const numericColumns = new Set([
  "percentage",
  "recycled_content",
  "carbon_footprint",
  "water_usage",
  "energy_consumption",
  "waste_generation",
  "recyclability_score",
  "repairability_score",
]);

const dateColumns = new Set(["production_date", "event_date", "issue_date", "expiry_date"]);
const urlColumns = new Set(["main_image_url", "certificate_url"]);

function clean(value: string | undefined) {
  const trimmed = String(value || "").trim();
  return trimmed || null;
}

function numberOrNull(value: string | undefined) {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function makeDppId(sku: string) {
  const safeSku = sku.replace(/[^a-zA-Z0-9]+/g, "-").replace(/(^-|-$)+/g, "").toUpperCase();
  return `DPP-${safeSku || Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

function escapeCsv(value: string | number) {
  const raw = String(value ?? "");
  return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
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

      moduleConfig.required.forEach((field) => {
        if (!row[field]?.trim()) {
          issues.push({
            moduleKey: upload.moduleKey,
            row: rowNumber,
            message: `Missing required field: ${field}`,
          });
        }
      });

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

function stringRecord(record: Record<string, string | number>) {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, String(value ?? "")]));
}

function buildDemoUploads(): ParsedUpload[] {
  return modules.map((moduleConfig) => {
    const rows = [stringRecord(moduleConfig.sample)];

    if (moduleConfig.key === "Materials") {
      rows.push({
        ...stringRecord(moduleConfig.sample),
        material_name_en: "Elastane",
        material_name_zh: "氨纶",
        material_type: "Fiber",
        percentage: "5",
        certification: "OEKO-TEX",
      });
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
    materials: 0,
    traceability: 0,
    esg: 0,
    circularity: 0,
    certificates: 0,
    consumerTransparency: 0,
  };

  const productIds = await ensureProducts(supabase, uploads, stats);

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
          subtitle: "按 6 个 DPP 核心模块上传数据，先完成校验和预览，再进入正式入库。",
          module: "导入模块",
          download: "下载 CSV 模板",
          loadSample: "加载演示数据",
          upload: "上传 CSV / TSV",
          xlsxNote: "Excel .xlsx 解析将在依赖安装后启用；当前版本可先使用 CSV / TSV。",
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
          unsupported: "当前文件格式暂不支持，请上传 CSV 或 TSV。",
        }
      : {
          title: "Bulk Import Center",
          subtitle: "Upload data by the 6 core DPP modules, validate it, then move to database import.",
          module: "Import module",
          download: "Download CSV Template",
          loadSample: "Load Demo Data",
          upload: "Upload CSV / TSV",
          xlsxNote: "Excel .xlsx parsing will be enabled after the parser dependency is available; CSV / TSV works now.",
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
          unsupported: "This file format is not supported yet. Please upload CSV or TSV.",
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

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const parsed: ParsedUpload[] = [];

    for (const file of files) {
      const lower = file.name.toLowerCase();
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
          <button className="btn-primary" onClick={() => downloadTemplate(selectedConfig)} type="button">
            {t.download}
          </button>
          <Link className="btn-secondary" href="/dashboard/import?demo=1">
            {t.loadSample}
          </Link>
          <label className="btn-secondary cursor-pointer">
            {t.upload}
            <input accept=".csv,.tsv" className="hidden" multiple onChange={handleFileUpload} type="file" />
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
