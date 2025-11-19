"use server";

import { createClient } from "@/lib/supabase/server";
import { format, subDays, eachDayOfInterval } from "date-fns";

// =============================================
// SHARE OF VOICE METRICS
// =============================================

/**
 * Calculate Share of Voice for brand vs competitors
 * Returns percentage of mentions across all tracked entities
 */
export async function getShareOfVoice(
  projectId: string,
  fromDate?: Date,
  toDate?: Date,
  platform?: string,
  region?: string
) {
  const supabase = await createClient();

  // Get project info (name and client_url for favicon)
  const { data: project } = await supabase
    .from("projects")
    .select("name, client_url")
    .eq("id", projectId)
    .single();

  // Calculate date range (default to last 30 days if not provided)
  const endDate = toDate || new Date();
  const startDate = fromDate || (() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date;
  })();

  // Build platform and region filters
  const platformFilter = platform && platform !== "all";
  const regionFilter = region && region !== "GLOBAL";

  // Get brand citations in period with platform and region filters
  let brandCitationsQuery = supabase
    .from("citations_detail")
    .select(`
      id,
      created_at,
      ai_responses!inner(
        platform,
        prompt_tracking!inner(region)
      )
    `)
    .eq("project_id", projectId)
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString());

  if (platformFilter) {
    brandCitationsQuery = brandCitationsQuery.eq("ai_responses.platform", platform);
  }

  if (regionFilter) {
    brandCitationsQuery = brandCitationsQuery.eq("ai_responses.prompt_tracking.region", region);
  }

  const { data: brandCitations } = await brandCitationsQuery;

  // Get competitor citations in period with competitor info, platform and region filters
  let competitorCitationsQuery = supabase
    .from("competitor_citations")
    .select(`
      id,
      created_at,
      competitor_id,
      competitors!inner(name, domain, is_active, region),
      ai_responses!inner(
        platform,
        prompt_tracking!inner(region)
      )
    `)
    .eq("project_id", projectId)
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString());

  if (platformFilter) {
    competitorCitationsQuery = competitorCitationsQuery.eq("ai_responses.platform", platform);
  }

  if (regionFilter) {
    // Filter by prompt's region only (we'll filter competitor region in JS below)
    competitorCitationsQuery = competitorCitationsQuery
      .eq("ai_responses.prompt_tracking.region", region);
  }

  const { data: competitorCitations } = await competitorCitationsQuery;

  // Count brand mentions
  const brandMentions = brandCitations?.length || 0;

  // First, get ALL active competitors for this region (even if they have 0 mentions)
  // This ensures all competitors defined for the region appear in the selector
  let allCompetitorsQuery = supabase
    .from("competitors")
    .select("id, name, domain, region")
    .eq("project_id", projectId)
    .eq("is_active", true);

  if (regionFilter) {
    // Get competitors with region matching OR GLOBAL
    allCompetitorsQuery = allCompetitorsQuery.or(`region.eq.${region},region.eq.GLOBAL`);
  }

  const { data: allCompetitors } = await allCompetitorsQuery;

  // Initialize competitor stats with ALL competitors for the region
  const competitorStats = new Map<string, { id: string; name: string; domain: string; mentions: number }>();
  
  allCompetitors?.forEach((competitor: any) => {
    competitorStats.set(competitor.name, {
      id: competitor.id,
      name: competitor.name,
      domain: competitor.domain || "",
      mentions: 0, // Initialize with 0 mentions
    });
  });

  // Now count mentions from citations (only those in the region filter)
  competitorCitations?.forEach((citation: any) => {
    const competitor = citation.competitors;
    if (!competitor || !competitor.is_active) return;

    // Filter by competitor region (in JavaScript since SQL .or() doesn't work properly)
    if (regionFilter) {
      const competitorRegion = competitor.region;
      if (competitorRegion !== region && competitorRegion !== 'GLOBAL') {
        return; // Skip this competitor
      }
    }

    // Increment mentions if competitor exists in stats
    if (competitorStats.has(competitor.name)) {
      competitorStats.get(competitor.name)!.mentions++;
    }
  });

  // Calculate totals
  const competitorMentions = Array.from(competitorStats.values()).reduce(
    (sum, comp) => sum + comp.mentions,
    0
  );
  const totalMentions = brandMentions + competitorMentions;

  // Calculate percentages
  const brandPercentage = totalMentions > 0 ? (brandMentions / totalMentions) * 100 : 0;

  const competitors = Array.from(competitorStats.values()).map((comp) => ({
    id: comp.id,
    name: comp.name,
    domain: comp.domain || comp.name, // Fallback to name if no domain
    mentions: comp.mentions,
    percentage: totalMentions > 0 ? Number(((comp.mentions / totalMentions) * 100).toFixed(1)) : 0,
  }));

  // Sort competitors by percentage descending (highest first)
  competitors.sort((a, b) => b.percentage - a.percentage);

  // Determine market position
  const allEntities = [
    { name: project?.name || "Your Brand", mentions: brandMentions, percentage: brandPercentage },
    ...competitors,
  ].sort((a, b) => b.mentions - a.mentions);

  const marketPosition = allEntities.findIndex((e) => e.name === (project?.name || "Your Brand")) + 1;

  return {
    brand: {
      name: project?.name || "Your Brand",
      domain: project?.client_url || project?.name || "", // Fallback to name if no URL
      mentions: brandMentions,
      percentage: Number(brandPercentage.toFixed(1)),
    },
    competitors,
    totalMentions,
    marketPosition,
  };
}

