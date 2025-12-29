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
 * Check if all prompts have been processed (2 ai_responses per prompt: openai + gemini)
 */
export async function checkPromptsProcessed(projectId: string): Promise<{
  allProcessed: boolean;
  totalPrompts: number;
  processedPrompts: number;
  missingResponses: Array<{ promptId: string; missingPlatforms: string[] }>;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log("[checkPromptsProcessed] No user found");
      return { allProcessed: false, totalPrompts: 0, processedPrompts: 0, missingResponses: [], error: "Not authenticated" };
    }

    // 1. Get all prompts for this project
    const { data: prompts, error: promptsError } = await supabase
      .from("prompt_tracking")
      .select("id")
      .eq("project_id", projectId)
      .eq("is_active", true);

    if (promptsError) {
      console.error("[checkPromptsProcessed] Error fetching prompts:", promptsError);
      return { allProcessed: false, totalPrompts: 0, processedPrompts: 0, missingResponses: [], error: promptsError.message };
    }

    if (!prompts || prompts.length === 0) {
      console.log("[checkPromptsProcessed] No prompts found for project:", projectId);
      return { allProcessed: false, totalPrompts: 0, processedPrompts: 0, missingResponses: [], error: "No prompts found" };
    }

    console.log(`[checkPromptsProcessed] Found ${prompts.length} prompts for project ${projectId}`);

    const promptIds = prompts.map(p => p.id);
    const platforms = ['openai', 'gemini'];

    // 2. Get all ai_responses for these prompts
    const { data: aiResponses, error: responsesError } = await supabase
      .from("ai_responses")
      .select("id, prompt_tracking_id, platform")
      .in("prompt_tracking_id", promptIds)
      .in("platform", platforms);

    if (responsesError) {
      console.error("[checkPromptsProcessed] Error fetching ai_responses:", responsesError);
      return { allProcessed: false, totalPrompts: prompts.length, processedPrompts: 0, missingResponses: [], error: responsesError.message };
    }

    console.log(`[checkPromptsProcessed] Found ${aiResponses?.length || 0} ai_responses for ${promptIds.length} prompts`);

    // 3. Group responses by prompt_tracking_id
    const responsesByPrompt = new Map<string, Set<string>>();
    promptIds.forEach(promptId => {
      responsesByPrompt.set(promptId, new Set());
    });

    aiResponses?.forEach(response => {
      const promptId = response.prompt_tracking_id;
      if (responsesByPrompt.has(promptId)) {
        responsesByPrompt.get(promptId)!.add(response.platform);
      }
    });

    // 4. Check which prompts are fully processed
    const missingResponses: Array<{ promptId: string; missingPlatforms: string[] }> = [];
    let processedCount = 0;

    responsesByPrompt.forEach((platformsSet, promptId) => {
      const missing = platforms.filter(p => !platformsSet.has(p));
      if (missing.length === 0) {
        processedCount++;
      } else {
        missingResponses.push({ promptId, missingPlatforms: missing });
        console.log(`[checkPromptsProcessed] Prompt ${promptId} missing platforms: ${missing.join(", ")}`);
      }
    });

    const allProcessed = processedCount === prompts.length;

    console.log(`[checkPromptsProcessed] Status: ${processedCount}/${prompts.length} prompts processed, allProcessed: ${allProcessed}`);

    return {
      allProcessed,
      totalPrompts: prompts.length,
      processedPrompts: processedCount,
      missingResponses,
    };
  } catch (error: any) {
    console.error("[checkPromptsProcessed] Unexpected error:", error);
    return { allProcessed: false, totalPrompts: 0, processedPrompts: 0, missingResponses: [], error: error.message || "Unexpected error" };
  }
}

/**
 * Get brand ranking data directly from brand_mentions table
 * Returns brand vs competitor mentions ranking in percentages
 */
