"use server";

import { createClient } from "@/lib/supabase/server";
import { format, subDays, eachDayOfInterval } from "date-fns";

// =============================================
// DAILY BRAND STATS QUERIES
// =============================================
// These queries use the pre-aggregated daily_brand_stats table
// for optimized performance on large datasets.
// Fallback to real-time queries from brand_mentions/citations when needed.

export interface DailyStats {
  stat_date: string;
  entity_type: "brand" | "competitor";
  competitor_id: string | null;
  entity_name: string;
  mentions_count: number;
  citations_count: number;
  responses_analyzed: number;
}

export interface ShareOfVoiceData {
  date: string;
  entity_name: string;
  entity_type: "brand" | "competitor";
  competitor_id: string | null;
  mentions: number;
  share_percentage: number;
}

// =============================================
// GET DAILY STATS
// =============================================

/**
 * Get pre-aggregated daily stats for a project
 * Uses the daily_brand_stats table for fast queries
 * For current day, supplements with real-time data after 4:30 AM
 */
export async function getDailyStats(
  projectId: string,
  startDate?: Date,
  endDate?: Date,
  platform?: string,
  region?: string,
  topicId?: string
): Promise<DailyStats[]> {
  const supabase = await createClient();

  const start = startDate || subDays(new Date(), 30);
  const end = endDate || new Date();

  // Check if we're querying today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDateOnly = new Date(end);
  endDateOnly.setHours(0, 0, 0, 0);
  const isQueryingToday = endDateOnly.getTime() === today.getTime();

  // Get daily stats from pre-aggregated table
  const { data: dailyStats, error } = await supabase.rpc("get_daily_stats", {
    p_project_id: projectId,
    p_start_date: format(start, "yyyy-MM-dd"),
    p_end_date: format(end, "yyyy-MM-dd"),
  });

  if (error) {
    console.error("Error fetching daily stats:", error);
    // Fallback to real-time query
    return getDailyStatsRealTime(projectId, start, end);
  }

  // If querying today, supplement with real-time data after 4:30 AM
  if (isQueryingToday) {
    const realTimeStats = await getTodayRealTimeStats(projectId, platform, region, topicId);
    return mergeDailyStats(dailyStats || [], realTimeStats);
  }

  return dailyStats || [];
}

// =============================================
// GET SHARE OF VOICE TREND
// =============================================

/**
 * Get share of voice trend over time from pre-aggregated data
 */
export async function getShareOfVoiceTrend(
  projectId: string,
  days: number = 30
): Promise<ShareOfVoiceData[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_share_of_voice_trend", {
    p_project_id: projectId,
    p_days: days,
  });

  if (error) {
    console.error("Error fetching share of voice trend:", error);
    return [];
  }

  return data || [];
}

// =============================================
// AGGREGATED METRICS FROM DAILY STATS
// =============================================

/**
 * Get sentiment metrics from brand_evaluations table
 * Aggregates by entity (brand/competitor) and date range
 */
