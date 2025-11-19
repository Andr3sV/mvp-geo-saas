"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Get all unique tags (categories) used in a project's prompts
 * This allows users to see and reuse existing tags
 */
export async function getProjectTags(projectId: string) {
  const supabase = await createClient();

  // Get ALL prompts (including those with null category)
  const { data, error } = await supabase
    .from("prompt_tracking")
    .select("category")
    .eq("project_id", projectId)
    .order("category", { ascending: true });

  if (error) {
    console.error("Error fetching project tags:", error);
    return { data: [], error: error.message };
  }

  // Get unique tags, treating null/empty as "general"
  const tags = data.map((item) => {
    const cat = item.category;
    if (!cat || cat.trim() === "") return "general";
    return cat.trim();
  });

  const uniqueTags = [...new Set(tags)].sort();

  return { data: uniqueTags, error: null };
}

