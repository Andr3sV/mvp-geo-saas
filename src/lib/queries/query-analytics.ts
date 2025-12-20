"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Get yesterday's date
 */
function getYesterday(): Date {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(23, 59, 59, 999);
  return yesterday;
}

// =============================================
// QUERY PATTERNS - Overview Metrics
// =============================================

export async function getQueryOverview(
  projectId: string,
  fromDate?: Date,
  toDate?: Date,
  platform?: string,
  region?: string
) {
  const supabase = await createClient();

  const endDate = toDate || getYesterday();
  const startDate = fromDate || (() => {
    const date = getYesterday();
    date.setDate(date.getDate() - 29);
    date.setHours(0, 0, 0, 0);
    return date;
  })();

  // Get citations with web_search_query
  let query = supabase
    .from("citations")
    .select("web_search_query, ai_responses!inner(platform, prompt_tracking!inner(project_id, region))")
    .eq("ai_responses.prompt_tracking.project_id", projectId)
    .not("web_search_query", "is", null)
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString());

  if (platform && platform !== "all") {
    query = query.eq("ai_responses.platform", platform);
  }

  const { data: citations, error } = await query;

  if (error) {
    console.error("Error fetching query overview:", error);
    return {
      totalQueries: 0,
      uniqueQueries: 0,
      topPlatform: "N/A",
      avgQueryLength: 0,
    };
  }

  // Filter by region if needed
  const filteredCitations = citations?.filter((c: any) => {
    if (!region || region === "GLOBAL") return true;
    return c.ai_responses?.prompt_tracking?.region === region;
  }) || [];

  const allQueries = filteredCitations.map((c: any) => c.web_search_query).filter(Boolean);
  const uniqueQueries = new Set(allQueries);

  // Count by platform
  const platformCounts: Record<string, number> = {};
  filteredCitations.forEach((c: any) => {
    const p = c.ai_responses?.platform;
    if (p) {
      platformCounts[p] = (platformCounts[p] || 0) + 1;
    }
  });

  const topPlatform = Object.entries(platformCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

  // Average query length
  const avgLength = allQueries.length > 0
    ? Math.round(allQueries.reduce((sum: number, q: string) => sum + q.length, 0) / allQueries.length)
    : 0;

  return {
    totalQueries: allQueries.length,
    uniqueQueries: uniqueQueries.size,
    topPlatform: topPlatform === "openai" ? "OpenAI" : topPlatform === "gemini" ? "Gemini" : topPlatform,
    avgQueryLength: avgLength,
  };
}

// =============================================
// QUERY PATTERNS - Word Cloud Data
// =============================================

