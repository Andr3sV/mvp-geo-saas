"use server";

import { createClient } from "@/lib/supabase/server";
import { PLATFORMS } from "@/lib/constants/platforms";
import { getRegionIdByCode } from "@/lib/actions/regions";

/**
 * Get yesterday's date (end of day is yesterday, not today, since today's data won't be available until tomorrow)
 */
function getYesterday(): Date {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(23, 59, 59, 999);
  return yesterday;
}

/**
 * Get real-time stats for today (after 4:30 AM cutoff) aggregated by platform
 * Used to supplement daily_brand_stats when querying current day
 */
async function getTodayRealTimeStatsByPlatform(
  projectId: string,
  platform?: string,
  region?: string,
  topicId?: string
): Promise<Array<{
  platform: string;
  entity_type: "brand" | "competitor";
  competitor_id: string | null;
  mentions_count: number;
  citations_count: number;
}>> {
  const supabase = await createClient();
  const { format } = await import("date-fns");
  const today = new Date();
  const cutoffTime = new Date(today);
  cutoffTime.setHours(4, 30, 0, 0); // 4:30 AM today (UTC)

  // Get brand_mentions created after 4:30 AM today
  let mentionsQuery = supabase
    .from("brand_mentions")
    .select("created_at, brand_type, competitor_id, ai_response_id")
    .eq("project_id", projectId)
    .gte("created_at", cutoffTime.toISOString())
    .lte("created_at", today.toISOString());

  const { data: brandMentions } = await mentionsQuery;

  // Get citations created after 4:30 AM today
  let citationsQuery = supabase
    .from("citations")
    .select("created_at, citation_type, competitor_id, ai_response_id")
    .eq("project_id", projectId)
    .gte("created_at", cutoffTime.toISOString())
    .lte("created_at", today.toISOString());

  const { data: citations } = await citationsQuery;

  // Get ai_response_ids
  const aiResponseIds = new Set<string>();
  brandMentions?.forEach((m: any) => {
    if (m.ai_response_id) aiResponseIds.add(m.ai_response_id);
  });
  citations?.forEach((c: any) => {
    if (c.ai_response_id) aiResponseIds.add(c.ai_response_id);
  });

  if (aiResponseIds.size === 0) {
    return [];
  }

  // Convert region code to region_id if needed
  let regionId: string | null = null;
  if (region && region !== "GLOBAL" && region !== "all") {
    regionId = await getRegionIdByCode(projectId, region);
  }

  // Fetch ai_responses with prompt_tracking data (including region_id and regions join)
  let aiResponsesQuery = supabase
    .from("ai_responses")
    .select("id, platform, prompt_tracking(region_id, topic_id, regions:region_id(code))")
    .in("id", Array.from(aiResponseIds));

  // Apply platform filter if provided
  if (platform && platform !== "all") {
    // Map frontend platform to database platform
    const platformMap: Record<string, string> = {
      chatgpt: "openai",
      anthropic: "claude",
      gemini: "gemini",
      perplexity: "perplexity",
    };
    const mappedPlatform = platformMap[platform] || platform;
    aiResponsesQuery = aiResponsesQuery.eq("platform", mappedPlatform);
  }

  const { data: aiResponses } = await aiResponsesQuery;

  // Filter by region_id and topic_id after fetching
  let filteredAiResponses = aiResponses || [];
  if (regionId) {
    filteredAiResponses = filteredAiResponses.filter((ar: any) => {
      const pt = ar.prompt_tracking;
      // Handle both array and object cases for Supabase joins
      const tracking = Array.isArray(pt) ? pt[0] : pt;
      return tracking?.region_id === regionId;
    });
  }
  if (topicId && topicId !== "all") {
    filteredAiResponses = filteredAiResponses.filter((ar: any) => {
      const pt = ar.prompt_tracking;
      const tracking = Array.isArray(pt) ? pt[0] : pt;
      return tracking?.topic_id === topicId;
    });
  }

  // Create map for quick lookup
  const aiResponseMap = new Map<string, any>();
  filteredAiResponses.forEach((ar: any) => {
    const pt = ar.prompt_tracking;
    const tracking = Array.isArray(pt) ? pt[0] : pt;
    const regions = tracking?.regions;
    const regionCode = Array.isArray(regions) ? regions[0]?.code : regions?.code;
    aiResponseMap.set(ar.id, {
      platform: ar.platform || "all",
      region: regionCode || "GLOBAL",
      topic_id: tracking?.topic_id || "all",
    });
  });

  // Get competitors
  const { data: competitors } = await supabase
    .from("competitors")
    .select("id, name")
    .eq("project_id", projectId)
    .eq("is_active", true);

  // Aggregate by platform, entity and dimensions
  const statsMap = new Map<string, {
    platform: string;
    entity_type: "brand" | "competitor";
    competitor_id: string | null;
    mentions_count: number;
    citations_count: number;
  }>();

  // Process brand mentions
  brandMentions?.forEach((mention: any) => {
    const aiResponseData = aiResponseMap.get(mention.ai_response_id);
    if (!aiResponseData) return; // Skip if filtered out

    const mentionPlatform = aiResponseData.platform;
    // Only include openai and gemini for platform breakdown
    if (mentionPlatform !== "openai" && mentionPlatform !== "gemini") return;

    const key = `${mention.brand_type === "client" ? "brand" : mention.competitor_id || "unknown"}-${mentionPlatform}`;
    
    if (!statsMap.has(key)) {
      statsMap.set(key, {
        platform: mentionPlatform,
        entity_type: mention.brand_type === "client" ? "brand" : "competitor",
        competitor_id: mention.brand_type === "client" ? null : mention.competitor_id,
        mentions_count: 0,
        citations_count: 0,
      });
    }
    statsMap.get(key)!.mentions_count++;
  });

  // Process citations
  citations?.forEach((citation: any) => {
    const aiResponseData = aiResponseMap.get(citation.ai_response_id);
    if (!aiResponseData) return; // Skip if filtered out

    const citationPlatform = aiResponseData.platform;
    // Only include openai and gemini for platform breakdown
    if (citationPlatform !== "openai" && citationPlatform !== "gemini") return;

    const key = `${citation.citation_type === "brand" ? "brand" : citation.competitor_id || "unknown"}-${citationPlatform}`;
    
    if (!statsMap.has(key)) {
      statsMap.set(key, {
        platform: citationPlatform,
        entity_type: citation.citation_type === "brand" ? "brand" : "competitor",
        competitor_id: citation.citation_type === "brand" ? null : citation.competitor_id,
        mentions_count: 0,
        citations_count: 0,
      });
    }
    statsMap.get(key)!.citations_count++;
  });

  return Array.from(statsMap.values());
}

