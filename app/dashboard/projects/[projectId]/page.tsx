import { P0ProjectDetail } from "@/components/p0/P0ProjectDetail";

export default function ProjectPage({ params }: { params: { projectId: string } }) {
  return <P0ProjectDetail projectId={params.projectId} />;
}
