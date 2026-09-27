const OFFICIAL_PATH = /^\/(?:api\/v2\/resolver\/[^/]+|p\/[^/]+|01\/[^/]+)$/;

function normalizeQrHost(host: string) {
  return host.trim().toLowerCase().replace(/:\d+$/, "");
}

export function approvedQrHosts(requestHost: string, configured = process.env.QR_APPROVED_HOSTS || "") {
  return Array.from(new Set([
    normalizeQrHost(requestHost),
    ...configured.split(",").map(normalizeQrHost).filter(Boolean),
  ]));
}

export function validateOfficialQrTarget(rawTarget: string, requestOrigin: string, hosts: string[]) {
  let target: URL;
  try {
    target = new URL(rawTarget, requestOrigin);
  } catch {
    throw new Error("QR_TARGET_INVALID");
  }
  const targetHost = normalizeQrHost(target.hostname);
  const isLocal = targetHost === "localhost" || targetHost === "127.0.0.1";
  if (target.protocol !== "https:" && !(isLocal && target.protocol === "http:")) throw new Error("QR_TARGET_SCHEME_DENIED");
  if (target.username || target.password) throw new Error("QR_TARGET_CREDENTIALS_DENIED");
  if (!hosts.map(normalizeQrHost).includes(targetHost)) throw new Error("QR_TARGET_HOST_DENIED");
  if (!OFFICIAL_PATH.test(target.pathname) || target.search || target.hash) throw new Error("QR_TARGET_PATH_DENIED");
  return target.toString();
}
