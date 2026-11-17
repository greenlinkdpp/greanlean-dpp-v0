import type { Metadata } from "next";
import { QrCodeDemo } from "@/components/v2/demo/QrCodeDemo";

type Props = { searchParams?: Promise<{ lang?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const zh = (await searchParams)?.lang !== "en";
  return {
    title: { absolute: zh ? "QR Code 批次电池信息 Demo | GreanLean" : "QR Code Batch Battery Information Demo | GreanLean" },
    description: zh ? "扫码查看批次电池信息：制造商、材料、标签、产品文件与分类回收。演示数据。" : "Scan to explore batch battery information: manufacturer, materials, labels, documents and collection. Demo data.",
  };
}

export default async function QrCodeDemoPage({ searchParams }: Props) {
  return <QrCodeDemo locale={(await searchParams)?.lang === "en" ? "en" : "zh"} />;
}
