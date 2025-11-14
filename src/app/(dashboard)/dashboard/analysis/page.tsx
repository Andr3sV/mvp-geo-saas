import { PageHeader } from "@/components/dashboard/page-header";
import { AnalysisReports } from "@/components/analysis/analysis-reports";

export default function AnalysisPage() {
  return (
    <div>
      <PageHeader
        title="Analysis Reports"
        description="View and manage AI analysis jobs and results"
      />

      <AnalysisReports />
    </div>
  );
}

