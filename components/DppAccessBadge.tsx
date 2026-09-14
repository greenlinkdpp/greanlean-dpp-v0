import type { DppAudience } from "@/lib/publicDppViewModel";

export function DppAccessBadge({
  audience,
  locale,
}: {
  audience: DppAudience;
  locale: "zh" | "en";
}) {
  const labels = {
    zh: {
      PUBLIC: "公众可见",
      LEGITIMATE_INTEREST: "专业授权",
      AUTHORITY_ONLY: "监管授权",
    },
    en: {
      PUBLIC: "Public",
      LEGITIMATE_INTEREST: "Professional grant",
      AUTHORITY_ONLY: "Authority grant",
    },
  } as const;
  const style = audience === "AUTHORITY_ONLY"
    ? "border-amber-300 bg-amber-50 text-amber-900"
    : audience === "LEGITIMATE_INTEREST"
      ? "border-blue-300 bg-blue-50 text-blue-800"
      : "border-emerald-300 bg-emerald-50 text-emerald-800";

  return (
    <span className={`inline-flex min-h-6 shrink-0 items-center rounded border px-2 text-[11px] font-black leading-5 ${style}`}>
      {labels[locale][audience]}
    </span>
  );
}
