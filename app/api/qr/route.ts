import { NextRequest } from "next/server";
import QRCode from "qrcode";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url") || "https://greanlean.com";
  const buffer = await QRCode.toBuffer(url, {
    type: "png",
    width: 320,
    margin: 1,
  });

  const body = new Uint8Array(buffer);

  return new Response(body, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
