"use server";

import { createClient } from "@/lib/supabase/server";

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

function applyRegionFilter(
  query: any,
  filters?: CitationFilterOptions
) {
  if (filters?.region && filters.region !== "GLOBAL") {
    // For queries that join with prompt_tracking, filter by region
    query = query.eq("ai_responses.prompt_tracking.region", filters.region);
  }
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
 * Get Quick Look Metrics using REAL data from AI analysis
 * - Total Citation Pages: Count of citations for brand from daily_brand_stats
 * - My Pages Cited: Same as totalCitationPages
 * - Ranking: Brand vs Competitors citations ranking
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

  // Map platform filter
  const mappedPlatform = mapPlatformToDatabase(filters?.platform);
  const platformFilter = mappedPlatform !== null;
  const regionFilter = filters?.region && filters.region !== "GLOBAL"; // GLOBAL means sum all regions
  const topicFilter = filters?.topicId && filters.topicId !== "all";

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
  const [
    totalCitationPagesResult,
    myPagesCitedResult,
    competitorCitationsResult,
    allCompetitorsResult
  ] = await Promise.all([
    // Total Citation Pages - use daily_brand_stats.citations_count for brand
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
      if (regionFilter) {
        query = query.eq("region", filters.region);
      }

      if (topicFilter) {
        query = query.eq("topic_id", filters.topicId);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching total citation pages:', error);
        return { data: 0, error };
      }
      const total = data?.reduce((sum, row) => sum + (row.citations_count || 0), 0) || 0;
      return { data: total, error: null };
    })(),
    
    // My Pages Cited - same as totalCitationPages (citations_count from daily_brand_stats)
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

      if (regionFilter) {
        query = query.eq("region", filters.region);
      }

      if (topicFilter) {
        query = query.eq("topic_id", filters.topicId);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching my pages cited:', error);
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
      
      if (regionFilter) {
        query = query.eq("region", filters.region);
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
  const totalCitationPages = totalCitationPagesResult.data || 0;

  // My Pages Cited (same as totalCitationPages)
  const myPagesCited = myPagesCitedResult.data || 0;

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

  // Get citations grouped by date - only citations WITH URLs and direct mentions
  const { data: citations } = await supabase
    .from("citations_detail")
    .select("created_at")
    .eq("project_id", projectId)
    .eq("is_direct_mention", true) // ✅ Only count real mentions in text, not URLs without mentions
    .not("cited_url", "is", null) // ✅ Only real citations with URLs
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

  // Map platform filter
  const mappedPlatform = mapPlatformToDatabase(platform);
  const platformFilter = mappedPlatform !== null;
  const regionFilter = region && region !== "GLOBAL"; // GLOBAL means sum all regions
  const topicFilter = topicId && topicId !== "all";

  // Format dates for SQL
  const startDateStr = format(startDate, "yyyy-MM-dd");
  const endDateStr = format(endDate, "yyyy-MM-dd");

  // =============================================
  // GET BRAND CITATIONS (from daily_brand_stats)
  // =============================================
  let brandQuery = supabase
    .from("daily_brand_stats")
    .select("citations_count")
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
    console.error('Error fetching brand citations from daily_brand_stats:', brandError);
  }

  const brandCitations = brandStats?.reduce((sum, stat) => sum + (stat.citations_count || 0), 0) || 0;

  // =============================================
  // GET COMPETITOR CITATIONS (from daily_brand_stats)
  // =============================================
  let competitorQuery = supabase
    .from("daily_brand_stats")
        .select("competitor_id, entity_name, citations_count, competitors!inner(id, name, domain, is_active, color)")
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
    console.error('Error fetching competitor citations from daily_brand_stats:', compError);
  }

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
 * Uses citations table - counts ALL citations by domain (not filtered by citation_type)
 */
export async function getMostCitedDomains(
  projectId: string,
  limit: number = 10,
  filters: CitationFilterOptions = {}
) {
  const supabase = await createClient();

  // Map platform filter
  const mappedPlatform = mapPlatformToDatabase(filters?.platform);
  const platformFilter = mappedPlatform !== null;
  const regionFilter = filters?.region && filters.region !== "GLOBAL";
  const topicFilter = filters?.topicId && filters.topicId !== "all";

  // Helper function to build the base query
  const buildQuery = () => {
    let query = supabase
      .from("citations")
            .select(`
              id,
        domain,
        url,
              ai_responses!inner(
                platform,
                prompt_tracking!inner(region, topic_id)
              )
            `)
            .eq("project_id", projectId)
      .not("domain", "is", null)
      .not("url", "is", null);

    // Apply date filter
    query = applyDateFilter(query, filters, "created_at");

    // Apply platform filter (with mapping)
    if (platformFilter) {
      query = query.eq("ai_responses.platform", mappedPlatform);
    }

    // Apply region filter
    if (regionFilter) {
      query = query.eq("ai_responses.prompt_tracking.region", filters.region);
    }

    // Apply topic filter
    if (topicFilter) {
      query = query.eq("ai_responses.prompt_tracking.topic_id", filters.topicId);
    }

    return query;
  };

  console.log("Most Cited Domains query filters:", {
    projectId,
    platformFilter: mappedPlatform,
    regionFilter: filters?.region,
    topicFilter: filters?.topicId,
    dateRange: filters?.fromDate && filters?.toDate ? {
      from: filters.fromDate.toISOString(),
      to: filters.toDate.toISOString()
    } : null
  });

  // Fetch citations using pagination (Supabase has a 1000 row limit per query)
  // We'll fetch in batches, but limit to a reasonable number of pages for performance
  let allCitations: any[] = [];
  let page = 0;
  const pageSize = 1000;
  const maxPages = 10; // Limit to 10,000 citations max for performance (should be enough for most cases)

  try {
    while (page < maxPages) {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      
      // Build a fresh query for each page
      const query = buildQuery();
      const { data: citations, error } = await query.range(from, to);

      if (error) {
        console.error("Error fetching most cited domains (page", page, "):", error);
        // If we have some data, return what we have instead of failing completely
        if (allCitations.length > 0) {
          console.warn("Returning partial data due to error on page", page);
          break;
        }
        return [];
      }

      if (!citations || citations.length === 0) {
        // No more data
        break;
      }

      allCitations = allCitations.concat(citations);
      
      // If we got fewer than pageSize results, we've reached the end
      if (citations.length < pageSize) {
        break;
      }
      
      page++;
    }
  } catch (error) {
    console.error("Unexpected error in pagination loop:", error);
    // If we have some data, return what we have
    if (allCitations.length === 0) {
      return [];
    }
  }

  if (allCitations.length === 0) {
    console.log("No citations found for Most Cited Domains");
    return [];
  }

  console.log(`Fetched ${allCitations.length} total citations across ${page + 1} page(s)`);

  const citations = allCitations;

  // Debug: Log unique domains found
  const uniqueDomains = new Set(citations.map((c: any) => c.domain).filter(Boolean));
  console.log(`Found ${uniqueDomains.size} unique domains in citations (total citations: ${citations.length})`);

  // Count citations by domain - simple aggregation
  const domainStats = new Map<string, {
    domain: string;
    citations: number;
    platforms: Set<string>;
    sampleUrl: string;
  }>();

  citations.forEach((citation: any) => {
    const domain = citation.domain;
    if (!domain) {
      console.log("Skipping citation with no domain:", citation.id);
      return;
    }

    if (!domainStats.has(domain)) {
      domainStats.set(domain, {
        domain,
        citations: 0,
        platforms: new Set(),
        sampleUrl: citation.url,
      });
    }

    const stats = domainStats.get(domain)!;
    stats.citations++;
    if (citation.ai_responses?.platform) {
      stats.platforms.add(citation.ai_responses.platform);
    } else {
      console.log("Citation missing platform:", citation.id, citation.domain);
    }
  });

  // Debug: Log domain distribution
  console.log("Domain stats:", Array.from(domainStats.entries()).slice(0, 10).map(([domain, stats]) => ({
    domain,
    citations: stats.citations,
    platforms: Array.from(stats.platforms)
  })));

  // Convert to array and sort by citations count (descending)
  const domains = Array.from(domainStats.values())
    .map((stats) => {
      return {
        domain: stats.domain,
        citations: stats.citations,
        type: "Web Source",
        platforms: Array.from(stats.platforms),
        changePercent: 0, // TODO: Calculate trend comparing with previous period
      };
    })
    .sort((a, b) => b.citations - a.citations)
    .slice(0, limit);

  console.log(`Returning ${domains.length} domains, top domain has ${domains[0]?.citations || 0} citations`);

  return domains;
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

  // Step 3: Get all citations for this project with filters
  // Note: citations table doesn't have project_id directly, it's through ai_responses
  let citationsQuery = applyTopicFilter(
    applyRegionFilter(
      applyPlatformFilter(
        applyDateFilter(
          supabase
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
                prompt_tracking!inner(region, topic_id)
              )
            `)
            .eq("ai_responses.project_id", projectId)
            .not("domain", "is", null)
            .limit(10000),
          filters
        ),
        filters
      ),
      filters
    ),
    filters
  );

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

  // Step 3: Get all citations for this project with filters
  let citationsQuery = applyTopicFilter(
    applyRegionFilter(
      applyPlatformFilter(
        applyDateFilter(
          supabase
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
                prompt_tracking!inner(region, topic_id)
              )
            `)
            .eq("ai_responses.project_id", projectId)
            .not("domain", "is", null)
            .limit(10000),
          filters
        ),
        filters
      ),
      filters
    ),
    filters
  );

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

  // Get total count for pagination
  let countQuery = supabase
    .from("citations")
            .select(`
              id,
              ai_responses!inner(
                platform,
                prompt_tracking!inner(region, topic_id)
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

  // Apply region filter
  if (regionFilter) {
    countQuery = countQuery.eq("ai_responses.prompt_tracking.region", filters.region);
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
        prompt_tracking!inner(region, topic_id)
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

  // Apply region filter
  if (regionFilter) {
    dataQuery = dataQuery.eq("ai_responses.prompt_tracking.region", filters.region);
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

  // Format dates for SQL
  const currentStartStr = format(currentStartDate, "yyyy-MM-dd");
  const currentEndStr = format(currentEndDate, "yyyy-MM-dd");
  const previousStartStr = format(previousStartDate, "yyyy-MM-dd");
  const previousEndStr = format(previousEndDate, "yyyy-MM-dd");

  // Helper function to build query
  const buildStatsQuery = (startDate: string, endDate: string, entityType: "brand" | "competitor") => {
    let query = supabase
      .from("daily_brand_stats")
      .select("citations_count, competitor_id, entity_name, competitors!inner(name, is_active)")
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
  const currentBrandCitations = currentBrandResult.data?.reduce(
    (sum, stat) => sum + (stat.citations_count || 0),
    0
  ) || 0;

  const currentCompCitationsMap = new Map<string, number>();
  currentCompResult.data?.forEach((stat: any) => {
    const competitor = stat.competitors;
    if (!competitor?.is_active || !stat.competitor_id) return;

    const currentCount = currentCompCitationsMap.get(stat.competitor_id) || 0;
    currentCompCitationsMap.set(stat.competitor_id, currentCount + (stat.citations_count || 0));
  });

  const currentCompCitations = Array.from(currentCompCitationsMap.values()).reduce(
    (sum, count) => sum + count,
    0
  );

  const currentTotal = currentBrandCitations + currentCompCitations;
  const currentBrandShare = currentTotal > 0 
    ? (currentBrandCitations / currentTotal) * 100 
    : 0;

  // =============================================
  // PREVIOUS PERIOD
  // =============================================
  const [previousBrandResult, previousCompResult] = await Promise.all([
    buildStatsQuery(previousStartStr, previousEndStr, "brand"),
    buildStatsQuery(previousStartStr, previousEndStr, "competitor"),
  ]);
  
  // Calculate previous period stats
  const previousBrandCitations = previousBrandResult.data?.reduce(
    (sum, stat) => sum + (stat.citations_count || 0),
    0
  ) || 0;

  const previousCompCitationsMap = new Map<string, number>();
  previousCompResult.data?.forEach((stat: any) => {
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
    const currentStat = currentCompResult.data?.find((s: any) => s.competitor_id === competitorId);
    const previousStat = previousCompResult.data?.find((s: any) => s.competitor_id === competitorId);
    
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
    .select("stat_date, entity_type, competitor_id, citations_count, entity_name")
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

  // Group stats by date
  const allDays = eachDayOfInterval({ start: startDate, end: endDate });
  const dailyData = allDays.map((day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    const dayStats = stats?.filter((s: any) => s.stat_date === dayStr) || [];

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