export async function getQueryWordCloudData(
  projectId: string,
  fromDate?: Date,
  toDate?: Date,
  platform?: string,
  region?: string,
  limit: number = 100
) {
  const supabase = await createClient();

  const endDate = toDate || getYesterday();
  const startDate = fromDate || (() => {
    const date = getYesterday();
    date.setDate(date.getDate() - 29);
    date.setHours(0, 0, 0, 0);
    return date;
  })();

  let query = supabase
    .from("citations")
    .select("web_search_query, ai_responses!inner(platform, prompt_tracking!inner(project_id, region))")
    .eq("ai_responses.prompt_tracking.project_id", projectId)
    .not("web_search_query", "is", null)
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString());

  if (platform && platform !== "all") {
    query = query.eq("ai_responses.platform", platform);
  }

  const { data: citations, error } = await query;

  if (error) {
    console.error("Error fetching word cloud data:", error);
    return [];
  }

  // Filter by region
  const filteredCitations = citations?.filter((c: any) => {
    if (!region || region === "GLOBAL") return true;
    return c.ai_responses?.prompt_tracking?.region === region;
  }) || [];

  // Count query frequency
  const queryCounts = new Map<string, number>();
  filteredCitations.forEach((c: any) => {
    const q = c.web_search_query;
    if (q) {
      queryCounts.set(q, (queryCounts.get(q) || 0) + 1);
    }
  });

  // Convert to word cloud format and sort by count
  const wordCloudData = Array.from(queryCounts.entries())
    .map(([text, value]) => ({ text, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);

  return wordCloudData;
}

// =============================================
// QUERY PATTERNS - Platform Distribution
// =============================================

export async function getQueryPlatformDistribution(
  projectId: string,
  fromDate?: Date,
  toDate?: Date,
  region?: string
) {
  const supabase = await createClient();

  const endDate = toDate || getYesterday();
  const startDate = fromDate || (() => {
    const date = getYesterday();
    date.setDate(date.getDate() - 29);
    date.setHours(0, 0, 0, 0);
    return date;
  })();

  let query = supabase
    .from("citations")
    .select("web_search_query, ai_responses!inner(platform, prompt_tracking!inner(project_id, region))")
    .eq("ai_responses.prompt_tracking.project_id", projectId)
    .not("web_search_query", "is", null)
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString());

  const { data: citations, error } = await query;

  if (error) {
    console.error("Error fetching platform distribution:", error);
    return { openai: [], gemini: [] };
  }

  // Filter by region
  const filteredCitations = citations?.filter((c: any) => {
    if (!region || region === "GLOBAL") return true;
    return c.ai_responses?.prompt_tracking?.region === region;
  }) || [];

  // Group by platform and count queries
  const platformQueries: Record<string, Map<string, number>> = {
    openai: new Map(),
    gemini: new Map(),
  };

  filteredCitations.forEach((c: any) => {
    const platform = c.ai_responses?.platform;
    const query = c.web_search_query;
    if (platform && query && platformQueries[platform]) {
      const map = platformQueries[platform];
      map.set(query, (map.get(query) || 0) + 1);
    }
  });

  // Convert to arrays
  const formatPlatformData = (map: Map<string, number>) => {
    return Array.from(map.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  return {
    openai: formatPlatformData(platformQueries.openai),
    gemini: formatPlatformData(platformQueries.gemini),
  };
}

// =============================================
// QUERY PATTERNS - Intent Breakdown
// =============================================

export async function getQueryIntentBreakdown(
  projectId: string,
  fromDate?: Date,
  toDate?: Date,
  platform?: string,
  region?: string
) {
  const supabase = await createClient();

  const endDate = toDate || getYesterday();
  const startDate = fromDate || (() => {
    const date = getYesterday();
    date.setDate(date.getDate() - 29);
    date.setHours(0, 0, 0, 0);
    return date;
  })();

  let query = supabase
    .from("citations")
    .select("web_search_query, ai_responses!inner(platform, prompt_tracking!inner(project_id, region))")
    .eq("ai_responses.prompt_tracking.project_id", projectId)
    .not("web_search_query", "is", null)
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString());

  if (platform && platform !== "all") {
    query = query.eq("ai_responses.platform", platform);
  }

  const { data: citations, error } = await query;

  if (error) {
    console.error("Error fetching intent breakdown:", error);
    return [];
  }

  // Filter by region
  const filteredCitations = citations?.filter((c: any) => {
    if (!region || region === "GLOBAL") return true;
    return c.ai_responses?.prompt_tracking?.region === region;
  }) || [];

  // Categorize queries by intent patterns
  const intentPatterns = [
    { pattern: /^what (is|are)/i, intent: "Definition", color: "#3b82f6" },
    { pattern: /^how (to|do|can)/i, intent: "How-to", color: "#10b981" },
    { pattern: /best|top|recommended/i, intent: "Best/Top", color: "#f59e0b" },
    { pattern: /compare|vs|versus|difference/i, intent: "Comparison", color: "#8b5cf6" },
    { pattern: /why|reason/i, intent: "Explanation", color: "#ec4899" },
    { pattern: /review|rating/i, intent: "Reviews", color: "#14b8a6" },
    { pattern: /price|cost|pricing/i, intent: "Pricing", color: "#f97316" },
    { pattern: /alternative|instead/i, intent: "Alternatives", color: "#6366f1" },
  ];

  const intentCounts: Record<string, { count: number; color: string }> = {};

  filteredCitations.forEach((c: any) => {
    const q = c.web_search_query?.toLowerCase() || "";
    let matched = false;

    for (const { pattern, intent, color } of intentPatterns) {
      if (pattern.test(q)) {
        if (!intentCounts[intent]) {
          intentCounts[intent] = { count: 0, color };
        }
        intentCounts[intent].count++;
        matched = true;
        break;
      }
    }

    if (!matched) {
      if (!intentCounts["Other"]) {
        intentCounts["Other"] = { count: 0, color: "#64748b" };
      }
      intentCounts["Other"].count++;
    }
  });

  return Object.entries(intentCounts)
    .map(([intent, { count, color }]) => ({ intent, count, color }))
    .sort((a, b) => b.count - a.count);
}

// =============================================
// QUERY PATTERNS - Top Queries
// =============================================

export async function getTopQueries(
  projectId: string,
  limit: number = 20,
  fromDate?: Date,
  toDate?: Date,
  platform?: string,
  region?: string
) {
  const supabase = await createClient();

  const endDate = toDate || getYesterday();
  const startDate = fromDate || (() => {
    const date = getYesterday();
    date.setDate(date.getDate() - 29);
    date.setHours(0, 0, 0, 0);
    return date;
  })();

  let query = supabase
    .from("citations")
    .select("web_search_query, domain, ai_responses!inner(platform, prompt_tracking!inner(project_id, region))")
    .eq("ai_responses.prompt_tracking.project_id", projectId)
    .not("web_search_query", "is", null)
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString());

  if (platform && platform !== "all") {
    query = query.eq("ai_responses.platform", platform);
  }

  const { data: citations, error } = await query;

  if (error) {
    console.error("Error fetching top queries:", error);
    return [];
  }

  // Filter by region
  const filteredCitations = citations?.filter((c: any) => {
    if (!region || region === "GLOBAL") return true;
    return c.ai_responses?.prompt_tracking?.region === region;
  }) || [];

  // Aggregate by query
  const queryData = new Map<string, {
    count: number;
    platforms: Set<string>;
    domains: Set<string>;
  }>();

  filteredCitations.forEach((c: any) => {
    const q = c.web_search_query;
    if (!q) return;

    if (!queryData.has(q)) {
      queryData.set(q, { count: 0, platforms: new Set(), domains: new Set() });
    }

    const data = queryData.get(q)!;
    data.count++;
    if (c.ai_responses?.platform) data.platforms.add(c.ai_responses.platform);
    if (c.domain) data.domains.add(c.domain);
  });

  return Array.from(queryData.entries())
    .map(([query, data]) => ({
      query,
      count: data.count,
      platforms: Array.from(data.platforms),
      domains: Array.from(data.domains).slice(0, 3),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// =============================================
// QUERY PATTERNS - Query-Domain Correlation
// =============================================

export async function getQueryDomainCorrelation(
  projectId: string,
  fromDate?: Date,
  toDate?: Date,
  platform?: string,
  region?: string,
  queryLimit: number = 10,
  domainLimit: number = 10
) {
  const supabase = await createClient();

  const endDate = toDate || getYesterday();
  const startDate = fromDate || (() => {
    const date = getYesterday();
    date.setDate(date.getDate() - 29);
    date.setHours(0, 0, 0, 0);
    return date;
  })();

  let query = supabase
    .from("citations")
    .select("web_search_query, domain, ai_responses!inner(platform, prompt_tracking!inner(project_id, region))")
    .eq("ai_responses.prompt_tracking.project_id", projectId)
    .not("web_search_query", "is", null)
    .not("domain", "is", null)
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString());

  if (platform && platform !== "all") {
    query = query.eq("ai_responses.platform", platform);
  }

  const { data: citations, error } = await query;

  if (error) {
    console.error("Error fetching query-domain correlation:", error);
    return { queries: [], domains: [], matrix: [] };
  }

  // Filter by region
  const filteredCitations = citations?.filter((c: any) => {
    if (!region || region === "GLOBAL") return true;
    return c.ai_responses?.prompt_tracking?.region === region;
  }) || [];

  // Count queries and domains
  const queryCounts = new Map<string, number>();
  const domainCounts = new Map<string, number>();
  const correlationMap = new Map<string, Map<string, number>>();

  filteredCitations.forEach((c: any) => {
    const q = c.web_search_query;
    const d = c.domain;
    if (!q || !d) return;

    queryCounts.set(q, (queryCounts.get(q) || 0) + 1);
    domainCounts.set(d, (domainCounts.get(d) || 0) + 1);

    if (!correlationMap.has(q)) {
      correlationMap.set(q, new Map());
    }
    const qMap = correlationMap.get(q)!;
    qMap.set(d, (qMap.get(d) || 0) + 1);
  });

  // Get top queries and domains
  const topQueries = Array.from(queryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, queryLimit)
    .map(([q]) => q);

  const topDomains = Array.from(domainCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, domainLimit)
    .map(([d]) => d);

  // Build matrix
  const matrix = topQueries.map((q) => {
    const qCorrelations = correlationMap.get(q) || new Map();
    return topDomains.map((d) => qCorrelations.get(d) || 0);
  });

  return { queries: topQueries, domains: topDomains, matrix };
}

// =============================================
// TRENDING - Metrics
// =============================================

export async function getTrendMetrics(
  projectId: string,
  fromDate?: Date,
  toDate?: Date,
  platform?: string,
  region?: string
) {
  const supabase = await createClient();
  const { format, subDays } = await import("date-fns");

  const endDate = toDate || getYesterday();
  const startDate = fromDate || (() => {
    const date = getYesterday();
    date.setDate(date.getDate() - 29);
    date.setHours(0, 0, 0, 0);
    return date;
  })();

  // Calculate periods
  const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const previousStart = subDays(startDate, periodDays);
  const previousEnd = subDays(startDate, 1);

  // Fetch current period
  let currentQuery = supabase
    .from("citations")
    .select("web_search_query, created_at, ai_responses!inner(platform, prompt_tracking!inner(project_id, region))")
    .eq("ai_responses.prompt_tracking.project_id", projectId)
    .not("web_search_query", "is", null)
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString());

  if (platform && platform !== "all") {
    currentQuery = currentQuery.eq("ai_responses.platform", platform);
  }

  // Fetch previous period
  let previousQuery = supabase
    .from("citations")
    .select("web_search_query, ai_responses!inner(platform, prompt_tracking!inner(project_id, region))")
    .eq("ai_responses.prompt_tracking.project_id", projectId)
    .not("web_search_query", "is", null)
    .gte("created_at", previousStart.toISOString())
    .lte("created_at", previousEnd.toISOString());

  if (platform && platform !== "all") {
    previousQuery = previousQuery.eq("ai_responses.platform", platform);
  }

  const [currentResult, previousResult] = await Promise.all([currentQuery, previousQuery]);

  if (currentResult.error || previousResult.error) {
    console.error("Error fetching trend metrics:", currentResult.error || previousResult.error);
    return { risingCount: 0, decliningCount: 0, newCount: 0, momentumScore: 0 };
  }

  // Filter by region
  const filterByRegion = (citations: any[]) => {
    if (!region || region === "GLOBAL") return citations;
    return citations.filter((c: any) => c.ai_responses?.prompt_tracking?.region === region);
  };

  const currentCitations = filterByRegion(currentResult.data || []);
  const previousCitations = filterByRegion(previousResult.data || []);

  // Count queries per period
  const currentCounts = new Map<string, number>();
  const previousCounts = new Map<string, number>();

  currentCitations.forEach((c: any) => {
    const q = c.web_search_query;
    if (q) currentCounts.set(q, (currentCounts.get(q) || 0) + 1);
  });

  previousCitations.forEach((c: any) => {
    const q = c.web_search_query;
    if (q) previousCounts.set(q, (previousCounts.get(q) || 0) + 1);
  });

  // Calculate rising, declining, new
  let risingCount = 0;
  let decliningCount = 0;
  let newCount = 0;

  currentCounts.forEach((count, query) => {
    const prevCount = previousCounts.get(query) || 0;
    if (prevCount === 0) {
      newCount++;
    } else if (count > prevCount) {
      risingCount++;
    }
  });

  previousCounts.forEach((prevCount, query) => {
    const currCount = currentCounts.get(query) || 0;
    if (currCount < prevCount && currCount > 0) {
      decliningCount++;
    }
  });

  // Calculate momentum score
  const currentTotal = currentCitations.length;
  const previousTotal = previousCitations.length;
  const momentumScore = previousTotal > 0
    ? Number(((currentTotal - previousTotal) / previousTotal * 100).toFixed(1))
    : 0;

  return { risingCount, decliningCount, newCount, momentumScore };
}

// =============================================
// TRENDING - Query Velocity (Daily Evolution)
// =============================================

export async function getQueryVelocity(
  projectId: string,
  fromDate?: Date,
  toDate?: Date,
  platform?: string,
  region?: string
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

  let query = supabase
    .from("citations")
    .select("web_search_query, created_at, ai_responses!inner(platform, prompt_tracking!inner(project_id, region))")
    .eq("ai_responses.prompt_tracking.project_id", projectId)
    .not("web_search_query", "is", null)
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString());

  if (platform && platform !== "all") {
    query = query.eq("ai_responses.platform", platform);
  }

  const { data: citations, error } = await query;

  if (error) {
    console.error("Error fetching query velocity:", error);
    return [];
  }

  // Filter by region
  const filteredCitations = citations?.filter((c: any) => {
    if (!region || region === "GLOBAL") return true;
    return c.ai_responses?.prompt_tracking?.region === region;
  }) || [];

  // Group by date
  const dailyCounts = new Map<string, number>();
  filteredCitations.forEach((c: any) => {
    const date = format(new Date(c.created_at), "yyyy-MM-dd");
    dailyCounts.set(date, (dailyCounts.get(date) || 0) + 1);
  });

  // Generate all days
  const allDays = eachDayOfInterval({ start: startDate, end: endDate });

  return allDays.map((day) => {
    const dateStr = format(day, "yyyy-MM-dd");
    return {
      date: format(day, "MMM dd"),
      fullDate: dateStr,
      queries: dailyCounts.get(dateStr) || 0,
    };
  });
}

// =============================================
// TRENDING - Rising Queries
// =============================================

export async function getRisingQueries(
  projectId: string,
  limit: number = 10,
  fromDate?: Date,
  toDate?: Date,
  platform?: string,
  region?: string
) {
  const supabase = await createClient();
  const { subDays } = await import("date-fns");

  const endDate = toDate || getYesterday();
  const startDate = fromDate || (() => {
    const date = getYesterday();
    date.setDate(date.getDate() - 29);
    date.setHours(0, 0, 0, 0);
    return date;
  })();

  const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const previousStart = subDays(startDate, periodDays);
  const previousEnd = subDays(startDate, 1);

  // Fetch both periods
  const fetchPeriod = async (start: Date, end: Date) => {
    let query = supabase
      .from("citations")
      .select("web_search_query, ai_responses!inner(platform, prompt_tracking!inner(project_id, region))")
      .eq("ai_responses.prompt_tracking.project_id", projectId)
      .not("web_search_query", "is", null)
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());

    if (platform && platform !== "all") {
      query = query.eq("ai_responses.platform", platform);
    }

    return query;
  };

  const [currentResult, previousResult] = await Promise.all([
    fetchPeriod(startDate, endDate),
    fetchPeriod(previousStart, previousEnd),
  ]);

  if (currentResult.error || previousResult.error) {
    return [];
  }

  const filterByRegion = (citations: any[]) => {
    if (!region || region === "GLOBAL") return citations;
    return citations.filter((c: any) => c.ai_responses?.prompt_tracking?.region === region);
  };

  const currentCitations = filterByRegion(currentResult.data || []);
  const previousCitations = filterByRegion(previousResult.data || []);

  // Count by query
  const countQueries = (citations: any[]) => {
    const counts = new Map<string, { count: number; platforms: Set<string> }>();
    citations.forEach((c: any) => {
      const q = c.web_search_query;
      if (!q) return;
      if (!counts.has(q)) counts.set(q, { count: 0, platforms: new Set() });
      const data = counts.get(q)!;
      data.count++;
      if (c.ai_responses?.platform) data.platforms.add(c.ai_responses.platform);
    });
    return counts;
  };

  const currentCounts = countQueries(currentCitations);
  const previousCounts = countQueries(previousCitations);

  // Calculate growth
  const rising: Array<{
    query: string;
    currentCount: number;
    previousCount: number;
    growth: number;
    platforms: string[];
  }> = [];

  currentCounts.forEach((data, query) => {
    const prevData = previousCounts.get(query);
    const prevCount = prevData?.count || 0;

    if (data.count > prevCount && prevCount > 0) {
      const growth = ((data.count - prevCount) / prevCount) * 100;
      rising.push({
        query,
        currentCount: data.count,
        previousCount: prevCount,
        growth: Number(growth.toFixed(1)),
        platforms: Array.from(data.platforms),
      });
    }
  });

  return rising.sort((a, b) => b.growth - a.growth).slice(0, limit);
}

