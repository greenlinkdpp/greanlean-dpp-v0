import { notFound, redirect } from "next/navigation";

const INDUSTRIAL_BATTERY_ALIASES = new Set([
  "DPP-GV-ESS-14K3-000001",
  "DPP-BAT-IND-ESS-14336-001",
  "green-vault-ess-14-3-000001",
  "green-vault-ess-14-3-demo-000001",
]);

export default function PassportAliasPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { lang?: string; view?: string };
}) {
  if (!INDUSTRIAL_BATTERY_ALIASES.has(decodeURIComponent(params.slug))) notFound();
  const query = new URLSearchParams();
  query.set("lang", searchParams?.lang === "en" ? "en" : "zh");
  query.set(
    "view",
    searchParams?.view === "audit"
      ? "audit"
      : searchParams?.view === "professional"
        ? "professional"
        : "consumer",
  );
  redirect(`/p/DPP-GV-ESS-14K3-000001?${query.toString()}`);
}
