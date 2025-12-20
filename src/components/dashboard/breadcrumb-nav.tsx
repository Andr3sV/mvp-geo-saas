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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useProject } from "@/contexts/project-context";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { createProject } from "@/lib/actions/workspace";
import { toast } from "sonner";

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
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [clientUrl, setClientUrl] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      setError("Project name is required");
      return;
    }

    if (!currentWorkspace?.id) {
      setError("No workspace selected");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const result = await createProject({
        name: projectName.trim(),
        workspace_id: currentWorkspace.id,
        client_url: clientUrl.trim() || undefined,
      });

      if (result.data && !result.error) {
        toast.success("Project created successfully");
        
        // Save new project ID to localStorage before reload
        localStorage.setItem("selectedProjectId", result.data.id);
        
        setShowCreateDialog(false);
        setProjectName("");
        setClientUrl("");
        
        // Force full page reload to refresh data
        // router.refresh() doesn't update Client Component props reliably
        window.location.href = window.location.pathname;
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
                onClick={() => setShowCreateDialog(true)}
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

      {/* Create Project Dialog */}
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
              <Label htmlFor="workspace-name">Workspace</Label>
              <Input
                id="workspace-name"
                value={currentWorkspace?.name || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Project will be created in this workspace
              </p>
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
    </div>
  );
}

