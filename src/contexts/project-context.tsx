"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface ProjectContextType {
  selectedProjectId: string | null;
  setSelectedProjectId: (projectId: string) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({
  children,
  defaultProjectId,
}: {
  children: React.ReactNode;
  defaultProjectId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedProjectId, setSelectedProjectIdState] = useState<string | null>(
    defaultProjectId || null
  );

  // Initialize from URL params or default
  useEffect(() => {
    const projectFromUrl = searchParams.get("project");
    if (projectFromUrl) {
      setSelectedProjectIdState(projectFromUrl);
    } else if (defaultProjectId) {
      setSelectedProjectIdState(defaultProjectId);
      // Set URL param
      const params = new URLSearchParams(searchParams.toString());
      params.set("project", defaultProjectId);
      router.replace(`?${params.toString()}`);
    }
  }, []);

  const setSelectedProjectId = (projectId: string) => {
    setSelectedProjectIdState(projectId);
    
    // Update URL
    const params = new URLSearchParams(searchParams.toString());
    params.set("project", projectId);
    router.replace(`?${params.toString()}`);
    
    // Store in localStorage for persistence
    localStorage.setItem("selectedProjectId", projectId);
  };

  return (
    <ProjectContext.Provider value={{ selectedProjectId, setSelectedProjectId }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
}