// =============================================
// PLATFORM OVERVIEW
// =============================================

/**
 * Get total mentions/citations per platform with percentages and trends
 */
export async function getPlatformOverview(
  projectId: string,
  fromDate?: Date,
  toDate?: Date,
  region?: string,
  topicId?: string
) {
  const supabase = await createClient();
  const { format } = await import("date-fns");

  // Calculate date range
  const endDate = toDate || getYesterday();
  const startDate = fromDate || (() => {
    const date = getYesterday();
    date.setDate(date.getDate() - 29);
    date.setHours(0, 0, 0, 0);
    return date;
  })();

  // Check if we're querying today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDateOnly = new Date(endDate);
  endDateOnly.setHours(0, 0, 0, 0);
  const isQueryingToday = endDateOnly.getTime() === today.getTime();

  // Calculate previous period for trends
  const periodDuration = endDate.getTime() - startDate.getTime();
  const previousEndDate = new Date(startDate);
  const previousStartDate = new Date(previousEndDate.getTime() - periodDuration);

  const regionFilter = region && region !== "GLOBAL";
  const topicFilter = topicId && topicId !== "all";

  const startDateStr = format(startDate, "yyyy-MM-dd");
  const endDateStr = format(endDate, "yyyy-MM-dd");
  const previousStartStr = format(previousStartDate, "yyyy-MM-dd");
  const previousEndStr = format(previousEndDate, "yyyy-MM-dd");

  // Get region_id if region filter is active
  let regionId: string | null = null;
  if (regionFilter && region) {
    regionId = await getRegionIdByCode(projectId, region);
  }

  // Build query helper
  const buildQuery = (start: string, end: string) => {
    let query = supabase
      .from("daily_brand_stats")
      .select("platform, mentions_count, citations_count")
      .eq("project_id", projectId)
      .gte("stat_date", start)
      .lte("stat_date", end)
      .in("platform", ["openai", "gemini"]);

    if (regionFilter && regionId) {
      query = query.eq("region_id", regionId);
    }
    if (topicFilter) {
      query = query.eq("topic_id", topicId);
    }

    return query;
  };

  const [currentResult, previousResult] = await Promise.all([
    buildQuery(startDateStr, endDateStr),
    buildQuery(previousStartStr, previousEndStr),
  ]);

  if (currentResult.error) {
    console.error("Error fetching platform overview:", currentResult.error);
    return { platforms: [], totalMentions: 0, totalCitations: 0 };
  }

  // Aggregate by platform - current period
  const currentByPlatform: Record<string, { mentions: number; citations: number }> = {
    openai: { mentions: 0, citations: 0 },
    gemini: { mentions: 0, citations: 0 },
  };

  currentResult.data?.forEach((stat: any) => {
    if (stat.platform && currentByPlatform[stat.platform]) {
      currentByPlatform[stat.platform].mentions += stat.mentions_count || 0;
      currentByPlatform[stat.platform].citations += stat.citations_count || 0;
    }
  });

  // Supplement with real-time data for today if querying today
  if (isQueryingToday) {
    const realTimeStats = await getTodayRealTimeStatsByPlatform(projectId, undefined, region, topicId);
    
    realTimeStats.forEach((stat) => {
      if (stat.platform && currentByPlatform[stat.platform]) {
        currentByPlatform[stat.platform].mentions += stat.mentions_count || 0;
        currentByPlatform[stat.platform].citations += stat.citations_count || 0;
      }
    });
  }

  // Aggregate by platform - previous period
  const previousByPlatform: Record<string, { mentions: number; citations: number }> = {
    openai: { mentions: 0, citations: 0 },
    gemini: { mentions: 0, citations: 0 },
  };

  previousResult.data?.forEach((stat: any) => {
    if (stat.platform && previousByPlatform[stat.platform]) {
      previousByPlatform[stat.platform].mentions += stat.mentions_count || 0;
      previousByPlatform[stat.platform].citations += stat.citations_count || 0;
    }
  });

  // Calculate totals and percentages
  const totalMentions = Object.values(currentByPlatform).reduce((sum, p) => sum + p.mentions, 0);
  const totalCitations = Object.values(currentByPlatform).reduce((sum, p) => sum + p.citations, 0);
  const previousTotalMentions = Object.values(previousByPlatform).reduce((sum, p) => sum + p.mentions, 0);

  const platforms = Object.entries(PLATFORMS).map(([id, config]) => {
    const current = currentByPlatform[id] || { mentions: 0, citations: 0 };
    const previous = previousByPlatform[id] || { mentions: 0, citations: 0 };

    const currentShare = totalMentions > 0 ? (current.mentions / totalMentions) * 100 : 0;
    const previousShare = previousTotalMentions > 0 ? (previous.mentions / previousTotalMentions) * 100 : 0;
    const trend = currentShare - previousShare;

    return {
      ...config,
      mentions: current.mentions,
      citations: current.citations,
      share: Number(currentShare.toFixed(1)),
      trend: Number(trend.toFixed(1)),
    };
  });

  return {
    platforms,
    totalMentions,
    totalCitations,
  };
}

