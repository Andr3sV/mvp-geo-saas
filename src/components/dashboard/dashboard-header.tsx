"use client";

import { useState } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ProjectSelector } from "./project-selector";
import { UserNav } from "@/components/layout/user-nav";

interface DashboardHeaderProps {
  user: any;
  workspaces: any[];
  defaultProjectId?: string;
}

export function DashboardHeader({
  user,
  workspaces,
  defaultProjectId,
}: DashboardHeaderProps) {
  const [selectedProjectId, setSelectedProjectId] = useState(defaultProjectId);

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-6" />
      
      <ProjectSelector
        workspaces={workspaces}
        currentProjectId={selectedProjectId}
        onProjectChange={setSelectedProjectId}
      />

      <div className="ml-auto flex items-center gap-4">
        <UserNav user={user} />
      </div>
    </header>
  );
}