// =============================================
// TRENDING - Declining Queries
// =============================================

export async function getDecliningQueries(
  projectId: string,
  limit: number = 10,
  fromDate?: Date,
  toDate?: Date,
  platform?: string,
  region?: string
) {
  const supabase = await createClient();
  const { subDays } = await import("date-fns");

  const endDate = toDate || getYesterday();
  const startDate = fromDate || (() => {
    const date = getYesterday();
    date.setDate(date.getDate() - 29);
    date.setHours(0, 0, 0, 0);
    return date;
  })();

  const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const previousStart = subDays(startDate, periodDays);
  const previousEnd = subDays(startDate, 1);

  const fetchPeriod = async (start: Date, end: Date) => {
    let query = supabase
      .from("citations")
      .select("web_search_query, ai_responses!inner(platform, prompt_tracking!inner(project_id, region))")
      .eq("ai_responses.prompt_tracking.project_id", projectId)
      .not("web_search_query", "is", null)
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());

    if (platform && platform !== "all") {
      query = query.eq("ai_responses.platform", platform);
    }

    return query;
  };

  const [currentResult, previousResult] = await Promise.all([
    fetchPeriod(startDate, endDate),
    fetchPeriod(previousStart, previousEnd),
  ]);

  if (currentResult.error || previousResult.error) {
    return [];
  }

  const filterByRegion = (citations: any[]) => {
    if (!region || region === "GLOBAL") return citations;
    return citations.filter((c: any) => c.ai_responses?.prompt_tracking?.region === region);
  };

  const currentCitations = filterByRegion(currentResult.data || []);
  const previousCitations = filterByRegion(previousResult.data || []);

  const countQueries = (citations: any[]) => {
    const counts = new Map<string, { count: number; platforms: Set<string> }>();
    citations.forEach((c: any) => {
      const q = c.web_search_query;
      if (!q) return;
      if (!counts.has(q)) counts.set(q, { count: 0, platforms: new Set() });
      const data = counts.get(q)!;
      data.count++;
      if (c.ai_responses?.platform) data.platforms.add(c.ai_responses.platform);
    });
    return counts;
  };

  const currentCounts = countQueries(currentCitations);
  const previousCounts = countQueries(previousCitations);

  const declining: Array<{
    query: string;
    currentCount: number;
    previousCount: number;
    decline: number;
    platforms: string[];
  }> = [];

  previousCounts.forEach((prevData, query) => {
    const currData = currentCounts.get(query);
    const currCount = currData?.count || 0;

    if (currCount < prevData.count && currCount > 0) {
      const decline = ((prevData.count - currCount) / prevData.count) * 100;
      declining.push({
        query,
        currentCount: currCount,
        previousCount: prevData.count,
        decline: Number(decline.toFixed(1)),
        platforms: Array.from(currData?.platforms || prevData.platforms),
      });
    }
  });

  return declining.sort((a, b) => b.decline - a.decline).slice(0, limit);
}

