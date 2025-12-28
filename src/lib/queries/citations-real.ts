"use server";

import { createClient } from "@/lib/supabase/server";
import { getRegionIdByCode } from "@/lib/actions/regions";

type CitationFilterOptions = {
  fromDate?: Date;
  toDate?: Date;
  platform?: string;
  region?: string;
  topicId?: string;
};

function applyDateFilter(
  query: any,
  filters?: CitationFilterOptions,
  column: string = "created_at"
) {
  if (filters?.fromDate) {
    query = query.gte(column, filters.fromDate.toISOString());
  }
  if (filters?.toDate) {
    query = query.lte(column, filters.toDate.toISOString());
  }
  return query;
}

function applyPlatformFilter(
  query: any,
  filters?: CitationFilterOptions
) {
  if (filters?.platform && filters.platform !== "all") {
    // For queries that join with ai_responses, filter by platform
    query = query.eq("ai_responses.platform", filters.platform);
  }
  return query;
}

// Note: applyRegionFilter is deprecated - region filtering is now done using region_id
// This function is kept for backwards compatibility but should not be used for new code
// Use region_id with getRegionIdByCode instead
function applyRegionFilter(
  query: any,
  filters?: CitationFilterOptions
) {
  // This function is deprecated and does nothing
  // Region filtering should be done using region_id with regions table join
  return query;
}

function applyTopicFilter(
  query: any,
  filters?: CitationFilterOptions
) {
  if (filters?.topicId && filters.topicId !== "all") {
    // For queries that join with prompt_tracking, filter by topic_id
    query = query.eq("ai_responses.prompt_tracking.topic_id", filters.topicId);
  }
  return query;
}

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
 * Get real-time citations stats for today (after 4:30 AM cutoff)
 * Used to supplement daily_brand_stats when querying current day
 */
async function getTodayRealTimeCitationsStats(
  projectId: string,
  platform?: string,
  region?: string,
  topicId?: string
): Promise<{
  brandCitations: number;
  competitorCitations: Array<{
    competitor_id: string;
    citations_count: number;
  }>;
}> {
  const supabase = await createClient();
  const today = new Date();
  const cutoffTime = new Date(today);
  cutoffTime.setHours(4, 30, 0, 0); // 4:30 AM today (UTC)

  // Map platform filter
  const mappedPlatform = mapPlatformToDatabase(platform);
  const regionFilter = region && region !== "GLOBAL";
  const topicFilter = topicId && topicId !== "all";

  // Get region_id if region filter is active
  let regionId: string | null = null;
  if (regionFilter && region) {
    regionId = await getRegionIdByCode(projectId, region);
  }

  // Use SQL function for efficient aggregation
  const { data: todayData, error: todayError } = await supabase.rpc("get_today_citations_aggregated", {
    p_project_id: projectId,
    p_cutoff_time: cutoffTime.toISOString(),
    p_platform: mappedPlatform,
    p_region_id: regionId,
    p_topic_id: topicId && topicId !== "all" ? topicId : null,
  });

  if (todayError || !todayData || todayData.length === 0) {
    return { brandCitations: 0, competitorCitations: [] };
  }

  const result = todayData[0];
  const brandCitations = Number(result.brand_citations) || 0;
  
  // Convert JSONB competitor_citations to array format
  const competitorCitations: Array<{ competitor_id: string; citations_count: number }> = [];
  if (result.competitor_citations && typeof result.competitor_citations === 'object') {
    Object.entries(result.competitor_citations).forEach(([competitor_id, citations_count]) => {
      competitorCitations.push({
        competitor_id,
        citations_count: Number(citations_count) || 0,
      });
    });
  }

  return { brandCitations, competitorCitations };
}

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

// =============================================
// QUICK LOOK METRICS (REAL DATA)
// =============================================

/**
 * Get unified citations data (combines getQuickLookMetrics and getCitationsRanking)
 * Returns both quick metrics and ranking data in a single optimized query
 */
export async function getCitationsData(
  projectId: string,
  fromDate?: Date,
  toDate?: Date,
  platform?: string,
  region?: string,
  topicId?: string
) {
  const supabase = await createClient();
  const { format } = await import("date-fns");

  // Get project info
  const { data: project } = await supabase
    .from("projects")
    .select("name, client_url, color")
    .eq("id", projectId)
    .single();

  // Calculate date range (default to last 30 days ending yesterday)
  const endDate = toDate || getYesterday();
  const startDate = fromDate || (() => {
    const date = getYesterday();
    date.setDate(date.getDate() - 29); // 30 days total including yesterday
    date.setHours(0, 0, 0, 0);
    return date;
  })();

  // Check if we're querying today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDateOnly = new Date(endDate);
  endDateOnly.setHours(0, 0, 0, 0);
  const isQueryingToday = endDateOnly.getTime() === today.getTime();

  // Map platform filter
  const mappedPlatform = mapPlatformToDatabase(platform);
  const platformFilter = mappedPlatform !== null;
  const regionFilter = region && region !== "GLOBAL";
  const topicFilter = topicId && topicId !== "all";

  // Get region_id if region filter is active
  let regionId: string | null = null;
  if (regionFilter && region) {
    regionId = await getRegionIdByCode(projectId, region);
  }

  // Format dates for SQL
  const startDateStr = format(startDate, "yyyy-MM-dd");
  const endDateStr = format(endDate, "yyyy-MM-dd");

  // Execute unified query for all stats + competitors in parallel
  const [allStatsResult, allCompetitorsResult] = await Promise.all([
    // Unified query for brand and competitor citations
    (async () => {
      let query = supabase
        .from("daily_brand_stats")
        .select("entity_type, competitor_id, entity_name, citations_count, competitors(id, name, domain, is_active, color)")
        .eq("project_id", projectId)
        .gte("stat_date", startDateStr)
        .lte("stat_date", endDateStr);

      if (platformFilter) {
        query = query.eq("platform", mappedPlatform);
      }

      if (regionFilter && regionId) {
        query = query.eq("region_id", regionId);
      }

      if (topicFilter) {
        query = query.eq("topic_id", topicId);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching citations from daily_brand_stats:', error);
        return { data: [], error };
      }
      return { data: data || [], error: null };
    })(),
    
    // Get all active competitors
    (async () => {
      const { data, error } = await supabase
        .from("competitors")
        .select("id, name, domain, color")
        .eq("project_id", projectId)
        .eq("is_active", true);
      
      if (error) {
        console.error('Error fetching competitors:', error);
        return { data: [], error };
      }
      return { data: data || [], error: null };
    })()
  ]);

  // Separate brand and competitor stats in JavaScript
  const brandStats = allStatsResult.data?.filter(s => s.entity_type === "brand" && !s.competitor_id) || [];
  const competitorStats = allStatsResult.data?.filter(s => s.entity_type === "competitor" && s.competitor_id) || [];

  // Calculate brand citations
  let brandCitations = brandStats.reduce((sum, stat) => sum + (stat.citations_count || 0), 0);

  // Build competitor citations map
  const competitorCitationsMap = new Map<string, { id: string; name: string; domain: string; color?: string; citations: number }>();
  
  // Initialize with all active competitors (with 0 citations)
  allCompetitorsResult.data?.forEach((competitor: any) => {
    competitorCitationsMap.set(competitor.id, {
      id: competitor.id,
      name: competitor.name,
      domain: competitor.domain || "",
      color: competitor.color || undefined,
      citations: 0,
    });
  });

  // Sum citations from daily_brand_stats
  competitorStats.forEach((stat: any) => {
    const competitor = stat.competitors;
    if (!competitor || !competitor.is_active || !stat.competitor_id) return;

    const competitorId = stat.competitor_id;
    if (!competitorCitationsMap.has(competitorId)) {
      competitorCitationsMap.set(competitorId, {
        id: competitorId,
        name: competitor.name || stat.entity_name || "Unknown",
        domain: competitor.domain || "",
        citations: 0,
      });
    }

    competitorCitationsMap.get(competitorId)!.citations += stat.citations_count || 0;
  });

  // Supplement with real-time data for today if querying today
  if (isQueryingToday) {
    const realTimeStats = await getTodayRealTimeCitationsStats(projectId, platform, region, topicId);
    
    brandCitations += realTimeStats.brandCitations;
    
    realTimeStats.competitorCitations.forEach((compStat) => {
      const competitorId = compStat.competitor_id;
      if (!competitorCitationsMap.has(competitorId)) {
        const competitor = allCompetitorsResult.data?.find((c: any) => c.id === competitorId);
        if (competitor) {
          competitorCitationsMap.set(competitorId, {
            id: competitorId,
            name: competitor.name,
            domain: competitor.domain || "",
            color: competitor.color || undefined,
            citations: 0,
          });
        }
      }
      
      if (competitorCitationsMap.has(competitorId)) {
        competitorCitationsMap.get(competitorId)!.citations += compStat.citations_count;
      }
    });
  }

  // Calculate totals
  const competitorCitationsTotal = Array.from(competitorCitationsMap.values()).reduce(
    (sum, comp) => sum + comp.citations,
    0
  );
  const totalCitations = brandCitations + competitorCitationsTotal;

  // Build competitors array for ranking
  const competitors = Array.from(competitorCitationsMap.values())
    .filter((comp) => comp.citations > 0)
    .map((comp) => ({
      id: comp.id,
      name: comp.name,
      domain: comp.domain || comp.name,
      color: comp.color,
      citations: comp.citations,
      percentage: totalCitations > 0 ? Number(((comp.citations / totalCitations) * 100).toFixed(1)) : 0,
    }));

  // Sort competitors by citations descending
  competitors.sort((a, b) => b.citations - a.citations);

  // Build all entities for ranking
  const allEntities = [
    {
      id: projectId,
      name: project?.name || "Your Brand",
      domain: project?.client_url || project?.name || "",
      citations: brandCitations,
      percentage: totalCitations > 0 ? Number(((brandCitations / totalCitations) * 100).toFixed(1)) : 0,
    },
    ...competitors,
  ].sort((a, b) => b.citations - a.citations);

  // Determine market position (1-based index)
  const marketPosition = allEntities.findIndex((e) => e.id === projectId) + 1;

  // Return both quick metrics and ranking data
  return {
    // Quick metrics format
    totalCitationPages: brandCitations,
    myPagesCited: brandCitations,
    ranking: {
      position: marketPosition,
      totalEntities: allEntities.length,
      entities: allEntities,
    },
    // Ranking format (for compatibility)
    brand: {
      name: project?.name || "Your Brand",
      domain: project?.client_url || project?.name || "",
      color: project?.color || "#3B82F6",
      citations: brandCitations,
      percentage: totalCitations > 0 ? Number(((brandCitations / totalCitations) * 100).toFixed(1)) : 0,
    },
    competitors,
    totalCitations,
    marketPosition,
  };
}