// =============================================
// PLATFORM EVOLUTION
// =============================================

/**
 * Get daily mentions by platform for evolution chart
 */
export async function getPlatformEvolution(
  projectId: string,
  fromDate?: Date,
  toDate?: Date,
  region?: string,
  topicId?: string
) {
  const supabase = await createClient();
  const { format, eachDayOfInterval } = await import("date-fns");

  const endDate = toDate || getYesterday();
  const startDate = fromDate || (() => {
    const date = getYesterday();
    date.setDate(date.getDate() - 29);
    date.setHours(0, 0, 0, 0);
    return date;
  })();

  // Check if we're querying today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDateOnly = new Date(endDate);
  endDateOnly.setHours(0, 0, 0, 0);
  const isQueryingToday = endDateOnly.getTime() === today.getTime();

  const regionFilter = region && region !== "GLOBAL";
  const topicFilter = topicId && topicId !== "all";

  // Get region_id if region filter is active
  let regionId: string | null = null;
  if (regionFilter && region) {
    regionId = await getRegionIdByCode(projectId, region);
  }

  const startDateStr = format(startDate, "yyyy-MM-dd");
  const endDateStr = format(endDate, "yyyy-MM-dd");

  let query = supabase
    .from("daily_brand_stats")
    .select("stat_date, platform, mentions_count")
    .eq("project_id", projectId)
    .gte("stat_date", startDateStr)
    .lte("stat_date", endDateStr)
    .in("platform", ["openai", "gemini"]);

  if (regionFilter && regionId) {
    query = query.eq("region_id", regionId);
  }
  if (topicFilter) {
    query = query.eq("topic_id", topicId);
  }

  const { data: stats, error } = await query;

  if (error) {
    console.error("Error fetching platform evolution:", error);
    return [];
  }

  // Supplement with real-time data for today if querying today
  let realTimeStats: any[] = [];
  if (isQueryingToday) {
    const realTimeData = await getTodayRealTimeStatsByPlatform(projectId, undefined, region, topicId);
    const todayStr = format(today, "yyyy-MM-dd");
    
    // Aggregate real-time stats by platform for today
    const realTimeByPlatform: Record<string, number> = {
      openai: 0,
      gemini: 0,
    };
    
    realTimeData.forEach((stat) => {
      if (stat.platform && realTimeByPlatform.hasOwnProperty(stat.platform)) {
        realTimeByPlatform[stat.platform] += stat.mentions_count || 0;
      }
    });

    // Add to stats array for today
    Object.entries(realTimeByPlatform).forEach(([platform, count]) => {
      if (count > 0) {
        realTimeStats.push({
          stat_date: todayStr,
          platform,
          mentions_count: count,
        });
      }
    });
  }

  // Merge daily stats with real-time stats
  let allStats = [...(stats || [])];
  if (isQueryingToday && realTimeStats.length > 0) {
    const todayStr = format(today, "yyyy-MM-dd");
    const todayDailyStats = allStats.filter((s: any) => s.stat_date === todayStr);
    const todayRealTimeStats = realTimeStats.filter((s: any) => s.stat_date === todayStr);
    
    // Merge by platform
    const mergedTodayStats = new Map<string, any>();
    todayDailyStats.forEach((stat: any) => {
      const key = stat.platform;
      mergedTodayStats.set(key, { ...stat });
    });
    
    todayRealTimeStats.forEach((stat: any) => {
      const key = stat.platform;
      if (mergedTodayStats.has(key)) {
        mergedTodayStats.get(key)!.mentions_count += stat.mentions_count;
      } else {
        mergedTodayStats.set(key, { ...stat });
      }
    });
    
    // Replace today's stats in allStats
    const otherDaysStats = allStats.filter((s: any) => s.stat_date !== todayStr);
    allStats = [...otherDaysStats, ...Array.from(mergedTodayStats.values())];
  }

  // Generate all days in range
  const allDays = eachDayOfInterval({ start: startDate, end: endDate });

  const dailyData = allDays.map((day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    const dayStats = allStats.filter((s: any) => s.stat_date === dayStr);

    const openaiMentions = dayStats
      .filter((s: any) => s.platform === "openai")
      .reduce((sum: number, s: any) => sum + (s.mentions_count || 0), 0);

    const geminiMentions = dayStats
      .filter((s: any) => s.platform === "gemini")
      .reduce((sum: number, s: any) => sum + (s.mentions_count || 0), 0);

    return {
      date: format(day, "MMM dd"),
      fullDate: dayStr,
      openai: openaiMentions,
      gemini: geminiMentions,
      total: openaiMentions + geminiMentions,
    };
  });

  return dailyData;
}

