"use client";

import { ChevronDown, Building2, FolderKanban, Plus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useProject } from "@/contexts/project-context";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { CreateProjectWizard } from "@/components/projects/create-project-wizard";

interface BreadcrumbNavProps {
  workspaces: any[];
}

const PAGE_NAMES: Record<string, string> = {
  "/dashboard/citations": "Citation & domains",
  "/dashboard/share-of-voice": "Share of mentions",
  "/dashboard/platforms": "Platform Breakdown",
  "/dashboard/sentiment": "Sentiment Analysis",
  "/dashboard/attributes": "Attributes",
  "/dashboard/queries": "Query Patterns",
  "/dashboard/trending": "Trending Queries",
  "/dashboard/competitors": "Competitor Management",
  "/dashboard/reports/executive": "Executive Overview",
  "/dashboard/prompts": "Prompt Management",
  "/dashboard/settings": "Settings",
  "/dashboard": "Dashboard",
};

function getPageName(pathname: string): string {
  // Check for exact match first
  if (PAGE_NAMES[pathname]) {
    return PAGE_NAMES[pathname];
  }
  
  return "Dashboard";
}

export function BreadcrumbNav({ workspaces }: BreadcrumbNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { selectedProjectId, setSelectedProjectId } = useProject();
  const [currentWorkspace, setCurrentWorkspace] = useState<any>(null);
  const [currentProject, setCurrentProject] = useState<any>(null);
  const [showCreateWizard, setShowCreateWizard] = useState(false);

  useEffect(() => {
    if (selectedProjectId && workspaces.length > 0) {
      const workspace = workspaces.find((w) =>
        w.projects.some((p: any) => p.id === selectedProjectId)
      );
      const project = workspaces
        .flatMap((w) => w.projects || [])
        .find((p) => p.id === selectedProjectId);

      setCurrentWorkspace(workspace || workspaces[0]);
      setCurrentProject(project);
    } else if (workspaces.length > 0) {
      setCurrentWorkspace(workspaces[0]);
    }
  }, [selectedProjectId, workspaces]);

  const currentPageName = getPageName(pathname);

  return (
    <div className="flex items-center gap-2 text-sm">
      {/* Logo */}
      <Link href="/dashboard" className="flex h-8 w-8 items-center justify-center rounded-md overflow-hidden">
        <Image
          src="/ateneaiicon.svg"
          alt="Ateneai"
          width={32}
          height={32}
          className="object-contain"
        />
      </Link>
      <Separator orientation="vertical" className="h-6" />

      {/* Workspace Selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 font-medium hover:bg-muted/50"
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>{currentWorkspace?.name || "Workspace"}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Switch Workspace
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              onClick={() => {
                // A futuro: cambiar de workspace
                // Por ahora, solo selecciona el primer proyecto del workspace
                if (workspace.projects.length > 0) {
                  setSelectedProjectId(workspace.projects[0].id);
                }
              }}
              className={cn(
                currentWorkspace?.id === workspace.id && "bg-muted"
              )}
            >
              {workspace.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <span className="text-muted-foreground">/</span>

      {/* Project Selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 font-medium hover:bg-muted/50"
          >
            <FolderKanban className="h-3.5 w-3.5" />
            <span>{currentProject?.name || "Project"}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {currentWorkspace && (
            <>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                {currentWorkspace.name} Projects
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {currentWorkspace.projects?.map((project: any) => (
                <DropdownMenuItem
                  key={project.id}
                  onClick={() => setSelectedProjectId(project.id)}
                  className={cn(
                    selectedProjectId === project.id && "bg-muted"
                  )}
                >
                  {project.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowCreateWizard(true)}
                className="text-primary"
              >
                <Plus className="mr-2 h-4 w-4" />
                <span>Create Project</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <span className="text-muted-foreground">/</span>

      {/* Current Page */}
      <span className="font-medium">{currentPageName}</span>

      {/* Create Project Wizard */}
      <CreateProjectWizard
        open={showCreateWizard}
        onOpenChange={setShowCreateWizard}
        workspaces={workspaces.map((w) => ({ id: w.id, name: w.name }))}
        defaultWorkspaceId={currentWorkspace?.id || workspaces[0]?.id}
        onProjectCreated={(projectId) => {
          setSelectedProjectId(projectId);
          // Wizard will handle redirect
        }}
      />
    </div>
  );
}

