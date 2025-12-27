"use client";

import { ChevronDown, Building2, FolderKanban, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
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

export function BreadcrumbNav({ workspaces }: BreadcrumbNavProps) {
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

  // Only show workspace selector if there are multiple workspaces
  const showWorkspaceSelector = workspaces.length > 1;

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
      <Separator orientation="vertical" className="h-6 bg-zinc-600" />

      {/* Workspace Selector - Only show if multiple workspaces */}
      {showWorkspaceSelector && (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 font-medium text-white hover:bg-zinc-700 hover:text-white"
              >
                <Building2 className="h-3.5 w-3.5" />
                <span>{currentWorkspace?.name || "Workspace"}</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
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
          <span className="text-zinc-400">/</span>
        </>
      )}

      {/* Project Selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 font-medium text-white hover:bg-zinc-700 hover:text-white"
          >
            <FolderKanban className="h-3.5 w-3.5" />
            <span>{currentProject?.name || "Project"}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-70" />
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
