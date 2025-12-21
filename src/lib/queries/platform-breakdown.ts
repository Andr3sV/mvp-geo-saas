"use server";

import { createClient } from "@/lib/supabase/server";
import { PLATFORMS } from "@/lib/constants/platforms";

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

  // Build query helper
  const buildQuery = (start: string, end: string) => {
    let query = supabase
      .from("daily_brand_stats")
      .select("platform, mentions_count, citations_count")
      .eq("project_id", projectId)
      .gte("stat_date", start)
      .lte("stat_date", end)
      .in("platform", ["openai", "gemini"]);

    if (regionFilter) {
      query = query.eq("region", region);
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

  const regionFilter = region && region !== "GLOBAL";
  const topicFilter = topicId && topicId !== "all";

  const startDateStr = format(startDate, "yyyy-MM-dd");
  const endDateStr = format(endDate, "yyyy-MM-dd");

  let query = supabase
    .from("daily_brand_stats")
    .select("stat_date, platform, mentions_count")
    .eq("project_id", projectId)
    .gte("stat_date", startDateStr)
    .lte("stat_date", endDateStr)
    .in("platform", ["openai", "gemini"]);

  if (regionFilter) {
    query = query.eq("region", region);
  }
  if (topicFilter) {
    query = query.eq("topic_id", topicId);
  }

  const { data: stats, error } = await query;

  if (error) {
    console.error("Error fetching platform evolution:", error);
    return [];
  }

  // Generate all days in range
  const allDays = eachDayOfInterval({ start: startDate, end: endDate });

  const dailyData = allDays.map((day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    const dayStats = stats?.filter((s: any) => s.stat_date === dayStr) || [];

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

  const regionFilter = region && region !== "GLOBAL";
  const topicFilter = topicId && topicId !== "all";

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

  if (regionFilter) {
    query = query.eq("region", region);
  }
  if (topicFilter) {
    query = query.eq("topic_id", topicId);
  }

  const { data: stats, error } = await query;

  if (error) {
    console.error("Error fetching platform entity breakdown:", error);
    return {
      openai: { entities: [], totalMentions: 0 },
      gemini: { entities: [], totalMentions: 0 },
    };
  }

  // Process data per platform
  const processForPlatform = (platform: string) => {
    const platformStats = stats?.filter((s: any) => s.platform === platform) || [];

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

  const regionFilter = region && region !== "GLOBAL";

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

  if (regionFilter) {
    query = query.eq("region", region);
  }

  const { data: stats, error } = await query;

  if (error) {
    console.error("Error fetching topic performance:", error);
    return [];
  }

  // Aggregate by topic and platform
  const topicPerformance = (topics || []).map((topic: any) => {
    const topicStats = stats?.filter((s: any) => s.topic_id === topic.id) || [];

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

  // Get citations with platform info
  let query = supabase
    .from("citations")
    .select("domain, ai_responses!inner(platform, prompt_tracking!inner(project_id, region, topic_id))")
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
      const matchesRegion = !region || region === "GLOBAL" || c.ai_responses?.prompt_tracking?.region === region;
      const matchesTopic = !topicId || topicId === "all" || c.ai_responses?.prompt_tracking?.topic_id === topicId;
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

  // Build query helper
  const buildQuery = (start: string, end: string) => {
    let query = supabase
      .from("daily_brand_stats")
      .select("platform, entity_type, competitor_id, entity_name, mentions_count, competitors(id, name, domain, is_active)")
      .eq("project_id", projectId)
      .gte("stat_date", start)
      .lte("stat_date", end)
      .in("platform", ["openai", "gemini"]);

    if (regionFilter) {
      query = query.eq("region", region);
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
    console.error("Error fetching platform momentum:", currentResult.error);
    return { openai: [], gemini: [] };
  }

  // Process for each platform
  const processForPlatform = (platform: string) => {
    const currentStats = currentResult.data?.filter((s: any) => s.platform === platform) || [];
    const previousStats = previousResult.data?.filter((s: any) => s.platform === platform) || [];

    // Current period - aggregate by entity
    const currentEntityMap = new Map<string, { name: string; domain: string; mentions: number; isBrand: boolean }>();

    // Brand
    const currentBrandMentions = currentStats
      .filter((s: any) => s.entity_type === "brand" && !s.competitor_id)
      .reduce((sum: number, s: any) => sum + (s.mentions_count || 0), 0);

    currentEntityMap.set("brand", {
      name: project?.name || "Your Brand",
      domain: project?.client_url || "",
      mentions: currentBrandMentions,
      isBrand: true,
    });

    // Competitors
    currentStats
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
