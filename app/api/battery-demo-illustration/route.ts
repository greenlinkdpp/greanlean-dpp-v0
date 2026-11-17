import QRCode from "qrcode";
import { withApiRoute } from "@/lib/server/apiRoute";
import { batteryIllustrationIdentity, batteryIllustrationSvg, type BatteryIllustrationKind } from "@/lib/battery/demoIllustration";

export const GET = withApiRoute(async (request) => {
  const url = new URL(request.url);
  const identifier = url.searchParams.get("identifier") || "";
  const kind = url.searchParams.get("kind") || "";
  const data = batteryIllustrationIdentity(identifier, kind);
  if (!data) return Response.json({ error: "Unknown demonstration illustration" }, { status: 404 });
  const qr = await QRCode.toString(data.url, { type: "svg", margin: 2, errorCorrectionLevel: "M" });
  const svg = batteryIllustrationSvg(identifier, kind as BatteryIllustrationKind, url.searchParams.get("lang") !== "en", qr);
  return new Response(svg, { headers: {
    "Content-Type": "image/svg+xml; charset=utf-8",
    "Cache-Control": "public, max-age=86400",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex",
  } });
});
