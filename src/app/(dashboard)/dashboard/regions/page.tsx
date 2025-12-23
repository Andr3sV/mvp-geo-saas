import { PageHeader } from "@/components/dashboard/page-header";
import { RegionsManager } from "@/components/regions/regions-manager";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";

export default async function RegionsPage() {
  const user = await getUser();
  
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Region Management"
        description="Manage and organize regions (countries) for tracking and analytics segmentation"
      />
      <RegionsManager />
    </div>
  );
}

