"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type Topic = {
  id: string;
  project_id: string;
  name: string;
  slug: string;
  color?: string;
  created_at: string;
  prompt_count?: number;
};

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function getProjectTopics(projectId: string) {
  const supabase = await createClient();

  // Get topics with prompt count
  const { data, error } = await supabase
    .from("topics")
    .select(`
      *,
      prompt_tracking (count)
    `)
    .eq("project_id", projectId)
    .order("name", { ascending: true });

  if (error) {
    return { error: error.message, data: null };
  }

  // Format data to include count number
  const topics = data.map((topic: any) => ({
    ...topic,
    prompt_count: topic.prompt_tracking?.[0]?.count || 0,
  }));

  return { error: null, data: topics };
}

export async function createTopic(data: {
  project_id: string;
  name: string;
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

  const { data: topic, error } = await supabase
    .from("topics")
    .insert({
      project_id: data.project_id,
      name: data.name,
      slug,
      color: data.color,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "A topic with this name already exists", data: null };
    }
    return { error: error.message, data: null };
  }

  revalidatePath("/dashboard/topics");
  revalidatePath("/dashboard/prompts");
  return { error: null, data: topic };
}

export async function updateTopic(
  topicId: string,
  data: {
    name?: string;
    color?: string;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated", data: null };
  }

  const updates: any = { ...data };
  if (data.name) {
    updates.slug = generateSlug(data.name);
  }

  const { data: topic, error } = await supabase
    .from("topics")
    .update(updates)
    .eq("id", topicId)
    .select()
    .single();

  if (error) {
    return { error: error.message, data: null };
  }

  revalidatePath("/dashboard/topics");
  revalidatePath("/dashboard/prompts");
  return { error: null, data: topic };
}

export async function deleteTopic(topicId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated", success: false };
  }

  const { error } = await supabase
    .from("topics")
    .delete()
    .eq("id", topicId);

  if (error) {
    return { error: error.message, success: false };
  }

  revalidatePath("/dashboard/topics");
  revalidatePath("/dashboard/prompts");
  return { error: null, success: true };
}

