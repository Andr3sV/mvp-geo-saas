import { PageHeader } from "@/components/dashboard/page-header";
import { PromptsManager } from "@/components/prompts/prompts-manager";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";

export default async function PromptsPage() {
  const user = await getUser();
  
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Prompt Management"
        description="Configure and manage AI prompts to track your brand mentions"
      />

      <PromptsManager />
    </div>
  );
}

