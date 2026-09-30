import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/server/supabase";
const recent = new Map<string, number>();
export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown", now = Date.now();
  if ((recent.get(ip) || 0) > now - 60_000) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const name = String(body?.name || "").trim(), company = String(body?.company || "").trim(), email = String(body?.email || "").trim().toLowerCase(), message = String(body?.message || "").trim(), interest = String(body?.interest || "GENERAL_CONSULTATION");
  if (!body || String(body.website || "").trim() || name.length < 2 || company.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length < 5 || message.length > 4000 || !["BATTERY_PASSPORT","INDUSTRIAL_BATTERY","TEXTILE_DPP","CONSUMER_ELECTRONICS_DPP","OTHER_DPP","GENERAL_CONSULTATION"].includes(interest)) return NextResponse.json({ error: "INVALID_LEAD" }, { status: 400 });
  recent.set(ip, now);
  const { error } = await createSupabaseAdminClient().from("leads").insert({ name, company, contact: email, industry: interest, message, source: `homepage:${body.locale === "en" ? "en" : "zh"}` });
  return error ? NextResponse.json({ error: "LEAD_SAVE_FAILED" }, { status: 500 }) : NextResponse.json({ ok: true }, { status: 201 });
}
