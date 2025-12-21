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
  color?: string;
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
      color: data.color || '#3B82F6',
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

  // Trigger brand website analysis if client_url is provided
  if (data.client_url) {
    try {
      let backendUrl = process.env.BACKEND_ORCHESTRATOR_URL || process.env.NEXT_PUBLIC_BACKEND_ORCHESTRATOR_URL || 'https://mvp-geo-saas-production.up.railway.app';
      
      // Ensure URL has protocol (https://)
      if (backendUrl && !backendUrl.startsWith('http://') && !backendUrl.startsWith('https://')) {
        backendUrl = `https://${backendUrl}`;
      }
      
      // Log to both console and potentially to a monitoring service
      console.log('[BRAND_ANALYSIS_TRIGGER] Starting trigger', {
        project_id: project.id,
        client_url: data.client_url,
        backend_url: backendUrl,
        timestamp: new Date().toISOString(),
      });
      
      const requestBody = {
        project_id: project.id,
        client_url: data.client_url,
        force_refresh: false,
      };

      const response = await fetch(`${backendUrl}/analyze-brand-website`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { raw: responseText };
      }

      if (!response.ok) {
        console.error('[BRAND_ANALYSIS_TRIGGER] Failed', {
          status: response.status,
          statusText: response.statusText,
          response: responseData,
          request_body: requestBody,
        });
      } else {
        console.log('[BRAND_ANALYSIS_TRIGGER] Success', {
          project_id: project.id,
          response: responseData,
        });
      }
    } catch (error: any) {
      // Log error but don't fail project creation
      console.error('[BRAND_ANALYSIS_TRIGGER] Exception', {
        error: error?.message || String(error),
        stack: error?.stack,
        project_id: project.id,
        client_url: data.client_url,
      });
    }
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

  // Process categories -> topics first
  const categories = new Set(
    data.prompts
      .map((p) => p.category)
      .filter((c): c is string => !!c && c !== "general")
  );

  const topicMap = new Map<string, string>(); // name -> id

  // Ensure all categories exist as topics
  for (const category of categories) {
    // Check if exists
    const { data: existing } = await supabase
      .from("topics")
      .select("id")
      .eq("project_id", data.project_id)
      .eq("name", category)
      .single();

    if (existing) {
      topicMap.set(category, existing.id);
    } else {
      // Create new topic
      const { data: newTopic } = await supabase
        .from("topics")
        .insert({
          project_id: data.project_id,
          name: category,
          slug: generateSlug(category),
        })
        .select("id")
        .single();
      
      if (newTopic) {
        topicMap.set(category, newTopic.id);
      }
    }
  }

  // Insert prompts with region and mapped topic_id
  const promptsData = data.prompts.map((prompt) => ({
    project_id: data.project_id,
    prompt: prompt.prompt,
    region: prompt.region || "GLOBAL",
    category: prompt.category || "general", // Keep text category for now
    topic_id: prompt.category ? topicMap.get(prompt.category) : null,
    is_active: true,
  }));

  const { data: createdPrompts, error } = await supabase
    .from("prompt_tracking")
    .insert(promptsData)
    .select();

  if (error) {
    return { error: error.message, success: false, data: null };
  }

  // Revalidate all relevant paths
  revalidatePath("/", "layout");
  revalidatePath("/dashboard/prompts");
  revalidatePath("/dashboard");
  
  return { error: null, success: true, data: createdPrompts };
}

