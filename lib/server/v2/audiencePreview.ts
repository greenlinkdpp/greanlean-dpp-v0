import { createHmac, timingSafeEqual } from "node:crypto";
import type { PreviewRole } from "../../v2/presentation";

const PREPROD_HOST = "greanlean-dpp-preprod.vercel.app";
const MAX_GRANT_SECONDS = 24 * 60 * 60;

function secret() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

function message(identifier: string, role: PreviewRole, expiresAt: number) {
  return `${identifier}:${role}:${expiresAt}`;
}

function signature(identifier: string, role: PreviewRole, expiresAt: number) {
  return createHmac("sha256", secret()).update(message(identifier, role, expiresAt)).digest("hex");
}

export function createAudiencePreviewGrant(identifier: string, role: PreviewRole, expiresAt: number) {
  if (!secret()) throw new Error("Audience preview signing is not configured.");
  return `${expiresAt}.${signature(identifier, role, expiresAt)}`;
}

export function verifyAudiencePreviewGrant(input: {
  host: string;
  identifier: string;
  role: PreviewRole;
  grant?: string;
  now?: number;
}) {
  if (input.host !== PREPROD_HOST || !secret() || !input.grant) return false;
  const [expiryText, suppliedSignature, ...extra] = input.grant.split(".");
  const expiresAt = Number(expiryText);
  const now = input.now || Math.floor(Date.now() / 1000);
  if (extra.length || !Number.isSafeInteger(expiresAt) || expiresAt < now || expiresAt > now + MAX_GRANT_SECONDS) return false;
  const expected = signature(input.identifier, input.role, expiresAt);
  if (!/^[a-f0-9]{64}$/.test(suppliedSignature || "")) return false;
  return timingSafeEqual(Buffer.from(suppliedSignature, "hex"), Buffer.from(expected, "hex"));
}

export function isPreprodAudiencePreviewHost(host: string) {
  return host === PREPROD_HOST;
}
