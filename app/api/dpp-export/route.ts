import { createSupabaseClient } from "@/lib/supabase";
import {
  INDUSTRIAL_DEMO,
  industrialDemoStructuredPayload,
  isIndustrialDemoIdentifier,
} from "@/lib/battery/industrialDemo";

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function isPdfSafeText(value: string) {
  return /^[\x09\x0A\x0D\x20-\x7E]*$/.test(value);
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

const demoIdentifierMap: Record<string, string> = {
  "demo-organic-cotton-tshirt": "demo-organic-cotton-tshirt",
  "DPP-DEMO-001": "demo-organic-cotton-tshirt",
  "demo-wireless-earbuds": "demo-wireless-earbuds",
  "DPP-AUDIO-DEMO-001": "demo-wireless-earbuds",
  "demo-wpc-flooring": "demo-wpc-flooring",
  "DPP-WPC-MS140K25B": "demo-wpc-flooring",
  "demo-office-chair": "demo-office-chair",
  "DPP-FURN-DEMO-001": "demo-office-chair",
};

function demoKey(identifier: string) {
  return demoIdentifierMap[identifier] || "";
}

async function safeSelect(supabase: ReturnType<typeof createSupabaseClient>, table: string, productId: string, orderBy = "created_at") {
  const { data } = await supabase.from(table).select("*").eq("product_id", productId).order(orderBy, { ascending: orderBy.includes("date") });
  return data || [];
}

function demoPayload(product: string) {
  const demos: Record<string, any> = {
    "demo-wireless-earbuds": {
      product: { slug: product, name: "Wireless Bluetooth Earbuds", name_zh: "无线蓝牙耳机", sku: "GL-EARBUDS-001", dpp_id: "DPP-AUDIO-DEMO-001", category: "Consumer Electronics", status: "published", current_version: "v1.0" },
      identity: { gtin: "06900000000128", sgtin: "06900000000128.EARBUDS-DEMO-0001", batch_id: "BATCH-AUDIO-2026-001" },
      esg: { carbon_footprint: 6.8, water_usage: 42, recycled_content: 18 },
      certificates: ["EU Declaration of Conformity", "RoHS Restricted Substance Test Report", "REACH SVHC Screening"],
      materials: ["Recycled ABS / PC plastic", "Lithium-ion battery", "PCB and electronic components"],
      last_updated: "2026-06-05",
      version_history: [{ version: "v1.0", lifecycle_status: "published", change_type: "initial_publish", change_summary: "Initial electronics DPP demo publication.", changed_by: "greanlean admin", created_at: "2026-06-05T00:00:00.000Z" }],
    },
    "demo-wpc-flooring": {
      product: {
        slug: product,
        name: "WPC PLANK",
        name_zh: "WPC PLANK",
        sku: "MS140K25B",
        dpp_id: "DPP-WPC-MS140K25B",
        category: "WPC DECKING",
        status: "updated",
        current_version: "v1.1",
        description: "Outdoor composite decking board, 140x25mm, 2.55kg/m, SANDING finish, colours WOOD / COFFEE / DARK GREY / LIGHT GREY.",
      },
      identity: { gtin: "06900000000203", sgtin: "06900000000203.TRACE-W2605-05", batch_id: "W2605-05", serial_id: "TRACE-W2605-05" },
      esg: { carbon_footprint: 12, water_usage: 120, energy_consumption: 15, waste_generation: 0.7, recycled_content: 30 },
      certificates: ["EU Declaration of Performance", "FSC Certificate BV-COC-154663", "REACH Declaration", "VOC Test Report", "ISO9001 Certificate", "Installation Guide", "Warranty Document"],
      materials: ["Wood Fiber 60%", "Recycled HDPE 30%", "Stabilizer Additives 7%", "Brown Masterbatch 3%"],
      bom: ["Pallet", "Stainless Steel Clip And Screw with Narrow Gap (304)"],
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
      version_history: [
        { version: "v1.0", lifecycle_status: "published", change_type: "initial_publish", change_summary: "Initial WPC DPP publication.", changed_by: "greanlean admin", created_at: "2026-06-04T00:00:00.000Z" },
        { version: "v1.1", lifecycle_status: "updated", change_type: "data_correction", change_summary: "Updated WPC product data from flooring spreadsheet.", changed_by: "greanlean admin", created_at: "2026-06-07T00:00:00.000Z" }
      ],
    },
    "demo-office-chair": {
      product: { slug: product, name: "Disassemblable Office Chair", name_zh: "可拆解办公椅", sku: "GL-CHAIR-001", dpp_id: "DPP-FURN-DEMO-001", category: "Furniture", status: "published", current_version: "v1.0" },
      identity: { gtin: "06900000000302", sgtin: "06900000000302.CHAIR-DEMO-0001", batch_id: "BATCH-FURN-2026-001" },
      esg: { carbon_footprint: 28.6, water_usage: 76, recycled_content: 34 },
      certificates: ["Furniture Durability Test Report", "REACH SVHC and Heavy Metal Screening"],
      materials: ["Powder coated steel", "Recycled PP / nylon", "Polyester mesh and PU foam"],
      last_updated: "2026-06-06",
      version_history: [{ version: "v1.0", lifecycle_status: "published", change_type: "initial_publish", change_summary: "Initial furniture DPP demo publication.", changed_by: "greanlean admin", created_at: "2026-06-06T00:00:00.000Z" }],
    },
  };

  return demos[product] || {
    product: { slug: product, name: "Organic Cotton T-Shirt", name_zh: "有机棉基础 T 恤", sku: "GL-TSHIRT-001", dpp_id: "DPP-DEMO-001", category: "Textile & Apparel", status: "published", current_version: "v1.0" },
    identity: { gtin: "06900000000012", sgtin: "06900000000012.DEMO-TEE-0001", batch_id: "BATCH-2026-001" },
    esg: { carbon_footprint: 3.2, water_usage: 118, recycled_content: 4 },
    certificates: ["GOTS Scope Certificate", "OEKO-TEX Standard 100", "EU Declaration of Conformity"],
    materials: ["Organic cotton", "Recycled polyester sewing thread"],
    last_updated: "2026-06-04",
    version_history: [{ version: "v1.0", lifecycle_status: "published", change_type: "initial_publish", change_summary: "Initial textile DPP demo publication.", changed_by: "greanlean admin", created_at: "2026-06-04T00:00:00.000Z" }],
  };
}

async function databasePayload(productIdentifier: string) {
  const supabase = createSupabaseClient();
  const { data: productByDpp } = await supabase
    .from("products")
    .select("*")
    .eq("dpp_id", productIdentifier)
    .in("status", ["published", "updated", "expired"])
    .maybeSingle();
  const { data: productBySlug } = productByDpp
    ? { data: null }
    : await supabase
        .from("products")
        .select("*")
        .eq("public_slug", productIdentifier)
        .in("status", ["published", "updated", "expired"])
        .maybeSingle();
  const product = productByDpp || productBySlug;

  if (!product?.id) return null;

  const [materials, certificates, esgRows, bom, traceability, circularity, digitalIdentity, documents, governance, versions, registrySubmissions, registrationProofs, evidenceLinks, blockchainAnchors, sectorFieldValues] = await Promise.all([
    safeSelect(supabase, "product_materials", product.id),
    safeSelect(supabase, "product_certificates", product.id),
    safeSelect(supabase, "product_esg_metrics", product.id),
    safeSelect(supabase, "product_bom", product.id),
    safeSelect(supabase, "product_traceability", product.id, "event_date"),
    safeSelect(supabase, "product_circularity", product.id),
    safeSelect(supabase, "product_digital_identity", product.id),
    safeSelect(supabase, "product_documents", product.id),
    safeSelect(supabase, "product_data_governance", product.id),
    safeSelect(supabase, "product_versions", product.id),
    safeSelect(supabase, "dpp_registry_submissions", product.id),
    safeSelect(supabase, "dpp_registration_proofs", product.id),
    safeSelect(supabase, "dpp_evidence_links", product.id),
    safeSelect(supabase, "dpp_blockchain_anchors", product.id),
    safeSelect(supabase, "product_sector_field_values", product.id),
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
      sector_code: product.sector_code,
      category_code: product.category_code,
      subcategory_code: product.subcategory_code,
      dpp_profile_key: product.dpp_profile_key,
      dpp_id: product.dpp_id,
      granularity_level: product.granularity_level,
      commodity_code: product.commodity_code,
      unique_product_identifier: product.unique_product_identifier,
      eu_registration_status: product.eu_registration_status,
      main_image: product.main_image,
      status: product.status,
      current_version: product.current_version,
      updated_at: product.updated_at,
    },
    sector_profile: {
      sector_code: product.sector_code,
      category_code: product.category_code,
      subcategory_code: product.subcategory_code,
      profile_key: product.dpp_profile_key,
    },
    sector_specific_fields: sectorFieldValues.map((item: any) => ({
      profile_key: item.profile_key,
      module_key: item.module_key,
      field_key: item.field_key,
      label: item.field_label,
      label_zh: item.field_label_zh,
      value: item.field_value,
      value_json: item.field_value_json,
      unit: item.unit,
      evidence_status: item.evidence_status,
      source_type: item.source_type,
      visibility_level: item.visibility_level,
      updated_at: item.updated_at,
    })),
    identity: {
      product_uuid: identity?.product_uuid,
      gtin: identity?.gtin,
      sgtin,
      style_id: identity?.style_id,
      batch_id: identity?.batch_id,
      serial_id: identity?.serial_id,
      digital_link_url: identity?.digital_link_url,
      data_carrier_type: identity?.data_carrier_type,
      data_carrier_url: identity?.data_carrier_url,
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
      evidence_hash: item.evidence_hash,
      hash_algorithm: item.hash_algorithm,
      visibility_level: item.visibility_level,
    })),
    documents: documents.map((item: any) => ({
      name: item.document_name,
      type: item.document_type,
      url: item.file_url,
      language: item.language,
      version: item.version,
      evidence_hash: item.evidence_hash,
      hash_algorithm: item.hash_algorithm,
      visibility_level: item.visibility_level,
    })),
    governance: governance.map((item: any) => ({
      data_source: item.data_source,
      data_owner: item.data_owner,
      audit_status: item.audit_status,
      data_quality_score: item.data_quality_score,
    })),
    version_history: versions.map((item: any) => ({
      version: item.version,
      lifecycle_status: item.lifecycle_status,
      change_type: item.change_type,
      change_summary: item.change_summary,
      changed_by: item.changed_by,
      data_hash: item.data_hash,
      hash_algorithm: item.hash_algorithm,
      created_at: item.created_at,
    })),
    registry: {
      submissions: registrySubmissions.map((item: any) => ({
        status: item.submission_status,
        environment: item.registry_environment,
        eu_registration_identifier: item.eu_registration_identifier,
        commodity_code: item.commodity_code,
        submitted_version: item.submitted_version,
        submitted_hash: item.submitted_hash,
        semantic_model_version: item.semantic_model_version,
        submitted_at: item.submitted_at,
        accepted_at: item.accepted_at,
        rejected_reason: item.rejected_reason,
      })),
      proofs: registrationProofs.map((item: any) => ({
        type: item.proof_type,
        url: item.proof_url,
        proof_hash: item.proof_hash,
        hash_algorithm: item.hash_algorithm,
        qualified_seal_status: item.qualified_seal_status,
        qualified_timestamp: item.qualified_timestamp,
        generated_at: item.generated_at,
        expires_at: item.expires_at,
      })),
    },
    evidence_links: evidenceLinks.map((item: any) => ({
      evidence_type: item.evidence_type,
      evidence_ref_id: item.evidence_ref_id,
      supported_field: item.supported_field,
      supported_module: item.supported_module,
      claim_value: item.claim_value,
      verification_status: item.verification_status,
      visibility_level: item.visibility_level,
    })),
    blockchain_anchors: blockchainAnchors.map((item: any) => ({
      version: item.version,
      anchored_hash: item.anchored_hash,
      hash_algorithm: item.hash_algorithm,
      chain_name: item.chain_name,
      chain_id: item.chain_id,
      network: item.network,
      contract_address: item.contract_address,
      transaction_hash: item.transaction_hash,
      block_number: item.block_number,
      anchor_status: item.anchor_status,
      anchored_at: item.anchored_at,
      explorer_url: item.explorer_url,
    })),
    last_updated: product.updated_at || product.created_at,
  };
}

