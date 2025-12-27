import { SettingsTabs } from "@/components/settings/settings-tabs";
import { PageHeader } from "@/components/dashboard/page-header";
import { getUser, getUserProfile } from "@/lib/auth";
import { redirect } from "next/navigation";

interface SettingsPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const user = await getUser();
  
  if (!user) {
    redirect("/login");
  }

  const profile = await getUserProfile();
  const params = await searchParams;
  const defaultTab = params.tab || "projects";

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Settings"
        description="Manage your account, workspace, and projects"
      />

      <SettingsTabs 
        user={{
          email: user.email,
          name: profile?.name,
        }}
        defaultTab={defaultTab}
      />
    </div>
  );
}

