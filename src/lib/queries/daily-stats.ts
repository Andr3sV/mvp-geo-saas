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
  sentiment_positive_count: number;
  sentiment_neutral_count: number;
  sentiment_negative_count: number;
  sentiment_avg_rating: number | null;
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
 */
export async function getDailyStats(
  projectId: string,
  startDate?: Date,
  endDate?: Date
): Promise<DailyStats[]> {
  const supabase = await createClient();

  const start = startDate || subDays(new Date(), 30);
  const end = endDate || new Date();

  const { data, error } = await supabase.rpc("get_daily_stats", {
    p_project_id: projectId,
    p_start_date: format(start, "yyyy-MM-dd"),
    p_end_date: format(end, "yyyy-MM-dd"),
  });

  if (error) {
    console.error("Error fetching daily stats:", error);
    // Fallback to real-time query
    return getDailyStatsRealTime(projectId, start, end);
  }

  return data || [];
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
 * Get total mentions for brand and competitors over a period
 */
export async function getMentionsSummary(
  projectId: string,
  startDate?: Date,
  endDate?: Date
) {
  const stats = await getDailyStats(projectId, startDate, endDate);

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
    entry.sentiment_positive += stat.sentiment_positive_count;
    entry.sentiment_neutral += stat.sentiment_neutral_count;
    entry.sentiment_negative += stat.sentiment_negative_count;
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
 * Fallback: Get daily stats from source tables (brand_mentions, citations, brand_sentiment_attributes)
 * Used when daily_brand_stats table is not populated or needs real-time data
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

  // Get sentiment data grouped by day
  const { data: sentimentData } = await supabase
    .from("brand_sentiment_attributes")
    .select("created_at, brand_type, competitor_id, sentiment, sentiment_rating")
    .eq("project_id", projectId)
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString());

  // Get competitors
  const { data: competitors } = await supabase
    .from("competitors")
    .select("id, name")
    .eq("project_id", projectId)
    .eq("is_active", true);

  const competitorMap = new Map(competitors?.map((c) => [c.id, c.name]) || []);

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
    const daySentiment = sentimentData?.filter(
      (s) => format(new Date(s.created_at), "yyyy-MM-dd") === dayStr
    );

    // Brand stats
    const brandMentionsCount =
      dayMentions?.filter((m) => m.brand_type === "client").length || 0;
    const brandCitationsCount =
      dayCitations?.filter((c) => c.citation_type === "brand").length || 0;
    const brandSentiment = daySentiment?.filter((s) => s.brand_type === "client");
    const brandSentimentPos =
      brandSentiment?.filter((s) => s.sentiment === "positive").length || 0;
    const brandSentimentNeu =
      brandSentiment?.filter((s) => s.sentiment === "neutral").length || 0;
    const brandSentimentNeg =
      brandSentiment?.filter((s) => s.sentiment === "negative").length || 0;
    const brandAvgRating = brandSentiment?.length
      ? brandSentiment.reduce((sum, s) => sum + (s.sentiment_rating || 0), 0) /
        brandSentiment.length
      : null;

    results.push({
      stat_date: dayStr,
      entity_type: "brand",
      competitor_id: null,
      entity_name: brandName,
      mentions_count: brandMentionsCount,
      citations_count: brandCitationsCount,
      sentiment_positive_count: brandSentimentPos,
      sentiment_neutral_count: brandSentimentNeu,
      sentiment_negative_count: brandSentimentNeg,
      sentiment_avg_rating: brandAvgRating,
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
      const compSentiment = daySentiment?.filter(
        (s) => s.brand_type === "competitor" && s.competitor_id === comp.id
      );
      const compSentimentPos =
        compSentiment?.filter((s) => s.sentiment === "positive").length || 0;
      const compSentimentNeu =
        compSentiment?.filter((s) => s.sentiment === "neutral").length || 0;
      const compSentimentNeg =
        compSentiment?.filter((s) => s.sentiment === "negative").length || 0;
      const compAvgRating = compSentiment?.length
        ? compSentiment.reduce((sum, s) => sum + (s.sentiment_rating || 0), 0) /
          compSentiment.length
        : null;

      results.push({
        stat_date: dayStr,
        entity_type: "competitor",
        competitor_id: comp.id,
        entity_name: comp.name,
        mentions_count: compMentionsCount,
        citations_count: compCitationsCount,
        sentiment_positive_count: compSentimentPos,
        sentiment_neutral_count: compSentimentNeu,
        sentiment_negative_count: compSentimentNeg,
        sentiment_avg_rating: compAvgRating,
        responses_analyzed: 0,
      });
    });
  });

  return results;
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

