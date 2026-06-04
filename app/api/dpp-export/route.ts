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

function getDemoPayload(product: string) {
  return {
    product,
    dpp_id: "DPP-DEMO-001",
    sku: "GL-TSHIRT-001",
    gtin: "06900000000012",
    sgtin: "06900000000012.DEMO-TEE-0001",
    batch: "BATCH-2026-001",
    carbon_footprint: "3.2 kg CO2e",
    industry_average_carbon: "4.5 kg CO2e",
    water_usage: "118 L",
    certificates: ["GOTS Scope Certificate", "OEKO-TEX Standard 100", "EU Declaration of Conformity"],
    restricted_substances: {
      svhc: "Not detected above 0.1% w/w",
      lead: "< 10 mg/kg",
      cadmium: "< 1 mg/kg",
      chromium_vi: "Not detected",
      azo_dyes: "Not detected",
    },
    textile_reserved_fields: {
      microfiber_release_potential: "Low to medium, pending washing-simulation test confirmation",
      origin_traceability: "Xinjiang/Aksu cotton source -> Ningbo manufacturing -> Hamburg EU warehouse",
      animal_welfare: "Not applicable",
      labour_conditions: "SA8000 / BSCI reserved; supplier declaration recorded",
    },
    last_updated: "2026-06-04",
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const format = url.searchParams.get("format") || "json";
  const product = url.searchParams.get("product") || "demo-organic-cotton-tshirt";
  const payload = getDemoPayload(product);

  if (format === "pdf") {
    const lines = [
      "Digital Product Passport Export",
      "",
      `Product: ${payload.product}`,
      `DPP ID: ${payload.dpp_id}`,
      `SKU: ${payload.sku}`,
      `GTIN: ${payload.gtin}`,
      `SGTIN: ${payload.sgtin}`,
      `Batch: ${payload.batch}`,
      `Carbon footprint: ${payload.carbon_footprint}`,
      `Water usage: ${payload.water_usage}`,
      `Certificates: ${payload.certificates.join(", ")}`,
      `SVHC: ${payload.restricted_substances.svhc}`,
      `Last updated: ${payload.last_updated}`,
    ];

    return new Response(buildPdf(lines), {
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
