import { loadPublicDppData } from "@/lib/dpp/publicDppRepository";
import {
  loadShowcaseDppData,
  showcaseStructuredPayload,
} from "@/lib/server/dppShowcase";
import { buildBatteryPassShowcaseExport } from "@/lib/server/batteryPassShowcase";
import { createSupabaseClient } from "@/lib/supabase";

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
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

function value(value: unknown) {
  return value === null || value === undefined || value === "" ? "-" : String(value);
}

function pdfLines(payload: any) {
  const product = payload.product || {};
  const identity = payload.digitalIdentity?.[0] || {};
  const esg = payload.esg?.at?.(-1) || {};
  const battery = payload.batteryPresentation || {};
  const name = product.name || product.name_zh || "Digital Product Passport";
  const chineseName = product.name_zh || "";
  return [
    "Digital Product Passport",
    "",
    `Product: ${value(name)}`,
    isPdfSafeText(chineseName)
      ? `Chinese name: ${value(chineseName)}`
      : `Chinese name: see online passport (${value(product.dpp_id)})`,
    `DPP ID: ${value(product.dpp_id)}`,
    `Unique product identifier: ${value(product.unique_product_identifier || identity.digital_link_url)}`,
    `Version: ${value(payload.publication?.version || product.current_version)}`,
    `Status: ${value(product.status)}`,
    `SKU / model: ${value(product.sku || battery.modelIdentifier)}`,
    `Category: ${value(product.category)}`,
    `GTIN: ${value(identity.gtin)}`,
    `Batch: ${value(identity.batch_id)}`,
    `Serial: ${value(identity.serial_id || battery.serialNumber)}`,
    "",
    `Materials: ${value((payload.materials || []).map((item: any) => item.material_name).filter(Boolean).join(", "))}`,
    `Carbon footprint: ${value(esg.carbon_footprint)} kg CO2e`,
    `Water use: ${value(esg.water_usage)} L`,
    `Recycled content: ${value(esg.recycled_content)}%`,
    `Evidence records: ${(payload.certificates || []).length + (payload.documents || []).length}`,
    `Last updated: ${value(product.updated_at || product.created_at)}`,
  ];
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const format = url.searchParams.get("format") || "json";
  const showcase = url.searchParams.get("showcase") === "1";
  const identifier = url.searchParams.get("product");
  if (!identifier) {
    return Response.json(
      { error: "The product query parameter is required." },
      { status: 400 },
    );
  }

  if (format === "batterypass") {
    if (!showcase) {
      return Response.json(
        { error: "BatteryPass showcase export requires showcase=1." },
        { status: 403 },
      );
    }
    const batteryPassExport = buildBatteryPassShowcaseExport(identifier);
    if (!batteryPassExport) {
      return Response.json(
        { error: "BatteryPass validation export is not available for this product." },
        { status: 404 },
      );
    }
    return Response.json(batteryPassExport.payload, {
      headers: {
        "Content-Disposition": `attachment; filename="${batteryPassExport.fileName}"`,
        "Cache-Control": "no-store",
        "X-BatteryPass-Schema": batteryPassExport.schemaName,
      },
    });
  }

  const payload = showcase
    ? await loadShowcaseDppData(identifier)
    : await loadPublicDppData(createSupabaseClient(), identifier, false);
  if (!payload) {
    return Response.json({ error: "DPP not found." }, { status: 404 });
  }

  const filename = String(payload.product?.dpp_id || identifier)
    .replace(/[^a-zA-Z0-9._-]/g, "-");
  const publicationHeaders = {
    "X-DPP-Version": String(payload.publication?.version || payload.product?.current_version || ""),
    "X-DPP-Snapshot-Hash": String(payload.publication?.snapshotHash || ""),
    "X-DPP-Published-At": String(payload.publication?.publishedAt || ""),
  };
  if (format === "pdf") {
    return new Response(buildPdf(pdfLines(payload)), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="dpp-${filename}.pdf"`,
        "Cache-Control": "no-store",
        ...publicationHeaders,
      },
    });
  }

  const structuredPayload = format === "canonical"
    ? showcaseStructuredPayload(payload)
    : payload;
  return Response.json(structuredPayload, {
    headers: {
      "Content-Disposition": `attachment; filename="dpp-${filename}.json"`,
      "Cache-Control": "no-store",
      ...publicationHeaders,
    },
  });
}
