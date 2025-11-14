"use client";

import { BreadcrumbNav } from "./breadcrumb-nav";
import { UserNav } from "@/components/layout/user-nav";
import { useProject } from "@/contexts/project-context";
import { useEffect } from "react";

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
  const { selectedProjectId, setSelectedProjectId } = useProject();

  // Set default if not set
  useEffect(() => {
    if (!selectedProjectId && defaultProjectId) {
      setSelectedProjectId(defaultProjectId);
    }
  }, [selectedProjectId, defaultProjectId, setSelectedProjectId]);

  return (
    <header className="sticky top-0 z-50 flex h-14 w-full items-center gap-4 border-b bg-background px-6">
      <BreadcrumbNav workspaces={workspaces} />

      <div className="ml-auto flex items-center gap-4">
        <UserNav user={user} />
      </div>
    </header>
  );
}