// =============================================
// PLATFORM ENTITY BREAKDOWN
// =============================================

/**
 * Get brand vs competitors breakdown per platform
 */
export async function getPlatformEntityBreakdown(
  projectId: string,
  fromDate?: Date,
  toDate?: Date,
  region?: string,
  topicId?: string
) {
  const supabase = await createClient();
  const { format } = await import("date-fns");

  const endDate = toDate || getYesterday();
  const startDate = fromDate || (() => {
    const date = getYesterday();
    date.setDate(date.getDate() - 29);
    date.setHours(0, 0, 0, 0);
    return date;
  })();

  // Check if we're querying today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDateOnly = new Date(endDate);
  endDateOnly.setHours(0, 0, 0, 0);
  const isQueryingToday = endDateOnly.getTime() === today.getTime();

  const regionFilter = region && region !== "GLOBAL";
  const topicFilter = topicId && topicId !== "all";

  // Get region_id if region filter is active
  let regionId: string | null = null;
  if (regionFilter && region) {
    regionId = await getRegionIdByCode(projectId, region);
  }

  const startDateStr = format(startDate, "yyyy-MM-dd");
  const endDateStr = format(endDate, "yyyy-MM-dd");

  // Get project info
  const { data: project } = await supabase
    .from("projects")
    .select("name, client_url")
    .eq("id", projectId)
    .single();

  // Get all stats
  let query = supabase
    .from("daily_brand_stats")
    .select("platform, entity_type, competitor_id, entity_name, mentions_count, competitors(id, name, domain, is_active)")
    .eq("project_id", projectId)
    .gte("stat_date", startDateStr)
    .lte("stat_date", endDateStr)
    .in("platform", ["openai", "gemini"]);

  if (regionFilter && regionId) {
    query = query.eq("region_id", regionId);
  }
  if (topicFilter) {
    query = query.eq("topic_id", topicId);
  }

  const { data: stats, error } = await query;

  // Supplement with real-time data for today if querying today
  let realTimeStats: any[] = [];
  if (isQueryingToday && !error) {
    const realTimeData = await getTodayRealTimeStatsByPlatform(projectId, undefined, region, topicId);
    
    // Get competitor names for real-time stats
    const competitorIds = new Set<string>();
    realTimeData.forEach((stat) => {
      if (stat.entity_type === "competitor" && stat.competitor_id) {
        competitorIds.add(stat.competitor_id);
      }
    });

    if (competitorIds.size > 0) {
      const { data: realTimeCompetitors } = await supabase
        .from("competitors")
        .select("id, name, domain, is_active")
        .in("id", Array.from(competitorIds));

      const competitorMap = new Map<string, any>();
      realTimeCompetitors?.forEach((c: any) => {
        competitorMap.set(c.id, c);
      });

      // Convert to stats format
      realTimeData.forEach((stat) => {
        if (stat.platform === "openai" || stat.platform === "gemini") {
          realTimeStats.push({
            platform: stat.platform,
            entity_type: stat.entity_type,
            competitor_id: stat.competitor_id,
            entity_name: stat.entity_type === "brand" 
              ? (project?.name || "Your Brand")
              : (competitorMap.get(stat.competitor_id || "")?.name || "Unknown"),
            mentions_count: stat.mentions_count,
            competitors: stat.entity_type === "competitor" && stat.competitor_id
              ? competitorMap.get(stat.competitor_id)
              : null,
          });
        }
      });
    }
  }

  // Merge daily stats with real-time stats
  let allStats = [...(stats || [])];
  if (isQueryingToday && realTimeStats.length > 0) {
    // Merge by platform, entity_type, and competitor_id
    const mergedMap = new Map<string, any>();
    
    // Add daily stats
    allStats.forEach((stat: any) => {
      const key = `${stat.platform}-${stat.entity_type}-${stat.competitor_id || "brand"}`;
      mergedMap.set(key, { ...stat });
    });
    
    // Merge real-time stats
    realTimeStats.forEach((stat: any) => {
      const key = `${stat.platform}-${stat.entity_type}-${stat.competitor_id || "brand"}`;
      if (mergedMap.has(key)) {
        mergedMap.get(key)!.mentions_count += stat.mentions_count || 0;
      } else {
        mergedMap.set(key, { ...stat });
      }
    });
    
    allStats = Array.from(mergedMap.values());
  }

  if (error) {
    console.error("Error fetching platform entity breakdown:", error);
    return {
      openai: { entities: [], totalMentions: 0 },
      gemini: { entities: [], totalMentions: 0 },
    };
  }

  // Process data per platform
  const processForPlatform = (platform: string) => {
    const platformStats = allStats.filter((s: any) => s.platform === platform);

    // Brand stats
    const brandMentions = platformStats
      .filter((s: any) => s.entity_type === "brand" && !s.competitor_id)
      .reduce((sum: number, s: any) => sum + (s.mentions_count || 0), 0);

    // Competitor stats
    const competitorMap = new Map<string, { name: string; domain: string; mentions: number }>();
    platformStats
      .filter((s: any) => s.entity_type === "competitor" && s.competitor_id)
      .forEach((s: any) => {
        const comp = s.competitors as any;
        if (!comp?.is_active) return;

        const existing = competitorMap.get(s.competitor_id) || {
          name: comp?.name || s.entity_name || "Unknown",
          domain: comp?.domain || "",
          mentions: 0,
        };
        existing.mentions += s.mentions_count || 0;
        competitorMap.set(s.competitor_id, existing);
      });

    const competitors = Array.from(competitorMap.entries()).map(([id, data]) => ({
      id,
      ...data,
      isBrand: false,
    }));

    const totalMentions = brandMentions + competitors.reduce((sum, c) => sum + c.mentions, 0);

    const entities = [
      {
        id: "brand",
        name: project?.name || "Your Brand",
        domain: project?.client_url || "",
        mentions: brandMentions,
        percentage: totalMentions > 0 ? Number(((brandMentions / totalMentions) * 100).toFixed(1)) : 0,
        isBrand: true,
      },
      ...competitors.map((c) => ({
        ...c,
        percentage: totalMentions > 0 ? Number(((c.mentions / totalMentions) * 100).toFixed(1)) : 0,
      })),
    ];

    // Sort by percentage descending
    entities.sort((a, b) => b.percentage - a.percentage);

    return { entities, totalMentions };
  };

  return {
    openai: processForPlatform("openai"),
    gemini: processForPlatform("gemini"),
  };
}