// =============================================
// TRENDING - Query Momentum (for scatter)
// =============================================

export async function getQueryMomentum(
  projectId: string,
  fromDate?: Date,
  toDate?: Date,
  platform?: string,
  region?: string,
  limit: number = 30
) {
  const supabase = await createClient();
  const { subDays } = await import("date-fns");

  const endDate = toDate || getYesterday();
  const startDate = fromDate || (() => {
    const date = getYesterday();
    date.setDate(date.getDate() - 29);
    date.setHours(0, 0, 0, 0);
    return date;
  })();

  const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const previousStart = subDays(startDate, periodDays);
  const previousEnd = subDays(startDate, 1);

  const fetchPeriod = async (start: Date, end: Date) => {
    let query = supabase
      .from("citations")
      .select("web_search_query, ai_responses!inner(platform, prompt_tracking!inner(project_id, region))")
      .eq("ai_responses.prompt_tracking.project_id", projectId)
      .not("web_search_query", "is", null)
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());

    if (platform && platform !== "all") {
      query = query.eq("ai_responses.platform", platform);
    }

    return query;
  };

  const [currentResult, previousResult] = await Promise.all([
    fetchPeriod(startDate, endDate),
    fetchPeriod(previousStart, previousEnd),
  ]);

  if (currentResult.error || previousResult.error) {
    return [];
  }

  const filterByRegion = (citations: any[]) => {
    if (!region || region === "GLOBAL") return citations;
    return citations.filter((c: any) => c.ai_responses?.prompt_tracking?.region === region);
  };

  const currentCitations = filterByRegion(currentResult.data || []);
  const previousCitations = filterByRegion(previousResult.data || []);

  const currentCounts = new Map<string, number>();
  const previousCounts = new Map<string, number>();

  currentCitations.forEach((c: any) => {
    const q = c.web_search_query;
    if (q) currentCounts.set(q, (currentCounts.get(q) || 0) + 1);
  });

  previousCitations.forEach((c: any) => {
    const q = c.web_search_query;
    if (q) previousCounts.set(q, (previousCounts.get(q) || 0) + 1);
  });

  const allQueries = new Set([...currentCounts.keys(), ...previousCounts.keys()]);
  const momentum: Array<{
    query: string;
    volume: number;
    growth: number;
    quadrant: "star" | "rising" | "stable" | "declining";
  }> = [];

  allQueries.forEach((query) => {
    const curr = currentCounts.get(query) || 0;
    const prev = previousCounts.get(query) || 0;

    if (curr === 0) return; // Skip completely gone queries

    const growth = prev > 0 ? ((curr - prev) / prev) * 100 : (curr > 0 ? 100 : 0);

    let quadrant: "star" | "rising" | "stable" | "declining";
    if (curr >= 5 && growth > 20) quadrant = "star";
    else if (curr < 5 && growth > 20) quadrant = "rising";
    else if (growth >= -20 && growth <= 20) quadrant = "stable";
    else quadrant = "declining";

    momentum.push({
      query,
      volume: curr,
      growth: Number(growth.toFixed(1)),
      quadrant,
    });
  });

  return momentum
    .sort((a, b) => b.volume - a.volume)
    .slice(0, limit);
}

