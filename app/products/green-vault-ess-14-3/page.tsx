import { redirect } from "next/navigation";

export default async function GreenVaultProductPage({ searchParams }: { searchParams?: Promise<{ lang?: string }> }) {
  const lang = (await searchParams)?.lang === "en" ? "en" : "zh";
  redirect(`/p/DPP-GV-ESS-14K3-000001?lang=${lang}`);
}
