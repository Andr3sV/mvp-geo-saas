import { redirect } from "next/navigation";
import { getUser, getUserWorkspaces } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const workspaces = await getUserWorkspaces();

  if (workspaces.length === 0) {
    redirect("/onboarding");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <span className="text-xl font-semibold">Ateneai</span>
          <div className="text-sm text-muted-foreground">
            Welcome, {user.email}
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold">Welcome to your Dashboard! 🎉</h1>
          <p className="mb-8 text-lg text-muted-foreground">
            You've successfully completed the onboarding process.
          </p>
          <div className="rounded-lg border bg-muted/50 p-6">
            <p className="text-sm text-muted-foreground">
              Dashboard features will be implemented in Phase 3
            </p>
            <p className="mt-2 text-sm font-medium">
              Your workspace: {workspaces[0]?.workspaces?.name || "Unknown"}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

