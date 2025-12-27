"use client";

import { BreadcrumbNav } from "./breadcrumb-nav";
import { useProject } from "@/contexts/project-context";
import { useEffect } from "react";

interface DashboardHeaderProps {
  workspaces: any[];
  defaultProjectId?: string;
}

export function DashboardHeader({
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
    <header className="sticky top-0 z-50 flex h-14 w-full items-center gap-4 border-b border-zinc-700 bg-zinc-800 text-white px-6">
      <BreadcrumbNav workspaces={workspaces} />
    </header>
  );
}

