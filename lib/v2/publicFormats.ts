import type { DppAudience, ImmutableDppPayload } from "./audienceProjection.ts";
import { isSyntheticDemoPayload, projectImmutableDpp, SYNTHETIC_DEMO_NOTICES } from "./audienceProjection.ts";

export const JSON_LD_CONTEXT_VERSION = "greanlean-dpp-internal-2026-09-v1";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapePdf(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function publicJson(payload: ImmutableDppPayload, audience: DppAudience) {
  return projectImmutableDpp(payload, audience);
}

export function publicJsonLd(payload: ImmutableDppPayload, audience: DppAudience) {
  const projection = projectImmutableDpp(payload, audience);
  const semanticFields = Object.fromEntries(projection.fields
    .filter((field) => field.semanticUri)
    .map((field) => [field.semanticUri as string, field.value]));
  return {
    "@context": {
      "@version": 1.1,
      dpp: "https://greanlean.example/context/dpp/",
      profileStatus: "dpp:profileStatus",
    },
    "@id": `urn:greanlean:dpp:${projection.passportIdentifier}`,
    "@type": "dpp:DigitalProductPassport",
    profileStatus: "PARTIAL_INTERNAL_PROFILE",
    contextVersion: JSON_LD_CONTEXT_VERSION,
    passportId: projection.passportId,
    passportIdentifier: projection.passportIdentifier,
    version: projection.version,
    schemaVersion: projection.schemaVersion,
    payloadHash: projection.payloadHash,
    publishedAt: projection.publishedAt,
    ...semanticFields,
  };
}

export function publicHtml(payload: ImmutableDppPayload, audience: DppAudience) {
  const projection = projectImmutableDpp(payload, audience);
  const warning = isSyntheticDemoPayload(payload)
    ? `<aside role="alert" style="border:3px solid #b45309;background:#fffbeb;padding:16px;margin:16px 0"><strong>${SYNTHETIC_DEMO_NOTICES.map(escapeHtml).join(" · ")}</strong></aside>`
    : "";
  const rows = projection.fields.map((field) =>
    `<tr><th>${escapeHtml(field.fieldCode)}</th><td>${escapeHtml(typeof field.value === "object" ? JSON.stringify(field.value) : field.value)}${field.unit ? ` ${escapeHtml(field.unit)}` : ""}</td></tr>`,
  ).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>DPP ${escapeHtml(projection.passportIdentifier)}</title></head><body><main data-passport-id="${escapeHtml(projection.passportId)}" data-version="${projection.version}" data-payload-hash="${escapeHtml(projection.payloadHash)}"><h1>Digital Product Passport</h1>${warning}<dl><dt>Passport</dt><dd>${escapeHtml(projection.passportIdentifier)}</dd><dt>Version</dt><dd>${projection.version}</dd><dt>Schema Version</dt><dd>${escapeHtml(projection.schemaVersion)}</dd><dt>Payload Hash</dt><dd>${escapeHtml(projection.payloadHash)}</dd><dt>Published At</dt><dd>${escapeHtml(projection.publishedAt)}</dd></dl><table><tbody>${rows}</tbody></table></main></body></html>`;
}

export function publicPdf(payload: ImmutableDppPayload, audience: DppAudience) {
  const projection = projectImmutableDpp(payload, audience);
  const lines = [
    "Digital Product Passport",
    `Passport ID: ${projection.passportId}`,
    `Passport Identifier: ${projection.passportIdentifier}`,
    `Version: ${projection.version}`,
    `Schema Version: ${projection.schemaVersion}`,
    `Payload Hash: ${projection.payloadHash}`,
    `Published At: ${projection.publishedAt}`,
    `Generated At: ${new Date().toISOString()}`,
    ...projection.fields.map((field) => `${field.fieldCode}: ${typeof field.value === "object" ? JSON.stringify(field.value) : String(field.value ?? "-")}${field.unit ? ` ${field.unit}` : ""}`),
  ];
  const content = lines.flatMap((line) => line.match(/.{1,92}/g) || [line])
    .map((line) => `(${escapePdf(line.replace(/[^\x20-\x7E]/g, "?"))}) Tj T*`).join("\n");
  const stream = `BT\n/F1 9 Tf\n12 TL\n45 800 Td\n${content}\nET`;
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
  const xref = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, "0")} 00000 n \n`; });
  return pdf + `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
}
