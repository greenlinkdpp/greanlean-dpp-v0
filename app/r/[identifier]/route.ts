import { NextResponse } from "next/server";

export function GET(request: Request, { params }: { params: Promise<{ identifier: string }> }) {
  return params.then(({ identifier }) => {
    const url = new URL(request.url);
    const target = new URL(`/p/${encodeURIComponent(identifier)}`, url.origin);
    const lang = url.searchParams.get("lang");
    if (lang === "zh" || lang === "en") target.searchParams.set("lang", lang);
    return NextResponse.redirect(target, 302);
  });
}