// =============================================
// SHARE OF VOICE TRENDS
// =============================================

/**
 * Calculate Share of Voice trends by comparing current vs previous period
 */
export async function getShareOfVoiceTrends(
  projectId: string,
  fromDate?: Date,
  toDate?: Date,
  platform?: string,
  region?: string
) {
  const supabase = await createClient();

  // Current period (default to last 30 days if not provided)
  const currentEndDate = toDate || new Date();
  const currentStartDate = fromDate || (() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date;
  })();

  // Calculate period duration
  const periodDuration = currentEndDate.getTime() - currentStartDate.getTime();

  // Previous period (same duration, before current period)
  const previousEndDate = new Date(currentStartDate);
  const previousStartDate = new Date(previousEndDate.getTime() - periodDuration);

  // Build platform and region filters
  const platformFilter = platform && platform !== "all";
  const regionFilter = region && region !== "GLOBAL";

  // Get current period data
  let currentBrandQuery = supabase
    .from("citations_detail")
    .select(`
      id,
      ai_responses!inner(
        platform,
        prompt_tracking!inner(region)
      )
    `)
    .eq("project_id", projectId)
    .gte("created_at", currentStartDate.toISOString())
    .lte("created_at", currentEndDate.toISOString());

  if (platformFilter) {
    currentBrandQuery = currentBrandQuery.eq("ai_responses.platform", platform);
  }

  if (regionFilter) {
    currentBrandQuery = currentBrandQuery.eq("ai_responses.prompt_tracking.region", region);
  }

  let currentCompQuery = supabase
    .from("competitor_citations")
    .select(`
      id,
      competitor_id,
      competitors!inner(name, is_active, region),
      ai_responses!inner(
        platform,
        prompt_tracking!inner(region)
      )
    `)
    .eq("project_id", projectId)
    .gte("created_at", currentStartDate.toISOString())
    .lte("created_at", currentEndDate.toISOString());

  if (platformFilter) {
    currentCompQuery = currentCompQuery.eq("ai_responses.platform", platform);
  }

  if (regionFilter) {
    currentCompQuery = currentCompQuery
      .eq("ai_responses.prompt_tracking.region", region);
  }

  const [currentBrandResult, currentCompResult] = await Promise.all([
    currentBrandQuery,
    currentCompQuery,
  ]);

  // Get previous period data
  let previousBrandQuery = supabase
    .from("citations_detail")
    .select(`
      id,
      ai_responses!inner(
        platform,
        prompt_tracking!inner(region)
      )
    `)
    .eq("project_id", projectId)
    .gte("created_at", previousStartDate.toISOString())
    .lte("created_at", previousEndDate.toISOString());

  if (platformFilter) {
    previousBrandQuery = previousBrandQuery.eq("ai_responses.platform", platform);
  }

  if (regionFilter) {
    previousBrandQuery = previousBrandQuery.eq("ai_responses.prompt_tracking.region", region);
  }

  let previousCompQuery = supabase
    .from("competitor_citations")
    .select(`
      id,
      competitor_id,
      competitors!inner(name, is_active, region),
      ai_responses!inner(
        platform,
        prompt_tracking!inner(region)
      )
    `)
    .eq("project_id", projectId)
    .gte("created_at", previousStartDate.toISOString())
    .lte("created_at", previousEndDate.toISOString());

  if (platformFilter) {
    previousCompQuery = previousCompQuery.eq("ai_responses.platform", platform);
  }

  if (regionFilter) {
    previousCompQuery = previousCompQuery
      .eq("ai_responses.prompt_tracking.region", region);
  }

  const [previousBrandResult, previousCompResult] = await Promise.all([
    previousBrandQuery,
    previousCompQuery,
  ]);

  // Calculate current period stats
  const currentBrandMentions = currentBrandResult.data?.length || 0;
  
  // Count current competitor mentions (with region filter in JS)
  let currentCompMentions = 0;
  currentCompResult.data?.forEach((citation: any) => {
    const competitor = citation.competitors;
    if (!competitor?.is_active) return;
    
    if (regionFilter) {
      const competitorRegion = competitor.region;
      if (competitorRegion !== region && competitorRegion !== 'GLOBAL') {
        return; // Skip this competitor
      }
    }
    currentCompMentions++;
  });
  
  const currentTotal = currentBrandMentions + currentCompMentions;
  const currentBrandShare = currentTotal > 0 
    ? (currentBrandMentions / currentTotal) * 100 
    : 0;

  // Calculate previous period stats
  const previousBrandMentions = previousBrandResult.data?.length || 0;
  
  // Count previous competitor mentions (with region filter in JS)
  let previousCompMentions = 0;
  previousCompResult.data?.forEach((citation: any) => {
    const competitor = citation.competitors;
    if (!competitor?.is_active) return;
    
    if (regionFilter) {
      const competitorRegion = competitor.region;
      if (competitorRegion !== region && competitorRegion !== 'GLOBAL') {
        return; // Skip this competitor
      }
    }
    previousCompMentions++;
  });
  
  const previousTotal = previousBrandMentions + previousCompMentions;
  const previousBrandShare = previousTotal > 0 
    ? (previousBrandMentions / previousTotal) * 100 
    : 0;

  // Calculate trend
  const shareTrend = currentBrandShare - previousBrandShare;

  // Calculate competitor trends
  const competitorTrends = new Map<string, { current: number; previous: number }>();

  // Current competitor stats (filter by region in JS)
  currentCompResult.data?.forEach((citation: any) => {
    const competitor = citation.competitors;
    if (!competitor?.name || !competitor.is_active) return;
    
    // Filter by competitor region (in JavaScript since SQL .or() doesn't work properly)
    if (regionFilter) {
      const competitorRegion = competitor.region;
      if (competitorRegion !== region && competitorRegion !== 'GLOBAL') {
        return; // Skip this competitor
      }
    }
    
    const name = competitor.name;
    if (!competitorTrends.has(name)) {
      competitorTrends.set(name, { current: 0, previous: 0 });
    }
    competitorTrends.get(name)!.current++;
  });

  // Previous competitor stats (filter by region in JS)
  previousCompResult.data?.forEach((citation: any) => {
    const competitor = citation.competitors;
    if (!competitor?.name || !competitor.is_active) return;
    
    // Filter by competitor region (in JavaScript since SQL .or() doesn't work properly)
    if (regionFilter) {
      const competitorRegion = competitor.region;
      if (competitorRegion !== region && competitorRegion !== 'GLOBAL') {
        return; // Skip this competitor
      }
    }
    
    const name = competitor.name;
    if (!competitorTrends.has(name)) {
      competitorTrends.set(name, { current: 0, previous: 0 });
    }
    competitorTrends.get(name)!.previous++;
  });

  // Calculate percentage trends for each competitor
  const competitorTrendsList = Array.from(competitorTrends.entries()).map(
    ([name, stats]) => {
      const currentShare = currentTotal > 0 ? (stats.current / currentTotal) * 100 : 0;
      const previousShare = previousTotal > 0 ? (stats.previous / previousTotal) * 100 : 0;
      const trend = currentShare - previousShare;

      return {
        name,
        trend: Number(trend.toFixed(1)),
        currentMentions: stats.current,
        previousMentions: stats.previous,
      };
    }
  );

  return {
    brandTrend: Number(shareTrend.toFixed(1)),
    competitorTrends: competitorTrendsList,
  };
}