async function getSentimentFromBrandEvaluations(
  projectId: string,
  startDate?: Date,
  endDate?: Date
): Promise<Map<string, {
  sentiment_positive: number;
  sentiment_neutral: number;
  sentiment_negative: number;
  sentiment_mixed: number;
  total_sentiment_score: number;
  count: number;
}>> {
  const supabase = await createClient();
  const sentimentMap = new Map<string, {
    sentiment_positive: number;
    sentiment_neutral: number;
    sentiment_negative: number;
    sentiment_mixed: number;
    total_sentiment_score: number;
    count: number;
  }>();

  let query = supabase
    .from("brand_evaluations")
    .select("entity_type, competitor_id, sentiment, sentiment_score")
    .eq("project_id", projectId);

  if (startDate) {
    query = query.gte("created_at", startDate.toISOString());
  }

  if (endDate) {
    // Add one day and subtract 1ms to include the entire end date
    const endDatePlusOne = new Date(endDate);
    endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
    endDatePlusOne.setMilliseconds(endDatePlusOne.getMilliseconds() - 1);
    query = query.lte("created_at", endDatePlusOne.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching sentiment from brand_evaluations:", error);
    return sentimentMap;
  }

  // Aggregate sentiment by entity
  (data || []).forEach((eval_) => {
    const key = eval_.entity_type === "brand" ? "brand" : eval_.competitor_id || "unknown";

    if (!sentimentMap.has(key)) {
      sentimentMap.set(key, {
        sentiment_positive: 0,
        sentiment_neutral: 0,
        sentiment_negative: 0,
        sentiment_mixed: 0,
        total_sentiment_score: 0,
        count: 0,
      });
    }

    const entry = sentimentMap.get(key)!;
    entry.count++;

    if (eval_.sentiment === "positive") {
      entry.sentiment_positive++;
    } else if (eval_.sentiment === "neutral") {
      entry.sentiment_neutral++;
    } else if (eval_.sentiment === "negative") {
      entry.sentiment_negative++;
    } else if (eval_.sentiment === "mixed") {
      entry.sentiment_mixed++;
    }

    if (eval_.sentiment_score !== null) {
      entry.total_sentiment_score += eval_.sentiment_score;
    }
  });

  return sentimentMap;
}

/**
 * Get total mentions for brand and competitors over a period
 * Now includes sentiment from brand_evaluations instead of daily_brand_stats
 */
export async function getMentionsSummary(
  projectId: string,
  startDate?: Date,
  endDate?: Date,
  platform?: string,
  region?: string,
  topicId?: string
) {
  const stats = await getDailyStats(projectId, startDate, endDate, platform, region, topicId);
  const sentimentData = await getSentimentFromBrandEvaluations(projectId, startDate, endDate);

  // Aggregate by entity
  const summary = new Map<
    string,
    {
      entity_type: "brand" | "competitor";
      entity_name: string;
      competitor_id: string | null;
      total_mentions: number;
      total_citations: number;
      sentiment_positive: number;
      sentiment_neutral: number;
      sentiment_negative: number;
      avg_sentiment: number | null;
    }
  >();

  stats.forEach((stat) => {
    const key = stat.entity_type === "brand" ? "brand" : stat.competitor_id!;

    if (!summary.has(key)) {
      summary.set(key, {
        entity_type: stat.entity_type,
        entity_name: stat.entity_name,
        competitor_id: stat.competitor_id,
        total_mentions: 0,
        total_citations: 0,
        sentiment_positive: 0,
        sentiment_neutral: 0,
        sentiment_negative: 0,
        avg_sentiment: null,
      });
    }

    const entry = summary.get(key)!;
    entry.total_mentions += stat.mentions_count;
    entry.total_citations += stat.citations_count;
  });

  // Add sentiment data from brand_evaluations
  sentimentData.forEach((sentiment, key) => {
    if (!summary.has(key)) {
      // If we don't have stats for this entity, create entry with just sentiment
      summary.set(key, {
        entity_type: key === "brand" ? "brand" : "competitor",
        entity_name: "",
        competitor_id: key === "brand" ? null : key,
        total_mentions: 0,
        total_citations: 0,
        sentiment_positive: 0,
        sentiment_neutral: 0,
        sentiment_negative: 0,
        avg_sentiment: null,
      });
    }

    const entry = summary.get(key)!;
    entry.sentiment_positive += sentiment.sentiment_positive;
    entry.sentiment_neutral += sentiment.sentiment_neutral;
    entry.sentiment_negative += sentiment.sentiment_negative;
    // Note: mixed sentiment is not included in the counts, but we could add it if needed
  });

  // Calculate average sentiment for each entity
  summary.forEach((entry) => {
    const totalSentiment =
      entry.sentiment_positive + entry.sentiment_neutral + entry.sentiment_negative;
    if (totalSentiment > 0) {
      // Simple average: positive = 1, neutral = 0, negative = -1
      entry.avg_sentiment =
        (entry.sentiment_positive - entry.sentiment_negative) / totalSentiment;
    }
  });

  return Array.from(summary.values());
}

/**
 * Get sentiment metrics from daily stats
 */
export async function getSentimentFromDailyStats(
  projectId: string,
  startDate?: Date,
  endDate?: Date
) {
  const summary = await getMentionsSummary(projectId, startDate, endDate);
  const brandData = summary.find((s) => s.entity_type === "brand");

  if (!brandData) {
    return {
      positive: 0,
      neutral: 0,
      negative: 0,
      total: 0,
      avgRating: 0,
    };
  }

  const total =
    brandData.sentiment_positive +
    brandData.sentiment_neutral +
    brandData.sentiment_negative;

  return {
    positive: brandData.sentiment_positive,
    neutral: brandData.sentiment_neutral,
    negative: brandData.sentiment_negative,
    total,
    avgRating: brandData.avg_sentiment || 0,
  };
}

// =============================================
// REAL-TIME FALLBACK QUERIES
// =============================================

/**
 * Fallback: Get daily stats from source tables (brand_mentions, citations)
 * Used when daily_brand_stats table is not populated or needs real-time data
 * Note: Sentiment data is now retrieved from brand_evaluations via getMentionsSummary
 */
async function getDailyStatsRealTime(
  projectId: string,
  startDate: Date,
  endDate: Date
): Promise<DailyStats[]> {
  const supabase = await createClient();

  // Get project info
  const { data: project } = await supabase
    .from("projects")
    .select("brand_name")
    .eq("id", projectId)
    .single();

  const brandName = project?.brand_name || "Brand";

  // Generate all dates in range
  const allDays = eachDayOfInterval({ start: startDate, end: endDate });
  const results: DailyStats[] = [];

  // Get brand mentions grouped by day
  const { data: brandMentions } = await supabase
    .from("brand_mentions")
    .select("created_at, brand_type, competitor_id")
    .eq("project_id", projectId)
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString());

  // Get citations grouped by day
  const { data: citations } = await supabase
    .from("citations")
    .select("created_at, citation_type, competitor_id")
    .eq("project_id", projectId)
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString());

  // Get competitors
  const { data: competitors } = await supabase
    .from("competitors")
    .select("id, name")
    .eq("project_id", projectId)
    .eq("is_active", true);

  // Build daily stats
  allDays.forEach((day) => {
    const dayStr = format(day, "yyyy-MM-dd");

    // Filter data for this day
    const dayMentions = brandMentions?.filter(
      (m) => format(new Date(m.created_at), "yyyy-MM-dd") === dayStr
    );
    const dayCitations = citations?.filter(
      (c) => format(new Date(c.created_at), "yyyy-MM-dd") === dayStr
    );

    // Brand stats
    const brandMentionsCount =
      dayMentions?.filter((m) => m.brand_type === "client").length || 0;
    const brandCitationsCount =
      dayCitations?.filter((c) => c.citation_type === "brand").length || 0;

    results.push({
      stat_date: dayStr,
      entity_type: "brand",
      competitor_id: null,
      entity_name: brandName,
      mentions_count: brandMentionsCount,
      citations_count: brandCitationsCount,
      responses_analyzed: 0, // Not calculated in real-time fallback
    });

    // Competitor stats
    competitors?.forEach((comp) => {
      const compMentionsCount =
        dayMentions?.filter(
          (m) => m.brand_type === "competitor" && m.competitor_id === comp.id
        ).length || 0;
      const compCitationsCount =
        dayCitations?.filter(
          (c) => c.citation_type === "competitor" && c.competitor_id === comp.id
        ).length || 0;

      results.push({
        stat_date: dayStr,
        entity_type: "competitor",
        competitor_id: comp.id,
        entity_name: comp.name,
        mentions_count: compMentionsCount,
        citations_count: compCitationsCount,
        responses_analyzed: 0,
      });
    });
  });

  return results;
}

