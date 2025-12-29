"use server";

import { createClient } from "@/lib/supabase/server";
import { getShareOfVoice } from "@/lib/queries/share-of-voice";

/**
 * Check if results are ready for a project
 * Results are ready when:
 * 1. At least one prompt exists
 * 2. At least one mention or citation exists
 */
export async function checkResultsReady(projectId: string): Promise<{
  ready: boolean;
  hasPrompts: boolean;
  hasMentions: boolean;
  hasCitations: boolean;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ready: false, hasPrompts: false, hasMentions: false, hasCitations: false };
  }

  // Check if prompts exist
  const { data: prompts, error: promptsError } = await supabase
    .from("prompt_tracking")
    .select("id")
    .eq("project_id", projectId)
    .limit(1);

  const hasPrompts = !promptsError && prompts && prompts.length > 0;

  // Check if mentions exist (from brand_mentions or daily_brand_stats)
  const { data: mentions, error: mentionsError } = await supabase
    .from("brand_mentions")
    .select("id")
    .eq("project_id", projectId)
    .limit(1);

  const { data: stats, error: statsError } = await supabase
    .from("daily_brand_stats")
    .select("id")
    .eq("project_id", projectId)
    .limit(1);

  const hasMentions = (!mentionsError && mentions && mentions.length > 0) || 
                      (!statsError && stats && stats.length > 0);

  // Check if citations exist
  const { data: citations, error: citationsError } = await supabase
    .from("citations")
    .select("id")
    .eq("project_id", projectId)
    .limit(1);

  const hasCitations = !citationsError && citations && citations.length > 0;

  // Results are ready if we have prompts and at least one mention or citation
  const ready = hasPrompts && (hasMentions || hasCitations);

  return {
    ready,
    hasPrompts,
    hasMentions,
    hasCitations,
  };
}

/**
 * Get brand ranking data for a project
 * Returns brand vs competitor mentions ranking in percentages
 */
export async function getBrandRanking(projectId: string): Promise<{
  error: string | null;
  data: {
    brand: {
      name: string;
      percentage: number;
      mentions: number;
      rank: number;
    };
    competitors: Array<{
      id: string;
      name: string;
      percentage: number;
      mentions: number;
      rank: number;
    }>;
    totalMentions: number;
  } | null;
}> {
  try {
    const sovData = await getShareOfVoice(projectId);

    // Calculate ranks (1-based)
    const allEntities = [
      {
        name: sovData.brand.name,
        percentage: sovData.brand.percentage,
        mentions: sovData.brand.mentions,
        isBrand: true,
      },
      ...sovData.competitors.map((c) => ({
        name: c.name,
        percentage: c.percentage,
        mentions: c.mentions,
        isBrand: false,
        id: c.id,
      })),
    ].sort((a, b) => b.percentage - a.percentage);

    const brandRank = allEntities.findIndex((e) => e.isBrand) + 1;

    const competitors = sovData.competitors.map((comp) => {
      const rank = allEntities.findIndex((e) => !e.isBrand && e.name === comp.name) + 1;
      return {
        id: comp.id,
        name: comp.name,
        percentage: comp.percentage,
        mentions: comp.mentions,
        rank,
      };
    });

    return {
      error: null,
      data: {
        brand: {
          name: sovData.brand.name,
          percentage: sovData.brand.percentage,
          mentions: sovData.brand.mentions,
          rank: brandRank,
        },
        competitors,
        totalMentions: sovData.totalMentions,
      },
    };
  } catch (error: any) {
    return {
      error: error.message || "Failed to get brand ranking",
      data: null,
    };
  }
}

