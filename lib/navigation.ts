export type NavigationLocale = "en" | "zh";

export const PRIMARY_V2_DEMO_PATH = "/p/DPP-GLR-EBIKE-000001";
export const V2_BACKOFFICE_PATH = "/dashboard/v2";
export const PLATFORM_CONSOLE_PATH = "/dashboard/platform";

export function localizedPath(path: string, locale: NavigationLocale) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}lang=${locale}`;
}

export function safeLoginReturnPath(requested: string | null, locale: NavigationLocale, fallbackPath = V2_BACKOFFICE_PATH) {
  const fallback = localizedPath(fallbackPath, locale);
  if (!requested || !requested.startsWith("/") || requested.startsWith("//")) return fallback;
  if (requested.includes("\\") || /%(?:0[0-9a-f]|1[0-9a-f]|2f|5c|7f)/i.test(requested)) return fallback;

  try {
    const base = "https://navigation.invalid";
    const url = new URL(requested, base);
    if (url.origin !== base || !url.pathname.startsWith("/")) return fallback;
    if (url.searchParams.get("lang") !== "en" && url.searchParams.get("lang") !== "zh") {
      url.searchParams.set("lang", locale);
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
