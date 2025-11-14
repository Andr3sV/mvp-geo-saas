import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getUserWorkspacesWithProjects } from "@/lib/queries/workspace";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ProjectProvider } from "@/contexts/project-context";

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
    <ProjectProvider defaultProjectId={defaultProject?.id}>
      <SidebarProvider>
        <div className="flex min-h-screen w-full flex-col">
          {/* Header - Always full width, sticky at top */}
          <DashboardHeader
            user={user}
            workspaces={workspaces}
            defaultProjectId={defaultProject?.id}
          />

          {/* Sidebar + Main Content below header */}
          <div className="flex flex-1 overflow-hidden">
            <AppSidebar />
            <main className="flex-1 overflow-auto p-6">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ProjectProvider>
  );
}

