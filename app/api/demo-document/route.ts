import { withApiRoute } from "@/lib/server/apiRoute";

const allowedFiles = new Set([
  "demo-eu-declaration-of-conformity.pdf",
  "demo-un38-3-test-summary.pdf",
  "demo-iec-62619-report.pdf",
  "demo-safety-data-sheet.pdf",
  "demo-carbon-footprint-declaration.pdf",
]);

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export const GET = withApiRoute(async (request) => {
  const url = new URL(request.url);
  const file = url.searchParams.get("file") || "";
  const zh = url.searchParams.get("lang") !== "en";
  if (!allowedFiles.has(file)) {
    return Response.json({ error: "Unknown demo document" }, { status: 404 });
  }
  const title = zh ? "演示文件占位说明" : "Demo document placeholder";
  const notice = zh
    ? "该文件仅用于展示电池护照的文件入口。当前没有真实检测报告、实验室签章、证书编号或法规认证。"
    : "This file only demonstrates a battery-passport document entry. No real test report, laboratory seal, certificate number or regulatory certification is present.";
  const html = `<!doctype html>
<html lang="${zh ? "zh-CN" : "en"}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{margin:0;background:#f8fafc;color:#0f172a;font-family:Arial,sans-serif}.wrap{max-width:720px;margin:0 auto;padding:64px 24px}.label{display:inline-block;border:1px solid #fcd34d;background:#fffbeb;color:#78350f;padding:7px 10px;font-size:12px;font-weight:800}.panel{margin-top:24px;border:1px solid #cbd5e1;background:#fff;padding:32px}h1{font-size:32px;margin:0 0 18px}p{line-height:1.75}.file{margin-top:22px;border-top:1px solid #e2e8f0;padding-top:18px;font-family:monospace;overflow-wrap:anywhere}</style></head>
<body><main class="wrap"><span class="label">${title}</span><section class="panel"><h1>${title}</h1><p>${notice}</p><p class="file">${escapeHtml(file)}</p></section></main></body></html>`;
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "X-Robots-Tag": "noindex",
    },
  });
});
