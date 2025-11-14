"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createWorkspace(data: { name: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated", data: null };
  }

  const slug = generateSlug(data.name);

  // Check if slug already exists
  const { data: existing } = await supabase
    .from("workspaces")
    .select("id")
    .eq("slug", slug)
    .single();

  if (existing) {
    return { error: "A workspace with this name already exists", data: null };
  }

  // Create workspace
  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .insert({
      name: data.name,
      slug,
      owner_id: user.id,
    })
    .select()
    .single();

  if (workspaceError) {
    return { error: workspaceError.message, data: null };
  }

  // Add user as owner to workspace_members
  const { error: memberError } = await supabase.from("workspace_members").insert({
    workspace_id: workspace.id,
    user_id: user.id,
    role: "owner",
  });

  if (memberError) {
    return { error: memberError.message, data: null };
  }

  revalidatePath("/", "layout");
  return { error: null, data: workspace };
}

export async function createProject(data: {
  name: string;
  workspace_id: string;
  client_url?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated", data: null };
  }

  const slug = generateSlug(data.name);

  // Create project
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      name: data.name,
      slug,
      workspace_id: data.workspace_id,
      client_url: data.client_url,
      brand_name: data.name,
    })
    .select()
    .single();

  if (projectError) {
    return { error: projectError.message, data: null };
  }

  // Add user as admin to project_members
  const { error: memberError } = await supabase.from("project_members").insert({
    project_id: project.id,
    user_id: user.id,
    role: "admin",
  });

  if (memberError) {
    return { error: memberError.message, data: null };
  }

  revalidatePath("/", "layout");
  return { error: null, data: project };
}

export async function savePrompts(data: {
  project_id: string;
  prompts: string[];
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated", success: false };
  }

  // Insert prompts
  const promptsData = data.prompts.map((prompt) => ({
    project_id: data.project_id,
    prompt,
    is_active: true,
  }));

  const { error } = await supabase.from("prompt_tracking").insert(promptsData);

  if (error) {
    return { error: error.message, success: false };
  }

  revalidatePath("/", "layout");
  return { error: null, success: true };
}

