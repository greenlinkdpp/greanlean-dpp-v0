import { NextResponse } from "next/server";
import { loadPublicDemoShowcase } from "@/lib/server/v2/demoShowcase";

export const dynamic = "force-dynamic";

/** Public, intentionally shaped catalog projection for product-experience surfaces. */
export async function GET() {
  return NextResponse.json({ entries: await loadPublicDemoShowcase() }, {
    headers: { "Cache-Control": "public, max-age=60, s-maxage=60" },
  });
}