// =============================================
// TRENDING - Emerging Queries
// =============================================

export async function getEmergingQueries(
  projectId: string,
  fromDate?: Date,
  toDate?: Date,
  platform?: string,
  region?: string,
  limit: number = 10
) {
  const supabase = await createClient();
  const { format, subDays } = await import("date-fns");

  const endDate = toDate || getYesterday();
  const startDate = fromDate || (() => {
    const date = getYesterday();
    date.setDate(date.getDate() - 29);
    date.setHours(0, 0, 0, 0);
    return date;
  })();

  const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const previousStart = subDays(startDate, periodDays);
  const previousEnd = subDays(startDate, 1);

  const fetchPeriod = async (start: Date, end: Date) => {
    let query = supabase
      .from("citations")
      .select("web_search_query, created_at, ai_responses!inner(platform, prompt_tracking!inner(project_id, region))")
      .eq("ai_responses.prompt_tracking.project_id", projectId)
      .not("web_search_query", "is", null)
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());

    if (platform && platform !== "all") {
      query = query.eq("ai_responses.platform", platform);
    }

    return query;
  };

  const [currentResult, previousResult] = await Promise.all([
    fetchPeriod(startDate, endDate),
    fetchPeriod(previousStart, previousEnd),
  ]);

  if (currentResult.error || previousResult.error) {
    return [];
  }

  const filterByRegion = (citations: any[]) => {
    if (!region || region === "GLOBAL") return citations;
    return citations.filter((c: any) => c.ai_responses?.prompt_tracking?.region === region);
  };

  const currentCitations = filterByRegion(currentResult.data || []);
  const previousCitations = filterByRegion(previousResult.data || []);

  const previousQueries = new Set(previousCitations.map((c: any) => c.web_search_query));

  // Find new queries and their first appearance
  const newQueries = new Map<string, { count: number; firstSeen: Date; platforms: Set<string> }>();

  currentCitations.forEach((c: any) => {
    const q = c.web_search_query;
    if (!q || previousQueries.has(q)) return;

    if (!newQueries.has(q)) {
      newQueries.set(q, { count: 0, firstSeen: new Date(c.created_at), platforms: new Set() });
    }
    const data = newQueries.get(q)!;
    data.count++;
    if (c.ai_responses?.platform) data.platforms.add(c.ai_responses.platform);

    const citationDate = new Date(c.created_at);
    if (citationDate < data.firstSeen) {
      data.firstSeen = citationDate;
    }
  });

  return Array.from(newQueries.entries())
    .map(([query, data]) => ({
      query,
      count: data.count,
      firstSeen: format(data.firstSeen, "MMM dd, yyyy"),
      platforms: Array.from(data.platforms),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