// =============================================
// REAL-TIME STATS FOR TODAY (After 4:30 AM)
// =============================================

/**
 * Get real-time stats for today (after 4:30 AM cutoff)
 * Used to supplement daily_brand_stats when querying current day
 */
async function getTodayRealTimeStats(
  projectId: string,
  platform?: string,
  region?: string,
  topicId?: string
): Promise<DailyStats[]> {
  const supabase = await createClient();
  const today = new Date();
  const cutoffTime = new Date(today);
  cutoffTime.setHours(4, 30, 0, 0); // 4:30 AM today (UTC)

  // Get project info
  const { data: project } = await supabase
    .from("projects")
    .select("brand_name")
    .eq("id", projectId)
    .single();

  const brandName = project?.brand_name || "Brand";
  const todayStr = format(today, "yyyy-MM-dd");

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

  // Get ai_response_ids to fetch platform, region, topic_id
  const aiResponseIds = new Set<string>();
  brandMentions?.forEach((m: any) => {
    if (m.ai_response_id) aiResponseIds.add(m.ai_response_id);
  });
  citations?.forEach((c: any) => {
    if (c.ai_response_id) aiResponseIds.add(c.ai_response_id);
  });

  // Create a map for quick lookup
  const aiResponseMap = new Map<string, any>();

  // Only fetch if we have ai_response_ids
  if (aiResponseIds.size > 0) {
    // Fetch ai_responses with prompt_tracking data
    let aiResponsesQuery = supabase
      .from("ai_responses")
      .select("id, platform, prompt_tracking_id, prompt_tracking(region, topic_id)")
      .in("id", Array.from(aiResponseIds));

    // Apply platform filter if provided
    if (platform && platform !== "all") {
      aiResponsesQuery = aiResponsesQuery.eq("platform", platform);
    }

    const { data: aiResponses } = await aiResponsesQuery;

    // Filter by region and topic_id after fetching (since we can't filter nested relations easily)
    let filteredAiResponses = aiResponses || [];
    if (region && region !== "GLOBAL") {
      filteredAiResponses = filteredAiResponses.filter((ar: any) => 
        ar.prompt_tracking?.region === region
      );
    }
    if (topicId && topicId !== "all") {
      filteredAiResponses = filteredAiResponses.filter((ar: any) => 
        ar.prompt_tracking?.topic_id === topicId
      );
    }

    // Build map from filtered results
    filteredAiResponses.forEach((ar: any) => {
      aiResponseMap.set(ar.id, {
        platform: ar.platform || "all",
        region: ar.prompt_tracking?.region || "GLOBAL",
        topic_id: ar.prompt_tracking?.topic_id || "all",
      });
    });
  }

  // Get competitors
  const { data: competitors } = await supabase
    .from("competitors")
    .select("id, name")
    .eq("project_id", projectId)
    .eq("is_active", true);

  // Aggregate by entity and dimensions
  const statsMap = new Map<string, DailyStats>();

  // Process brand mentions
  brandMentions?.forEach((mention: any) => {
    const aiResponseData = aiResponseMap.get(mention.ai_response_id);
    if (!aiResponseData) return; // Skip if ai_response not found (filtered out)

    const mentionPlatform = aiResponseData.platform;
    const mentionRegion = aiResponseData.region;
    const mentionTopicId = aiResponseData.topic_id;
    
    const key = `${mention.brand_type === "client" ? "brand" : mention.competitor_id || "unknown"}-${mentionPlatform}-${mentionRegion}-${mentionTopicId}`;
    
    if (!statsMap.has(key)) {
      statsMap.set(key, {
        stat_date: todayStr,
        entity_type: mention.brand_type === "client" ? "brand" : "competitor",
        competitor_id: mention.brand_type === "client" ? null : mention.competitor_id,
        entity_name: mention.brand_type === "client" ? brandName : competitors?.find(c => c.id === mention.competitor_id)?.name || "Unknown",
        mentions_count: 0,
        citations_count: 0,
        responses_analyzed: 0,
      });
    }
    statsMap.get(key)!.mentions_count++;
  });

  // Process citations
  citations?.forEach((citation: any) => {
    const aiResponseData = aiResponseMap.get(citation.ai_response_id);
    if (!aiResponseData) return; // Skip if ai_response not found (filtered out)

    const citationPlatform = aiResponseData.platform;
    const citationRegion = aiResponseData.region;
    const citationTopicId = aiResponseData.topic_id;
    
    const key = `${citation.citation_type === "brand" ? "brand" : citation.competitor_id || "unknown"}-${citationPlatform}-${citationRegion}-${citationTopicId}`;
    
    if (!statsMap.has(key)) {
      statsMap.set(key, {
        stat_date: todayStr,
        entity_type: citation.citation_type === "brand" ? "brand" : "competitor",
        competitor_id: citation.citation_type === "brand" ? null : citation.competitor_id,
        entity_name: citation.citation_type === "brand" ? brandName : competitors?.find(c => c.id === citation.competitor_id)?.name || "Unknown",
        mentions_count: 0,
        citations_count: 0,
        responses_analyzed: 0,
      });
    }
    statsMap.get(key)!.citations_count++;
  });

  return Array.from(statsMap.values());
}

