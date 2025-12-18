"use server";

import { createClient } from "@/lib/supabase/server";
import { format, subDays, eachDayOfInterval } from "date-fns";

// =============================================
// SHARE OF VOICE METRICS
// =============================================
// MIGRATED: Now uses brand_mentions table instead of legacy citations_detail/competitor_citations

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

  // =============================================
  // GET BRAND MENTIONS (from brand_mentions table)
  // =============================================
  let brandMentionsQuery = supabase
    .from("brand_mentions")
    .select(`
      id,
      ai_responses!inner(
        platform,
        prompt_tracking!inner(region, topic_id)
      )
    `, { count: 'exact', head: false })
    .eq("project_id", projectId)
    .eq("brand_type", "client") // ✅ Only brand mentions (not competitors)
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString());

  if (platformFilter) {
    brandMentionsQuery = brandMentionsQuery.eq("ai_responses.platform", platform);
  }

  if (regionFilter) {
    brandMentionsQuery = brandMentionsQuery.eq("ai_responses.prompt_tracking.region", region);
  }

  if (topicFilter) {
    brandMentionsQuery = brandMentionsQuery.eq("ai_responses.prompt_tracking.topic_id", topicId);
  }

  const { count: brandMentionsCount, error: brandError } = await brandMentionsQuery;
  
  if (brandError) {
    console.error('Error fetching brand mentions:', brandError);
  }
  
  const brandMentions = brandMentionsCount || 0;

  // =============================================
  // GET COMPETITOR MENTIONS (from brand_mentions table)
  // =============================================
  let competitorMentionsQuery = supabase
    .from("brand_mentions")
    .select(`
      id,
      created_at,
      competitor_id,
      competitors!inner(id, name, domain, is_active, region),
      ai_responses!inner(
        platform,
        prompt_tracking!inner(region, topic_id)
      )
    `)
    .eq("project_id", projectId)
    .eq("brand_type", "competitor") // ✅ Only competitor mentions
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString())
    .limit(50000);

  if (platformFilter) {
    competitorMentionsQuery = competitorMentionsQuery.eq("ai_responses.platform", platform);
  }

  if (regionFilter) {
    competitorMentionsQuery = competitorMentionsQuery
      .eq("ai_responses.prompt_tracking.region", region);
  }

  if (topicFilter) {
    competitorMentionsQuery = competitorMentionsQuery
      .eq("ai_responses.prompt_tracking.topic_id", topicId);
  }

  const { data: competitorMentions, error: compError } = await competitorMentionsQuery;
  
  if (compError) {
    console.error('Error fetching competitor mentions:', compError);
  }

  // Get ALL active competitors for this region (even if they have 0 mentions)
  let allCompetitorsQuery = supabase
    .from("competitors")
    .select("id, name, domain, region")
    .eq("project_id", projectId)
    .eq("is_active", true);

  if (regionFilter) {
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
      mentions: 0,
    });
  });

  // Count mentions from brand_mentions (filter by competitor region in JS)
  competitorMentions?.forEach((mention: any) => {
    const competitor = mention.competitors;
    if (!competitor || !competitor.is_active) return;

    // Filter by competitor region - ONLY exact match (not GLOBAL)
    if (regionFilter) {
      const competitorRegion = competitor.region;
      if (competitorRegion !== region) {
        return;
      }
    }

    if (competitorStats.has(competitor.name)) {
      competitorStats.get(competitor.name)!.mentions++;
    }
  });

  // Calculate totals
  const competitorMentionsTotal = Array.from(competitorStats.values()).reduce(
    (sum, comp) => sum + comp.mentions,
    0
  );
  const totalMentions = brandMentions + competitorMentionsTotal;

  // Calculate percentages
  const brandPercentage = totalMentions > 0 ? (brandMentions / totalMentions) * 100 : 0;

  const competitors = Array.from(competitorStats.values()).map((comp) => ({
    id: comp.id,
    name: comp.name,
    domain: comp.domain || comp.name,
    mentions: comp.mentions,
    percentage: totalMentions > 0 ? Number(((comp.mentions / totalMentions) * 100).toFixed(1)) : 0,
  }));

  // Sort competitors by percentage descending
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
      domain: project?.client_url || project?.name || "",
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

  // Current period
  const currentEndDate = toDate || new Date();
  const currentStartDate = fromDate || (() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date;
  })();

  // Calculate period duration
  const periodDuration = currentEndDate.getTime() - currentStartDate.getTime();

  // Previous period
  const previousEndDate = new Date(currentStartDate);
  const previousStartDate = new Date(previousEndDate.getTime() - periodDuration);

  // Build filters
  const platformFilter = platform && platform !== "all";
  const regionFilter = region && region !== "GLOBAL";
  const topicFilter = topicId && topicId !== "all";

  // =============================================
  // CURRENT PERIOD - Brand Mentions
  // =============================================
  let currentBrandQuery = supabase
    .from("brand_mentions")
    .select(`
      id,
      ai_responses!inner(
        platform,
        prompt_tracking!inner(region, topic_id)
      )
    `, { count: 'exact', head: false })
    .eq("project_id", projectId)
    .eq("brand_type", "client")
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

  // =============================================
  // CURRENT PERIOD - Competitor Mentions
  // =============================================
  let currentCompQuery = supabase
    .from("brand_mentions")
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
    .eq("brand_type", "competitor")
    .gte("created_at", currentStartDate.toISOString())
    .lte("created_at", currentEndDate.toISOString())
    .limit(50000);

  if (platformFilter) {
    currentCompQuery = currentCompQuery.eq("ai_responses.platform", platform);
  }
  if (regionFilter) {
    currentCompQuery = currentCompQuery.eq("ai_responses.prompt_tracking.region", region);
  }
  if (topicFilter) {
    currentCompQuery = currentCompQuery.eq("ai_responses.prompt_tracking.topic_id", topicId);
  }

  // =============================================
  // PREVIOUS PERIOD - Brand Mentions
  // =============================================
  let previousBrandQuery = supabase
    .from("brand_mentions")
    .select(`
      id,
      ai_responses!inner(
        platform,
        prompt_tracking!inner(region, topic_id)
      )
    `, { count: 'exact', head: false })
    .eq("project_id", projectId)
    .eq("brand_type", "client")
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

  // =============================================
  // PREVIOUS PERIOD - Competitor Mentions
  // =============================================
  let previousCompQuery = supabase
    .from("brand_mentions")
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
    .eq("brand_type", "competitor")
    .gte("created_at", previousStartDate.toISOString())
    .lte("created_at", previousEndDate.toISOString())
    .limit(50000);

  if (platformFilter) {
    previousCompQuery = previousCompQuery.eq("ai_responses.platform", platform);
  }
  if (regionFilter) {
    previousCompQuery = previousCompQuery.eq("ai_responses.prompt_tracking.region", region);
  }
  if (topicFilter) {
    previousCompQuery = previousCompQuery.eq("ai_responses.prompt_tracking.topic_id", topicId);
  }

  const [currentBrandResult, currentCompResult, previousBrandResult, previousCompResult] = 
    await Promise.all([
      currentBrandQuery,
      currentCompQuery,
      previousBrandQuery,
      previousCompQuery,
    ]);

  // Calculate current period stats
  const currentBrandMentions = currentBrandResult.count || 0;
  
  let currentCompMentions = 0;
  currentCompResult.data?.forEach((mention: any) => {
    const competitor = mention.competitors;
    if (!competitor?.is_active) return;
    
    if (regionFilter) {
      const competitorRegion = competitor.region;
      if (competitorRegion !== region && competitorRegion !== 'GLOBAL') {
        return;
      }
    }
    currentCompMentions++;
  });
  
  const currentTotal = currentBrandMentions + currentCompMentions;
  const currentBrandShare = currentTotal > 0 
    ? (currentBrandMentions / currentTotal) * 100 
    : 0;

  // Calculate previous period stats
  const previousBrandMentions = previousBrandResult.count || 0;
  
  let previousCompMentions = 0;
  previousCompResult.data?.forEach((mention: any) => {
    const competitor = mention.competitors;
    if (!competitor?.is_active) return;
    
    if (regionFilter) {
      const competitorRegion = competitor.region;
      if (competitorRegion !== region && competitorRegion !== 'GLOBAL') {
        return;
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

  currentCompResult.data?.forEach((mention: any) => {
    const competitor = mention.competitors;
    if (!competitor?.name || !competitor.is_active) return;
    
    if (regionFilter) {
      const competitorRegion = competitor.region;
      if (competitorRegion !== region && competitorRegion !== 'GLOBAL') {
        return;
      }
    }
    
    const name = competitor.name;
    if (!competitorTrends.has(name)) {
      competitorTrends.set(name, { current: 0, previous: 0 });
    }
    competitorTrends.get(name)!.current++;
  });

  previousCompResult.data?.forEach((mention: any) => {
    const competitor = mention.competitors;
    if (!competitor?.name || !competitor.is_active) return;
    
    if (regionFilter) {
      const competitorRegion = competitor.region;
      if (competitorRegion !== region && competitorRegion !== 'GLOBAL') {
        return;
      }
    }
    
    const name = competitor.name;
    if (!competitorTrends.has(name)) {
      competitorTrends.set(name, { current: 0, previous: 0 });
    }
    competitorTrends.get(name)!.previous++;
  });

  // Calculate percentage trends
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
      description: `${leader?.name || 'Leader'} leads with ${leader?.percentage || 0}%. You have ${sovData.brand.percentage}% share of voice.`,
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
 * Uses optimized SQL RPC function
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

  // Get project info
  const { data: project } = await supabase
    .from("projects")
    .select("name, client_url")
    .eq("id", projectId)
    .single();

  // Calculate date range
  const endDate = toDate || new Date();
  const startDate = fromDate || subDays(endDate, 30);

  // Get competitor info if selected
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

  // Use optimized SQL function
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
    // Fallback to empty data
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

  // Process results
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
