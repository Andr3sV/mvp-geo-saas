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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { createProject } from "@/lib/actions/workspace";
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
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [clientUrl, setClientUrl] = useState("");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [projectColor, setProjectColor] = useState("#3B82F6");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentProject = workspaces
    .flatMap((w) => w.projects)
    .find((p) => p.id === currentProjectId);

  const currentWorkspace = workspaces.find((w) =>
    w.projects.some((p) => p.id === currentProjectId)
  );

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      setError("Project name is required");
      return;
    }

    if (!selectedWorkspaceId) {
      setError("Please select a workspace");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const result = await createProject({
        name: projectName.trim(),
        workspace_id: selectedWorkspaceId,
        client_url: clientUrl.trim() || undefined,
        color: projectColor,
      });

      if (result.data && !result.error) {
        // Close dialog and reset form
        setShowCreateDialog(false);
        setProjectName("");
        setClientUrl("");
        setSelectedWorkspaceId("");
        setProjectColor("#3B82F6");
        
        // Switch to new project
        onProjectChange(result.data.id);
        
        // Refresh the page to show new project
        router.refresh();
      } else {
        setError(result.error || "Failed to create project");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsCreating(false);
    }
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
            onClick={() => {
              setSelectedWorkspaceId(currentWorkspace?.id || workspaces[0]?.id || "");
              setShowCreateDialog(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            <span>Create project</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Add a new project to track GEO performance for a client or brand.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="workspace">Workspace</Label>
              <select
                id="workspace"
                value={selectedWorkspaceId}
                onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={isCreating}
              >
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name *</Label>
              <Input
                id="project-name"
                placeholder="e.g., Acme Corp, Nike Campaign"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                disabled={isCreating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-url">Client Website (Optional)</Label>
              <Input
                id="client-url"
                type="url"
                placeholder="https://example.com"
                value={clientUrl}
                onChange={(e) => setClientUrl(e.target.value)}
                disabled={isCreating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-color">Brand Color</Label>
              <div className="flex items-center gap-3">
                <input
                  id="project-color"
                  type="color"
                  value={projectColor}
                  onChange={(e) => setProjectColor(e.target.value)}
                  disabled={isCreating}
                  className="h-10 w-20 cursor-pointer rounded border border-input bg-background disabled:cursor-not-allowed disabled:opacity-50"
                />
                <Input
                  type="text"
                  value={projectColor}
                  onChange={(e) => setProjectColor(e.target.value)}
                  placeholder="#3B82F6"
                  disabled={isCreating}
                  className="flex-1"
                  pattern="^#[0-9A-Fa-f]{6}$"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Choose a color to represent this brand in charts and visualizations
              </p>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                setProjectName("");
                setClientUrl("");
                setSelectedWorkspaceId("");
                setProjectColor("#3B82F6");
                setError(null);
              }}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateProject} disabled={isCreating}>
              {isCreating ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

