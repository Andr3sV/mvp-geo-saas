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
      )
    `)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message, data: null };
  }

  return { error: null, data };
}

export async function createPrompt(data: {
  project_id: string;
  prompt: string;
  category?: PromptCategory;
  region?: string;
  is_active?: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated", data: null };
  }

  // Handle topic mapping
  const categoryName = data.category || "general";
  const topicId = await getOrCreateTopic(supabase, data.project_id, categoryName);

  const { data: prompt, error } = await supabase
    .from("prompt_tracking")
    .insert({
      project_id: data.project_id,
      prompt: data.prompt,
      category: categoryName, // Keep for legacy/tags
      topic_id: topicId,      // New strict relation
      region: data.region || "GLOBAL",
      is_active: data.is_active ?? true,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message, data: null };
  }

  revalidatePath("/dashboard");
  return { error: null, data: prompt };
}

export async function updatePrompt(
  promptId: string,
  data: {
    prompt?: string;
    category?: PromptCategory;
    region?: string;
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

  // Need project_id to look up topic, fetch current prompt first
  const { data: currentPrompt } = await supabase
    .from("prompt_tracking")
    .select("project_id")
    .eq("id", promptId)
    .single();

  if (!currentPrompt) {
    return { error: "Prompt not found", data: null };
  }

  const updates: any = { ...data };

  // If category changed, update topic relation
  if (data.category) {
    updates.topic_id = await getOrCreateTopic(supabase, currentPrompt.project_id, data.category);
  }

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

