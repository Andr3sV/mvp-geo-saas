"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Changed to string to allow dynamic user-created tags/topics
// Users can now create any category/topic they want
export type PromptCategory = string;

// Helper to get/create topic by name
async function getOrCreateTopic(supabase: any, projectId: string, name: string) {
  if (!name || name === "general") return null;

  // 1. Try to find existing topic
  const { data: existing } = await supabase
    .from("topics")
    .select("id")
    .eq("project_id", projectId)
    .eq("name", name)
    .single();

  if (existing) return existing.id;

  // 2. Create new topic
  // Simple slugify logic
  const slug = name.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-");
  
  const { data: newTopic } = await supabase
    .from("topics")
    .insert({
      project_id: projectId,
      name,
      slug
    })
    .select("id")
    .single();

  return newTopic?.id || null;
}

export async function getProjectPrompts(projectId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("prompt_tracking")
    .select(`
      *,
      topics (
        id,
        name,
        color
      ),
      regions (
        id,
        code,
        name
      )
    `)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message, data: null };
  }

  // Add region code for backward compatibility (prompts-list uses prompt.region)
  const promptsWithRegion = data?.map((prompt: any) => ({
    ...prompt,
    region: prompt.regions?.code || null, // Return null if no region (shouldn't happen if data is valid)
  })) || [];

  return { error: null, data: promptsWithRegion };
}

export async function createPrompt(data: {
  project_id: string;
  prompt: string;
  category?: PromptCategory;
  topic_id?: string;
  region?: string; // Region code (e.g., "US", "ES") - will be converted to region_id
  is_active?: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated", data: null };
  }

  // Convert region code to region_id
  // Region is required - GLOBAL is virtual (not stored)
  if (!data.region || data.region === "GLOBAL" || data.region === "all") {
    return { error: "Region is required. GLOBAL is a virtual option and cannot be used for prompts.", data: null };
  }

  const regionCode = data.region.toUpperCase();
  const { data: region } = await supabase
    .from("regions")
    .select("id")
    .eq("project_id", data.project_id)
    .eq("code", regionCode)
    .eq("is_active", true)
    .single();
  
  if (!region) {
    return { error: `Region "${regionCode}" not found or is inactive. Please create the region first or select an active region.`, data: null };
  }

  const regionId = region.id;

  // topic_id is now provided directly by the user selection
  // category is kept separate as a tag (legacy support)
  const insertData: any = {
    project_id: data.project_id,
    prompt: data.prompt,
    region_id: regionId,
    is_active: data.is_active ?? true,
  };

  // Add topic_id if provided
  if (data.topic_id) {
    insertData.topic_id = data.topic_id;
  }

  // Add category (tag) if provided
  if (data.category) {
    insertData.category = data.category;
  }

  const { data: prompt, error } = await supabase
    .from("prompt_tracking")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    return { error: error.message, data: null };
  }

  // Trigger immediate prompt processing if prompt is active
  if (prompt.is_active !== false) {
    try {
      let backendUrl = process.env.BACKEND_ORCHESTRATOR_URL || process.env.NEXT_PUBLIC_BACKEND_ORCHESTRATOR_URL || 'https://mvp-geo-saas-production.up.railway.app';
      
      // Ensure URL has protocol
      if (backendUrl && !backendUrl.startsWith('http://') && !backendUrl.startsWith('https://')) {
        backendUrl = `https://${backendUrl}`;
      }
      
      console.log('[PROMPT_PROCESSING_TRIGGER] Starting trigger', {
        prompt_tracking_id: prompt.id,
        project_id: data.project_id,
        backend_url: backendUrl,
        timestamp: new Date().toISOString(),
      });
      
      const requestBody = {
        prompt_tracking_id: prompt.id,
        project_id: data.project_id,
        // platforms_to_process is optional - if not provided, process-prompt will use all available platforms
      };

      const response = await fetch(`${backendUrl}/process-prompt`, {
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
        console.error('[PROMPT_PROCESSING_TRIGGER] Failed', {
          status: response.status,
          statusText: response.statusText,
          response: responseData,
          request_body: requestBody,
        });
      } else {
        console.log('[PROMPT_PROCESSING_TRIGGER] Success', {
          prompt_tracking_id: prompt.id,
          response: responseData,
        });
      }
    } catch (error: any) {
      // Log error but don't fail prompt creation
      console.error('[PROMPT_PROCESSING_TRIGGER] Exception', {
        error: error?.message || String(error),
        stack: error?.stack,
        prompt_tracking_id: prompt.id,
        project_id: data.project_id,
      });
    }
  }

  revalidatePath("/dashboard");
  return { error: null, data: prompt };
}

