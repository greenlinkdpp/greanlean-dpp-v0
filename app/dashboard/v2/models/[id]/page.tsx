import { BackofficeConsole } from "@/components/v2/backoffice/BackofficeConsole";

export default async function V2BackofficeModelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BackofficeConsole section="models" modelId={id} />;
}
