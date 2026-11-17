import type { DemoLocale } from "./demo/language.ts";
import { demoDigitalLinkPath } from "./demoDigitalLinks.ts";

const showcaseIdentifiers = new Set([
  "DPP-LMT-BAT-48V15AH",
  "DPP-GV-ESS-14K3-000001",
  "DPP-SFJK-31-1-REC",
  "DPP-CE-EARBUDS-001",
]);

export function productPassportHref(identifier: string, locale: DemoLocale, options?: { demo?: boolean }) {
  const params = new URLSearchParams({ lang: locale });
  if (showcaseIdentifiers.has(identifier)) params.set("showcase", "1");
  const digitalLink = demoDigitalLinkPath(identifier);
  if (!digitalLink && options?.demo) params.set("demo", "1");
  const path = digitalLink || `/p/${encodeURIComponent(identifier)}`;
  return `${path}?${params.toString()}`;
}
