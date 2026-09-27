import { redirect } from "next/navigation";

export default async function LmtBatteryDemoPage({ searchParams }: { searchParams?: Promise<{ lang?: string }> }) {
  const lang = (await searchParams)?.lang === "en" ? "en" : "zh";
  redirect(`/p/DPP-LMT-BAT-48V15AH?lang=${lang}`);
}
