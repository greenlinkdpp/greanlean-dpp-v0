import type { Metadata } from "next";
import { QrCodeDemo } from "@/components/v2/demo/QrCodeDemo";
import { demoLocale, demoText } from "@/lib/demo/language";
import { loadDemoLanguage } from "@/lib/demo/loadLanguage";

type Props = { searchParams?: Promise<{ lang?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const language = await loadDemoLanguage(demoLocale((await searchParams)?.lang));
  return {
    title: { absolute: `${demoText(language, "QR Code Batch Battery Information Demo", "QR Code 批次电池信息 Demo")} | GreanLean` },
    description: demoText(language, "Scan to explore batch battery information: manufacturer, materials, labels, documents and collection. Demo data.", "扫码查看批次电池信息：制造商、材料、标签、产品文件与分类回收。演示数据。"),
  };
}

export default async function QrCodeDemoPage({ searchParams }: Props) {
  return <QrCodeDemo language={await loadDemoLanguage(demoLocale((await searchParams)?.lang))} />;
}