// =============================================
// TOPIC PERFORMANCE BY PLATFORM
// =============================================

/**
 * Get topic performance matrix by platform
 */
export async function getTopicPerformanceByPlatform(
  projectId: string,
  fromDate?: Date,
  toDate?: Date,
  region?: string
) {
  const supabase = await createClient();
  const { format } = await import("date-fns");

  const endDate = toDate || getYesterday();
  const startDate = fromDate || (() => {
    const date = getYesterday();
    date.setDate(date.getDate() - 29);
    date.setHours(0, 0, 0, 0);
    return date;
  })();

  // Check if we're querying today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDateOnly = new Date(endDate);
  endDateOnly.setHours(0, 0, 0, 0);
  const isQueryingToday = endDateOnly.getTime() === today.getTime();

  const regionFilter = region && region !== "GLOBAL";

  // Get region_id if region filter is active
  let regionId: string | null = null;
  if (regionFilter && region) {
    regionId = await getRegionIdByCode(projectId, region);
  }

  const startDateStr = format(startDate, "yyyy-MM-dd");
  const endDateStr = format(endDate, "yyyy-MM-dd");

  // Get topics
  const { data: topics, error: topicsError } = await supabase
    .from("topics")
    .select("id, name")
    .eq("project_id", projectId)
    .eq("is_active", true);

  if (topicsError || !topics || topics.length === 0) {
    console.log("No topics found for project:", projectId);
    return [];
  }

  // Get ALL stats per topic and platform (brand only - your performance per topic)
  // We need to filter by topic_id being NOT NULL
  let query = supabase
    .from("daily_brand_stats")
    .select("platform, topic_id, mentions_count")
    .eq("project_id", projectId)
    .eq("entity_type", "brand")
    .is("competitor_id", null)
    .not("topic_id", "is", null)
    .gte("stat_date", startDateStr)
    .lte("stat_date", endDateStr)
    .in("platform", ["openai", "gemini"]);

  if (regionFilter && regionId) {
    query = query.eq("region_id", regionId);
  }

  const { data: stats, error } = await query;

  // Supplement with real-time data for today if querying today
  let realTimeStats: any[] = [];
  if (isQueryingToday && !error) {
    const today = new Date();
    const cutoffTime = new Date(today);
    cutoffTime.setHours(4, 30, 0, 0); // 4:30 AM today (UTC)

    // Get brand_mentions created after 4:30 AM today (brand only)
    let realTimeMentionsQuery = supabase
      .from("brand_mentions")
      .select("created_at, brand_type, ai_response_id")
      .eq("project_id", projectId)
      .eq("brand_type", "client")
      .gte("created_at", cutoffTime.toISOString())
      .lte("created_at", today.toISOString());

    const { data: realTimeMentions } = await realTimeMentionsQuery;

    // Get ai_response_ids
    const aiResponseIds = new Set<string>();
    realTimeMentions?.forEach((m: any) => {
      if (m.ai_response_id) aiResponseIds.add(m.ai_response_id);
    });

    if (aiResponseIds.size > 0) {
      // Convert region code to region_id if needed
      let regionId: string | null = null;
      if (regionFilter && region && region !== "GLOBAL") {
        regionId = await getRegionIdByCode(projectId, region);
      }

      let aiResponsesQuery = supabase
        .from("ai_responses")
        .select("id, platform, prompt_tracking(region_id, topic_id, regions:region_id(code))")
        .in("id", Array.from(aiResponseIds));

      const { data: aiResponses } = await aiResponsesQuery;

      // Filter by region_id and topic_id
      let filteredAiResponses = aiResponses || [];
      if (regionId) {
        filteredAiResponses = filteredAiResponses.filter((ar: any) => {
          const pt = ar.prompt_tracking;
          const tracking = Array.isArray(pt) ? pt[0] : pt;
          return tracking?.region_id === regionId;
        });
      }
      // Only include responses with topic_id (not null)
      filteredAiResponses = filteredAiResponses.filter((ar: any) => {
        const pt = ar.prompt_tracking;
        const tracking = Array.isArray(pt) ? pt[0] : pt;
        return tracking?.topic_id !== null && tracking?.topic_id !== undefined;
      });

      // Aggregate by platform and topic_id
      const aiResponseMap = new Set(filteredAiResponses.map((ar: any) => ar.id));
      const topicPlatformMap = new Map<string, { platform: string; mentions: number }>();

      realTimeMentions?.forEach((mention: any) => {
        if (!aiResponseMap.has(mention.ai_response_id)) return;

        const aiResponse = filteredAiResponses.find((ar: any) => ar.id === mention.ai_response_id);
        if (!aiResponse) return;
        
        // Handle both array and object cases for prompt_tracking
        const pt = aiResponse.prompt_tracking;
        const tracking = Array.isArray(pt) ? pt[0] : pt;
        if (!tracking || !tracking.topic_id) return;

        const platform = aiResponse.platform;
        if (platform !== "openai" && platform !== "gemini") return;

        const topicId = tracking.topic_id;
        const key = `${topicId}-${platform}`;
        
        if (!topicPlatformMap.has(key)) {
          topicPlatformMap.set(key, { platform, mentions: 0 });
        }
        topicPlatformMap.get(key)!.mentions++;
      });

      // Convert to stats format
      topicPlatformMap.forEach((value, key) => {
        const [topicIdStr] = key.split("-");
        realTimeStats.push({
          platform: value.platform,
          topic_id: topicIdStr,
          mentions_count: value.mentions,
        });
      });
    }
  }

  // Merge daily stats with real-time stats
  let allStats = [...(stats || [])];
  if (isQueryingToday && realTimeStats.length > 0) {
    // Merge by platform and topic_id
    const mergedMap = new Map<string, any>();
    
    // Add daily stats
    allStats.forEach((stat: any) => {
      const key = `${stat.platform}-${stat.topic_id}`;
      mergedMap.set(key, { ...stat });
    });
    
    // Merge real-time stats
    realTimeStats.forEach((stat: any) => {
      const key = `${stat.platform}-${stat.topic_id}`;
      if (mergedMap.has(key)) {
        mergedMap.get(key)!.mentions_count += stat.mentions_count || 0;
      } else {
        mergedMap.set(key, { ...stat });
      }
    });
    
    allStats = Array.from(mergedMap.values());
  }

  if (error) {
    console.error("Error fetching topic performance:", error);
    return [];
  }

  // Aggregate by topic and platform
  const topicPerformance = (topics || []).map((topic: any) => {
    const topicStats = allStats.filter((s: any) => s.topic_id === topic.id);

    const openaiMentions = topicStats
      .filter((s: any) => s.platform === "openai")
      .reduce((sum: number, s: any) => sum + (s.mentions_count || 0), 0);

    const geminiMentions = topicStats
      .filter((s: any) => s.platform === "gemini")
      .reduce((sum: number, s: any) => sum + (s.mentions_count || 0), 0);

    return {
      id: topic.id,
      name: topic.name,
      openai: openaiMentions,
      gemini: geminiMentions,
      total: openaiMentions + geminiMentions,
    };
  });

  // Sort by total mentions descending
  topicPerformance.sort((a, b) => b.total - a.total);

  return topicPerformance;
}

