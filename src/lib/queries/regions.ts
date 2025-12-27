"use server";

import { createClient } from "@/lib/supabase/server";
import { getCountryByCode } from "@/lib/countries";

export interface RegionForSelect {
  code: string;
  name: string;
  flag: string;
}

/**
 * Get project regions formatted for CountrySelect component
 * Does NOT include GLOBAL - the CountrySelect component handles "All countries" option
 */
export async function getProjectRegionsForSelect(projectId: string): Promise<RegionForSelect[]> {
  const supabase = await createClient();

  const { data: regions, error } = await supabase
    .from("regions")
    .select("code, name")
    .eq("project_id", projectId)
    .eq("is_active", true)
    .order("code", { ascending: true });

  if (error) {
    console.error("Error fetching regions:", error);
    return [];
  }

  // Convert regions to CountrySelect format
  const regionsForSelect: RegionForSelect[] = regions.map((region) => {
    const country = getCountryByCode(region.code);
    return {
      code: region.code,
      name: region.name,
      flag: country?.flag || "🏳️",
    };
  });

  return regionsForSelect;
}

