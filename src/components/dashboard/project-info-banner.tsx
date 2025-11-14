"use client";

import { useEffect, useState } from "react";
import { useProject } from "@/contexts/project-context";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

interface Project {
  id: string;
  name: string;
  client_url?: string;
}

interface ProjectInfoBannerProps {
  workspaces: any[];
}

export function ProjectInfoBanner({ workspaces }: ProjectInfoBannerProps) {
  const { selectedProjectId } = useProject();
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  useEffect(() => {
    if (selectedProjectId && workspaces.length > 0) {
      const project = workspaces
        .flatMap((w) => w.projects || [])
        .find((p) => p.id === selectedProjectId);
      
      setCurrentProject(project || null);
    }
  }, [selectedProjectId, workspaces]);

  if (!currentProject) return null;

  return (
    <div className="mb-4 rounded-lg border bg-muted/50 p-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Badge variant="outline">Current Project</Badge>
        <span className="font-medium">{currentProject.name}</span>
        {currentProject.client_url && (
          <a
            href={currentProject.client_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
          >
            <ExternalLink className="h-3 w-3" />
            {currentProject.client_url}
          </a>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Viewing data for this project only
      </p>
    </div>
  );
}

