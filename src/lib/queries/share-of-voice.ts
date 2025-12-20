"use server";

import { createClient } from "@/lib/supabase/server";
import { format, subDays, eachDayOfInterval } from "date-fns";

/**
 * Get yesterday's date (end of day is yesterday, not today, since today's data won't be available until tomorrow)
 */
function getYesterday(): Date {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(23, 59, 59, 999);
  return yesterday;
}

// =============================================
// SHARE OF VOICE METRICS
// =============================================
// MIGRATED: Now uses daily_brand_stats table for optimized performance

/**
 * Map frontend platform values to database platform values
 */
function mapPlatformToDatabase(platform: string | undefined): string | null {
  if (!platform || platform === "all") return null;
  
  const platformMap: Record<string, string> = {
    chatgpt: "openai",
    anthropic: "claude",
    gemini: "gemini",
    perplexity: "perplexity",
  };
  
  return platformMap[platform] || platform;
}

/**
 * Calculate Share of Voice for brand vs competitors
 * Returns percentage of mentions across all tracked entities
 * Uses daily_brand_stats table for optimized performance
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

  // Get project info (name, client_url for favicon, and color)
  const { data: project } = await supabase
    .from("projects")
    .select("name, client_url, color")
    .eq("id", projectId)
    .single();

  // Calculate date range (default to last 30 days ending yesterday)
  // Today's data won't be available until tomorrow, so max date is yesterday
  const endDate = toDate || getYesterday();
  const startDate = fromDate || (() => {
    const date = getYesterday();
    date.setDate(date.getDate() - 29); // 30 days total including yesterday
    date.setHours(0, 0, 0, 0);
    return date;
  })();

  // Map platform filter
  const mappedPlatform = mapPlatformToDatabase(platform);
  const platformFilter = mappedPlatform !== null;
  const regionFilter = region && region !== "GLOBAL"; // GLOBAL means sum all regions
  const topicFilter = topicId && topicId !== "all";

  // Format dates for SQL
  const startDateStr = format(startDate, "yyyy-MM-dd");
  const endDateStr = format(endDate, "yyyy-MM-dd");

  // =============================================
  // GET BRAND MENTIONS (from daily_brand_stats)
  // =============================================
  let brandQuery = supabase
    .from("daily_brand_stats")
    .select("mentions_count")
    .eq("project_id", projectId)
    .eq("entity_type", "brand")
    .is("competitor_id", null)
    .gte("stat_date", startDateStr)
    .lte("stat_date", endDateStr);

  if (platformFilter) {
    brandQuery = brandQuery.eq("platform", mappedPlatform);
  }

  // When region is GLOBAL, don't filter by region (sum all regions)
  if (regionFilter) {
    brandQuery = brandQuery.eq("region", region);
  }

  if (topicFilter) {
    brandQuery = brandQuery.eq("topic_id", topicId);
  }

  const { data: brandStats, error: brandError } = await brandQuery;
  
  if (brandError) {
    console.error('Error fetching brand mentions from daily_brand_stats:', brandError);
  }
  
  const brandMentions = brandStats?.reduce((sum, stat) => sum + (stat.mentions_count || 0), 0) || 0;

  // =============================================
  // GET COMPETITOR MENTIONS (from daily_brand_stats)
  // =============================================
  let competitorQuery = supabase
    .from("daily_brand_stats")
    .select("competitor_id, entity_name, mentions_count, competitors!inner(id, name, domain, is_active, color)")
    .eq("project_id", projectId)
    .eq("entity_type", "competitor")
    .not("competitor_id", "is", null)
    .gte("stat_date", startDateStr)
    .lte("stat_date", endDateStr);

  if (platformFilter) {
    competitorQuery = competitorQuery.eq("platform", mappedPlatform);
  }

  // When region is GLOBAL, don't filter by region (sum all regions)
  if (regionFilter) {
    competitorQuery = competitorQuery.eq("region", region);
  }

  if (topicFilter) {
    competitorQuery = competitorQuery.eq("topic_id", topicId);
  }

  const { data: competitorStats, error: compError } = await competitorQuery;
  
  if (compError) {
    console.error('Error fetching competitor mentions from daily_brand_stats:', compError);
  }

  // Get ALL active competitors (for the region if filtered, or all if GLOBAL)
  let allCompetitorsQuery = supabase
    .from("competitors")
    .select("id, name, domain, color")
    .eq("project_id", projectId)
    .eq("is_active", true);

  // Note: We don't filter competitors by region here because competitors can have mentions
  // from different regions. The region filter is applied to the stats, not the competitor list.
  const { data: allCompetitors } = await allCompetitorsQuery;

  // Aggregate competitor mentions by competitor_id
  const competitorMentionsMap = new Map<string, { id: string; name: string; domain: string; color?: string; mentions: number }>();
  
  // Initialize with all active competitors (with 0 mentions)
  allCompetitors?.forEach((competitor: any) => {
    competitorMentionsMap.set(competitor.id, {
      id: competitor.id,
      name: competitor.name,
      domain: competitor.domain || "",
      color: competitor.color || undefined,
      mentions: 0,
    });
  });

  // Sum mentions from daily_brand_stats
  competitorStats?.forEach((stat: any) => {
    const competitor = stat.competitors;
    if (!competitor || !competitor.is_active || !stat.competitor_id) return;

    const competitorId = stat.competitor_id;
    if (!competitorMentionsMap.has(competitorId)) {
      competitorMentionsMap.set(competitorId, {
        id: competitorId,
        name: competitor.name || stat.entity_name || "Unknown",
        domain: competitor.domain || "",
        color: competitor.color || undefined,
        mentions: 0,
      });
    }

    competitorMentionsMap.get(competitorId)!.mentions += stat.mentions_count || 0;
  });

  // Calculate totals
  const competitorMentionsTotal = Array.from(competitorMentionsMap.values()).reduce(
    (sum, comp) => sum + comp.mentions,
    0
  );
  const totalMentions = brandMentions + competitorMentionsTotal;

  // Calculate percentages
  const brandPercentage = totalMentions > 0 ? (brandMentions / totalMentions) * 100 : 0;

  const competitors = Array.from(competitorMentionsMap.values())
    .filter((comp) => comp.mentions > 0) // Only show competitors with mentions
    .map((comp) => ({
    id: comp.id,
    name: comp.name,
    domain: comp.domain || comp.name,
    color: comp.color,
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
      color: project?.color || "#3B82F6",
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
 * Uses daily_brand_stats table for optimized performance
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

  // Current period (default to last 30 days ending yesterday)
  // Today's data won't be available until tomorrow, so max date is yesterday
  const currentEndDate = toDate || getYesterday();
  const currentStartDate = fromDate || (() => {
    const date = getYesterday();
    date.setDate(date.getDate() - 29); // 30 days total including yesterday
    date.setHours(0, 0, 0, 0);
    return date;
  })();

  // Calculate period duration
  const periodDuration = currentEndDate.getTime() - currentStartDate.getTime();

  // Previous period
  const previousEndDate = new Date(currentStartDate);
  const previousStartDate = new Date(previousEndDate.getTime() - periodDuration);

  // Map platform filter
  const mappedPlatform = mapPlatformToDatabase(platform);
  const platformFilter = mappedPlatform !== null;
  const regionFilter = region && region !== "GLOBAL"; // GLOBAL means sum all regions
  const topicFilter = topicId && topicId !== "all";

  // Format dates for SQL
  const currentStartStr = format(currentStartDate, "yyyy-MM-dd");
  const currentEndStr = format(currentEndDate, "yyyy-MM-dd");
  const previousStartStr = format(previousStartDate, "yyyy-MM-dd");
  const previousEndStr = format(previousEndDate, "yyyy-MM-dd");

  // Helper function to build query
  const buildStatsQuery = (startDate: string, endDate: string, entityType: "brand" | "competitor") => {
    let query = supabase
      .from("daily_brand_stats")
      .select("mentions_count, competitor_id, entity_name, competitors!inner(name, is_active, color)")
    .eq("project_id", projectId)
      .eq("entity_type", entityType)
      .gte("stat_date", startDate)
      .lte("stat_date", endDate);

    if (entityType === "brand") {
      query = query.is("competitor_id", null);
    } else {
      query = query.not("competitor_id", "is", null);
    }

  if (platformFilter) {
      query = query.eq("platform", mappedPlatform);
  }

    // When region is GLOBAL, don't filter by region (sum all regions)
  if (regionFilter) {
      query = query.eq("region", region);
  }

  if (topicFilter) {
      query = query.eq("topic_id", topicId);
  }

    return query;
  };

  // =============================================
  // CURRENT PERIOD
  // =============================================
  const [currentBrandResult, currentCompResult] = await Promise.all([
    buildStatsQuery(currentStartStr, currentEndStr, "brand"),
    buildStatsQuery(currentStartStr, currentEndStr, "competitor"),
    ]);

  // Calculate current period stats
  const currentBrandMentions = currentBrandResult.data?.reduce(
    (sum, stat) => sum + (stat.mentions_count || 0),
    0
  ) || 0;
  
  const currentCompMentionsMap = new Map<string, number>();
  currentCompResult.data?.forEach((stat: any) => {
    const competitor = stat.competitors;
    if (!competitor?.is_active || !stat.competitor_id) return;

    const currentCount = currentCompMentionsMap.get(stat.competitor_id) || 0;
    currentCompMentionsMap.set(stat.competitor_id, currentCount + (stat.mentions_count || 0));
  });

  const currentCompMentions = Array.from(currentCompMentionsMap.values()).reduce(
    (sum, count) => sum + count,
    0
  );
  
  const currentTotal = currentBrandMentions + currentCompMentions;
  const currentBrandShare = currentTotal > 0 
    ? (currentBrandMentions / currentTotal) * 100 
    : 0;

  // =============================================
  // PREVIOUS PERIOD
  // =============================================
  const [previousBrandResult, previousCompResult] = await Promise.all([
    buildStatsQuery(previousStartStr, previousEndStr, "brand"),
    buildStatsQuery(previousStartStr, previousEndStr, "competitor"),
  ]);

  // Calculate previous period stats
  const previousBrandMentions = previousBrandResult.data?.reduce(
    (sum, stat) => sum + (stat.mentions_count || 0),
    0
  ) || 0;
  
  const previousCompMentionsMap = new Map<string, number>();
  previousCompResult.data?.forEach((stat: any) => {
    const competitor = stat.competitors;
    if (!competitor?.is_active || !stat.competitor_id) return;

    const previousCount = previousCompMentionsMap.get(stat.competitor_id) || 0;
    previousCompMentionsMap.set(stat.competitor_id, previousCount + (stat.mentions_count || 0));
  });

  const previousCompMentions = Array.from(previousCompMentionsMap.values()).reduce(
    (sum, count) => sum + count,
    0
  );
  
  const previousTotal = previousBrandMentions + previousCompMentions;
  const previousBrandShare = previousTotal > 0 
    ? (previousBrandMentions / previousTotal) * 100 
    : 0;

  // Calculate trend
  const shareTrend = currentBrandShare - previousBrandShare;

  // Calculate competitor trends
  const competitorTrends = new Map<string, { current: number; previous: number }>();

  // Get all unique competitor IDs from both periods
  const allCompetitorIds = new Set([
    ...Array.from(currentCompMentionsMap.keys()),
    ...Array.from(previousCompMentionsMap.keys()),
  ]);

  allCompetitorIds.forEach((competitorId) => {
    // Get competitor name from current or previous result
    const currentStat = currentCompResult.data?.find((s: any) => s.competitor_id === competitorId);
    const previousStat = previousCompResult.data?.find((s: any) => s.competitor_id === competitorId);
    
    // competitors is a single object from the join (Supabase returns it as an object, not array)
    const currentCompetitor = currentStat?.competitors as { name?: string; is_active?: boolean } | undefined;
    const previousCompetitor = previousStat?.competitors as { name?: string; is_active?: boolean } | undefined;
    
    const competitorName = currentCompetitor?.name || 
                          previousCompetitor?.name || 
                          currentStat?.entity_name || 
                          previousStat?.entity_name || 
                          "Unknown";

    if (!competitorTrends.has(competitorName)) {
      competitorTrends.set(competitorName, { current: 0, previous: 0 });
    }

    competitorTrends.get(competitorName)!.current += currentCompMentionsMap.get(competitorId) || 0;
    competitorTrends.get(competitorName)!.previous += previousCompMentionsMap.get(competitorId) || 0;
  });

  // Calculate percentage trends
  const competitorTrendsList = Array.from(competitorTrends.entries())
    .filter(([_, stats]) => stats.current > 0 || stats.previous > 0) // Only include competitors with mentions
    .map(([name, stats]) => {
      const currentShare = currentTotal > 0 ? (stats.current / currentTotal) * 100 : 0;
      const previousShare = previousTotal > 0 ? (stats.previous / previousTotal) * 100 : 0;
      const trend = currentShare - previousShare;

      return {
        name,
        trend: Number(trend.toFixed(1)),
        currentMentions: stats.current,
        previousMentions: stats.previous,
      };
    });

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

  // Calculate date range (default to last 30 days ending yesterday)
  // Today's data won't be available until tomorrow, so max date is yesterday
  const endDate = toDate || getYesterday();
  const startDate = fromDate || (() => {
    const date = getYesterday();
    date.setDate(date.getDate() - 29); // 30 days total including yesterday
    date.setHours(0, 0, 0, 0);
    return date;
  })();

  // Get competitor info if selected
  let competitorName = "";
  let competitorDomain = "";
  let competitorColor: string | undefined = undefined;

  if (competitorId) {
    const { data: compData } = await supabase
      .from("competitors")
      .select("name, domain, color")
      .eq("id", competitorId)
      .single();

    competitorName = compData?.name || "Competitor";
    competitorDomain = compData?.domain || "";
    competitorColor = compData?.color || undefined;
  }

  // Use optimized SQL function
  // Note: The SQL function handles platform mapping (chatgpt->openai, anthropic->claude)
  // and region GLOBAL (sums all regions)
  // Ensure endDate is set to end of day
  const endDateForQuery = new Date(endDate);
  endDateForQuery.setHours(23, 59, 59, 999);
  
  const { data: dailyMentions, error } = await supabase.rpc("get_daily_mentions_evolution", {
    p_project_id: projectId,
    p_competitor_id: competitorId || null,
    p_from_date: startDate.toISOString(),
    p_to_date: endDateForQuery.toISOString(),
    p_platform: platform && platform !== "all" ? platform : null,
    p_region: region && region !== "GLOBAL" ? region : null, // NULL means GLOBAL (sum all)
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
      brandColor: project?.color || undefined,
      competitorName,
      competitorDomain,
      competitorColor,
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
    brandColor: project?.color || undefined,
    competitorName,
    competitorDomain,
    competitorColor,
  };
}

// =============================================
// SHARE EVOLUTION (ALL ENTITIES OVER TIME)
// =============================================

/**
 * Get share evolution data for all entities (brand + all competitors) over time
 * Returns daily share percentages for stacked area chart
 */
