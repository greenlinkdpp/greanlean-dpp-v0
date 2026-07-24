import { notFound, redirect } from "next/navigation";
import { INDUSTRIAL_DEMO, isIndustrialDemoIdentifier } from "@/lib/battery/industrialDemo";

export default function PassportAliasPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { lang?: string; view?: string };
}) {
  if (!isIndustrialDemoIdentifier(decodeURIComponent(params.slug))) notFound();
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
  redirect(`/p/${encodeURIComponent(INDUSTRIAL_DEMO.dppId)}?${query.toString()}`);
}
