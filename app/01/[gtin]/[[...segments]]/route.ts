import { NextRequest, NextResponse } from "next/server";
import { buildGs1DigitalLink, parseGs1DigitalLinkSegments } from "@/lib/dppCompliance";
import { createSupabaseClient } from "@/lib/supabase";

type Params = {
  gtin: string;
  segments?: string[];
};

export async function GET(request: NextRequest, { params }: { params: Params }) {
  const identity = parseGs1DigitalLinkSegments(params.gtin, params.segments || []);
  if (!identity.gtin) {
    return NextResponse.json({ error: "Invalid GTIN" }, { status: 400 });
  }

  const supabase = createSupabaseClient();
  let query = supabase.from("product_digital_identity").select("product_id, gtin, batch_id, serial_id").eq("gtin", identity.gtin);

  if (identity.batchId) query = query.eq("batch_id", identity.batchId);
  if (identity.serialId) query = query.eq("serial_id", identity.serialId);

  const { data: identities, error } = await query.limit(10);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const productIds = (identities || []).map((row) => row.product_id).filter(Boolean);
  if (!productIds.length) {
    return NextResponse.json(
      {
        error: "DPP identity not found",
        gs1_digital_link: buildGs1DigitalLink({
          gtin: identity.gtin,
          batchId: identity.batchId,
          serialId: identity.serialId,
          baseUrl: request.nextUrl.origin,
        }),
      },
      { status: 404 },
    );
  }

  const { data: products, error: productError } = await supabase
    .from("products")
    .select("dpp_id, public_slug, status")
    .in("id", productIds)
    .in("status", ["published", "updated", "expired"])
    .limit(1);

  if (productError) return NextResponse.json({ error: productError.message }, { status: 500 });

  const product = products?.[0];
  const identifier = product?.dpp_id || product?.public_slug;
  if (!identifier) return NextResponse.json({ error: "Published DPP not found" }, { status: 404 });

  return NextResponse.redirect(new URL(`/p/${encodeURIComponent(identifier)}`, request.nextUrl.origin));
}
