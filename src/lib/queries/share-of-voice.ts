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
  region?: string,
  topicId?: string
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

  // Build platform, region, and topic filters
  const platformFilter = platform && platform !== "all";
  const regionFilter = region && region !== "GLOBAL";
  const topicFilter = topicId && topicId !== "all";

  // Get brand citations in period with platform, region, and topic filters
  // Use count instead of fetching all rows to avoid Supabase's 1000 row limit
  // IMPORTANT: Only count direct mentions (is_direct_mention = true), not URLs without mentions
  let brandCitationsQuery = supabase
    .from("citations_detail")
    .select(`
      id,
      ai_responses!inner(
        platform,
        prompt_tracking!inner(region, topic_id)
      )
    `, { count: 'exact', head: false })
    .eq("project_id", projectId)
    .eq("is_direct_mention", true) // ✅ Only count real mentions in text, not URLs without mentions
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString());

  if (platformFilter) {
    brandCitationsQuery = brandCitationsQuery.eq("ai_responses.platform", platform);
  }

  if (regionFilter) {
    brandCitationsQuery = brandCitationsQuery.eq("ai_responses.prompt_tracking.region", region);
  }

  if (topicFilter) {
    brandCitationsQuery = brandCitationsQuery.eq("ai_responses.prompt_tracking.topic_id", topicId);
  }

  const { count: brandCitationsCount, error: brandError } = await brandCitationsQuery;
  
  if (brandError) {
    console.error('Error fetching brand citations:', brandError);
  }
  
  const brandMentions = brandCitationsCount || 0;

  // Get competitor citations in period with competitor info, platform, region, and topic filters
  // Need full data to group by competitor, so we'll fetch in batches if needed
  let competitorCitationsQuery = supabase
    .from("competitor_citations")
    .select(`
      id,
      created_at,
      competitor_id,
      competitors!inner(name, domain, is_active, region),
      ai_responses!inner(
        platform,
        prompt_tracking!inner(region, topic_id)
      )
    `)
    .eq("project_id", projectId)
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString())
    .limit(50000); // Increase limit to handle large datasets

  if (platformFilter) {
    competitorCitationsQuery = competitorCitationsQuery.eq("ai_responses.platform", platform);
  }

  if (regionFilter) {
    // Filter by prompt's region only (we'll filter competitor region in JS below)
    competitorCitationsQuery = competitorCitationsQuery
      .eq("ai_responses.prompt_tracking.region", region);
  }

  if (topicFilter) {
    competitorCitationsQuery = competitorCitationsQuery
      .eq("ai_responses.prompt_tracking.topic_id", topicId);
  }

  const { data: competitorCitations, error: compError } = await competitorCitationsQuery;
  
  if (compError) {
    console.error('Error fetching competitor citations:', compError);
  }

  // First, get ALL active competitors for this region (even if they have 0 mentions)
  // This ensures all competitors defined for the region appear in Market Share Distribution
  // Filter: ONLY competitors with the selected region (NOT GLOBAL)
  let allCompetitorsQuery = supabase
    .from("competitors")
    .select("id, name, domain, region")
    .eq("project_id", projectId)
    .eq("is_active", true);

  if (regionFilter) {
    // Get ONLY competitors with region matching the filter (NOT GLOBAL)
    allCompetitorsQuery = allCompetitorsQuery.eq("region", region);
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

    // Filter by competitor region - ONLY exact match (not GLOBAL)
    if (regionFilter) {
      const competitorRegion = competitor.region;
      if (competitorRegion !== region) {
        return; // Skip this competitor - must be exact match
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
  region?: string,
  topicId?: string
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

  // Build platform, region, and topic filters
  const platformFilter = platform && platform !== "all";
  const regionFilter = region && region !== "GLOBAL";
  const topicFilter = topicId && topicId !== "all";

  // Get current period data
  // IMPORTANT: Only count direct mentions (is_direct_mention = true), not URLs without mentions
  let currentBrandQuery = supabase
    .from("citations_detail")
    .select(`
      id,
      ai_responses!inner(
        platform,
        prompt_tracking!inner(region, topic_id)
      )
    `, { count: 'exact', head: false })
    .eq("project_id", projectId)
    .eq("is_direct_mention", true) // ✅ Only count real mentions in text, not URLs without mentions
    .gte("created_at", currentStartDate.toISOString())
    .lte("created_at", currentEndDate.toISOString());

  if (platformFilter) {
    currentBrandQuery = currentBrandQuery.eq("ai_responses.platform", platform);
  }

  if (regionFilter) {
    currentBrandQuery = currentBrandQuery.eq("ai_responses.prompt_tracking.region", region);
  }

  if (topicFilter) {
    currentBrandQuery = currentBrandQuery.eq("ai_responses.prompt_tracking.topic_id", topicId);
  }

  let currentCompQuery = supabase
    .from("competitor_citations")
    .select(`
      id,
      competitor_id,
      competitors!inner(name, is_active, region),
      ai_responses!inner(
        platform,
        prompt_tracking!inner(region, topic_id)
      )
    `)
    .eq("project_id", projectId)
    .gte("created_at", currentStartDate.toISOString())
    .lte("created_at", currentEndDate.toISOString())
    .limit(50000); // Increase limit to handle large datasets

  if (platformFilter) {
    currentCompQuery = currentCompQuery.eq("ai_responses.platform", platform);
  }

  if (regionFilter) {
    currentCompQuery = currentCompQuery
      .eq("ai_responses.prompt_tracking.region", region);
  }

  if (topicFilter) {
    currentCompQuery = currentCompQuery
      .eq("ai_responses.prompt_tracking.topic_id", topicId);
  }

  const [currentBrandResult, currentCompResult] = await Promise.all([
    currentBrandQuery,
    currentCompQuery,
  ]);

  // Get previous period data
  // IMPORTANT: Only count direct mentions (is_direct_mention = true), not URLs without mentions
  let previousBrandQuery = supabase
    .from("citations_detail")
    .select(`
      id,
      ai_responses!inner(
        platform,
        prompt_tracking!inner(region, topic_id)
      )
    `, { count: 'exact', head: false })
    .eq("project_id", projectId)
    .eq("is_direct_mention", true) // ✅ Only count real mentions in text, not URLs without mentions
    .gte("created_at", previousStartDate.toISOString())
    .lte("created_at", previousEndDate.toISOString());

  if (platformFilter) {
    previousBrandQuery = previousBrandQuery.eq("ai_responses.platform", platform);
  }

  if (regionFilter) {
    previousBrandQuery = previousBrandQuery.eq("ai_responses.prompt_tracking.region", region);
  }

  if (topicFilter) {
    previousBrandQuery = previousBrandQuery.eq("ai_responses.prompt_tracking.topic_id", topicId);
  }

  let previousCompQuery = supabase
    .from("competitor_citations")
    .select(`
      id,
      competitor_id,
      competitors!inner(name, is_active, region),
      ai_responses!inner(
        platform,
        prompt_tracking!inner(region, topic_id)
      )
    `)
    .eq("project_id", projectId)
    .gte("created_at", previousStartDate.toISOString())
    .lte("created_at", previousEndDate.toISOString())
    .limit(50000); // Increase limit to handle large datasets

  if (platformFilter) {
    previousCompQuery = previousCompQuery.eq("ai_responses.platform", platform);
  }

  if (regionFilter) {
    previousCompQuery = previousCompQuery
      .eq("ai_responses.prompt_tracking.region", region);
  }

  if (topicFilter) {
    previousCompQuery = previousCompQuery
      .eq("ai_responses.prompt_tracking.topic_id", topicId);
  }

  const [previousBrandResult, previousCompResult] = await Promise.all([
    previousBrandQuery,
    previousCompQuery,
  ]);

  // Calculate current period stats - use count instead of data.length
  const currentBrandMentions = currentBrandResult.count || 0;
  
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

  // Calculate previous period stats - use count instead of data.length
  const previousBrandMentions = previousBrandResult.count || 0;
  
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
  region?: string,
  topicId?: string
) {
  const [sovData, trendsData] = await Promise.all([
    getShareOfVoice(projectId, fromDate, toDate, platform, region, topicId),
    getShareOfVoiceTrends(projectId, fromDate, toDate, platform, region, topicId),
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
  region?: string,
  topicId?: string
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

  // Get competitor info if competitor selected
  let competitorName = "";
  let competitorDomain = "";

  if (competitorId) {
    const { data: compData } = await supabase
      .from("competitors")
      .select("name, domain")
      .eq("id", competitorId)
      .single();

    competitorName = compData?.name || "Competitor";
    competitorDomain = compData?.domain || "";
  }

  // Use optimized SQL function for aggregation (handles large datasets efficiently)
  // This replaces client-side counting which was hitting pagination limits
  const { data: dailyMentions, error } = await supabase.rpc("get_daily_mentions_evolution", {
    p_project_id: projectId,
    p_competitor_id: competitorId || null,
    p_from_date: startDate.toISOString(),
    p_to_date: endDate.toISOString(),
    p_platform: platform && platform !== "all" ? platform : null,
    p_region: region && region !== "GLOBAL" ? region : null,
    p_topic_id: topicId && topicId !== "all" ? topicId : null,
  });

  if (error) {
    console.error("Error fetching daily mentions evolution:", error);
    // Fallback to empty data structure
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });
    const dailyData = allDays.map((day) => ({
      date: format(day, "MMM dd"),
      fullDate: format(day, "yyyy-MM-dd"),
      brandMentions: 0,
      competitorMentions: 0,
    }));

    return {
      data: dailyData,
      brandName: project?.name || "Your Brand",
      brandDomain: project?.client_url || project?.name || "",
      competitorName,
      competitorDomain,
    };
  }

  // Create array of all days in range to ensure we have data for every day
  const allDays = eachDayOfInterval({ start: startDate, end: endDate });
  
  interface DailyMentions {
    brandMentions: number;
    competitorMentions: number;
  }
  
  const mentionsMap = new Map<string, DailyMentions>(
    (dailyMentions || []).map((item: any) => [
      format(new Date(item.date), "yyyy-MM-dd"),
      {
        brandMentions: Number(item.brand_mentions) || 0,
        competitorMentions: Number(item.competitor_mentions) || 0,
      },
    ])
  );

  // Map to chart format
  const dailyData = allDays.map((day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    const mentions: DailyMentions = mentionsMap.get(dayStr) || { brandMentions: 0, competitorMentions: 0 };

    return {
      date: format(day, "MMM dd"),
      fullDate: dayStr,
      brandMentions: mentions.brandMentions,
      competitorMentions: mentions.competitorMentions,
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

