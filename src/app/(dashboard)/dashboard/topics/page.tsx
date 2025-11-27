import { PageHeader } from "@/components/dashboard/page-header";
import { TopicsManager } from "@/components/topics/topics-manager";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";

export default async function TopicsPage() {
  const user = await getUser();
  
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Topic Management"
        description="Manage and organize your topics for better analytics segmentation"
      />
      <TopicsManager />
    </div>
  );
}