// =============================================
// PLATFORM CITATION SOURCES
// =============================================

/**
 * Get top cited domains per platform
 */
export async function getPlatformCitationSources(
  projectId: string,
  limit: number = 10,
  fromDate?: Date,
  toDate?: Date,
  region?: string,
  topicId?: string
) {
  const supabase = await createClient();

  const endDate = toDate || getYesterday();
  const startDate = fromDate || (() => {
    const date = getYesterday();
    date.setDate(date.getDate() - 29);
    date.setHours(0, 0, 0, 0);
    return date;
  })();

  // Convert region code to region_id if needed
  let regionId: string | null = null;
  if (region && region !== "GLOBAL" && region !== "all") {
    regionId = await getRegionIdByCode(projectId, region);
  }

  // Get citations with platform info
  let query = supabase
    .from("citations")
    .select("domain, ai_responses!inner(platform, prompt_tracking!inner(project_id, region_id, topic_id, regions:region_id(code)))")
    .eq("ai_responses.prompt_tracking.project_id", projectId)
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString())
    .not("domain", "is", null);

  const { data: citations, error } = await query;

  if (error) {
    console.error("Error fetching platform citation sources:", error);
    return { openai: [], gemini: [] };
  }

  // Filter and aggregate by platform
  const aggregateByPlatform = (platform: string) => {
    const platformCitations = citations?.filter((c: any) => {
      const p = c.ai_responses?.platform;
      const matchesPlatform = p === platform;
      
      // Handle region filter
      let matchesRegion = true;
      if (regionId) {
        const pt = c.ai_responses?.prompt_tracking;
        const tracking = Array.isArray(pt) ? pt[0] : pt;
        matchesRegion = tracking?.region_id === regionId;
      } else if (!region || region === "GLOBAL" || region === "all") {
        matchesRegion = true;
      }
      
      // Handle topic filter
      const pt = c.ai_responses?.prompt_tracking;
      const tracking = Array.isArray(pt) ? pt[0] : pt;
      const matchesTopic = !topicId || topicId === "all" || tracking?.topic_id === topicId;
      
      return matchesPlatform && matchesRegion && matchesTopic;
    }) || [];

    const domainCounts = new Map<string, number>();
    platformCitations.forEach((c: any) => {
      if (c.domain) {
        domainCounts.set(c.domain, (domainCounts.get(c.domain) || 0) + 1);
      }
    });

    return Array.from(domainCounts.entries())
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  };

  return {
    openai: aggregateByPlatform("openai"),
    gemini: aggregateByPlatform("gemini"),
  };
}

