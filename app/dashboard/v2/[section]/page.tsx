import { BackofficeConsole } from "@/components/v2/backoffice/BackofficeConsole";

export default async function V2BackofficeSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  return <BackofficeConsole section={section} />;
}
