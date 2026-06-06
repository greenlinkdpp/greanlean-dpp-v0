import { createSupabaseClient } from "@/lib/supabase";

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildPdf(lines: string[]) {
  const contentLines = lines
    .flatMap((line) => {
      if (!line) return ["T*"];
      const chunks = line.length > 92 ? line.match(/.{1,92}/g) || [line] : [line];
      return chunks.map((chunk) => `(${escapePdfText(chunk)}) Tj T*`);
    })
    .join("\n");

  const stream = `BT
/F1 10 Tf
14 TL
50 790 Td
${contentLines}
ET`;

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return pdf;
}

function latest<T>(rows: T[]) {
  return rows[0] || null;
}

function compact(values: Array<string | number | null | undefined>) {
  return values.filter((value) => value !== null && value !== undefined && value !== "").join(" ");
}

async function safeSelect(supabase: ReturnType<typeof createSupabaseClient>, table: string, productId: string, orderBy = "created_at") {
  const { data } = await supabase.from(table).select("*").eq("product_id", productId).order(orderBy, { ascending: orderBy.includes("date") });
  return data || [];
}

function demoPayload(product: string) {
  const demos: Record<string, any> = {
    "demo-wireless-earbuds": {
      product: { slug: product, name: "Wireless Bluetooth Earbuds", name_zh: "无线蓝牙耳机", sku: "GL-EARBUDS-001", dpp_id: "DPP-AUDIO-DEMO-001", category: "Consumer Electronics" },
      identity: { gtin: "06900000000128", sgtin: "06900000000128.EARBUDS-DEMO-0001", batch_id: "BATCH-AUDIO-2026-001" },
      esg: { carbon_footprint: 6.8, water_usage: 42, recycled_content: 18 },
      certificates: ["EU Declaration of Conformity", "RoHS Restricted Substance Test Report", "REACH SVHC Screening"],
      materials: ["Recycled ABS / PC plastic", "Lithium-ion battery", "PCB and electronic components"],
      last_updated: "2026-06-05",
    },
    "demo-wpc-flooring": {
      product: {
        slug: product,
        name: "WPC PLANK",
        name_zh: "WPC PLANK",
        sku: "MS140K25B",
        dpp_id: "DPP-WPC-MS140K25B",
        category: "WPC DECKING",
        description: "Outdoor composite decking board, 140x25mm, 2.55kg/m, SANDING finish, colours WOOD / COFFEE / DARK GREY / LIGHT GREY.",
      },
      identity: { gtin: "06900000000203", sgtin: "06900000000203.TRACE-W2605-05", batch_id: "W2605-05", serial_id: "TRACE-W2605-05" },
      esg: { carbon_footprint: 12, water_usage: 120, energy_consumption: 15, waste_generation: 0.7, recycled_content: 30 },
      certificates: ["EU Declaration of Performance", "FSC Certificate BV-COC-154663", "REACH Declaration", "VOC Test Report", "ISO9001 Certificate", "Installation Guide", "Warranty Document"],
      materials: ["Wood Fiber 60%", "Recycled HDPE 30%", "Stabilizer Additives 7%", "Brown Masterbatch 3%", "Pallet", "Stainless Steel Clip And Screw with Narrow Gap (304)"],
      circularity: {
        renewable_content: 60,
        recyclable: "Yes",
        reusable: "Yes",
        repairability: "Replaceable Decking Panels",
        disassembly: "Mechanical / screw-and-clip disassembly",
        end_of_life: "Mechanical Recycling; avoid landfill; remove metal fasteners before recycling; reprocess into composite material.",
      },
      governance: {
        data_source: "地板DPP.xlsx plus demo assumptions for blank environmental and traceability fields.",
        estimated_fields: ["carbon footprint", "electricity", "water", "renewable energy ratio", "waste recycling rate", "ISO14001 readiness"],
      },
      last_updated: "2026-06-07",
    },
    "demo-office-chair": {
      product: { slug: product, name: "Disassemblable Office Chair", name_zh: "可拆解办公椅", sku: "GL-CHAIR-001", dpp_id: "DPP-FURN-DEMO-001", category: "Furniture" },
      identity: { gtin: "06900000000302", sgtin: "06900000000302.CHAIR-DEMO-0001", batch_id: "BATCH-FURN-2026-001" },
      esg: { carbon_footprint: 28.6, water_usage: 76, recycled_content: 34 },
      certificates: ["Furniture Durability Test Report", "REACH SVHC and Heavy Metal Screening"],
      materials: ["Powder coated steel", "Recycled PP / nylon", "Polyester mesh and PU foam"],
      last_updated: "2026-06-06",
    },
  };

  return demos[product] || {
    product: { slug: product, name: "Organic Cotton T-Shirt", name_zh: "有机棉基础 T 恤", sku: "GL-TSHIRT-001", dpp_id: "DPP-DEMO-001", category: "Textile & Apparel" },
    identity: { gtin: "06900000000012", sgtin: "06900000000012.DEMO-TEE-0001", batch_id: "BATCH-2026-001" },
    esg: { carbon_footprint: 3.2, water_usage: 118, recycled_content: 4 },
    certificates: ["GOTS Scope Certificate", "OEKO-TEX Standard 100", "EU Declaration of Conformity"],
    materials: ["Organic cotton", "Recycled polyester sewing thread"],
    last_updated: "2026-06-04",
  };
}

