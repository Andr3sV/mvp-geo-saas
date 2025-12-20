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

export async function updateProject(projectId: string, data: {
  name?: string;
  client_url?: string;
  description?: string;
  color?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated", data: null };
  }

  const updateData: any = {};
  
  if (data.name) {
    updateData.name = data.name;
    updateData.slug = generateSlug(data.name);
    updateData.brand_name = data.name;
  }
  
  if (data.client_url !== undefined) {
    updateData.client_url = data.client_url;
  }
  
  if (data.description !== undefined) {
    updateData.description = data.description;
  }
  
  if (data.color !== undefined) {
    updateData.color = data.color;
  }

  const { data: project, error } = await supabase
    .from("projects")
    .update(updateData)
    .eq("id", projectId)
    .select()
    .single();

  if (error) {
    return { error: error.message, data: null };
  }

  revalidatePath("/", "layout");
  return { error: null, data: project };
}

export async function deleteProject(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated", success: false };
  }

  // Delete project (cascades to prompt_tracking, project_members, etc.)
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId);

  if (error) {
    return { error: error.message, success: false };
  }

  revalidatePath("/", "layout");
  return { error: null, success: true };
}

export async function getProjectDetails(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated", data: null };
  }

  const { data: project, error } = await supabase
    .from("projects")
    .select(`
      *,
      workspaces (
        id,
        name,
        slug,
        owner_id
      )
    `)
    .eq("id", projectId)
    .single();

  if (error) {
    return { error: error.message, data: null };
  }

  return { error: null, data: project };
}

export async function getProjectMembers(projectId: string) {
  const supabase = await createClient();

  const { data: members, error } = await supabase
    .from("project_members")
    .select(`
      *,
      users (
        id,
        email,
        name,
        avatar_url
      )
    `)
    .eq("project_id", projectId);

  if (error) {
    return { error: error.message, data: null };
  }

  return { error: null, data: members };
}

export async function updateProjectMemberRole(
  memberId: string,
  role: "admin" | "member" | "viewer"
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated", success: false };
  }

  const { error } = await supabase
    .from("project_members")
    .update({ role })
    .eq("id", memberId);

  if (error) {
    return { error: error.message, success: false };
  }

  revalidatePath("/", "layout");
  return { error: null, success: true };
}

export async function removeProjectMember(memberId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated", success: false };
  }

  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("id", memberId);

  if (error) {
    return { error: error.message, success: false };
  }

  revalidatePath("/", "layout");
  return { error: null, success: true };
}

