export type PublicSurface = "resolver" | "public-dpp" | "public-html" | "qr" | "identifier-lookup";

export type Rule = {
  surface: PublicSurface;
  limit: number;
  windowMs: number;
};

type Counter = { count: number; resetAt: number };

const PUBLIC_RULES: Array<{ matches: (pathname: string) => boolean; rule: Rule }> = [
  { matches: (path) => path.startsWith("/api/v2/resolver/"), rule: { surface: "resolver", limit: 120, windowMs: 60_000 } },
  { matches: (path) => path.startsWith("/api/v2/public/passports/"), rule: { surface: "public-dpp", limit: 90, windowMs: 60_000 } },
  { matches: (path) => path.startsWith("/api/battery-dpp/public/"), rule: { surface: "public-dpp", limit: 90, windowMs: 60_000 } },
  { matches: (path) => path.startsWith("/p/"), rule: { surface: "public-html", limit: 120, windowMs: 60_000 } },
  { matches: (path) => path === "/api/qr", rule: { surface: "qr", limit: 30, windowMs: 60_000 } },
  { matches: (path) => path.startsWith("/01/"), rule: { surface: "identifier-lookup", limit: 120, windowMs: 60_000 } },
];

const counters = new Map<string, Counter>();
const MAX_COUNTERS = 20_000;

export function publicSurfaceRule(pathname: string): Rule | null {
  return PUBLIC_RULES.find(({ matches }) => matches(pathname))?.rule || null;
}

export function requestBodyLimit(pathname: string, contentType: string): number | null {
  if (pathname === "/api/internal/dpp-files" && contentType.includes("multipart/form-data")) return 30 * 1024 * 1024;
  if (pathname.startsWith("/api/") && (contentType.includes("application/json") || contentType.includes("application/ld+json"))) return 1024 * 1024;
  return null;
}

export function consumePublicRateLimit(clientKey: string, rule: Rule, now = Date.now()) {
  const key = `${rule.surface}:${clientKey}`;
  let counter = counters.get(key);
  if (!counter || counter.resetAt <= now) counter = { count: 0, resetAt: now + rule.windowMs };
  counter.count += 1;
  counters.set(key, counter);

  if (counters.size > MAX_COUNTERS) {
    counters.forEach((value, candidate) => {
      if (value.resetAt <= now) counters.delete(candidate);
    });
    while (counters.size > MAX_COUNTERS) {
      const oldest = counters.keys().next().value;
      if (oldest === undefined) break;
      counters.delete(oldest);
    }
  }

  return {
    allowed: counter.count <= rule.limit,
    limit: rule.limit,
    remaining: Math.max(0, rule.limit - counter.count),
    retryAfterSeconds: Math.max(1, Math.ceil((counter.resetAt - now) / 1000)),
    resetAt: counter.resetAt,
  };
}

export async function consumeDistributedPublicRateLimit(clientKeyHash: string, rule: Rule) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("PUBLIC_RATE_LIMIT_CONFIGURATION_MISSING");
  const response = await fetch(`${url}/rest/v1/rpc/v2_phase6c_consume_public_rate_limit`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify({
      p_surface: rule.surface,
      p_client_key_hash: clientKeyHash,
      p_limit: rule.limit,
      p_window_seconds: Math.ceil(rule.windowMs / 1000),
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`PUBLIC_RATE_LIMIT_BACKEND_FAILED_${response.status}`);
  const rows = await response.json() as Array<{
    allowed: boolean;
    remaining: number;
    retry_after_seconds: number;
  }>;
  const row = rows[0];
  if (!row || typeof row.allowed !== "boolean") throw new Error("PUBLIC_RATE_LIMIT_BACKEND_INVALID_RESPONSE");
  return {
    allowed: row.allowed,
    limit: rule.limit,
    remaining: Number(row.remaining),
    retryAfterSeconds: Math.max(1, Number(row.retry_after_seconds)),
  };
}

export function usesDistributedPublicRateLimit() {
  return process.env.PUBLIC_RATE_LIMIT_BACKEND === "supabase";
}

export function resetPublicRateLimitsForTests() {
  counters.clear();
}
