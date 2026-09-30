import { DemoShowcase } from "@/components/v2/demo/DemoShowcase";
import { loadPublicDemoShowcase } from "@/lib/server/v2/demoShowcase";

export const dynamic = "force-dynamic";

export default async function DemoPage({ searchParams }: { searchParams?: Promise<{ lang?: string }> }) {
  const lang = (await searchParams)?.lang === "en" ? "en" : "zh";
  return <DemoShowcase entries={await loadPublicDemoShowcase()} locale={lang} />;
}
