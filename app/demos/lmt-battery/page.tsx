import { redirect } from "next/navigation";

export default function LmtBatteryDemoPage({ searchParams }: { searchParams?: { lang?: string } }) {
  const lang = searchParams?.lang === "en" ? "en" : "zh";
  redirect(`/p/DPP-LMT-BAT-48V15AH?view=consumer&lang=${lang}`);
}
