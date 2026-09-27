import { notFound, redirect } from "next/navigation";

const INDUSTRIAL_BATTERY_ALIASES = new Set([
  "DPP-GV-ESS-14K3-000001",
  "DPP-BAT-IND-ESS-14336-001",
  "green-vault-ess-14-3-000001",
  "green-vault-ess-14-3-demo-000001",
]);

export default async function PassportAliasPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ lang?: string; view?: string }>;
}) {
  const [{ slug }, requested = {}] = await Promise.all([params, searchParams]);
  if (!INDUSTRIAL_BATTERY_ALIASES.has(decodeURIComponent(slug))) notFound();
  const query = new URLSearchParams();
  query.set("lang", requested.lang === "en" ? "en" : "zh");
  query.set(
    "view",
    requested.view === "audit"
      ? "audit"
      : requested.view === "professional"
        ? "professional"
        : "consumer",
  );
  redirect(`/p/DPP-GV-ESS-14K3-000001?${query.toString()}`);
}