/**
 * Merge daily stats from pre-aggregated table with real-time stats
 * Sums counts when entity and dimensions match
 */
function mergeDailyStats(
  dailyStats: DailyStats[],
  realTimeStats: DailyStats[]
): DailyStats[] {
  const mergedMap = new Map<string, DailyStats>();

  // Add daily stats first
  dailyStats.forEach((stat) => {
    const key = `${stat.entity_type}-${stat.competitor_id || "brand"}-${stat.stat_date}`;
    mergedMap.set(key, { ...stat });
  });

  // Add/merge real-time stats
  realTimeStats.forEach((stat) => {
    const key = `${stat.entity_type}-${stat.competitor_id || "brand"}-${stat.stat_date}`;
    
    if (mergedMap.has(key)) {
      // Merge: sum counts
      const existing = mergedMap.get(key)!;
      existing.mentions_count += stat.mentions_count;
      existing.citations_count += stat.citations_count;
      existing.responses_analyzed += stat.responses_analyzed;
    } else {
      // Add new entry
      mergedMap.set(key, { ...stat });
    }
  });

  return Array.from(mergedMap.values());
}

// =============================================
// BRAND MENTIONS QUERIES (Direct from source)
// =============================================

/**
 * Get brand mentions count (real-time from brand_mentions table)
 */
