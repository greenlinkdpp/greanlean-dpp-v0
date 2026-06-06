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

const documents: Record<string, { title: string; lines: string[] }> = {
  svhc: {
    title: "SVHC Candidate List Screening Statement",
    lines: [
      "SVHC Candidate List Screening Statement",
      "Result: Not detected above 0.1% w/w reporting threshold",
      "Scope: Organic cotton T-shirt demo product",
      "Reference: REACH candidate-list screening and supplier declarations",
    ],
  },
  "heavy-metals": {
    title: "Heavy Metals Test Summary",
    lines: [
      "Heavy Metals Test Summary",
      "Lead (Pb): < 10 mg/kg",
      "Cadmium (Cd): < 1 mg/kg",
      "Chromium VI: Not detected",
      "Scope: Fabric, sewing thread and trims in demo product",
    ],
  },
  azo: {
    title: "Azo Dyes Test Summary",
    lines: [
      "Azo Dyes Test Summary",
      "Restricted aromatic amines: Not detected",
      "Criterion: < 30 mg/kg",
      "Scope: Dyed organic cotton fabric and sewing thread",
    ],
  },
  msds: {
    title: "MSDS Safety Data Sheet Index",
    lines: [
      "MSDS Safety Data Sheet Index",
      "Included: low-impact reactive dyeing auxiliaries and related textile chemicals",
      "Status: Documents available for buyer review",
      "Note: Replace this demo index with supplier-issued MSDS files for real products.",
    ],
  },
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "svhc";
  const product = url.searchParams.get("product") || "demo-organic-cotton-tshirt";
  const isElectronics = product === "demo-wireless-earbuds";
  const isFlooring = product === "demo-wpc-flooring";
  const doc = documents[type] || documents.svhc;
  const lines = [
    doc.title,
    "",
    `Product: ${isElectronics ? "Wireless Bluetooth Earbuds" : isFlooring ? "WPC PLANK" : "Organic Cotton T-Shirt"} (${product})`,
    `DPP ID: ${isElectronics ? "DPP-AUDIO-DEMO-001" : isFlooring ? "DPP-WPC-MS140K25B" : "DPP-DEMO-001"}`,
    `SKU: ${isElectronics ? "GL-EARBUDS-001" : isFlooring ? "MS140K25B" : "GL-TSHIRT-001"}`,
    ...(isFlooring ? ["Batch/Lot: W2605-05", "Material formula: Wood Fiber 60%, Recycled HDPE 30%, Stabilizer Additives 7%, Brown Masterbatch 3%", "Hazardous substance presence: No SVHC declared"] : []),
    "",
    ...doc.lines.slice(1),
    "",
    "Demo notice: this PDF is generated for DPP demonstration and should be replaced by official laboratory reports or supplier MSDS files for real products.",
  ];

  return new Response(buildPdf(lines), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${type}-${product}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