function pdfLines(payload: any) {
  const productName = payload.product.name || payload.product.slug || "-";
  const chineseName = payload.product.name_zh || "";
  return [
    "Digital Product Passport Export",
    "",
    `Product: ${productName}`,
    isPdfSafeText(chineseName) ? `Chinese name: ${chineseName}` : `Chinese name: see online DPP page (${payload.product.dpp_id || productName})`,
    `DPP ID: ${payload.product.dpp_id || "-"}`,
    `DPP profile: ${payload.product.dpp_profile_key || payload.sector_profile?.profile_key || "-"}`,
    `Unique product identifier: ${payload.product.unique_product_identifier || "-"}`,
    `Granularity: ${payload.product.granularity_level || "-"}`,
    `Commodity code: ${payload.product.commodity_code || "-"}`,
    `EU registry status: ${payload.product.eu_registration_status || "-"}`,
    `EU registration ID: ${payload.registry?.submissions?.[0]?.eu_registration_identifier || "-"}`,
    `Blockchain anchor: ${payload.blockchain_anchors?.[0]?.transaction_hash || "-"}`,
    `Version: ${payload.product.current_version || "-"}`,
    `Status: ${payload.product.status || "-"}`,
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

function industrialDemoPdfLines() {
  const payload = industrialDemoStructuredPayload();
  const spec = payload.technicalSpecifications;
  return [
    "GreenVault ESS-14.3 Digital Battery Passport",
    "SYNTHETIC DEMONSTRATION DATA - NOT FOR REGULATORY SUBMISSION",
    "",
    `DPP ID: ${INDUSTRIAL_DEMO.dppId}`,
    `UPI: ${INDUSTRIAL_DEMO.upi}`,
    `Model: ${payload.passportMetadata.modelIdentifier}`,
    `Batch: ${payload.passportMetadata.batchIdentifier}`,
    `Item: ${payload.passportMetadata.itemIdentifier}`,
    `GTIN (demo): ${INDUSTRIAL_DEMO.gtin}`,
    `Category: Rechargeable stationary industrial battery above 2 kWh`,
    "",
    `Chemistry: Lithium iron phosphate / graphite`,
    `Rated energy: ${spec.ratedEnergyKWh} kWh`,
    `Rated capacity: ${spec.ratedCapacityAh} Ah`,
    `Nominal voltage: ${spec.nominalVoltageV} V`,
    `Operating voltage: ${spec.minimumVoltageV}-${spec.maximumVoltageV} V`,
    `Mass: ${spec.weightKg} kg`,
    `Continuous / peak power: ${spec.continuousPowerKW} kW / ${spec.peakPower.valueKW} kW for ${spec.peakPower.durationSeconds} s`,
    `Expected cycle life: ${spec.cycleLife.cycles} cycles at ${spec.cycleLife.depthOfDischargePct}% DoD and ${spec.cycleLife.temperatureC} C`,
    `Carbon footprint demo: ${payload.carbonFootprint.totalKgCO2e} kg CO2e total; ${payload.carbonFootprint.intensityKgCO2ePerKWh} kg CO2e/kWh`,
    "",
    "Verification: SYNTHETIC_DEMO",
    "No live BMS connection. No third-party verification. No formal EU DPP Registry submission.",
  ];
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const format = url.searchParams.get("format") || "json";
  const product = url.searchParams.get("product") || "demo-organic-cotton-tshirt";
  if (isIndustrialDemoIdentifier(product)) {
    if (format === "pdf") {
      return new Response(buildPdf(industrialDemoPdfLines()), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="dpp-${INDUSTRIAL_DEMO.slug}.pdf"`,
          "Cache-Control": "no-store",
        },
      });
    }
    return Response.json(industrialDemoStructuredPayload(), {
      headers: {
        "Content-Disposition": `attachment; filename="dpp-${INDUSTRIAL_DEMO.slug}.json"`,
        "Cache-Control": "no-store",
      },
    });
  }
  const mappedDemoKey = demoKey(product);
  const payload =
    mappedDemoKey === "demo-wpc-flooring"
      ? demoPayload(mappedDemoKey)
      : (await databasePayload(product)) || demoPayload(mappedDemoKey || product);

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
