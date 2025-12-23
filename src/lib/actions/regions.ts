"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getCountryByCode } from "@/lib/countries";

export type Region = {
  id: string;
  project_id: string;
  code: string;
  name: string;
  is_active: boolean;
  created_at: string;
  prompt_count?: number; // Count of prompts using this region
};

export async function getProjectRegions(projectId: string) {
  const supabase = await createClient();

  // Get regions with prompt count
  const { data, error } = await supabase
    .from("regions")
    .select(`
      *,
      prompt_tracking (count)
    `)
    .eq("project_id", projectId)
    .order("code", { ascending: true });

  if (error) {
    return { error: error.message, data: null };
  }

  // Format data to include count number
  const regions = data.map((region: any) => ({
    ...region,
    prompt_count: region.prompt_tracking?.[0]?.count || 0,
  }));

  return { error: null, data: regions };
}

export async function createRegion(data: {
  project_id: string;
  code: string;
  name?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated", data: null };
  }

  // Validate code (must be uppercase, 2-6 characters, not GLOBAL)
  const code = data.code.toUpperCase().trim();
  if (code === "GLOBAL") {
    return { error: "GLOBAL is a virtual option and cannot be created", data: null };
  }
  if (code.length < 2 || code.length > 6) {
    return { error: "Region code must be 2-6 characters", data: null };
  }

  // Get country name from code if not provided
  const country = getCountryByCode(code);
  const name = data.name || country?.name || code;

  const { data: region, error } = await supabase
    .from("regions")
    .insert({
      project_id: data.project_id,
      code,
      name,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "A region with this code already exists", data: null };
    }
    return { error: error.message, data: null };
  }

  revalidatePath("/dashboard/regions");
  revalidatePath("/dashboard/prompts");
  return { error: null, data: region };
}

export async function updateRegion(
  regionId: string,
  data: {
    name?: string;
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

  const { data: updatedRegion, error } = await supabase
    .from("regions")
    .update(data)
    .eq("id", regionId)
    .select()
    .single();

  if (error) {
    return { error: error.message, data: null };
  }

  revalidatePath("/dashboard/regions");
  revalidatePath("/dashboard/prompts");
  return { error: null, data: updatedRegion };
}

export async function deleteRegion(regionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated", success: false };
  }

  // Check if region is in use
  const { count } = await supabase
    .from("prompt_tracking")
    .select("*", { count: "exact", head: true })
    .eq("region_id", regionId);

  if (count && count > 0) {
    return { 
      error: `Cannot delete region: it is used by ${count} prompt(s). Please update or delete those prompts first.`, 
      success: false 
    };
  }

  const { error } = await supabase
    .from("regions")
    .delete()
    .eq("id", regionId);

  if (error) {
    return { error: error.message, success: false };
  }

  revalidatePath("/dashboard/regions");
  revalidatePath("/dashboard/prompts");
  return { error: null, success: true };
}

export async function getRegionIdByCode(projectId: string, code: string): Promise<string | null> {
  const supabase = await createClient();

  // Handle GLOBAL - return null (means no filter)
  if (code === "GLOBAL" || code === "all") {
    return null;
  }

  const { data, error } = await supabase
    .from("regions")
    .select("id")
    .eq("project_id", projectId)
    .eq("code", code.toUpperCase())
    .eq("is_active", true)
    .single();

  if (error || !data) {
    return null;
  }

  return data.id;
}

