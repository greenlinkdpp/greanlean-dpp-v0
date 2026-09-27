import { P0ProjectDetail } from "@/components/p0/P0ProjectDetail";

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <P0ProjectDetail projectId={projectId} />;
}