/**
 * Get Quick Look Metrics using REAL data from AI analysis
 * - Total Citation Pages: Count of citations for brand from daily_brand_stats
 * - My Pages Cited: Same as totalCitationPages
 * - Ranking: Brand vs Competitors citations ranking
 * @deprecated Use getCitationsData instead for better performance
 */
export async function getQuickLookMetrics(
  projectId: string,
  filters: CitationFilterOptions = {}
) {
  const supabase = await createClient();
  const { format } = await import("date-fns");

  // Calculate date range (default to last 30 days ending yesterday)
  const endDate = filters?.toDate || getYesterday();
  const startDate = filters?.fromDate || (() => {
    const date = getYesterday();
    date.setDate(date.getDate() - 29); // 30 days total including yesterday
    date.setHours(0, 0, 0, 0);
    return date;
  })();

  // Check if we're querying today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDateOnly = new Date(endDate);
  endDateOnly.setHours(0, 0, 0, 0);
  const isQueryingToday = endDateOnly.getTime() === today.getTime();

  // Map platform filter
  const mappedPlatform = mapPlatformToDatabase(filters?.platform);
  const platformFilter = mappedPlatform !== null;
  const regionFilter = filters?.region && filters.region !== "GLOBAL"; // GLOBAL means sum all regions
  const topicFilter = filters?.topicId && filters.topicId !== "all";

  // Get region_id if region filter is active
  let regionId: string | null = null;
  if (regionFilter && filters.region) {
    regionId = await getRegionIdByCode(projectId, filters.region);
  }

  // Format dates for SQL
  const startDateStr = format(startDate, "yyyy-MM-dd");
  const endDateStr = format(endDate, "yyyy-MM-dd");

  // Get project info
  const { data: project } = await supabase
    .from("projects")
    .select("name, client_url, color")
    .eq("id", projectId)
    .single();

  // Execute all queries in parallel for better performance
  // Note: totalCitationPages and myPagesCited are the same value, so we only need one query
  const [
    brandCitationsResult,
    competitorCitationsResult,
    allCompetitorsResult
  ] = await Promise.all([
    // Brand Citations - single query for both totalCitationPages and myPagesCited
    (async () => {
      let query = supabase
        .from("daily_brand_stats")
        .select("citations_count")
        .eq("project_id", projectId)
        .eq("entity_type", "brand")
        .is("competitor_id", null)
        .gte("stat_date", startDateStr)
        .lte("stat_date", endDateStr);

      if (platformFilter) {
        query = query.eq("platform", mappedPlatform);
      }

      // When region is GLOBAL, don't filter by region (sum all regions)
      if (regionFilter && regionId) {
        query = query.eq("region_id", regionId);
      }

      if (topicFilter) {
        query = query.eq("topic_id", filters.topicId);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching brand citations:', error);
        return { data: 0, error };
      }
      const total = data?.reduce((sum, row) => sum + (row.citations_count || 0), 0) || 0;
      return { data: total, error: null };
    })(),
    
    // Competitor Citations - get citations_count for all competitors
    (async () => {
      let query = supabase
        .from("daily_brand_stats")
        .select("competitor_id, entity_name, citations_count, competitors!inner(id, name, domain, is_active, color)")
        .eq("project_id", projectId)
        .eq("entity_type", "competitor")
        .not("competitor_id", "is", null)
        .gte("stat_date", startDateStr)
        .lte("stat_date", endDateStr);

      if (platformFilter) {
        query = query.eq("platform", mappedPlatform);
      }
      
      if (regionFilter && regionId) {
        query = query.eq("region_id", regionId);
      }
      
      if (topicFilter) {
        query = query.eq("topic_id", filters.topicId);
      }
      
      const { data, error } = await query;
      if (error) {
        console.error('Error fetching competitor citations:', error);
        return { data: [], error };
      }
      return { data: data || [], error: null };
    })(),
    
    // Get all active competitors
    (async () => {
      const { data, error } = await supabase
        .from("competitors")
        .select("id, name, domain, color")
              .eq("project_id", projectId)
        .eq("is_active", true);
      
      if (error) {
        console.error('Error fetching competitors:', error);
        return { data: [], error };
      }
      return { data: data || [], error: null };
    })()
  ]);

  // Total Citation Pages
  // Both values are the same (brand citations)
  let totalCitationPages = brandCitationsResult.data || 0;
  let myPagesCited = brandCitationsResult.data || 0;

  // Supplement with real-time data for today if querying today
  if (isQueryingToday) {
    const realTimeStats = await getTodayRealTimeCitationsStats(
      projectId,
      filters?.platform,
      filters?.region,
      filters?.topicId
    );
    
    totalCitationPages += realTimeStats.brandCitations;
    myPagesCited += realTimeStats.brandCitations;
  }

  // Build competitor citations ranking
  const competitorCitationsMap = new Map<string, { id: string; name: string; domain: string; citations: number }>();

  // Initialize with all active competitors (with 0 citations)
  allCompetitorsResult.data?.forEach((competitor: any) => {
    competitorCitationsMap.set(competitor.id, {
      id: competitor.id,
      name: competitor.name,
      domain: competitor.domain || "",
      citations: 0,
    });
  });

  // Sum citations from daily_brand_stats
  competitorCitationsResult.data?.forEach((stat: any) => {
    const competitor = stat.competitors;
    if (!competitor || !competitor.is_active || !stat.competitor_id) return;

    const competitorId = stat.competitor_id;
    if (!competitorCitationsMap.has(competitorId)) {
      competitorCitationsMap.set(competitorId, {
        id: competitorId,
        name: competitor.name || stat.entity_name || "Unknown",
        domain: competitor.domain || "",
        citations: 0,
      });
    }

    competitorCitationsMap.get(competitorId)!.citations += stat.citations_count || 0;
  });

  // Supplement with real-time data for today if querying today
  if (isQueryingToday) {
    const realTimeStats = await getTodayRealTimeCitationsStats(
      projectId,
      filters?.platform,
      filters?.region,
      filters?.topicId
    );
    
    realTimeStats.competitorCitations.forEach((compStat) => {
      const competitorId = compStat.competitor_id;
      if (!competitorCitationsMap.has(competitorId)) {
        // Need to get competitor info
        const competitor = allCompetitorsResult.data?.find((c: any) => c.id === competitorId);
        if (competitor) {
          competitorCitationsMap.set(competitorId, {
            id: competitorId,
            name: competitor.name,
            domain: competitor.domain || "",
            citations: 0,
          });
        }
      }
      
      if (competitorCitationsMap.has(competitorId)) {
        competitorCitationsMap.get(competitorId)!.citations += compStat.citations_count;
      }
    });
  }

  // Calculate totals
  const competitorCitationsTotal = Array.from(competitorCitationsMap.values()).reduce(
    (sum, comp) => sum + comp.citations,
    0
  );
  const totalCitations = totalCitationPages + competitorCitationsTotal;

  // Build ranking array
  const allEntities = [
    {
      id: projectId,
      name: project?.name || "Your Brand",
      domain: project?.client_url || project?.name || "",
      citations: totalCitationPages,
      percentage: totalCitations > 0 ? Number(((totalCitationPages / totalCitations) * 100).toFixed(1)) : 0,
    },
    ...Array.from(competitorCitationsMap.values())
      .filter((comp) => comp.citations > 0) // Only show competitors with citations
      .map((comp) => ({
        id: comp.id,
        name: comp.name,
        domain: comp.domain || comp.name,
        citations: comp.citations,
        percentage: totalCitations > 0 ? Number(((comp.citations / totalCitations) * 100).toFixed(1)) : 0,
      })),
  ].sort((a, b) => b.citations - a.citations);

  // Determine market position (1-based index)
  const marketPosition = allEntities.findIndex((e) => e.id === projectId) + 1;

  return {
    totalCitationPages,
    myPagesCited,
    ranking: {
      position: marketPosition,
      totalEntities: allEntities.length,
      entities: allEntities,
    },
  };
}

