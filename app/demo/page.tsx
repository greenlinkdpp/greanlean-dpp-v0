import { DemoShowcase } from "@/components/v2/demo/DemoShowcase";
import { loadPublicDemoShowcase } from "@/lib/server/v2/demoShowcase";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams?: Promise<{ lang?: string }> }): Promise<Metadata> {
  const zh = (await searchParams)?.lang !== "en";
  return { title: { absolute: zh ? "GreanLean 产品护照展厅" : "GreanLean Digital Product Passport Showcase" } };
}

export default async function DemoPage({ searchParams }: { searchParams?: Promise<{ lang?: string }> }) {
  const lang = (await searchParams)?.lang === "en" ? "en" : "zh";
  return <DemoShowcase entries={await loadPublicDemoShowcase()} locale={lang} />;
}