// =============================================
// PLATFORM MOMENTUM (for scatter chart)
// =============================================

/**
 * Get momentum data for scatter chart (share vs trend per platform)
 */
export async function getPlatformMomentum(
  projectId: string,
  fromDate?: Date,
  toDate?: Date,
  region?: string,
  topicId?: string
) {
  const supabase = await createClient();
  const { format } = await import("date-fns");

  const endDate = toDate || getYesterday();
  const startDate = fromDate || (() => {
    const date = getYesterday();
    date.setDate(date.getDate() - 29);
    date.setHours(0, 0, 0, 0);
    return date;
  })();

  // Check if we're querying today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDateOnly = new Date(endDate);
  endDateOnly.setHours(0, 0, 0, 0);
  const isQueryingToday = endDateOnly.getTime() === today.getTime();

  // Calculate previous period
  const periodDuration = endDate.getTime() - startDate.getTime();
  const previousEndDate = new Date(startDate);
  const previousStartDate = new Date(previousEndDate.getTime() - periodDuration);

  const regionFilter = region && region !== "GLOBAL";
  const topicFilter = topicId && topicId !== "all";

  const startDateStr = format(startDate, "yyyy-MM-dd");
  const endDateStr = format(endDate, "yyyy-MM-dd");
  const previousStartStr = format(previousStartDate, "yyyy-MM-dd");
  const previousEndStr = format(previousEndDate, "yyyy-MM-dd");

  // Get project info
  const { data: project } = await supabase
    .from("projects")
    .select("name, client_url")
    .eq("id", projectId)
    .single();

  // Get region_id if region filter is active
  let regionId: string | null = null;
  if (regionFilter && region) {
    regionId = await getRegionIdByCode(projectId, region);
  }

  // Build query helper
  const buildQuery = (start: string, end: string) => {
    let query = supabase
      .from("daily_brand_stats")
      .select("platform, entity_type, competitor_id, entity_name, mentions_count, competitors(id, name, domain, is_active)")
      .eq("project_id", projectId)
      .gte("stat_date", start)
      .lte("stat_date", end)
      .in("platform", ["openai", "gemini"]);

    if (regionFilter && regionId) {
      query = query.eq("region_id", regionId);
    }
    if (topicFilter) {
      query = query.eq("topic_id", topicId);
    }

    return query;
  };

  const [currentResult, previousResult] = await Promise.all([
    buildQuery(startDateStr, endDateStr),
    buildQuery(previousStartStr, previousEndStr),
  ]);

  // Supplement current period with real-time data if querying today
  let currentStats = currentResult.data || [];
  if (isQueryingToday && !currentResult.error) {
    const realTimeData = await getTodayRealTimeStatsByPlatform(projectId, undefined, region, topicId);
    
    // Get competitor names for real-time stats
    const competitorIds = new Set<string>();
    realTimeData.forEach((stat) => {
      if (stat.entity_type === "competitor" && stat.competitor_id) {
        competitorIds.add(stat.competitor_id);
      }
    });

    if (competitorIds.size > 0) {
      const { data: realTimeCompetitors } = await supabase
        .from("competitors")
        .select("id, name, domain, is_active")
        .in("id", Array.from(competitorIds));

      const competitorMap = new Map<string, any>();
      realTimeCompetitors?.forEach((c: any) => {
        competitorMap.set(c.id, c);
      });

      // Convert to stats format
      const realTimeStats: any[] = [];
      realTimeData.forEach((stat) => {
        if (stat.platform === "openai" || stat.platform === "gemini") {
          realTimeStats.push({
            platform: stat.platform,
            entity_type: stat.entity_type,
            competitor_id: stat.competitor_id,
            entity_name: stat.entity_type === "brand" 
              ? (project?.name || "Your Brand")
              : (competitorMap.get(stat.competitor_id || "")?.name || "Unknown"),
            mentions_count: stat.mentions_count,
            competitors: stat.entity_type === "competitor" && stat.competitor_id
              ? competitorMap.get(stat.competitor_id)
              : null,
          });
        }
      });

      // Merge by platform, entity_type, and competitor_id
      const mergedMap = new Map<string, any>();
      
      // Add daily stats
      currentStats.forEach((stat: any) => {
        const key = `${stat.platform}-${stat.entity_type}-${stat.competitor_id || "brand"}`;
        mergedMap.set(key, { ...stat });
      });
      
      // Merge real-time stats
      realTimeStats.forEach((stat: any) => {
        const key = `${stat.platform}-${stat.entity_type}-${stat.competitor_id || "brand"}`;
        if (mergedMap.has(key)) {
          mergedMap.get(key)!.mentions_count += stat.mentions_count || 0;
        } else {
          mergedMap.set(key, { ...stat });
        }
      });
      
      currentStats = Array.from(mergedMap.values());
    }
  }

  if (currentResult.error) {
    console.error("Error fetching platform momentum:", currentResult.error);
    return { openai: [], gemini: [] };
  }

  // Process for each platform
  const processForPlatform = (platform: string) => {
    const currentPlatformStats = currentStats.filter((s: any) => s.platform === platform);
    const previousStats = previousResult.data?.filter((s: any) => s.platform === platform) || [];

    // Current period - aggregate by entity
    const currentEntityMap = new Map<string, { name: string; domain: string; mentions: number; isBrand: boolean }>();

    // Brand
    const currentBrandMentions = currentPlatformStats
      .filter((s: any) => s.entity_type === "brand" && !s.competitor_id)
      .reduce((sum: number, s: any) => sum + (s.mentions_count || 0), 0);

    currentEntityMap.set("brand", {
      name: project?.name || "Your Brand",
      domain: project?.client_url || "",
      mentions: currentBrandMentions,
      isBrand: true,
    });

    // Competitors
    currentPlatformStats
      .filter((s: any) => s.entity_type === "competitor" && s.competitor_id)
      .forEach((s: any) => {
        const comp = s.competitors as any;
        if (!comp?.is_active) return;

        const existing = currentEntityMap.get(s.competitor_id) || {
          name: comp?.name || s.entity_name || "Unknown",
          domain: comp?.domain || "",
          mentions: 0,
          isBrand: false,
        };
        existing.mentions += s.mentions_count || 0;
        currentEntityMap.set(s.competitor_id, existing);
      });

    // Previous period - same process
    const previousEntityMap = new Map<string, number>();

    const previousBrandMentions = previousStats
      .filter((s: any) => s.entity_type === "brand" && !s.competitor_id)
      .reduce((sum: number, s: any) => sum + (s.mentions_count || 0), 0);

    previousEntityMap.set("brand", previousBrandMentions);

    previousStats
      .filter((s: any) => s.entity_type === "competitor" && s.competitor_id)
      .forEach((s: any) => {
        const existing = previousEntityMap.get(s.competitor_id) || 0;
        previousEntityMap.set(s.competitor_id, existing + (s.mentions_count || 0));
      });

    // Calculate totals
    const currentTotal = Array.from(currentEntityMap.values()).reduce((sum, e) => sum + e.mentions, 0);
    const previousTotal = Array.from(previousEntityMap.values()).reduce((sum, v) => sum + v, 0);

    // Build entities with share and trend
    const entities = Array.from(currentEntityMap.entries()).map(([id, data]) => {
      const currentShare = currentTotal > 0 ? (data.mentions / currentTotal) * 100 : 0;
      const previousMentions = previousEntityMap.get(id) || 0;
      const previousShare = previousTotal > 0 ? (previousMentions / previousTotal) * 100 : 0;
      const trend = currentShare - previousShare;

      return {
        id,
        name: data.name,
        domain: data.domain,
        mentions: data.mentions,
        percentage: Number(currentShare.toFixed(1)),
        trend: Number(trend.toFixed(1)),
        isBrand: data.isBrand,
      };
    });

    return entities;
  };

  return {
    openai: processForPlatform("openai"),
    gemini: processForPlatform("gemini"),
  };
}
