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

  // Get current project to check if client_url changed
  const { data: currentProject } = await supabase
    .from("projects")
    .select("client_url")
    .eq("id", projectId)
    .single();

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

  // Trigger brand website analysis if client_url was added or changed
  const urlChanged = data.client_url && data.client_url !== currentProject?.client_url;
  if (urlChanged) {
    try {
      let backendUrl = process.env.BACKEND_ORCHESTRATOR_URL || process.env.NEXT_PUBLIC_BACKEND_ORCHESTRATOR_URL || 'https://mvp-geo-saas-production.up.railway.app';
      
      // Ensure URL has protocol (https://)
      if (backendUrl && !backendUrl.startsWith('http://') && !backendUrl.startsWith('https://')) {
        backendUrl = `https://${backendUrl}`;
      }
      
      console.log(`[INFO] Triggering brand website analysis for project ${projectId} (URL updated): ${data.client_url}`);
      console.log(`[INFO] Backend URL: ${backendUrl}`);
      
      const response = await fetch(`${backendUrl}/analyze-brand-website`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: projectId,
          client_url: data.client_url,
          force_refresh: true, // Force refresh since URL changed
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[ERROR] Brand website analysis failed: ${response.status} ${response.statusText}`, errorText);
      } else {
        const result = await response.json();
        console.log(`[INFO] Brand website analysis triggered successfully for project ${projectId}`, result);
      }
    } catch (error: any) {
      // Log error but don't fail project update
      console.error('[WARN] Failed to trigger brand website analysis:', error?.message || error);
    }
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

