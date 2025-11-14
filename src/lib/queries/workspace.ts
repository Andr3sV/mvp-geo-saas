"use server";

import { createClient } from "@/lib/supabase/server";

export async function getUserWorkspacesWithProjects() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Get workspaces where user is owner
  const { data: workspaces } = await supabase
    .from("workspaces")
    .select(`
      id,
      name,
      slug
    `)
    .eq("owner_id", user.id);

  if (!workspaces) return [];

  // Get projects for each workspace
  const workspacesWithProjects = await Promise.all(
    workspaces.map(async (workspace) => {
      const { data: projects } = await supabase
        .from("projects")
        .select(`
          id,
          name,
          slug,
          client_url,
          brand_name
        `)
        .eq("workspace_id", workspace.id);

      return {
        ...workspace,
        projects: projects || [],
      };
    })
  );

  return workspacesWithProjects;
}

export async function getProject(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: project } = await supabase
    .from("projects")
    .select(`
      id,
      name,
      slug,
      client_url,
      brand_name,
      workspace_id,
      workspaces (
        id,
        name,
        slug
      )
    `)
    .eq("id", projectId)
    .single();

  return project;
}