// =============================================
// SHARE OF VOICE INSIGHTS
// =============================================

/**
 * Generate AI-powered insights based on Share of Voice data
 */
export async function getShareOfVoiceInsights(
  projectId: string,
  fromDate?: Date,
  toDate?: Date,
  platform?: string,
  region?: string
) {
  const [sovData, trendsData] = await Promise.all([
    getShareOfVoice(projectId, fromDate, toDate, platform, region),
    getShareOfVoiceTrends(projectId, fromDate, toDate, platform, region),
  ]);

  const insights: Array<{
    type: "success" | "info" | "warning" | "opportunity";
    title: string;
    description: string;
  }> = [];

  // Market leader insight
  if (sovData.marketPosition === 1) {
    insights.push({
      type: "success",
      title: "📈 You're leading the market",
      description: `Your brand has the highest share of voice at ${sovData.brand.percentage}%, maintaining a strong lead over competitors.`,
    });
  } else {
    const leader = sovData.competitors[0];
    insights.push({
      type: "info",
      title: `🎯 Market Position #${sovData.marketPosition}`,
      description: `${leader.name} leads with ${leader.percentage}%. You have ${sovData.brand.percentage}% share of voice.`,
    });
  }

  // Trend insight
  if (trendsData.brandTrend > 2) {
    insights.push({
      type: "success",
      title: "🚀 Growing momentum",
      description: `Your share of voice increased by ${trendsData.brandTrend}% compared to the previous period. Keep up the great work!`,
    });
  } else if (trendsData.brandTrend < -2) {
    insights.push({
      type: "warning",
      title: "⚠️ Share declining",
      description: `Your share of voice decreased by ${Math.abs(trendsData.brandTrend)}%. Consider reviewing your content strategy.`,
    });
  }

  // Competitor opportunity
  const decliningCompetitors = trendsData.competitorTrends
    .filter((c) => c.trend < -1)
    .sort((a, b) => a.trend - b.trend);

  if (decliningCompetitors.length > 0) {
    const topDeclining = decliningCompetitors[0];
    insights.push({
      type: "opportunity",
      title: "💡 Opportunity detected",
      description: `${topDeclining.name} is losing ground (${topDeclining.trend}%). Focus on their key topics to capture their audience.`,
    });
  }

  // Low competition insight
  if (sovData.competitors.length === 0) {
    insights.push({
      type: "info",
      title: "👥 Add competitors",
      description: "Track competitors to get comparative insights and identify market opportunities.",
    });
  }

  return insights;
}