export async function getBrandRankingFromDirectQueries(projectId: string): Promise<{
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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { error: "Not authenticated", data: null };
    }

    // Get project info
    const { data: project } = await supabase
      .from("projects")
      .select("id, name, client_url, color")
      .eq("id", projectId)
      .single();

    if (!project) {
      return { error: "Project not found", data: null };
    }

    // Get all ai_response_ids for this project (from prompts)
    const { data: prompts } = await supabase
      .from("prompt_tracking")
      .select("id")
      .eq("project_id", projectId)
      .eq("is_active", true);

    if (!prompts || prompts.length === 0) {
      return { error: "No prompts found", data: null };
    }

    const promptIds = prompts.map(p => p.id);
    
    const { data: aiResponses } = await supabase
      .from("ai_responses")
      .select("id")
      .in("prompt_tracking_id", promptIds)
      .in("platform", ['openai', 'gemini']);

    if (!aiResponses || aiResponses.length === 0) {
      return { error: "No AI responses found", data: null };
    }

    const aiResponseIds = aiResponses.map(r => r.id);

    // Get brand mentions (brand_type = 'client')
    const { data: brandMentions } = await supabase
      .from("brand_mentions")
      .select("id, ai_response_id")
      .eq("project_id", projectId)
      .eq("brand_type", "client")
      .in("ai_response_id", aiResponseIds);

    const brandMentionsCount = brandMentions?.length || 0;

    // Get competitor mentions (brand_type = 'competitor')
    const { data: competitorMentions } = await supabase
      .from("brand_mentions")
      .select("id, competitor_id, ai_response_id")
      .eq("project_id", projectId)
      .eq("brand_type", "competitor")
      .in("ai_response_id", aiResponseIds);

    // Get all active competitors
    const { data: allCompetitors } = await supabase
      .from("competitors")
      .select("id, name, domain, color")
      .eq("project_id", projectId)
      .eq("is_active", true);

    // Aggregate competitor mentions
    const competitorMentionsMap = new Map<string, number>();
    allCompetitors?.forEach(comp => {
      competitorMentionsMap.set(comp.id, 0);
    });

    competitorMentions?.forEach(mention => {
      if (mention.competitor_id) {
        const current = competitorMentionsMap.get(mention.competitor_id) || 0;
        competitorMentionsMap.set(mention.competitor_id, current + 1);
      }
    });

    // Calculate totals
    const competitorMentionsTotal = Array.from(competitorMentionsMap.values())
      .reduce((sum, count) => sum + count, 0);
    const totalMentions = brandMentionsCount + competitorMentionsTotal;

    // Calculate percentages and build competitor array
    const competitors = Array.from(competitorMentionsMap.entries())
      .map(([competitorId, mentions]) => {
        const competitor = allCompetitors?.find(c => c.id === competitorId);
        if (!competitor) return null;
        
        return {
          id: competitor.id,
          name: competitor.name,
          mentions,
          percentage: totalMentions > 0 ? Number(((mentions / totalMentions) * 100).toFixed(1)) : 0,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null && c.mentions > 0)
      .sort((a, b) => b.percentage - a.percentage);

    // Calculate brand percentage
    const brandPercentage = totalMentions > 0 
      ? Number(((brandMentionsCount / totalMentions) * 100).toFixed(1)) 
      : 0;

    // Determine rank
    const allEntities = [
      { name: project.name, percentage: brandPercentage, mentions: brandMentionsCount },
      ...competitors.map(c => ({ name: c.name, percentage: c.percentage, mentions: c.mentions })),
    ].sort((a, b) => b.percentage - a.percentage);

    const brandRank = allEntities.findIndex(e => e.name === project.name) + 1;

    // Assign ranks to competitors
    const competitorsWithRank = competitors.map(comp => {
      const rank = allEntities.findIndex(e => e.name === comp.name) + 1;
      return { ...comp, rank };
    });

    return {
      error: null,
      data: {
        brand: {
          name: project.name,
          percentage: brandPercentage,
          mentions: brandMentionsCount,
          rank: brandRank,
        },
        competitors: competitorsWithRank,
        totalMentions,
      },
    };
  } catch (error: any) {
    return {
      error: error.message || "Failed to get brand ranking",
      data: null,
    };
  }
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

