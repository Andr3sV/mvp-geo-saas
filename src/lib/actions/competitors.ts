"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface Competitor {
  id: string;
  project_id: string;
  name: string;
  domain: string;
  region: string;
  favicon?: string;
  color?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function getProjectCompetitors(projectId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("competitors")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message, data: null };
  }

  return { error: null, data };
}

/**
 * Get competitors filtered by region for Share of Voice selector
 * Returns competitors with region matching the filter OR GLOBAL
 */
export async function getCompetitorsByRegion(projectId: string, region: string = "GLOBAL") {
  const supabase = await createClient();
  
  console.log('🔍 [getCompetitorsByRegion] Called with:', { projectId, region });

  // Get ALL active competitors first (filter in JavaScript is more reliable)
  const { data: allCompetitors, error } = await supabase
    .from("competitors")
    .select("id, name, domain, region, color")
    .eq("project_id", projectId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  console.log('🔍 [getCompetitorsByRegion] All competitors fetched:', {
    count: allCompetitors?.length,
    error: error?.message,
    allCompetitors: allCompetitors?.map((c: any) => ({ name: c.name, region: c.region }))
  });

  if (error) {
    console.error('❌ [getCompetitorsByRegion] Error:', error);
    return { error: error.message, data: null };
  }

  // Filter by region in JavaScript (more reliable than SQL .or())
  // If region is ES, show ONLY competitors with region = ES (not GLOBAL)
  // If region is GLOBAL, show ALL competitors
  let filteredCompetitors = allCompetitors || [];

  if (region && region !== "GLOBAL") {
    // Filter: ONLY competitors with the selected region (NOT GLOBAL)
    filteredCompetitors = allCompetitors?.filter(
      (c: any) => c.region === region
    ) || [];
    console.log('🔍 [getCompetitorsByRegion] After filtering by region:', {
      region,
      count: filteredCompetitors.length,
      filteredCompetitors: filteredCompetitors.map((c: any) => ({ name: c.name, region: c.region }))
    });
  } else {
    console.log('🔍 [getCompetitorsByRegion] No region filter (GLOBAL), returning all');
  }

  return { error: null, data: filteredCompetitors };
}

export async function createCompetitor(data: {
  project_id: string;
  name: string;
  domain: string;
  region: string;
  favicon?: string;
  color?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated", data: null };
  }

  const { data: competitor, error } = await supabase
    .from("competitors")
    .insert({
      project_id: data.project_id,
      name: data.name,
      domain: data.domain,
      region: data.region || "GLOBAL",
      favicon: data.favicon,
      color: data.color || "#3B82F6",
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    // Check if it's a unique constraint violation
    if (error.code === "23505") {
      return { error: "This competitor already exists for this project", data: null };
    }
    return { error: error.message, data: null };
  }

  revalidatePath("/dashboard/competitors");
  return { error: null, data: competitor };
}

export async function updateCompetitor(
  competitorId: string,
  data: {
    name?: string;
    domain?: string;
    region?: string;
    favicon?: string;
    color?: string;
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

  const { data: competitor, error } = await supabase
    .from("competitors")
    .update(data)
    .eq("id", competitorId)
    .select()
    .single();

  if (error) {
    return { error: error.message, data: null };
  }

  revalidatePath("/dashboard/competitors");
  return { error: null, data: competitor };
}

export async function deleteCompetitor(competitorId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated", success: false };
  }

  const { error } = await supabase
    .from("competitors")
    .delete()
    .eq("id", competitorId);

  if (error) {
    return { error: error.message, success: false };
  }

  revalidatePath("/dashboard/competitors");
  return { error: null, success: true };
}

export async function toggleCompetitorActive(competitorId: string, isActive: boolean) {
  return updateCompetitor(competitorId, { is_active: isActive });
}

/**
 * Batch create competitors for a project
 */
export async function batchCreateCompetitors(data: {
  project_id: string;
  region_id: string; // Para asignar región a los competidores
  competitors: Array<{
    name: string;
    domain: string;
  }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated", data: null };
  }

  if (!data.competitors || data.competitors.length === 0) {
    return { error: "No competitors provided", data: null };
  }

  // Get region code from region_id
  const { data: region, error: regionError } = await supabase
    .from("regions")
    .select("code")
    .eq("id", data.region_id)
    .single();

  if (regionError || !region) {
    return { error: "Region not found", data: null };
  }

  const regionCode = region.code;

  // Create competitors one by one (using createCompetitor to handle duplicates)
  const createdCompetitors = [];
  const errors = [];

  for (const competitor of data.competitors) {
    const result = await createCompetitor({
      project_id: data.project_id,
      name: competitor.name.trim(),
      domain: competitor.domain.trim(),
      region: regionCode,
    });

    if (result.error) {
      errors.push({ competitor: competitor.name, error: result.error });
    } else if (result.data) {
      createdCompetitors.push(result.data);
    }
  }

  if (errors.length > 0 && createdCompetitors.length === 0) {
    return { error: errors[0].error, data: null };
  }

  return { error: null, data: createdCompetitors };
}

