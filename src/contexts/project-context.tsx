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
  
  // Initialize from localStorage first, then URL, then default
  const getInitialProjectId = (): string | null => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("selectedProjectId");
      if (stored) return stored;
    }
    return defaultProjectId || null;
  };

  const [selectedProjectId, setSelectedProjectIdState] = useState<string | null>(
    getInitialProjectId
  );

  // Initialize from URL params or localStorage or default
  useEffect(() => {
    const projectFromUrl = searchParams.get("project");
    
    if (projectFromUrl) {
      // URL param takes precedence
      setSelectedProjectIdState(projectFromUrl);
      if (typeof window !== "undefined") {
        localStorage.setItem("selectedProjectId", projectFromUrl);
      }
    } else {
      // Try localStorage, then default
      const stored = typeof window !== "undefined" 
        ? localStorage.getItem("selectedProjectId")
        : null;
      
      const projectToUse = stored || defaultProjectId;
      
      if (projectToUse) {
        setSelectedProjectIdState(projectToUse);
        // Set URL param
        const params = new URLSearchParams(searchParams.toString());
        params.set("project", projectToUse);
        router.replace(`?${params.toString()}`, { scroll: false });
      }
    }
  }, []);

  const setSelectedProjectId = (projectId: string) => {
    setSelectedProjectIdState(projectId);
    
    // Update URL without scrolling
    const params = new URLSearchParams(searchParams.toString());
    params.set("project", projectId);
    router.replace(`?${params.toString()}`, { scroll: false });
    
    // Store in localStorage for persistence
    if (typeof window !== "undefined") {
      localStorage.setItem("selectedProjectId", projectId);
    }
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