export async function getBrandMentionsCount(
  projectId: string,
  brandType: "client" | "competitor" = "client",
  competitorId?: string,
  startDate?: Date,
  endDate?: Date
): Promise<number> {
  const supabase = await createClient();

  let query = supabase
    .from("brand_mentions")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("brand_type", brandType);

  if (competitorId) {
    query = query.eq("competitor_id", competitorId);
  }

  if (startDate) {
    query = query.gte("created_at", startDate.toISOString());
  }

  if (endDate) {
    query = query.lte("created_at", endDate.toISOString());
  }

  const { count, error } = await query;

  if (error) {
    console.error("Error fetching brand mentions count:", error);
    return 0;
  }

  return count || 0;
}

/**
 * Get citations count (real-time from citations table)
 */
export async function getCitationsCount(
  projectId: string,
  citationType: "brand" | "competitor" | "other" = "brand",
  competitorId?: string,
  startDate?: Date,
  endDate?: Date
): Promise<number> {
  const supabase = await createClient();

  let query = supabase
    .from("citations")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("citation_type", citationType);

  if (competitorId) {
    query = query.eq("competitor_id", competitorId);
  }

  if (startDate) {
    query = query.gte("created_at", startDate.toISOString());
  }

  if (endDate) {
    query = query.lte("created_at", endDate.toISOString());
  }

  const { count, error } = await query;

  if (error) {
    console.error("Error fetching citations count:", error);
    return 0;
  }

  return count || 0;
}

// =============================================
// CITATION DOMAINS QUERIES
// =============================================

/**
 * Get top cited domains from citations table
 */
export async function getTopCitedDomains(
  projectId: string,
  limit: number = 10,
  startDate?: Date,
  endDate?: Date
): Promise<Array<{ domain: string; count: number; citation_type: string }>> {
  const supabase = await createClient();

  let query = supabase
    .from("citations")
    .select("domain, citation_type")
    .eq("project_id", projectId)
    .not("domain", "is", null);

  if (startDate) {
    query = query.gte("created_at", startDate.toISOString());
  }

  if (endDate) {
    query = query.lte("created_at", endDate.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching top cited domains:", error);
    return [];
  }

  // Group by domain
  const domainCounts = new Map<
    string,
    { count: number; citation_type: string }
  >();

  data?.forEach((item: any) => {
    if (item.domain) {
      const existing = domainCounts.get(item.domain);
      if (existing) {
        existing.count++;
      } else {
        domainCounts.set(item.domain, {
          count: 1,
          citation_type: item.citation_type,
        });
      }
    }
  });

  // Sort by count and limit
  return Array.from(domainCounts.entries())
    .map(([domain, data]) => ({ domain, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Get citation stats by type
 */
export async function getCitationStatsByType(
  projectId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  brand: number;
  competitor: number;
  other: number;
  total: number;
}> {
  const supabase = await createClient();

  let query = supabase
    .from("citations")
    .select("citation_type")
    .eq("project_id", projectId);

  if (startDate) {
    query = query.gte("created_at", startDate.toISOString());
  }

  if (endDate) {
    query = query.lte("created_at", endDate.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching citation stats by type:", error);
    return { brand: 0, competitor: 0, other: 0, total: 0 };
  }

  const stats = { brand: 0, competitor: 0, other: 0, total: data?.length || 0 };

  data?.forEach((item: any) => {
    if (item.citation_type === "brand") stats.brand++;
    else if (item.citation_type === "competitor") stats.competitor++;
    else stats.other++;
  });

  return stats;
}

