import { BarChart3, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { CitationsContent } from "@/components/citations/citations-content";
import { requireAuth } from "@/lib/auth";
import { getDefaultProject } from "@/lib/queries/workspace";
import { redirect } from "next/navigation";

export default async function CitationsPage() {
  const user = await requireAuth();
  const defaultProject = await getDefaultProject(user.id);

  if (!defaultProject) {
    redirect("/onboarding");
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Citation Tracking"
        description="Monitor how often your brand appears in AI-generated responses"
      />

      <CitationsContent projectId={defaultProject.id} />
    </div>
  );
}