// =============================================
// SHARE OF VOICE OVER TIME
// =============================================

/**
 * Get daily mentions evolution for brand and a specific competitor
 * Used for time-series chart visualization
 */
export async function getShareOfVoiceOverTime(
  projectId: string,
  competitorId: string | null,
  fromDate?: Date,
  toDate?: Date,
  platform?: string,
  region?: string
) {
  const supabase = await createClient();

  // Get project info (including domain for logo)
  const { data: project } = await supabase
    .from("projects")
    .select("name, client_url")
    .eq("id", projectId)
    .single();

  // Calculate date range (default to last 30 days if not provided)
  const endDate = toDate || new Date();
  const startDate = fromDate || subDays(endDate, 30);

  // Build platform and region filters
  const platformFilter = platform && platform !== "all";
  const regionFilter = region && region !== "GLOBAL";

  // Get brand mentions over time
  let brandMentionsQuery = supabase
    .from("citations_detail")
    .select(`
      id,
      created_at,
      ai_responses!inner(
        platform,
        prompt_tracking!inner(region)
      )
    `)
    .eq("project_id", projectId)
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString());

  if (platformFilter) {
    brandMentionsQuery = brandMentionsQuery.eq("ai_responses.platform", platform);
  }

  if (regionFilter) {
    brandMentionsQuery = brandMentionsQuery.eq("ai_responses.prompt_tracking.region", region);
  }

  const { data: brandMentions } = await brandMentionsQuery;

  // Get competitor mentions over time (if competitor selected)
  let competitorMentions: any[] = [];
  let competitorName = "";
  let competitorDomain = "";

  if (competitorId) {
    let compQuery = supabase
      .from("competitor_citations")
      .select(`
        id,
        created_at,
        competitors!inner(name, domain, region),
        ai_responses!inner(
          platform,
          prompt_tracking!inner(region)
        )
      `)
      .eq("project_id", projectId)
      .eq("competitor_id", competitorId)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString());

    if (platformFilter) {
      compQuery = compQuery.eq("ai_responses.platform", platform);
    }

    if (regionFilter) {
      // Since a specific competitor is selected, we still filter by prompt region
      // (the competitor's assigned region is validated at selection time in getShareOfVoice)
      compQuery = compQuery.eq("ai_responses.prompt_tracking.region", region);
    }

    const { data: compData } = await compQuery;

    competitorMentions = compData || [];
    competitorName = compData?.[0]?.competitors?.name || "Competitor";
    competitorDomain = compData?.[0]?.competitors?.domain || "";
  }

  // Create array of all days in range
  const allDays = eachDayOfInterval({ start: startDate, end: endDate });

  // Count mentions by day
  const dailyData = allDays.map((day) => {
    const dayStr = format(day, "yyyy-MM-dd");

    // Count brand mentions for this day
    const brandCount = brandMentions?.filter((m) => {
      const mentionDate = format(new Date(m.created_at), "yyyy-MM-dd");
      return mentionDate === dayStr;
    }).length || 0;

    // Count competitor mentions for this day
    const competitorCount = competitorMentions.filter((m) => {
      const mentionDate = format(new Date(m.created_at), "yyyy-MM-dd");
      return mentionDate === dayStr;
    }).length || 0;

    return {
      date: format(day, "MMM dd"),
      fullDate: dayStr,
      brandMentions: brandCount,
      competitorMentions: competitorCount,
    };
  });

  return {
    data: dailyData,
    brandName: project?.name || "Your Brand",
    brandDomain: project?.client_url || project?.name || "",
    competitorName,
    competitorDomain,
  };
}