export async function getShareEvolution(
  projectId: string,
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
  const endDate = toDate || getYesterday();
  const startDate = fromDate || (() => {
    const date = getYesterday();
    date.setDate(date.getDate() - 29);
    date.setHours(0, 0, 0, 0);
    return date;
  })();

  // Map platform filter
  const mappedPlatform = mapPlatformToDatabase(platform);
  const platformFilter = mappedPlatform !== null;
  const regionFilter = region && region !== "GLOBAL";
  const topicFilter = topicId && topicId !== "all";

  const startDateStr = format(startDate, "yyyy-MM-dd");
  const endDateStr = format(endDate, "yyyy-MM-dd");

  // Build query for daily stats
  let query = supabase
    .from("daily_brand_stats")
    .select("stat_date, entity_type, competitor_id, mentions_count, entity_name")
    .eq("project_id", projectId)
    .gte("stat_date", startDateStr)
    .lte("stat_date", endDateStr);

  if (platformFilter) {
    query = query.eq("platform", mappedPlatform);
  }
  if (regionFilter) {
    query = query.eq("region", region);
  }
  if (topicFilter) {
    query = query.eq("topic_id", topicId);
  }

  const { data: stats, error } = await query;

  if (error) {
    console.error("Error fetching share evolution:", error);
    return { data: [], entities: [] };
  }

  // Get active competitors
  const { data: competitors } = await supabase
    .from("competitors")
    .select("id, name, domain, color")
    .eq("project_id", projectId)
    .eq("is_active", true);

  // Create entity list (brand + competitors)
  const entityList = [
    { id: "brand", name: project?.name || "Your Brand", domain: project?.client_url || "", color: project?.color || undefined, isBrand: true },
    ...(competitors || []).map((c: any) => ({ id: c.id, name: c.name, domain: c.domain || "", color: c.color || undefined, isBrand: false })),
  ];

  // Group stats by date
  const allDays = eachDayOfInterval({ start: startDate, end: endDate });
  const dailyData = allDays.map((day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    const dayStats = stats?.filter((s: any) => s.stat_date === dayStr) || [];

    // Calculate mentions for each entity
    const entityMentions: Record<string, number> = {};
    let totalMentions = 0;

    // Brand mentions
    const brandMentions = dayStats
      .filter((s: any) => s.entity_type === "brand" && !s.competitor_id)
      .reduce((sum: number, s: any) => sum + (s.mentions_count || 0), 0);
    entityMentions["brand"] = brandMentions;
    totalMentions += brandMentions;

    // Competitor mentions
    competitors?.forEach((comp: any) => {
      const compMentions = dayStats
        .filter((s: any) => s.entity_type === "competitor" && s.competitor_id === comp.id)
        .reduce((sum: number, s: any) => sum + (s.mentions_count || 0), 0);
      entityMentions[comp.id] = compMentions;
      totalMentions += compMentions;
    });

    // Calculate percentages
    const result: any = {
      date: format(day, "MMM dd"),
      fullDate: dayStr,
      total: totalMentions,
    };

    entityList.forEach((entity) => {
      const mentions = entityMentions[entity.id] || 0;
      result[entity.id] = totalMentions > 0 ? Number(((mentions / totalMentions) * 100).toFixed(1)) : 0;
      result[`${entity.id}_mentions`] = mentions;
    });

    return result;
  });

  return {
    data: dailyData,
    entities: entityList,
  };
}

