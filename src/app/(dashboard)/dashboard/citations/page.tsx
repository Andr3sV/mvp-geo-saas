import { PageHeader } from "@/components/dashboard/page-header";
import { CitationsContent } from "@/components/citations/citations-content";

export default function CitationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Citation Tracking"
        description="Monitor how often your brand appears in AI-generated responses"
      />

      <CitationsContent />
    </div>
  );
}
