import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getUserWorkspacesWithProjects } from "@/lib/queries/workspace";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const workspaces = await getUserWorkspacesWithProjects();

  if (workspaces.length === 0) {
    redirect("/onboarding");
  }

  // Get first project as default
  const defaultProject = workspaces[0]?.projects?.[0];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <DashboardHeader
            user={user}
            workspaces={workspaces}
            defaultProjectId={defaultProject?.id}
          />
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