async function databasePayload(productSlug: string) {
  const supabase = createSupabaseClient();
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("public_slug", productSlug)
    .eq("status", "published")
    .maybeSingle();

  if (!product?.id) return null;

  const [materials, certificates, esgRows, bom, traceability, circularity, digitalIdentity, documents, governance] = await Promise.all([
    safeSelect(supabase, "product_materials", product.id),
    safeSelect(supabase, "product_certificates", product.id),
    safeSelect(supabase, "product_esg_metrics", product.id),
    safeSelect(supabase, "product_bom", product.id),
    safeSelect(supabase, "product_traceability", product.id, "event_date"),
    safeSelect(supabase, "product_circularity", product.id),
    safeSelect(supabase, "product_digital_identity", product.id),
    safeSelect(supabase, "product_documents", product.id),
    safeSelect(supabase, "product_data_governance", product.id),
  ]);

  const identity = latest<any>(digitalIdentity);
  const esg = latest<any>(esgRows);
  const circularityRow = latest<any>(circularity);
  const sgtin = identity?.gtin && identity?.serial_id ? `${identity.gtin}.${identity.serial_id}` : null;

  return {
    product: {
      slug: product.public_slug,
      name: product.name,
      name_zh: product.name_zh,
      sku: product.sku,
      brand: product.brand,
      category: product.category,
      subcategory: product.subcategory,
      dpp_id: product.dpp_id,
      main_image: product.main_image,
      status: product.status,
      updated_at: product.updated_at,
    },
    identity: {
      gtin: identity?.gtin,
      sgtin,
      batch_id: identity?.batch_id,
      serial_id: identity?.serial_id,
      digital_link_url: identity?.digital_link_url,
      qr_code_id: identity?.qr_code_id,
      nfc_id: identity?.nfc_id,
      rfid_epc: identity?.rfid_epc,
    },
    materials: materials.map((item: any) => ({
      name: item.material_name,
      name_zh: item.material_name_zh,
      type: item.material_type,
      percentage: item.percentage,
      recycled_content: item.recycled_content,
      origin_country: item.origin_country,
      certification: item.certification,
    })),
    bom: bom.map((item: any) => ({
      component: item.component_name,
      type: item.component_type,
      quantity: compact([item.quantity, item.unit]),
      position: item.position,
    })),
    traceability: traceability.map((item: any) => ({
      event: item.event_name,
      event_zh: item.event_name_zh,
      type: item.event_type,
      date: item.event_date,
      facility: item.facility_name,
      location: compact([item.city, item.country]),
      verification_status: item.verification_status,
    })),
    esg: {
      carbon_footprint: esg?.carbon_footprint,
      water_usage: esg?.water_usage,
      energy_consumption: esg?.energy_consumption,
      waste_generation: esg?.waste_generation,
      recycled_content: esg?.recycled_content,
      methodology: esg?.methodology,
      verified_by: esg?.verified_by,
      repairability_score: circularityRow?.repairability_score,
      recyclability_score: circularityRow?.recyclability_score,
      take_back_program: circularityRow?.take_back_program,
    },
    certificates: certificates.map((item: any) => ({
      name: item.certificate_name,
      type: item.certificate_type,
      number: item.certificate_number,
      issuer: item.issuer,
      issue_date: item.issue_date,
      expiry_date: item.expiry_date,
      verification_status: item.verification_status,
    })),
    documents: documents.map((item: any) => ({
      name: item.document_name,
      type: item.document_type,
      url: item.file_url,
      language: item.language,
      version: item.version,
    })),
    governance: governance.map((item: any) => ({
      data_source: item.data_source,
      data_owner: item.data_owner,
      audit_status: item.audit_status,
      data_quality_score: item.data_quality_score,
    })),
    last_updated: product.updated_at || product.created_at,
  };
}

function pdfLines(payload: any) {
  return [
    "Digital Product Passport Export",
    "",
    `Product: ${payload.product.name || payload.product.slug}`,
    `Chinese name: ${payload.product.name_zh || "-"}`,
    `DPP ID: ${payload.product.dpp_id || "-"}`,
    `SKU: ${payload.product.sku || "-"}`,
    `Category: ${payload.product.category || "-"}`,
    `GTIN: ${payload.identity?.gtin || "-"}`,
    `SGTIN: ${payload.identity?.sgtin || "-"}`,
    `Batch: ${payload.identity?.batch_id || "-"}`,
    "",
    `Materials: ${(payload.materials || []).map((item: any) => item.name || item).join(", ") || "-"}`,
    `Carbon footprint: ${payload.esg?.carbon_footprint ?? "-"} kg CO2e`,
    `Water usage: ${payload.esg?.water_usage ?? "-"} L`,
    `Recycled content: ${payload.esg?.recycled_content ?? "-"}%`,
    `Certificates: ${(payload.certificates || []).map((item: any) => item.name || item).join(", ") || "-"}`,
    `Last updated: ${payload.last_updated || "-"}`,
    "",
    "Demo notice: generated by greanlean DPP. Replace demo evidence with official product documents for real products.",
  ];
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const format = url.searchParams.get("format") || "json";
  const product = url.searchParams.get("product") || "demo-organic-cotton-tshirt";
  const payload = product === "demo-wpc-flooring" ? demoPayload(product) : (await databasePayload(product)) || demoPayload(product);

  if (format === "pdf") {
    return new Response(buildPdf(pdfLines(payload)), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="dpp-${product}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  }

  return Response.json(payload, {
    headers: {
      "Content-Disposition": `attachment; filename="dpp-${product}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
