import { redirect } from "next/navigation";
import { INDUSTRIAL_DEMO } from "@/lib/battery/industrialDemo";

export default function GreenVaultProductPage({ searchParams }: { searchParams?: { lang?: string } }) {
  const lang = searchParams?.lang === "en" ? "en" : "zh";
  redirect(`/p/${encodeURIComponent(INDUSTRIAL_DEMO.dppId)}?view=consumer&lang=${lang}`);
}
