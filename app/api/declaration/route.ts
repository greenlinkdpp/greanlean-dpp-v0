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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("lang") === "zh" ? "zh" : "en";
  const product = url.searchParams.get("product") || "demo-organic-cotton-tshirt";
  const isZh = locale === "zh";

  const lines = [
    "EU Declaration of Conformity",
    "",
    `Product: Organic Cotton T-Shirt (${product})`,
    "DPP ID: DPP-DEMO-001",
    "SKU: GL-TSHIRT-001",
    "GTIN: 06900000000012",
    "SGTIN: 06900000000012.DEMO-TEE-0001",
    "",
    "Applicable EU rules:",
    "1. Regulation (EU) 2024/1781 - ESPR framework for ecodesign requirements",
    "2. Regulation (EC) No 1907/2006 - REACH and RSL restricted substances screening",
    "3. Regulation (EU) 2023/988 - General Product Safety Regulation",
    "4. Regulation (EU) No 1007/2011 - Textile fibre names and labelling",
    "",
    "Manufacturer:",
    "Demo Garment Factory Co., Ltd., 88 Textile Road, Ningbo, Zhejiang, China",
    "",
    "Importer / EU responsible party:",
    "Greanlean EU Compliance GmbH, Demo Strasse 12, 20457 Hamburg, Germany",
    "",
    "Declaration date: 2026-06-04",
    "Validity: 2026-06-04 to 2027-06-03",
    "",
    isZh
      ? "Demo notice: this PDF is generated for DPP demonstration and should be replaced by the signed official declaration for real products."
      : "Demo notice: this PDF is generated for DPP demonstration and should be replaced by the signed official declaration for real products.",
  ];

  const pdf = buildPdf(lines);

  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="eu-declaration-${product}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
