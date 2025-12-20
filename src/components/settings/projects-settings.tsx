"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getUserWorkspacesWithProjects } from "@/lib/queries/workspace";
import { createProject } from "@/lib/actions/workspace";
import { updateProject as updateProjectDetails, deleteProject } from "@/lib/actions/project";
import { useRouter } from "next/navigation";

export function ProjectsSettings() {
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const router = useRouter();

  // Form states
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectUrl, setNewProjectUrl] = useState("");
  const [newProjectColor, setNewProjectColor] = useState("#3B82F6");
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectUrl, setEditProjectUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await getUserWorkspacesWithProjects();
    setWorkspaces(data);
    setLoading(false);
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      setError("Project name is required");
      return;
    }

    const workspace = workspaces[0]; // Use first workspace
    if (!workspace) {
      setError("No workspace found");
      return;
    }

    setActionLoading(true);
    setError(null);

    const result = await createProject({
      name: newProjectName,
      workspace_id: workspace.id,
      client_url: newProjectUrl || undefined,
      color: newProjectColor,
    });

    setActionLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setIsCreateOpen(false);
    setNewProjectName("");
    setNewProjectUrl("");
    setNewProjectColor("#3B82F6");
    loadData();
    router.refresh();
  };

  const handleEditProject = async () => {
    if (!selectedProject || !editProjectName.trim()) {
      setError("Project name is required");
      return;
    }

    setActionLoading(true);
    setError(null);

    const result = await updateProjectDetails(selectedProject.id, {
      name: editProjectName,
      client_url: editProjectUrl || undefined,
    });

    setActionLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setIsEditOpen(false);
    setSelectedProject(null);
    loadData();
    router.refresh();
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;

    setActionLoading(true);
    setError(null);

    const result = await deleteProject(selectedProject.id);

    setActionLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setIsDeleteOpen(false);
    setSelectedProject(null);
    loadData();
    router.refresh();
  };

  const openEditDialog = (project: any) => {
    setSelectedProject(project);
    setEditProjectName(project.name);
    setEditProjectUrl(project.client_url || "");
    setError(null);
    setIsEditOpen(true);
  };

  const openDeleteDialog = (project: any) => {
    setSelectedProject(project);
    setError(null);
    setIsDeleteOpen(true);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  const allProjects = workspaces.flatMap((w) => w.projects || []);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Projects</CardTitle>
              <CardDescription>
                Manage your projects and their settings
              </CardDescription>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Project
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                  <DialogDescription>
                    Add a new project to track in AI responses
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {error && (
                    <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="project-name">Project Name</Label>
                    <Input
                      id="project-name"
                      placeholder="e.g., Client Name, Brand"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      disabled={actionLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-url">Website URL (Optional)</Label>
                    <Input
                      id="project-url"
                      type="url"
                      placeholder="https://example.com"
                      value={newProjectUrl}
                      onChange={(e) => setNewProjectUrl(e.target.value)}
                      disabled={actionLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-color">Brand Color</Label>
                    <div className="flex items-center gap-3">
                      <input
                        id="project-color"
                        type="color"
                        value={newProjectColor}
                        onChange={(e) => setNewProjectColor(e.target.value)}
                        disabled={actionLoading}
                        className="h-10 w-20 cursor-pointer rounded border border-input bg-background disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <Input
                        type="text"
                        value={newProjectColor}
                        onChange={(e) => setNewProjectColor(e.target.value)}
                        placeholder="#3B82F6"
                        disabled={actionLoading}
                        className="flex-1"
                        pattern="^#[0-9A-Fa-f]{6}$"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Choose a color to represent this brand in charts and visualizations
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateOpen(false)}
                    disabled={actionLoading}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateProject} disabled={actionLoading}>
                    {actionLoading ? "Creating..." : "Create Project"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {allProjects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No projects yet. Create your first project to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {allProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{project.name}</h3>
                      <Badge variant="secondary">{project.slug}</Badge>
                    </div>
                    {project.client_url && (
                      <a
                        href={project.client_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {project.client_url}
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(project)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteDialog(project)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>Update project details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit-project-name">Project Name</Label>
              <Input
                id="edit-project-name"
                value={editProjectName}
                onChange={(e) => setEditProjectName(e.target.value)}
                disabled={actionLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-project-url">Website URL</Label>
              <Input
                id="edit-project-url"
                type="url"
                value={editProjectUrl}
                onChange={(e) => setEditProjectUrl(e.target.value)}
                disabled={actionLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleEditProject} disabled={actionLoading}>
              {actionLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedProject?.name}"? This action
              cannot be undone and will delete all associated data.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProject}
              disabled={actionLoading}
            >
              {actionLoading ? "Deleting..." : "Delete Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