// =============================================
// PLATFORM PERFORMANCE
// =============================================

/**
 * Get mentions breakdown by platform for each entity
 * Returns data for heatmap visualization
 */
export async function getPlatformPerformance(
  projectId: string,
  fromDate?: Date,
  toDate?: Date,
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
  const endDate = toDate || getYesterday();
  const startDate = fromDate || (() => {
    const date = getYesterday();
    date.setDate(date.getDate() - 29);
    date.setHours(0, 0, 0, 0);
    return date;
  })();

  const regionFilter = region && region !== "GLOBAL";
  const topicFilter = topicId && topicId !== "all";

  const startDateStr = format(startDate, "yyyy-MM-dd");
  const endDateStr = format(endDate, "yyyy-MM-dd");

  // Get stats grouped by entity and platform
  let query = supabase
    .from("daily_brand_stats")
    .select("entity_type, competitor_id, entity_name, platform, mentions_count")
    .eq("project_id", projectId)
    .gte("stat_date", startDateStr)
    .lte("stat_date", endDateStr);

  if (regionFilter) {
    query = query.eq("region", region);
  }
  if (topicFilter) {
    query = query.eq("topic_id", topicId);
  }

  const { data: stats, error } = await query;

  if (error) {
    console.error("Error fetching platform performance:", error);
    return { data: [], platforms: [], entities: [] };
  }

  // Get active competitors
  const { data: competitors } = await supabase
    .from("competitors")
    .select("id, name, domain")
    .eq("project_id", projectId)
    .eq("is_active", true);

  // Define platforms
  const platforms = ["openai", "claude", "gemini", "perplexity"];
  const platformLabels: Record<string, string> = {
    openai: "ChatGPT",
    claude: "Claude",
    gemini: "Gemini",
    perplexity: "Perplexity",
  };

  // Create entity list
  const entityList = [
    { id: "brand", name: project?.name || "Your Brand", domain: project?.client_url || "", isBrand: true },
    ...(competitors || []).map((c: any) => ({ id: c.id, name: c.name, domain: c.domain || "", isBrand: false })),
  ];

  // Aggregate mentions by entity and platform
  const performanceData = entityList.map((entity) => {
    const platformMentions: Record<string, number> = {};
    let totalMentions = 0;

    platforms.forEach((platform) => {
      let mentions = 0;

      if (entity.isBrand) {
        mentions = (stats || [])
          .filter((s: any) => s.entity_type === "brand" && !s.competitor_id && s.platform === platform)
          .reduce((sum: number, s: any) => sum + (s.mentions_count || 0), 0);
      } else {
        mentions = (stats || [])
          .filter((s: any) => s.entity_type === "competitor" && s.competitor_id === entity.id && s.platform === platform)
          .reduce((sum: number, s: any) => sum + (s.mentions_count || 0), 0);
      }

      platformMentions[platform] = mentions;
      totalMentions += mentions;
    });

    return {
      id: entity.id,
      name: entity.name,
      domain: entity.domain,
      isBrand: entity.isBrand,
      total: totalMentions,
      ...platformMentions,
    };
  });

  return {
    data: performanceData,
    platforms: platforms.map((p) => ({ id: p, label: platformLabels[p] })),
    entities: entityList,
  };
}
