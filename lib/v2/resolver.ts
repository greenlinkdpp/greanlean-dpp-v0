export const MAX_RESOLVER_REDIRECT_DEPTH = 8;

export function normalizeResolverHost(host: string) {
  return host.trim().toLowerCase().replace(/:\d+$/, "");
}

export function normalizeResolverPath(path: string) {
  const clean = `/${path.trim().replace(/^\/+/, "")}`.replace(/\/{2,}/g, "/");
  return clean === "/" ? clean : clean.replace(/\/$/, "");
}

export function buildApprovedResolverUrl(options: {
  origin: string;
  identifier: string;
  approvedHosts: string[];
}) {
  const origin = new URL(options.origin);
  const host = normalizeResolverHost(origin.hostname);
  if (!options.approvedHosts.map(normalizeResolverHost).includes(host)) {
    throw new Error("RESOLVER_OPEN_REDIRECT");
  }
  if (!options.identifier.trim() || /[/?#]/.test(options.identifier)) {
    throw new Error("RESOLVER_IDENTIFIER_INVALID");
  }
  return new URL(`/api/v2/resolver/${encodeURIComponent(options.identifier)}`, origin).toString();
}