export async function updatePrompt(
  promptId: string,
  data: {
    prompt?: string;
    category?: PromptCategory;
    region?: string; // Region code (e.g., "US", "ES") - will be converted to region_id
    is_active?: boolean;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated", data: null };
  }

  // Need project_id to look up topic and region, fetch current prompt first
  const { data: currentPrompt } = await supabase
    .from("prompt_tracking")
    .select("project_id")
    .eq("id", promptId)
    .single();

  if (!currentPrompt) {
    return { error: "Prompt not found", data: null };
  }

  const updates: any = { ...data };
  
  // Remove region from updates (we'll handle it separately)
  delete updates.region;

  // Convert region code to region_id if provided
  if (data.region !== undefined) {
    if (data.region === "GLOBAL" || data.region === "all") {
      return { error: "Region is required. GLOBAL is a virtual option and cannot be used for prompts.", data: null };
    }

    const regionCode = data.region.toUpperCase();
    const { data: region } = await supabase
      .from("regions")
      .select("id")
      .eq("project_id", currentPrompt.project_id)
      .eq("code", regionCode)
      .eq("is_active", true)
      .single();
    
    if (!region) {
      return { error: `Region "${regionCode}" not found or is inactive. Please create the region first or select an active region.`, data: null };
    }

    updates.region_id = region.id;
  }

  // If category changed, update topic relation - REMOVED to decouple Tags from Topics
  // if (data.category) {
  //   updates.topic_id = await getOrCreateTopic(supabase, currentPrompt.project_id, data.category);
  // }

  const { data: prompt, error } = await supabase
    .from("prompt_tracking")
    .update(updates)
    .eq("id", promptId)
    .select()
    .single();

  if (error) {
    return { error: error.message, data: null };
  }

  revalidatePath("/dashboard");
  return { error: null, data: prompt };
}

export async function deletePrompt(promptId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated", data: null };
  }

  const { error } = await supabase
    .from("prompt_tracking")
    .delete()
    .eq("id", promptId);

  if (error) {
    return { error: error.message, success: false };
  }

  revalidatePath("/dashboard");
  return { error: null, success: true };
}

export async function togglePromptActive(promptId: string, isActive: boolean) {
  return updatePrompt(promptId, { is_active: isActive });
}

/**
 * Batch create prompts from wizard confirmation
 */
export async function batchCreatePrompts(data: {
  project_id: string;
  region_id: string;
  prompts: Array<{
    prompt: string;
  }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated", data: null };
  }

  if (!data.prompts || data.prompts.length === 0) {
    return { error: "No prompts provided", data: null };
  }

  const promptsData = data.prompts.map((p) => ({
    project_id: data.project_id,
    prompt: p.prompt.trim(),
    region_id: data.region_id,
    is_active: true,
  }));

  const { data: createdPrompts, error } = await supabase
    .from("prompt_tracking")
    .insert(promptsData)
    .select();

  if (error) {
    return { error: error.message, data: null };
  }

  // Trigger immediate processing for all prompts (async, don't wait)
  if (createdPrompts && createdPrompts.length > 0) {
    try {
      let backendUrl = process.env.BACKEND_ORCHESTRATOR_URL || process.env.NEXT_PUBLIC_BACKEND_ORCHESTRATOR_URL || 'https://mvp-geo-saas-production.up.railway.app';
      
      if (backendUrl && !backendUrl.startsWith('http://') && !backendUrl.startsWith('https://')) {
        backendUrl = `https://${backendUrl}`;
      }

      // Trigger processing for each prompt (could be optimized to batch, but keeping simple for now)
      createdPrompts.forEach((prompt) => {
        fetch(`${backendUrl}/process-prompt`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt_tracking_id: prompt.id,
            project_id: data.project_id,
          }),
        }).catch((err) => {
          console.error(`[BATCH_CREATE_PROMPTS] Failed to trigger processing for prompt ${prompt.id}`, err);
        });
      });
    } catch (error) {
      // Silently fail - prompts will be processed by daily cron if needed
    }
  }

  revalidatePath("/dashboard/prompts");
  revalidatePath("/dashboard");
  
  return { error: null, data: createdPrompts };
}