// =============================================
// CITATIONS OVER TIME (REAL DATA)
// =============================================

/**
 * Get citation timeline from real AI analysis data
 */
export async function getCitationsOverTime(
  projectId: string,
  days: number = 30
) {
  const supabase = await createClient();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get citations grouped by date - only citations WITH URLs
  const { data: citations } = await supabase
    .from("citations")
    .select("created_at")
    .eq("project_id", projectId)
    .not("url", "is", null) // Only real citations with URLs
    .gte("created_at", startDate.toISOString())
    .limit(10000); // Increase limit to handle large datasets

  if (!citations) return [];

  // Group by date
  const dateMap = new Map<string, number>();
  citations.forEach((citation) => {
    const date = new Date(citation.created_at).toISOString().split("T")[0];
    dateMap.set(date, (dateMap.get(date) || 0) + 1);
  });

  // Fill in missing dates
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const count = dateMap.get(dateStr) || 0;
    
    result.push({
      date: dateStr,
      gained: count,
      lost: 0, // We don't track losses yet
      netChange: count,
      total: count,
    });
  }

  // Calculate cumulative total
  let cumulative = 0;
  result.forEach((item) => {
    cumulative += item.netChange;
    item.total = cumulative;
  });

  return result;
}

// =============================================
// CITATIONS EVOLUTION (BRAND VS COMPETITOR)
// =============================================

/**
 * Get daily citations evolution for brand and a specific competitor
 * Used for time-series chart visualization (similar to Share of Voice)
 * Uses optimized SQL RPC function with daily_brand_stats
 */
