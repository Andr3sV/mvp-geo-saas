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

export async function saveOnboardingData(data: {
  user_type: "agency" | "company";
  referral_source: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated", success: false };
  }

  // Update user profile with onboarding data
  const { error } = await supabase
    .from("users")
    .update({
      user_type: data.user_type,
      referral_source: data.referral_source,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message, success: false };
  }

  revalidatePath("/", "layout");
  return { error: null, success: true };
}

export async function savePrompts(data: {
  project_id: string;
  prompts: Array<{
    prompt: string;
    region?: string;
    category?: string;
  }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated", success: false, data: null };
  }

  // Insert prompts with region and category
  const promptsData = data.prompts.map((prompt) => ({
    project_id: data.project_id,
    prompt: prompt.prompt,
    region: prompt.region || "GLOBAL",
    category: prompt.category || "general",
    is_active: true,
  }));

  const { data: createdPrompts, error } = await supabase
    .from("prompt_tracking")
    .insert(promptsData)
    .select();

  if (error) {
    return { error: error.message, success: false, data: null };
  }

  revalidatePath("/", "layout");
  return { error: null, success: true, data: createdPrompts };
}

