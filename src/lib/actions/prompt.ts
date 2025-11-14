"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type PromptCategory = 
  | "product"
  | "pricing"
  | "features"
  | "competitors"
  | "use_cases"
  | "technical"
  | "general";

export async function getProjectPrompts(projectId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("prompt_tracking")
    .select("*")
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
  is_active?: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated", data: null };
  }

  const { data: prompt, error } = await supabase
    .from("prompt_tracking")
    .insert({
      project_id: data.project_id,
      prompt: data.prompt,
      category: data.category || "general",
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

  const { data: prompt, error } = await supabase
    .from("prompt_tracking")
    .update(data)
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