export async function getCitationsEvolution(
  projectId: string,
  competitorId: string | null,
  fromDate?: Date,
  toDate?: Date,
  platform?: string,
  region?: string,
  topicId?: string
) {
  const supabase = await createClient();
  const { format, eachDayOfInterval } = await import("date-fns");

  // Get project info (including domain for logo and color)
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
  
  const { data: dailyCitations, error } = await supabase.rpc("get_daily_citations_evolution", {
    p_project_id: projectId,
    p_competitor_id: competitorId || null,
    p_from_date: startDate.toISOString(),
    p_to_date: endDateForQuery.toISOString(),
    p_platform: platform && platform !== "all" ? platform : null,
    p_region: region && region !== "GLOBAL" ? region : null, // NULL means GLOBAL (sum all)
    p_topic_id: topicId && topicId !== "all" ? topicId : null,
  });

    if (error) {
    console.error("Error fetching daily citations evolution:", error);
    // Fallback to empty data
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });
    const dailyData = allDays.map((day) => ({
      date: format(day, "MMM dd"),
      fullDate: format(day, "yyyy-MM-dd"),
      brandCitations: 0,
      competitorCitations: 0,
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

  // Debug: Log the data received
  if (dailyCitations && dailyCitations.length > 0) {
    console.log("Daily citations data received:", dailyCitations.slice(0, 5));
    } else {
    console.log("No daily citations data received from RPC");
  }

  // Process results
  const allDays = eachDayOfInterval({ start: startDate, end: endDate });
  
  interface DailyCitations {
    brandCitations: number;
    competitorCitations: number;
  }
  
  const citationsMap = new Map<string, DailyCitations>();
  
  // Process daily citations data
  (dailyCitations || []).forEach((item: any) => {
    // Handle date conversion - item.date might be a string or Date object
    let dateStr: string;
    if (typeof item.date === 'string') {
      // If it's already a string, use it directly (might be in format 'YYYY-MM-DD')
      dateStr = item.date.split('T')[0]; // Remove time part if present
    } else if (item.date instanceof Date) {
      dateStr = format(item.date, "yyyy-MM-dd");
      } else {
      // Try to parse as date
      dateStr = format(new Date(item.date), "yyyy-MM-dd");
    }
    
    citationsMap.set(dateStr, {
      brandCitations: Number(item.brand_citations) || 0,
      competitorCitations: Number(item.competitor_citations) || 0,
    });
  });

  const dailyData = allDays.map((day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    const citations: DailyCitations = citationsMap.get(dayStr) || { brandCitations: 0, competitorCitations: 0 };

    return {
      date: format(day, "MMM dd"),
      fullDate: dayStr,
      brandCitations: citations.brandCitations,
      competitorCitations: citations.competitorCitations,
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
// CITATIONS RANKING (BRAND VS COMPETITORS)
// =============================================

/**
 * Get Citations Ranking for brand vs competitors
 * Similar to getShareOfVoice but uses citations_count from daily_brand_stats
 */
export async function getCitationsRanking(
  projectId: string,
  fromDate?: Date,
  toDate?: Date,
  platform?: string,
  region?: string,
  topicId?: string
) {
  const supabase = await createClient();
  const { format } = await import("date-fns");

  // Get project info
  const { data: project } = await supabase
    .from("projects")
    .select("name, client_url, color")
    .eq("id", projectId)
    .single();

  // Calculate date range (default to last 30 days ending yesterday)
  const endDate = toDate || getYesterday();
  const startDate = fromDate || (() => {
    const date = getYesterday();
    date.setDate(date.getDate() - 29); // 30 days total including yesterday
    date.setHours(0, 0, 0, 0);
    return date;
  })();

  // Check if we're querying today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDateOnly = new Date(endDate);
  endDateOnly.setHours(0, 0, 0, 0);
  const isQueryingToday = endDateOnly.getTime() === today.getTime();

  // Map platform filter
  const mappedPlatform = mapPlatformToDatabase(platform);
  const platformFilter = mappedPlatform !== null;
  const regionFilter = region && region !== "GLOBAL"; // GLOBAL means sum all regions
  const topicFilter = topicId && topicId !== "all";

  // Format dates for SQL
  const startDateStr = format(startDate, "yyyy-MM-dd");
  const endDateStr = format(endDate, "yyyy-MM-dd");

  // Get region_id if region filter is active
  let regionId: string | null = null;
  if (regionFilter && region) {
    regionId = await getRegionIdByCode(projectId, region);
  }

  // =============================================
  // GET BRAND AND COMPETITOR CITATIONS (unified query)
  // =============================================
  let unifiedQuery = supabase
    .from("daily_brand_stats")
    .select("entity_type, competitor_id, entity_name, citations_count, competitors(id, name, domain, is_active, color)")
    .eq("project_id", projectId)
    .gte("stat_date", startDateStr)
    .lte("stat_date", endDateStr);

  if (platformFilter) {
    unifiedQuery = unifiedQuery.eq("platform", mappedPlatform);
  }

  // When region is GLOBAL, don't filter by region (sum all regions)
  if (regionFilter && regionId) {
    unifiedQuery = unifiedQuery.eq("region_id", regionId);
  }

  if (topicFilter) {
    unifiedQuery = unifiedQuery.eq("topic_id", topicId);
  }

  const { data: allStats, error: statsError } = await unifiedQuery;

  if (statsError) {
    console.error('Error fetching citations from daily_brand_stats:', statsError);
  }

  // Separate brand and competitor stats in JavaScript
  const brandStats = allStats?.filter(s => s.entity_type === "brand" && !s.competitor_id) || [];
  const competitorStats = allStats?.filter(s => s.entity_type === "competitor" && s.competitor_id) || [];

  let brandCitations = brandStats.reduce((sum, stat) => sum + (stat.citations_count || 0), 0);

  // Get ALL active competitors (for the region if filtered, or all if GLOBAL)
  let allCompetitorsQuery = supabase
    .from("competitors")
    .select("id, name, domain, color")
    .eq("project_id", projectId)
    .eq("is_active", true);

  const { data: allCompetitors } = await allCompetitorsQuery;

  // Aggregate competitor citations by competitor_id
  const competitorCitationsMap = new Map<string, { id: string; name: string; domain: string; color?: string; citations: number }>();
  
  // Initialize with all active competitors (with 0 citations)
  allCompetitors?.forEach((competitor: any) => {
    competitorCitationsMap.set(competitor.id, {
      id: competitor.id,
      name: competitor.name,
      domain: competitor.domain || "",
      color: competitor.color || undefined,
      citations: 0,
    });
  });

  // Sum citations from daily_brand_stats
  competitorStats?.forEach((stat: any) => {
    const competitor = stat.competitors;
    if (!competitor || !competitor.is_active || !stat.competitor_id) return;

    const competitorId = stat.competitor_id;
    if (!competitorCitationsMap.has(competitorId)) {
      competitorCitationsMap.set(competitorId, {
        id: competitorId,
        name: competitor.name || stat.entity_name || "Unknown",
        domain: competitor.domain || "",
        citations: 0,
      });
    }

    competitorCitationsMap.get(competitorId)!.citations += stat.citations_count || 0;
  });

  // Supplement with real-time data for today if querying today
  if (isQueryingToday) {
    const realTimeStats = await getTodayRealTimeCitationsStats(projectId, platform, region, topicId);
    
    brandCitations += realTimeStats.brandCitations;
    
    realTimeStats.competitorCitations.forEach((compStat) => {
      const competitorId = compStat.competitor_id;
      if (!competitorCitationsMap.has(competitorId)) {
        // Need to get competitor info
        const competitor = allCompetitors?.find((c: any) => c.id === competitorId);
        if (competitor) {
          competitorCitationsMap.set(competitorId, {
            id: competitorId,
            name: competitor.name,
            domain: competitor.domain || "",
            color: competitor.color || undefined,
            citations: 0,
          });
        }
      }
      
      if (competitorCitationsMap.has(competitorId)) {
        competitorCitationsMap.get(competitorId)!.citations += compStat.citations_count;
      }
    });
  }

  // Calculate totals
  const competitorCitationsTotal = Array.from(competitorCitationsMap.values()).reduce(
    (sum, comp) => sum + comp.citations,
    0
  );
  const totalCitations = brandCitations + competitorCitationsTotal;

  // Calculate percentages
  const brandPercentage = totalCitations > 0 ? (brandCitations / totalCitations) * 100 : 0;

  const competitors = Array.from(competitorCitationsMap.values())
    .filter((comp) => comp.citations > 0) // Only show competitors with citations
    .map((comp) => ({
      id: comp.id,
      name: comp.name,
      domain: comp.domain || comp.name,
      color: comp.color,
      citations: comp.citations,
      percentage: totalCitations > 0 ? Number(((comp.citations / totalCitations) * 100).toFixed(1)) : 0,
    }));

  // Sort competitors by percentage descending
  competitors.sort((a, b) => b.percentage - a.percentage);

  // Determine market position
  const allEntities = [
    { name: project?.name || "Your Brand", citations: brandCitations, percentage: brandPercentage },
    ...competitors,
  ].sort((a, b) => b.citations - a.citations);

  const marketPosition = allEntities.findIndex((e) => e.name === (project?.name || "Your Brand")) + 1;

  return {
    brand: {
      name: project?.name || "Your Brand",
      domain: project?.client_url || project?.name || "",
      color: project?.color || "#3B82F6",
      citations: brandCitations,
      percentage: Number(brandPercentage.toFixed(1)),
    },
    competitors,
    totalCitations,
    marketPosition,
  };
}

// =============================================
// MOST CITED DOMAINS (REAL DATA)
// =============================================

/**
 * Get most cited domains/sources that mention your brand
 * This shows the actual websites (deportesroman.com, nike.com, etc.)
 * that AI models are using as sources when they cite your brand
 * Uses optimized SQL function for fast aggregation
 */
export async function getMostCitedDomains(
  projectId: string,
  limit: number = 10,
  filters: CitationFilterOptions = {}
) {
  const supabase = await createClient();

  // Map platform filter
  const mappedPlatform = mapPlatformToDatabase(filters?.platform);
  const regionFilter = filters?.region && filters.region !== "GLOBAL";
  const topicFilter = filters?.topicId && filters.topicId !== "all";

  // Get region_id if region filter is active
  let regionId: string | null = null;
  if (regionFilter && filters.region) {
    regionId = await getRegionIdByCode(projectId, filters.region);
    if (!regionId) {
      console.warn(`Region ${filters.region} not found for project ${projectId}`);
      return []; // Return empty if region doesn't exist
    }
  }

  // Calculate date range (default to last 30 days ending yesterday)
  const endDate = filters?.toDate || getYesterday();
  const startDate = filters?.fromDate || (() => {
    const date = getYesterday();
    date.setDate(date.getDate() - 29); // 30 days total including yesterday
    date.setHours(0, 0, 0, 0);
    return date;
  })();

  // Use optimized SQL function for fast aggregation
  // Extract topicId safely from filters
  const topicIdValue: string | null = (filters?.topicId && filters.topicId !== "all") ? filters.topicId : null;
  
  // Debug: Log parameters being passed to SQL function
  const rpcParams = {
    p_project_id: projectId,
    p_from_date: startDate.toISOString(),
    p_to_date: endDate.toISOString(),
    p_platform: mappedPlatform,
    p_region_id: regionId,
    p_topic_id: topicIdValue,
    p_limit: limit,
  };
  
  console.log("🔍 [getMostCitedDomains] Calling SQL function with params:", {
    projectId,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    mappedPlatform,
    regionId,
    topicIdValue,
    limit,
    regionFilter,
    topicFilter,
  });
  
  try {
    const { data: domainsData, error } = await supabase.rpc("get_most_cited_domains_aggregated", rpcParams);

    // Debug: Log RPC result
    console.log("🔍 [getMostCitedDomains] RPC result:", {
      hasData: !!domainsData,
      dataLength: domainsData?.length || 0,
      error: error ? {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      } : null,
      sampleData: domainsData?.slice(0, 2),
    });

    if (error) {
      console.error("❌ [getMostCitedDomains] Error fetching most cited domains:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fullError: error,
      });
      
      // If function doesn't exist (code 42883 = function does not exist), try fallback
      if (error.code === "42883" || error.message?.includes("does not exist") || (error.message?.includes("function") && error.message?.includes("not exist"))) {
        console.warn("⚠️ [getMostCitedDomains] SQL function does not exist. Falling back to direct query method.");
        console.warn("⚠️ Please run migration: 20251228140000_add_most_cited_domains_function.sql");
        
        // Try a simple direct query to verify if there's data at all
        const { data: testData } = await supabase
          .from("citations")
          .select("domain")
          .eq("project_id", projectId)
          .not("domain", "is", null)
          .limit(1);
        
        console.log("🔍 [getMostCitedDomains] Fallback test query result:", { hasData: !!testData?.length });
        
        // Return empty for now - user needs to run migration
        return [];
      }
      
      return [];
    }

    if (!domainsData || domainsData.length === 0) {
      console.warn("⚠️ [getMostCitedDomains] No data returned from SQL function. This could indicate:");
      console.warn("  - No citations match the filters");
      console.warn("  - SQL function has a logic issue");
      console.warn("  - Joins are filtering out all results");
      
      // Try a simple direct query to verify if there's any data at all
      // Note: citations table doesn't have project_id, need to join with ai_responses
      const { data: testData, error: testError } = await supabase
        .from("citations")
        .select(`
          domain, 
          created_at, 
          ai_response_id,
          ai_responses!inner(project_id, platform, prompt_tracking_id)
        `)
        .not("domain", "is", null)
        .not("url", "is", null)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .eq("ai_responses.project_id", projectId)
        .limit(5);
      
      console.log("🔍 [getMostCitedDomains] Test query to verify data exists:", {
        hasData: !!testData?.length,
        count: testData?.length || 0,
        sampleDomains: testData?.map((c: any) => ({ 
          domain: c.domain, 
          created_at: c.created_at, 
          has_ai_response: !!c.ai_response_id,
          platform: c.ai_responses?.platform,
          has_prompt_tracking: !!c.ai_responses?.prompt_tracking_id,
        })),
        testError: testError?.message,
        testErrorDetails: testError,
      });
      
      // Also check total citations count for this project (without date filter)
      const { count: totalCount } = await supabase
        .from("citations")
        .select(`
          id,
          ai_responses!inner(project_id)
        `, { count: "exact", head: true })
        .eq("ai_responses.project_id", projectId)
        .not("domain", "is", null);
      
      console.log("🔍 [getMostCitedDomains] Total citations for project (no date filter):", totalCount);
      
      return [];
    }

    // Map SQL function results to expected format
    const domains = domainsData.map((row: any) => ({
      domain: row.domain,
      citations: Number(row.citations_count) || 0,
      type: "Web Source",
      platforms: Array.isArray(row.platforms) ? row.platforms : [],
      changePercent: 0, // TODO: Calculate trend comparing with previous period
    }));

    console.log("✅ [getMostCitedDomains] Successfully mapped", domains.length, "domains");
    return domains;
  } catch (err) {
    console.error("❌ [getMostCitedDomains] Unexpected error:", {
      error: err,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return [];
  }
}

// =============================================
// HIGH VALUE OPPORTUNITIES (REAL DATA)
// =============================================

/**
 * Find high-authority domains that cite competitors but NOT your brand
 * These are actionable opportunities for content strategy and PR
 * 
 * Uses the citations table directly, searching for brand and competitor mentions
 * in the text and domain fields using ILIKE pattern matching.
 * 
 * Example: If forbes.com cites Nike and Adidas but not your brand,
 * it's a high-value opportunity to build presence there.
 */
export async function getHighValueOpportunities(
  projectId: string,
  limit: number = 10,
  filters: CitationFilterOptions = {}
) {
  const supabase = await createClient();

  // Step 1: Get brand name from project
  const { data: project } = await supabase
    .from("projects")
    .select("brand_name")
    .eq("id", projectId)
    .single();

  const brandName = project?.brand_name || "";

  if (!brandName) {
    console.warn("No brand_name found for project", projectId);
    return [];
  }

  // Step 2: Get active competitors for this project
  const { data: competitors } = await supabase
    .from("competitors")
    .select("id, name")
    .eq("project_id", projectId)
    .eq("is_active", true);

  if (!competitors || competitors.length === 0) {
    return [];
  }

  const competitorNames = competitors.map((c) => c.name).filter(Boolean);

  // Get region_id if region filter is active
  let regionId: string | null = null;
  if (filters?.region && filters.region !== "GLOBAL") {
    regionId = await getRegionIdByCode(projectId, filters.region);
  }

  // Step 3: Get all citations for this project with filters
  // Note: citations table doesn't have project_id directly, it's through ai_responses
  let citationsQuery = supabase
    .from("citations")
    .select(`
      id,
      domain,
      text,
      url,
      uri,
      ai_response_id,
      ai_responses!inner(
        project_id,
        platform,
        prompt_tracking!inner(
          region_id,
          topic_id,
          regions:region_id(code)
        )
      )
    `)
    .eq("ai_responses.project_id", projectId)
    .not("domain", "is", null);

  // Apply date filter
  citationsQuery = applyDateFilter(citationsQuery, filters, "created_at");

  // Apply platform filter
  if (filters?.platform && filters.platform !== "all") {
    citationsQuery = applyPlatformFilter(citationsQuery, filters);
  }

  // Apply region filter using region_id
  if (regionId) {
    citationsQuery = citationsQuery.eq("ai_responses.prompt_tracking.region_id", regionId);
  }

  // Apply topic filter
  if (filters?.topicId && filters.topicId !== "all") {
    citationsQuery = applyTopicFilter(citationsQuery, filters);
  }

  citationsQuery = citationsQuery.limit(10000);

  const { data: allCitations, error } = await citationsQuery;

  if (error) {
    console.error("❌ Error fetching citations:", error);
    return [];
  }

  if (!allCitations || allCitations.length === 0) {
    console.log("⚠️ No citations found for project", projectId);
    return [];
  }

  console.log(`📊 Found ${allCitations.length} citations for project ${projectId}`);
  console.log(`🔍 Brand name: "${brandName}"`);
  console.log(`🏢 Competitors (${competitorNames.length}):`, competitorNames);

  // Step 4: Process citations to identify brand and competitor mentions
  // Group by domain and track mentions
  const domainData = new Map<string, {
    domain: string;
    brandMentioned: boolean;
    competitorsMentioned: Set<string>;
    citationFrequency: number;
    responseIds: Set<string>;
    urls: Set<string>; // Track unique URLs for this domain
  }>();

  allCitations.forEach((citation: any) => {
    const domain = citation.domain;
    if (!domain) return;

    // Get text from citation (can be null/empty)
    const text = (citation.text || "").toLowerCase();
    const url = (citation.url || "").toLowerCase();
    const domainLower = (domain || "").toLowerCase();
    const brandNameLower = brandName.toLowerCase();

    // Search in text, url, and domain for brand mentions
    const brandMentioned = 
      text.includes(brandNameLower) || 
      url.includes(brandNameLower) ||
      domainLower.includes(brandNameLower);

    // Check which competitors are mentioned (search in text, url, and domain)
    const mentionedCompetitors = new Set<string>();
    competitorNames.forEach((compName) => {
      const compNameLower = compName.toLowerCase();
      if (
        text.includes(compNameLower) || 
        url.includes(compNameLower) ||
        domainLower.includes(compNameLower)
      ) {
        mentionedCompetitors.add(compName);
      }
    });

    // Initialize domain entry if not exists
    if (!domainData.has(domain)) {
      domainData.set(domain, {
        domain,
        brandMentioned: false,
        competitorsMentioned: new Set<string>(),
        citationFrequency: 0,
        responseIds: new Set<string>(),
        urls: new Set<string>(),
      });
    }

    const domainInfo = domainData.get(domain)!;

    // Update brand mention status (once true, stays true)
    if (brandMentioned) {
      domainInfo.brandMentioned = true;
    }

    // Add competitor mentions
    mentionedCompetitors.forEach((compName) => {
      domainInfo.competitorsMentioned.add(compName);
    });

    // Add URL/URI if this citation mentions competitors
    // We'll filter later to only show URLs for domains that don't mention brand
    if (mentionedCompetitors.size > 0) {
      // Use uri (original from Gemini/Vertex) if available, otherwise use url
      // uri is the original source, url is the transformed version
      const citationUrl = citation.uri || citation.url;
      if (citationUrl) {
        domainInfo.urls.add(citationUrl);
      }
    }

    // Increment citation frequency
    domainInfo.citationFrequency++;
    if (citation.ai_response_id) {
      domainInfo.responseIds.add(citation.ai_response_id);
    }
  });

  // Step 5: Filter domains that mention competitors but NOT brand
  console.log(`📈 Processing ${domainData.size} unique domains`);
  
  const opportunities = Array.from(domainData.values())
    .filter((domainInfo) => {
      // Must mention at least one competitor
      if (domainInfo.competitorsMentioned.size === 0) {
        return false;
      }
      // Must NOT mention brand
      if (domainInfo.brandMentioned) {
        return false;
      }
      return true;
    })
    .map((domainInfo) => {
      // Estimate DR based on citation frequency (simulated)
      const estimatedDR = Math.min(100, 50 + (domainInfo.citationFrequency * 8));

      // Calculate opportunity score
      // Higher score = more competitors + higher DR + more citations
      const competitorWeight = domainInfo.competitorsMentioned.size * 15;
      const frequencyWeight = Math.min(30, domainInfo.citationFrequency * 5);
      const drWeight = estimatedDR * 0.4;
      const opportunityScore = Math.min(100, competitorWeight + frequencyWeight + drWeight);

      // Determine priority
      let priority: "high" | "medium" | "low" = "medium";
      if (opportunityScore >= 75 || domainInfo.competitorsMentioned.size >= 3) {
        priority = "high";
      } else if (opportunityScore >= 50 || domainInfo.competitorsMentioned.size >= 2) {
        priority = "medium";
      } else {
        priority = "low";
      }

      return {
        domain: domainInfo.domain,
        domainRating: estimatedDR,
        competitorsMentioned: Array.from(domainInfo.competitorsMentioned),
        citationFrequency: domainInfo.citationFrequency,
        opportunityScore: Math.round(opportunityScore),
        priority,
        topics: ["GEO Opportunity"], // Could be enhanced with actual topic detection
        pages: Array.from(domainInfo.urls), // URLs where competitors are mentioned
      };
    })
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, limit);

  console.log(`✅ Found ${opportunities.length} opportunities after filtering`);
  if (opportunities.length > 0) {
    console.log("📋 Sample opportunity:", opportunities[0]);
  }

  return opportunities;
}

/**
 * Find domains that cite neither your brand nor competitors
 * These are untapped opportunities for brand awareness and content strategy
 * 
 * Uses the citations table directly, searching for brand and competitor mentions
 * in the text and domain fields using ILIKE pattern matching.
 */
export async function getUnmentionedSources(
  projectId: string,
  limit: number = 10,
  filters: CitationFilterOptions = {}
) {
  const supabase = await createClient();

  // Step 1: Get brand name from project
  const { data: project } = await supabase
    .from("projects")
    .select("brand_name")
    .eq("id", projectId)
    .single();

  const brandName = project?.brand_name || "";

  if (!brandName) {
    console.warn("No brand_name found for project", projectId);
    return [];
  }

  // Step 2: Get active competitors for this project
  const { data: competitors } = await supabase
    .from("competitors")
    .select("id, name")
    .eq("project_id", projectId)
    .eq("is_active", true);

  const competitorNames = competitors?.map((c) => c.name).filter(Boolean) || [];

  // Get region_id if region filter is active
  let regionId: string | null = null;
  if (filters?.region && filters.region !== "GLOBAL") {
    regionId = await getRegionIdByCode(projectId, filters.region);
  }

  // Step 3: Get all citations for this project with filters
  let citationsQuery = supabase
    .from("citations")
    .select(`
      id,
      domain,
      text,
      url,
      uri,
      ai_response_id,
      ai_responses!inner(
        project_id,
        platform,
        prompt_tracking!inner(
          region_id,
          topic_id,
          regions:region_id(code)
        )
      )
    `)
    .eq("ai_responses.project_id", projectId)
    .not("domain", "is", null);

  // Apply date filter
  citationsQuery = applyDateFilter(citationsQuery, filters, "created_at");

  // Apply platform filter
  if (filters?.platform && filters.platform !== "all") {
    citationsQuery = applyPlatformFilter(citationsQuery, filters);
  }

  // Apply region filter using region_id
  if (regionId) {
    citationsQuery = citationsQuery.eq("ai_responses.prompt_tracking.region_id", regionId);
  }

  // Apply topic filter
  if (filters?.topicId && filters.topicId !== "all") {
    citationsQuery = applyTopicFilter(citationsQuery, filters);
  }

  citationsQuery = citationsQuery.limit(10000);

  const { data: allCitations, error } = await citationsQuery;

  if (error) {
    console.error("❌ Error fetching citations:", error);
    return [];
  }

  if (!allCitations || allCitations.length === 0) {
    console.log("⚠️ No citations found for project", projectId);
    return [];
  }

  console.log(`📊 Found ${allCitations.length} citations for unmentioned sources`);
  console.log(`🔍 Brand name: "${brandName}"`);
  console.log(`🏢 Competitors (${competitorNames.length}):`, competitorNames);

  // Step 4: Process citations to identify domains with NO mentions
  const domainData = new Map<string, {
    domain: string;
    brandMentioned: boolean;
    competitorsMentioned: Set<string>;
    citationFrequency: number;
    responseIds: Set<string>;
    urls: Set<string>;
  }>();

  allCitations.forEach((citation: any) => {
    const domain = citation.domain;
    if (!domain) return;

    // Get text from citation (can be null/empty)
    const text = (citation.text || "").toLowerCase();
    const url = (citation.url || "").toLowerCase();
    const domainLower = (domain || "").toLowerCase();
    const brandNameLower = brandName.toLowerCase();

    // Check if brand is mentioned in text, url, or domain
    const brandMentioned = 
      text.includes(brandNameLower) || 
      url.includes(brandNameLower) ||
      domainLower.includes(brandNameLower);

    // Check which competitors are mentioned
    const mentionedCompetitors = new Set<string>();
    competitorNames.forEach((compName) => {
      const compNameLower = compName.toLowerCase();
      if (
        text.includes(compNameLower) || 
        url.includes(compNameLower) ||
        domainLower.includes(compNameLower)
      ) {
        mentionedCompetitors.add(compName);
      }
    });

    // Initialize domain entry if not exists
    if (!domainData.has(domain)) {
      domainData.set(domain, {
        domain,
        brandMentioned: false,
        competitorsMentioned: new Set<string>(),
        citationFrequency: 0,
        responseIds: new Set<string>(),
        urls: new Set<string>(),
      });
    }

    const domainInfo = domainData.get(domain)!;

    // Update brand mention status (once true, stays true)
    if (brandMentioned) {
      domainInfo.brandMentioned = true;
    }

    // Add competitor mentions
    mentionedCompetitors.forEach((compName) => {
      domainInfo.competitorsMentioned.add(compName);
    });

    // Add URL if this citation doesn't mention brand or competitors
    // These are the citations we're interested in
    if (!brandMentioned && mentionedCompetitors.size === 0) {
      const citationUrl = citation.uri || citation.url;
      if (citationUrl) {
        domainInfo.urls.add(citationUrl);
      }
    }

    // Increment citation frequency
    domainInfo.citationFrequency++;
    if (citation.ai_response_id) {
      domainInfo.responseIds.add(citation.ai_response_id);
    }
  });

  // Step 5: Filter domains that mention NEITHER brand NOR competitors
  console.log(`📈 Processing ${domainData.size} unique domains for unmentioned sources`);
  
  const unmentionedSources = Array.from(domainData.values())
    .filter((domainInfo) => {
      // Must NOT mention brand
      if (domainInfo.brandMentioned) {
        return false;
      }
      // Must NOT mention any competitors
      if (domainInfo.competitorsMentioned.size > 0) {
        return false;
      }
      return true;
    })
    .map((domainInfo) => {
      // Estimate DR based on citation frequency (simulated)
      const estimatedDR = Math.min(100, 50 + (domainInfo.citationFrequency * 8));

      // Calculate opportunity score
      // Higher score = higher DR + more citations
      // Since there are no competitor mentions, we focus on frequency and DR
      const frequencyWeight = Math.min(40, domainInfo.citationFrequency * 5);
      const drWeight = estimatedDR * 0.5;
      const opportunityScore = Math.min(100, frequencyWeight + drWeight);

      // Determine priority
      let priority: "high" | "medium" | "low" = "medium";
      if (opportunityScore >= 70 || domainInfo.citationFrequency >= 10) {
        priority = "high";
      } else if (opportunityScore >= 45 || domainInfo.citationFrequency >= 5) {
        priority = "medium";
      } else {
        priority = "low";
      }

      return {
        domain: domainInfo.domain,
        domainRating: estimatedDR,
        competitorsMentioned: [], // Empty since no competitors mentioned
        citationFrequency: domainInfo.citationFrequency,
        opportunityScore: Math.round(opportunityScore),
        priority,
        topics: ["Untapped Opportunity"],
        pages: Array.from(domainInfo.urls),
      };
    })
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, limit);

  console.log(`✅ Found ${unmentionedSources.length} unmentioned sources after filtering`);
  if (unmentionedSources.length > 0) {
    console.log("📋 Sample unmentioned source:", unmentionedSources[0]);
  }

  return unmentionedSources;
}

// =============================================
// CITATION SOURCES (INDIVIDUAL URLs)
// =============================================

/**
 * Get individual citation sources with URLs
 * Shows the actual articles/pages that cited the brand
 * Uses citations table (not citations_detail)
 * Removed: citation_text and sentiment
 */
export async function getCitationSources(
  projectId: string,
  page: number = 1,
  pageSize: number = 10,
  filters: CitationFilterOptions = {}
) {
  const supabase = await createClient();

  const offset = (page - 1) * pageSize;

  // Map platform filter
  const mappedPlatform = mapPlatformToDatabase(filters?.platform);
  const platformFilter = mappedPlatform !== null;
  const regionFilter = filters?.region && filters.region !== "GLOBAL";
  const topicFilter = filters?.topicId && filters.topicId !== "all";

  // Get region_id if region filter is active
  let regionId: string | null = null;
  if (regionFilter && filters.region) {
    regionId = await getRegionIdByCode(projectId, filters.region);
    if (!regionId) {
      // Region not found, return empty results
      return {
        data: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
      };
    }
  }

  // Get total count for pagination
  let countQuery = supabase
    .from("citations")
    .select(`
      id,
      ai_responses!inner(
        platform,
        prompt_tracking!inner(
          region_id,
          topic_id,
          regions:region_id(code)
        )
      )
    `, { count: "exact", head: true })
    .eq("project_id", projectId)
    .not("url", "is", null);

  // Apply date filter
  countQuery = applyDateFilter(countQuery, filters, "created_at");

  // Apply platform filter (with mapping)
  if (platformFilter) {
    countQuery = countQuery.eq("ai_responses.platform", mappedPlatform);
  }

  // Apply region filter using region_id
  if (regionFilter && regionId) {
    countQuery = countQuery.eq("ai_responses.prompt_tracking.region_id", regionId);
  }

  // Apply topic filter
  if (topicFilter) {
    countQuery = countQuery.eq("ai_responses.prompt_tracking.topic_id", filters.topicId);
  }

  const { count } = await countQuery;

  // Get paginated citations
  let dataQuery = supabase
    .from("citations")
    .select(`
      id,
      url,
      domain,
      created_at,
      ai_responses!inner(
        id,
        platform,
        prompt_tracking!inner(
          region_id,
          topic_id,
          regions:region_id(code)
        )
      )
    `)
    .eq("project_id", projectId)
    .not("url", "is", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  // Apply date filter
  dataQuery = applyDateFilter(dataQuery, filters, "created_at");

  // Apply platform filter (with mapping)
  if (platformFilter) {
    dataQuery = dataQuery.eq("ai_responses.platform", mappedPlatform);
  }

  // Apply region filter using region_id
  if (regionFilter && regionId) {
    dataQuery = dataQuery.eq("ai_responses.prompt_tracking.region_id", regionId);
  }

  // Apply topic filter
  if (topicFilter) {
    dataQuery = dataQuery.eq("ai_responses.prompt_tracking.topic_id", filters.topicId);
  }

  const { data: citations, error } = await dataQuery;

  if (error) {
    console.error("Error fetching citation sources:", error);
    return {
      data: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
    };
      }

  if (!citations) {
      return {
      data: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
    };
  }

  // Map citations (removed citationText and sentiment)
  const mappedCitations = citations.map((citation: any) => ({
    id: citation.id,
    citedUrl: citation.url,
    citedDomain: citation.domain,
    platform: citation.ai_responses?.platform || "unknown",
    createdAt: citation.created_at,
  }));

  const total = count || 0;
  const totalPages = Math.ceil(total / pageSize);

  return {
    data: mappedCitations,
    total,
    page,
    pageSize,
    totalPages,
  };
}

// =============================================
// CITATIONS TRENDS
// =============================================

/**
 * Calculate Citations trends by comparing current vs previous period
 * Uses daily_brand_stats table for optimized performance
 */
export async function getCitationsTrends(
  projectId: string,
  fromDate?: Date,
  toDate?: Date,
  platform?: string,
  region?: string,
  topicId?: string
) {
  const supabase = await createClient();
  const { format } = await import("date-fns");

  // Current period (default to last 30 days ending yesterday)
  const currentEndDate = toDate || getYesterday();
  const currentStartDate = fromDate || (() => {
    const date = getYesterday();
    date.setDate(date.getDate() - 29);
    date.setHours(0, 0, 0, 0);
    return date;
  })();

  // Check if we're querying today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentEndDateOnly = new Date(currentEndDate);
  currentEndDateOnly.setHours(0, 0, 0, 0);
  const isQueryingToday = currentEndDateOnly.getTime() === today.getTime();

  // Calculate period duration
  const periodDuration = currentEndDate.getTime() - currentStartDate.getTime();

  // Previous period
  const previousEndDate = new Date(currentStartDate);
  const previousStartDate = new Date(previousEndDate.getTime() - periodDuration);

  // Map platform filter
  const mappedPlatform = mapPlatformToDatabase(platform);
  const platformFilter = mappedPlatform !== null;
  const regionFilter = region && region !== "GLOBAL";
  const topicFilter = topicId && topicId !== "all";

  // Get region_id if region filter is active
  let regionId: string | null = null;
  if (regionFilter && region) {
    regionId = await getRegionIdByCode(projectId, region);
  }

  // Format dates for SQL
  const currentStartStr = format(currentStartDate, "yyyy-MM-dd");
  const currentEndStr = format(currentEndDate, "yyyy-MM-dd");
  const previousStartStr = format(previousStartDate, "yyyy-MM-dd");
  const previousEndStr = format(previousEndDate, "yyyy-MM-dd");

  // Helper function to build unified query
  const buildUnifiedStatsQuery = (startDate: string, endDate: string) => {
    let query = supabase
      .from("daily_brand_stats")
      .select("entity_type, citations_count, competitor_id, entity_name, competitors!inner(name, is_active)")
      .eq("project_id", projectId)
      .gte("stat_date", startDate)
      .lte("stat_date", endDate);

    if (platformFilter) {
      query = query.eq("platform", mappedPlatform);
    }

    if (regionFilter && regionId) {
      query = query.eq("region_id", regionId);
    }

    if (topicFilter) {
      query = query.eq("topic_id", topicId);
    }

    return query;
  };

  // =============================================
  // CURRENT PERIOD (unified query)
  // =============================================
  const currentResult = await buildUnifiedStatsQuery(currentStartStr, currentEndStr);

  // Separate brand and competitor stats in JavaScript
  const currentBrandStats = currentResult.data?.filter(s => s.entity_type === "brand" && !s.competitor_id) || [];
  const currentCompStats = currentResult.data?.filter(s => s.entity_type === "competitor" && s.competitor_id) || [];

  // Calculate current period stats
  let currentBrandCitations = currentBrandStats.reduce(
    (sum, stat) => sum + (stat.citations_count || 0),
    0
  );

  const currentCompCitationsMap = new Map<string, number>();
  currentCompStats.forEach((stat: any) => {
    const competitor = stat.competitors;
    if (!competitor?.is_active || !stat.competitor_id) return;

    const currentCount = currentCompCitationsMap.get(stat.competitor_id) || 0;
    currentCompCitationsMap.set(stat.competitor_id, currentCount + (stat.citations_count || 0));
  });

  // Supplement with real-time data for today if querying today
  if (isQueryingToday) {
    const realTimeStats = await getTodayRealTimeCitationsStats(projectId, platform, region, topicId);
    
    currentBrandCitations += realTimeStats.brandCitations;
    
    realTimeStats.competitorCitations.forEach((compStat) => {
      const currentCount = currentCompCitationsMap.get(compStat.competitor_id) || 0;
      currentCompCitationsMap.set(compStat.competitor_id, currentCount + compStat.citations_count);
    });
  }

  const currentCompCitations = Array.from(currentCompCitationsMap.values()).reduce(
    (sum, count) => sum + count,
    0
  );

  const currentTotal = currentBrandCitations + currentCompCitations;
  const currentBrandShare = currentTotal > 0 
    ? (currentBrandCitations / currentTotal) * 100 
    : 0;

  // =============================================
  // PREVIOUS PERIOD (unified query)
  // =============================================
  const previousResult = await buildUnifiedStatsQuery(previousStartStr, previousEndStr);
  
  // Separate brand and competitor stats in JavaScript
  const previousBrandStats = previousResult.data?.filter(s => s.entity_type === "brand" && !s.competitor_id) || [];
  const previousCompStats = previousResult.data?.filter(s => s.entity_type === "competitor" && s.competitor_id) || [];
  
  // Calculate previous period stats
  const previousBrandCitations = previousBrandStats.reduce(
    (sum, stat) => sum + (stat.citations_count || 0),
    0
  );

  const previousCompCitationsMap = new Map<string, number>();
  previousCompStats.forEach((stat: any) => {
    const competitor = stat.competitors;
    if (!competitor?.is_active || !stat.competitor_id) return;

    const previousCount = previousCompCitationsMap.get(stat.competitor_id) || 0;
    previousCompCitationsMap.set(stat.competitor_id, previousCount + (stat.citations_count || 0));
  });

  const previousCompCitations = Array.from(previousCompCitationsMap.values()).reduce(
    (sum, count) => sum + count,
    0
  );

  const previousTotal = previousBrandCitations + previousCompCitations;
  const previousBrandShare = previousTotal > 0 
    ? (previousBrandCitations / previousTotal) * 100 
    : 0;

  // Calculate trend
  const shareTrend = currentBrandShare - previousBrandShare;

  // Calculate competitor trends
  const competitorTrends = new Map<string, { current: number; previous: number }>();

  // Get all unique competitor IDs from both periods
  const allCompetitorIds = new Set([
    ...Array.from(currentCompCitationsMap.keys()),
    ...Array.from(previousCompCitationsMap.keys()),
  ]);

  allCompetitorIds.forEach((competitorId) => {
    const currentStat = currentCompStats.find((s: any) => s.competitor_id === competitorId);
    const previousStat = previousCompStats.find((s: any) => s.competitor_id === competitorId);
    
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

    competitorTrends.get(competitorName)!.current += currentCompCitationsMap.get(competitorId) || 0;
    competitorTrends.get(competitorName)!.previous += previousCompCitationsMap.get(competitorId) || 0;
  });

  // Calculate percentage trends
  const competitorTrendsList = Array.from(competitorTrends.entries())
    .filter(([_, stats]) => stats.current > 0 || stats.previous > 0)
    .map(([name, stats]) => {
      const currentShare = currentTotal > 0 ? (stats.current / currentTotal) * 100 : 0;
      const previousShare = previousTotal > 0 ? (stats.previous / previousTotal) * 100 : 0;
      const trend = currentShare - previousShare;

    return {
        name,
        trend: Number(trend.toFixed(1)),
        currentCitations: stats.current,
        previousCitations: stats.previous,
    };
  });

  return {
    brandTrend: Number(shareTrend.toFixed(1)),
    competitorTrends: competitorTrendsList,
  };
}

// =============================================
// CITATIONS SHARE EVOLUTION
// =============================================

/**
 * Get daily citations share percentages for all entities (brand + competitors)
 * Used for stacked area chart visualization
 */
export async function getCitationsShareEvolution(
  projectId: string,
  fromDate?: Date,
  toDate?: Date,
  platform?: string,
  region?: string,
  topicId?: string
) {
  const supabase = await createClient();
  const { format, eachDayOfInterval } = await import("date-fns");

  // Get project info
  const { data: project } = await supabase
    .from("projects")
    .select("name, client_url, color")
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

  // Check if we're querying today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDateOnly = new Date(endDate);
  endDateOnly.setHours(0, 0, 0, 0);
  const isQueryingToday = endDateOnly.getTime() === today.getTime();

  // Map platform filter
  const mappedPlatform = mapPlatformToDatabase(platform);
  const platformFilter = mappedPlatform !== null;
  const regionFilter = region && region !== "GLOBAL";
  const topicFilter = topicId && topicId !== "all";

  // Get region_id if region filter is active
  let regionId: string | null = null;
  if (regionFilter && region) {
    regionId = await getRegionIdByCode(projectId, region);
  }

  const startDateStr = format(startDate, "yyyy-MM-dd");
  const endDateStr = format(endDate, "yyyy-MM-dd");

  // Build query for daily stats
  let query = supabase
    .from("daily_brand_stats")
    .select("stat_date, entity_type, competitor_id, citations_count, entity_name")
            .eq("project_id", projectId)
    .gte("stat_date", startDateStr)
    .lte("stat_date", endDateStr);

  if (platformFilter) {
    query = query.eq("platform", mappedPlatform);
  }
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
    const today = new Date();
    const cutoffTime = new Date(today);
    cutoffTime.setHours(4, 30, 0, 0); // 4:30 AM today (UTC)

    // Get citations created after 4:30 AM today
    let realTimeCitationsQuery = supabase
      .from("citations")
      .select("created_at, citation_type, competitor_id, ai_response_id")
      .eq("project_id", projectId)
      .gte("created_at", cutoffTime.toISOString())
      .lte("created_at", today.toISOString());

    const { data: realTimeCitations } = await realTimeCitationsQuery;

    // Get ai_response_ids
    const aiResponseIds = new Set<string>();
    realTimeCitations?.forEach((c: any) => {
      if (c.ai_response_id) aiResponseIds.add(c.ai_response_id);
    });

    if (aiResponseIds.size > 0) {
      // Get region_id if region filter is active
      let regionId: string | null = null;
      if (regionFilter && region) {
        regionId = await getRegionIdByCode(projectId, region);
      }

      let aiResponsesQuery = supabase
        .from("ai_responses")
        .select("id, platform, prompt_tracking(region_id, topic_id, regions:region_id(code))")
        .in("id", Array.from(aiResponseIds));

      if (platformFilter) {
        aiResponsesQuery = aiResponsesQuery.eq("platform", mappedPlatform);
      }

      const { data: aiResponses } = await aiResponsesQuery;

      let filteredAiResponses = aiResponses || [];
      if (regionFilter && regionId) {
        filteredAiResponses = filteredAiResponses.filter((ar: any) => {
          const pt = ar.prompt_tracking;
          if (!pt) return false;
          // Handle both array and object returns from Supabase join
          const ptRegionId = Array.isArray(pt) ? pt[0]?.region_id : pt.region_id;
          return ptRegionId === regionId;
        });
      }
      if (topicFilter) {
        filteredAiResponses = filteredAiResponses.filter((ar: any) => 
          ar.prompt_tracking?.topic_id === topicId
        );
      }

      // Aggregate real-time citations by entity and date
      const aiResponseMap = new Set(filteredAiResponses.map((ar: any) => ar.id));
      const todayStr = format(today, "yyyy-MM-dd");
      const realTimeMap = new Map<string, { brand: number; competitors: Map<string, number> }>();

      realTimeCitations?.forEach((citation: any) => {
        if (!aiResponseMap.has(citation.ai_response_id)) return;

        if (citation.citation_type === "brand") {
          const key = `${todayStr}-brand`;
          if (!realTimeMap.has(key)) {
            realTimeMap.set(key, { brand: 0, competitors: new Map() });
          }
          realTimeMap.get(key)!.brand++;
        } else if (citation.competitor_id) {
          const key = `${todayStr}-competitor-${citation.competitor_id}`;
          if (!realTimeMap.has(key)) {
            realTimeMap.set(key, { brand: 0, competitors: new Map() });
          }
          const compCount = realTimeMap.get(key)!.competitors.get(citation.competitor_id) || 0;
          realTimeMap.get(key)!.competitors.set(citation.competitor_id, compCount + 1);
        }
      });

      // Get competitor names for real-time stats
      const competitorIds = new Set<string>();
      realTimeCitations?.forEach((c: any) => {
        if (c.citation_type === "competitor" && c.competitor_id) {
          competitorIds.add(c.competitor_id);
        }
      });

      if (competitorIds.size > 0) {
        const { data: realTimeCompetitors } = await supabase
          .from("competitors")
          .select("id, name")
          .in("id", Array.from(competitorIds));

        const competitorNameMap = new Map<string, string>();
        realTimeCompetitors?.forEach((c: any) => {
          competitorNameMap.set(c.id, c.name);
        });

        // Convert to stats format
        realTimeMap.forEach((value, key) => {
          const [dateStr, entityType, competitorId] = key.split("-");
          if (entityType === "brand") {
            realTimeStats.push({
              stat_date: dateStr,
              entity_type: "brand",
              competitor_id: null,
              citations_count: value.brand,
              entity_name: project?.name || "Your Brand",
            });
          } else if (entityType === "competitor" && competitorId) {
            value.competitors.forEach((count, compId) => {
              realTimeStats.push({
                stat_date: dateStr,
                entity_type: "competitor",
                competitor_id: compId,
                citations_count: count,
                entity_name: competitorNameMap.get(compId) || "Unknown",
              });
            });
          }
        });
      }
    }
  }

  if (error) {
    console.error("Error fetching citations share evolution:", error);
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

  // Merge daily stats with real-time stats for today
  let allStats = [...(stats || [])];
  if (isQueryingToday && realTimeStats.length > 0) {
    const todayStr = format(today, "yyyy-MM-dd");
    const todayDailyStats = allStats.filter((s: any) => s.stat_date === todayStr);
    const todayRealTimeStats = realTimeStats.filter((s: any) => s.stat_date === todayStr);
    
    // Merge by entity
    const mergedTodayStats = new Map<string, any>();
    todayDailyStats.forEach((stat: any) => {
      const key = `${stat.entity_type}-${stat.competitor_id || "brand"}`;
      mergedTodayStats.set(key, { ...stat });
    });
    
    todayRealTimeStats.forEach((stat: any) => {
      const key = `${stat.entity_type}-${stat.competitor_id || "brand"}`;
      if (mergedTodayStats.has(key)) {
        mergedTodayStats.get(key)!.citations_count += stat.citations_count;
      } else {
        mergedTodayStats.set(key, { ...stat });
      }
    });
    
    // Replace today's stats in allStats
    const otherDaysStats = allStats.filter((s: any) => s.stat_date !== todayStr);
    allStats = [...otherDaysStats, ...Array.from(mergedTodayStats.values())];
  }

  // Group stats by date
  const allDays = eachDayOfInterval({ start: startDate, end: endDate });
  const dailyData = allDays.map((day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    const dayStats = allStats.filter((s: any) => s.stat_date === dayStr);

    // Calculate citations for each entity
    const entityCitations: Record<string, number> = {};
    let totalCitations = 0;

    // Brand citations
    const brandCitations = dayStats
      .filter((s: any) => s.entity_type === "brand" && !s.competitor_id)
      .reduce((sum: number, s: any) => sum + (s.citations_count || 0), 0);
    entityCitations["brand"] = brandCitations;
    totalCitations += brandCitations;

    // Competitor citations
    competitors?.forEach((comp: any) => {
      const compCitations = dayStats
        .filter((s: any) => s.entity_type === "competitor" && s.competitor_id === comp.id)
        .reduce((sum: number, s: any) => sum + (s.citations_count || 0), 0);
      entityCitations[comp.id] = compCitations;
      totalCitations += compCitations;
    });

    // Calculate percentages
    const result: any = {
      date: format(day, "MMM dd"),
      fullDate: dayStr,
      total: totalCitations,
    };

    entityList.forEach((entity) => {
      const citations = entityCitations[entity.id] || 0;
      result[entity.id] = totalCitations > 0 ? Number(((citations / totalCitations) * 100).toFixed(1)) : 0;
      result[`${entity.id}_mentions`] = citations; // Keep _mentions key for component compatibility
    });

    return result;
  });

  return {
    data: dailyData,
    entities: entityList,
  };
}

