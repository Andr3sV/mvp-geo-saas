import { SettingsTabs } from "@/components/settings/settings-tabs";
import { getUser, getUserProfile } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const user = await getUser();
  
  if (!user) {
    redirect("/login");
  }

  const profile = await getUserProfile();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account, workspace, and projects
        </p>
      </div>

      <SettingsTabs 
        user={{
          email: user.email,
          name: profile?.name,
        }}
      />
    </div>
  );
}

