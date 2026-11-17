import { DemoShowcase } from "@/components/v2/demo/DemoShowcase";
import { demoLocale, demoText } from "@/lib/demo/language";
import { loadDemoLanguage } from "@/lib/demo/loadLanguage";
import { loadPublicDemoShowcase } from "@/lib/server/v2/demoShowcase";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
type Props = { searchParams?: Promise<{ lang?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const language = await loadDemoLanguage(demoLocale((await searchParams)?.lang));
  return { title: { absolute: `GreanLean ${demoText(language, "QR Code & Product Passport Showcase", "二维码与产品护照展厅")}` } };
}

export default async function DemoPage({ searchParams }: Props) {
  const [entries, query] = await Promise.all([loadPublicDemoShowcase(), searchParams]);
  return <DemoShowcase entries={entries} language={await loadDemoLanguage(demoLocale(query?.lang))} />;
}
