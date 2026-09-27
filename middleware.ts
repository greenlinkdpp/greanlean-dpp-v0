import { NextResponse, type NextRequest } from "next/server";
import {
  consumeDistributedPublicRateLimit,
  consumePublicRateLimit,
  publicSurfaceRule,
  requestBodyLimit,
  usesDistributedPublicRateLimit,
} from "@/lib/server/publicControls";

function contentSecurityPolicy(nonce: string, production: boolean) {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${production ? "" : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    ...(production ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

function applySecurityHeaders(headers: Headers, csp: string, production: boolean) {
  headers.set("Content-Security-Policy", csp);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  if (production) headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
}

function clientKey(request: NextRequest) {
  const address = process.env.VERCEL === "1"
    ? request.headers.get("x-vercel-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    : request.headers.get("x-real-ip") || "unknown";
  return address
    .split(",", 1)[0]
    .trim()
    .slice(0, 128);
}

async function hashClientKey(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function middleware(request: NextRequest) {
  const production = process.env.NODE_ENV === "production";
  const nonce = crypto.randomUUID().replaceAll("-", "");
  const csp = contentSecurityPolicy(nonce, production);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const declaredBytes = Number(request.headers.get("content-length") || 0);
  const maximumBytes = requestBodyLimit(request.nextUrl.pathname, request.headers.get("content-type") || "");
  if (maximumBytes !== null && Number.isFinite(declaredBytes) && declaredBytes > maximumBytes) {
    const response = NextResponse.json({ error: { code: "REQUEST_BODY_TOO_LARGE", message: "The request body exceeds the route capacity limit." } }, { status: 413 });
    applySecurityHeaders(response.headers, csp, production);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  const rule = publicSurfaceRule(request.nextUrl.pathname);
  let rateLimitHeaders: Record<string, string> = {};
  if (rule) {
    const admissionStartedAt = performance.now();
    const distributed = usesDistributedPublicRateLimit();
    const identityHash = await hashClientKey(clientKey(request));
    let result;
    try {
      result = distributed
        ? await consumeDistributedPublicRateLimit(identityHash, rule)
        : consumePublicRateLimit(clientKey(request), rule);
    } catch {
      const response = NextResponse.json({ error: { code: "PUBLIC_RATE_LIMIT_UNAVAILABLE", message: "The public request cannot be safely admitted." } }, { status: 503 });
      applySecurityHeaders(response.headers, csp, production);
      response.headers.set("Cache-Control", "no-store");
      return response;
    }
    rateLimitHeaders = {
      "X-RateLimit-Backend": distributed ? "distributed" : "memory",
      "X-RateLimit-Limit": String(result.limit),
      "X-RateLimit-Remaining": String(result.remaining),
      ...(process.env.DPP_ENVIRONMENT === "preproduction" ? { "X-RateLimit-Identity": identityHash.slice(0, 12) } : {}),
    };
    requestHeaders.set("x-public-rate-limit-admission-ms", (performance.now() - admissionStartedAt).toFixed(1));
    if (!result.allowed) {
      const response = NextResponse.json({ error: { code: "PUBLIC_RATE_LIMITED", message: "The public request rate limit has been exceeded." } }, { status: 429 });
      applySecurityHeaders(response.headers, csp, production);
      response.headers.set("Cache-Control", "no-store");
      response.headers.set("Retry-After", String(result.retryAfterSeconds));
      response.headers.set("X-RateLimit-Limit", String(result.limit));
      response.headers.set("X-RateLimit-Remaining", "0");
      response.headers.set("X-RateLimit-Backend", distributed ? "distributed" : "memory");
      if (process.env.DPP_ENVIRONMENT === "preproduction") response.headers.set("X-RateLimit-Identity", identityHash.slice(0, 12));
      return response;
    }
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  applySecurityHeaders(response.headers, csp, production);
  for (const [name, value] of Object.entries(rateLimitHeaders)) response.headers.set(name, value);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
