"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Get all unique tags (categories) used in a project's prompts
 * This allows users to see and reuse existing tags
 */
export async function getProjectTags(projectId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("prompt_tracking")
    .select("category")
    .eq("project_id", projectId)
    .not("category", "is", null)
    .order("category", { ascending: true });

  if (error) {
    console.error("Error fetching project tags:", error);
    return { data: [], error: error.message };
  }

  // Get unique tags
  const uniqueTags = [...new Set(data.map((item) => item.category))].filter(
    (tag): tag is string => tag !== null && tag !== undefined && tag.trim() !== ""
  );

  return { data: uniqueTags, error: null };
}

