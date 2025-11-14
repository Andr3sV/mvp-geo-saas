"use server";

import { createClient } from "@/lib/supabase/server";

export type WorkspaceRole = "owner" | "admin" | "member";
export type ProjectRole = "admin" | "member" | "viewer";

/**
 * Check if user is workspace owner
 */
export async function isWorkspaceOwner(workspaceId: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", workspaceId)
    .single();

  return workspace?.owner_id === user.id;
}

/**
 * Check if user has specific role in workspace
 */
export async function hasWorkspaceRole(
  workspaceId: string,
  requiredRoles: WorkspaceRole[]
): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  // Check if owner
  if (requiredRoles.includes("owner")) {
    const isOwner = await isWorkspaceOwner(workspaceId);
    if (isOwner) return true;
  }

  // Check workspace_members
  const { data: member } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .single();

  if (!member) return false;

  return requiredRoles.includes(member.role as WorkspaceRole);
}

/**
 * Check if user has specific role in project
 */
export async function hasProjectRole(
  projectId: string,
  requiredRoles: ProjectRole[]
): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  // Check if workspace owner
  const { data: project } = await supabase
    .from("projects")
    .select("workspace_id")
    .eq("id", projectId)
    .single();

  if (project) {
    const isOwner = await isWorkspaceOwner(project.workspace_id);
    if (isOwner) return true;
  }

  // Check project_members
  const { data: member } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!member) return false;

  return requiredRoles.includes(member.role as ProjectRole);
}

/**
 * Check if user can manage (edit/delete) a project
 */
export async function canManageProject(projectId: string): Promise<boolean> {
  return await hasProjectRole(projectId, ["admin"]);
}

/**
 * Check if user can view a project
 */
export async function canViewProject(projectId: string): Promise<boolean> {
  return await hasProjectRole(projectId, ["admin", "member", "viewer"]);
}

/**
 * Check if user can invite to workspace
 */
export async function canInviteToWorkspace(workspaceId: string): Promise<boolean> {
  return await hasWorkspaceRole(workspaceId, ["owner", "admin"]);
}

/**
 * Check if user can invite to project
 */
export async function canInviteToProject(projectId: string): Promise<boolean> {
  return await hasProjectRole(projectId, ["admin"]);
}

/**
 * Get user's role in workspace
 */
export async function getUserWorkspaceRole(workspaceId: string): Promise<WorkspaceRole | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Check if owner
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", workspaceId)
    .single();

  if (workspace?.owner_id === user.id) return "owner";

  // Check member role
  const { data: member } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .single();

  return member?.role as WorkspaceRole | null;
}

/**
 * Get user's role in project
 */
export async function getUserProjectRole(projectId: string): Promise<ProjectRole | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Check if workspace owner (has full access)
  const { data: project } = await supabase
    .from("projects")
    .select("workspace_id")
    .eq("id", projectId)
    .single();

  if (project) {
    const isOwner = await isWorkspaceOwner(project.workspace_id);
    if (isOwner) return "admin";
  }

  // Check project member role
  const { data: member } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  return member?.role as ProjectRole | null;
}

