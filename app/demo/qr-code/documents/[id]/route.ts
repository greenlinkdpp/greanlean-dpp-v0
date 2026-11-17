import { escapeHtml } from "@/lib/demo/escapeHtml";
import { demoBilingualText, demoLocale, demoText } from "@/lib/demo/language";
import { loadDemoLanguage } from "@/lib/demo/loadLanguage";
import { QR_DEMO_URL, qrDemo, qrDemoDocumentNotice } from "@/lib/qrDemo";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const document = qrDemo.documents.find((entry) => entry.id === id);
  if (!document) return new Response(null, { status: 404 });

  const locale = demoLocale(new URL(request.url).searchParams.get("lang"));
  const language = await loadDemoLanguage(locale);
  const title = escapeHtml(demoBilingualText(language, document.title));
  const notice = escapeHtml(demoBilingualText(language, qrDemoDocumentNotice));
  const badge = escapeHtml(demoText(language, "DEMO ONLY", "仅供演示"));
  const paragraphs = document.paragraphs.map((paragraph) => `<p>${escapeHtml(demoBilingualText(language, paragraph))}</p>`).join("");

  return new Response(`<!doctype html>
<html lang="${locale}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} | GreanLean</title></head>
<body><main><p>GreanLean · ${badge}</p><h1>${title}</h1>${paragraphs}<p>${notice}</p><a href="${QR_DEMO_URL}">${QR_DEMO_URL}</a></main></body>
</html>`, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${document.id}-${locale}.html"`,
      "Cache-Control": "public, max-age=3600",
      "X-Robots-Tag": "noindex",
    },
  });
}
