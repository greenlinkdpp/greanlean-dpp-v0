import { redirect } from "next/navigation";

export default function IndustrialBatteryDemoPage({ searchParams }: { searchParams?: { lang?: string } }) {
  const lang = searchParams?.lang === "en" ? "en" : "zh";
  redirect(`/p/DPP-GV-ESS-14K3-000001?lang=${lang}`);
}
