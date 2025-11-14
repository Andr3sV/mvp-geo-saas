import { PageHeader } from "@/components/dashboard/page-header";
import { AnalysisDetail } from "@/components/analysis/analysis-detail";

interface AnalysisDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AnalysisDetailPage({ params }: AnalysisDetailPageProps) {
  const { id } = await params;
  
  return (
    <div>
      <PageHeader
        title="Analysis Details"
        description="View detailed results of AI analysis job"
      />

      <AnalysisDetail jobId={id} />
    </div>
  );
}

