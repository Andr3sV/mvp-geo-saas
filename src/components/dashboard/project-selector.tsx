"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { CreateProjectWizard } from "@/components/projects/create-project-wizard";
import { useRouter } from "next/navigation";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  projects: Project[];
}

interface Project {
  id: string;
  name: string;
  slug: string;
}

interface ProjectSelectorProps {
  workspaces: Workspace[];
  currentProjectId?: string;
  onProjectChange: (projectId: string) => void;
}

export function ProjectSelector({
  workspaces,
  currentProjectId,
  onProjectChange,
}: ProjectSelectorProps) {
  const router = useRouter();
  const [showCreateWizard, setShowCreateWizard] = useState(false);

  const currentProject = workspaces
    .flatMap((w) => w.projects)
    .find((p) => p.id === currentProjectId);

  const currentWorkspace = workspaces.find((w) =>
    w.projects.some((p) => p.id === currentProjectId)
  );

  const handleProjectCreated = (projectId: string) => {
    onProjectChange(projectId);
    router.refresh();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-[200px] justify-between">
            <span className="truncate">
              {currentProject?.name || "Select project"}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[200px]">
          {workspaces.map((workspace) => (
            <div key={workspace.id}>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                {workspace.name}
              </DropdownMenuLabel>
              {workspace.projects.map((project) => (
                <DropdownMenuItem
                  key={project.id}
                  onClick={() => onProjectChange(project.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      currentProjectId === project.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{project.name}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </div>
          ))}
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              console.log('[ProjectSelector] Opening wizard');
              setShowCreateWizard(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            <span>Create project</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateProjectWizard
        open={showCreateWizard}
        onOpenChange={setShowCreateWizard}
        workspaces={workspaces.map((w) => ({ id: w.id, name: w.name }))}
        defaultWorkspaceId={currentWorkspace?.id || workspaces[0]?.id}
        onProjectCreated={handleProjectCreated}
      />
    </>
  );
}

