"use server";

import { createClient } from "@/lib/supabase/server";
import { startOfWeek } from "date-fns";

/**
 * Get yesterday's date
 */
function getYesterday(): Date {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(23, 59, 59, 999);
  return yesterday;
}

/**
 * Get default date range (current week starting Monday)
 */
function getDefaultDateRange() {
  const yesterday = getYesterday();
  const startOfCurrentWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
  startOfCurrentWeek.setHours(0, 0, 0, 0);
  
  return {
    from: startOfCurrentWeek,
    to: yesterday,
  };
}

// =============================================
// QUERY PATTERNS - Overview Metrics (RPC)
// =============================================

export async function getQueryOverview(
  projectId: string,
  fromDate?: Date,
  toDate?: Date,
  platform?: string,
  region?: string,
  entityId?: string | null,
  entityType?: 'brand' | 'competitor' | null
) {
  const supabase = await createClient();

  const defaultRange = getDefaultDateRange();
  const startDate = fromDate || defaultRange.from;
  const endDate = toDate || defaultRange.to;

  const { data, error } = await supabase.rpc("get_query_overview", {
    p_project_id: projectId,
    p_from_date: startDate.toISOString(),
    p_to_date: endDate.toISOString(),
    p_platform: platform && platform !== "all" ? platform : null,
    p_region: region && region !== "GLOBAL" ? region : null,
    p_entity_id: entityId || null,
    p_entity_type: entityType || null,
  });

  if (error) {
    console.error("Error fetching query overview:", error);
    return {
      totalQueries: 0,
      uniqueQueries: 0,
      topPlatform: "N/A",
      avgQueryLength: 0,
    };
  }

  const result = data?.[0] || data;
  const topPlatformValue = result?.top_platform || "N/A";
  
  return {
    totalQueries: result?.total_queries || 0,
    uniqueQueries: result?.unique_queries || 0,
    topPlatform: topPlatformValue === "openai" ? "OpenAI" : topPlatformValue === "gemini" ? "Gemini" : topPlatformValue,
    avgQueryLength: result?.avg_query_length || 0,
  };
}

// =============================================
// QUERY PATTERNS - Word Cloud Data (RPC)
// =============================================

export async function getQueryWordCloudData(
  projectId: string,
  fromDate?: Date,
  toDate?: Date,
  platform?: string,
  region?: string,
  limit: number = 50,
  entityId?: string | null,
  entityType?: 'brand' | 'competitor' | null
) {
  const supabase = await createClient();

  const defaultRange = getDefaultDateRange();
  const startDate = fromDate || defaultRange.from;
  const endDate = toDate || defaultRange.to;

  const { data, error } = await supabase.rpc("get_query_word_cloud", {
    p_project_id: projectId,
    p_from_date: startDate.toISOString(),
    p_to_date: endDate.toISOString(),
    p_platform: platform && platform !== "all" ? platform : null,
    p_region: region && region !== "GLOBAL" ? region : null,
    p_limit: limit,
    p_entity_id: entityId || null,
    p_entity_type: entityType || null,
  });

  if (error) {
    console.error("Error fetching word cloud data:", error);
    return [];
  }

  return data || [];
}

// =============================================
// QUERY PATTERNS - Platform Distribution (RPC)
// =============================================

export async function getQueryPlatformDistribution(
  projectId: string,
  fromDate?: Date,
  toDate?: Date,
  region?: string,
  entityId?: string | null,
  entityType?: 'brand' | 'competitor' | null
) {
  const supabase = await createClient();

  const defaultRange = getDefaultDateRange();
  const startDate = fromDate || defaultRange.from;
  const endDate = toDate || defaultRange.to;

  const { data, error } = await supabase.rpc("get_query_platform_distribution", {
    p_project_id: projectId,
    p_from_date: startDate.toISOString(),
    p_to_date: endDate.toISOString(),
    p_region: region && region !== "GLOBAL" ? region : null,
    p_entity_id: entityId || null,
    p_entity_type: entityType || null,
  });

  if (error) {
    console.error("Error fetching platform distribution:", error);
    return { openai: [], gemini: [] };
  }

  // Group results by platform
  const openai: Array<{ query: string; count: number }> = [];
  const gemini: Array<{ query: string; count: number }> = [];

  (data || []).forEach((item: any) => {
    const entry = { query: item.query, count: Number(item.count) };
    if (item.platform === "openai") {
      openai.push(entry);
    } else if (item.platform === "gemini") {
      gemini.push(entry);
    }
  });

  return { openai, gemini };
}

// =============================================
// QUERY PATTERNS - Intent Breakdown (RPC)
// =============================================

export async function getQueryIntentBreakdown(
  projectId: string,
  fromDate?: Date,
  toDate?: Date,
  platform?: string,
  region?: string,
  entityId?: string | null,
  entityType?: 'brand' | 'competitor' | null
) {
  const supabase = await createClient();

  const defaultRange = getDefaultDateRange();
  const startDate = fromDate || defaultRange.from;
  const endDate = toDate || defaultRange.to;

  const { data, error } = await supabase.rpc("get_query_intent_breakdown", {
    p_project_id: projectId,
    p_from_date: startDate.toISOString(),
    p_to_date: endDate.toISOString(),
    p_platform: platform && platform !== "all" ? platform : null,
    p_region: region && region !== "GLOBAL" ? region : null,
    p_entity_id: entityId || null,
    p_entity_type: entityType || null,
  });

  if (error) {
    console.error("Error fetching intent breakdown:", error);
    return [];
  }

  return (data || []).map((item: any) => ({
    intent: item.intent,
    count: Number(item.count),
    color: item.color,
  }));
}

// =============================================
// QUERY PATTERNS - Top Queries (RPC)
// =============================================

export async function getTopQueries(
  projectId: string,
  limit: number = 20,
  fromDate?: Date,
  toDate?: Date,
  platform?: string,
  region?: string,
  entityId?: string | null,
  entityType?: 'brand' | 'competitor' | null
) {
  const supabase = await createClient();

  const defaultRange = getDefaultDateRange();
  const startDate = fromDate || defaultRange.from;
  const endDate = toDate || defaultRange.to;

  const { data, error } = await supabase.rpc("get_top_queries", {
    p_project_id: projectId,
    p_from_date: startDate.toISOString(),
    p_to_date: endDate.toISOString(),
    p_platform: platform && platform !== "all" ? platform : null,
    p_region: region && region !== "GLOBAL" ? region : null,
    p_limit: limit,
    p_entity_id: entityId || null,
    p_entity_type: entityType || null,
  });

  if (error) {
    console.error("Error fetching top queries:", error);
    return [];
  }

  return (data || []).map((item: any) => ({
    query: item.query,
    count: Number(item.count),
    platforms: item.platforms || [],
    domains: item.domains || [],
  }));
}

// =============================================
// QUERY PATTERNS - Query-Domain Correlation (RPC)
// =============================================

export async function getQueryDomainCorrelation(
  projectId: string,
  fromDate?: Date,
  toDate?: Date,
  platform?: string,
  region?: string,
  queryLimit: number = 10,
  domainLimit: number = 10,
  entityId?: string | null,
  entityType?: 'brand' | 'competitor' | null
) {
  const supabase = await createClient();

  const defaultRange = getDefaultDateRange();
  const startDate = fromDate || defaultRange.from;
  const endDate = toDate || defaultRange.to;

  const { data, error } = await supabase.rpc("get_query_domain_correlation", {
    p_project_id: projectId,
    p_from_date: startDate.toISOString(),
    p_to_date: endDate.toISOString(),
    p_platform: platform && platform !== "all" ? platform : null,
    p_region: region && region !== "GLOBAL" ? region : null,
    p_query_limit: queryLimit,
    p_domain_limit: domainLimit,
    p_entity_id: entityId || null,
    p_entity_type: entityType || null,
  });

  if (error) {
    console.error("Error fetching query-domain correlation:", error);
    return { queries: [], domains: [], matrix: [] };
  }

  // Transform flat data into matrix format
  const queriesSet = new Set<string>();
  const domainsSet = new Set<string>();
  const correlationMap = new Map<string, Map<string, number>>();

  (data || []).forEach((item: any) => {
    queriesSet.add(item.query);
    domainsSet.add(item.domain);

    if (!correlationMap.has(item.query)) {
      correlationMap.set(item.query, new Map());
    }
    correlationMap.get(item.query)!.set(item.domain, Number(item.count));
  });

  const queries = Array.from(queriesSet);
  const domains = Array.from(domainsSet);

  // Build matrix
  const matrix = queries.map((q) => {
    const qCorrelations = correlationMap.get(q) || new Map();
    return domains.map((d) => qCorrelations.get(d) || 0);
  });

  return { queries, domains, matrix };
}

// =============================================
// TRENDING - Metrics (RPC)
// =============================================

export async function getTrendMetrics(
  projectId: string,
  fromDate?: Date,
  toDate?: Date,
  platform?: string,
  region?: string
) {
  const supabase = await createClient();

  const defaultRange = getDefaultDateRange();
  const startDate = fromDate || defaultRange.from;
  const endDate = toDate || defaultRange.to;

  const { data, error } = await supabase.rpc("get_trend_metrics", {
    p_project_id: projectId,
    p_from_date: startDate.toISOString(),
    p_to_date: endDate.toISOString(),
    p_platform: platform && platform !== "all" ? platform : null,
    p_region: region && region !== "GLOBAL" ? region : null,
  });

  if (error) {
    console.error("Error fetching trend metrics:", error);
    return { risingCount: 0, decliningCount: 0, newCount: 0, momentumScore: 0 };
  }

  const result = data?.[0] || data;
  return {
    risingCount: result?.rising_count || 0,
    decliningCount: result?.declining_count || 0,
    newCount: result?.new_count || 0,
    momentumScore: Number(result?.momentum_score || 0),
  };
}

// =============================================
// TRENDING - Query Velocity (RPC)
// =============================================

export async function getQueryVelocity(
  projectId: string,
  fromDate?: Date,
  toDate?: Date,
  platform?: string,
  region?: string
) {
  const supabase = await createClient();
  const { format } = await import("date-fns");

  const defaultRange = getDefaultDateRange();
  const startDate = fromDate || defaultRange.from;
  const endDate = toDate || defaultRange.to;

  const { data, error } = await supabase.rpc("get_query_velocity", {
    p_project_id: projectId,
    p_from_date: startDate.toISOString(),
    p_to_date: endDate.toISOString(),
    p_platform: platform && platform !== "all" ? platform : null,
    p_region: region && region !== "GLOBAL" ? region : null,
  });

  if (error) {
    console.error("Error fetching query velocity:", error);
    return [];
  }

  return (data || []).map((item: any) => ({
    date: format(new Date(item.date), "MMM dd"),
    fullDate: item.date,
    queries: Number(item.queries),
  }));
}

// =============================================
// TRENDING - Rising Queries (RPC)
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

  const defaultRange = getDefaultDateRange();
  const startDate = fromDate || defaultRange.from;
  const endDate = toDate || defaultRange.to;

  const { data, error } = await supabase.rpc("get_rising_queries", {
    p_project_id: projectId,
    p_from_date: startDate.toISOString(),
    p_to_date: endDate.toISOString(),
    p_platform: platform && platform !== "all" ? platform : null,
    p_region: region && region !== "GLOBAL" ? region : null,
    p_limit: limit,
  });

  if (error) {
    console.error("Error fetching rising queries:", error);
    return [];
  }

  return (data || []).map((item: any) => ({
    query: item.query,
    currentCount: item.current_count,
    previousCount: item.previous_count,
    growth: Number(item.growth),
    platforms: item.platforms || [],
  }));
}

// =============================================
// TRENDING - Declining Queries (RPC)
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

  const defaultRange = getDefaultDateRange();
  const startDate = fromDate || defaultRange.from;
  const endDate = toDate || defaultRange.to;

  const { data, error } = await supabase.rpc("get_declining_queries", {
    p_project_id: projectId,
    p_from_date: startDate.toISOString(),
    p_to_date: endDate.toISOString(),
    p_platform: platform && platform !== "all" ? platform : null,
    p_region: region && region !== "GLOBAL" ? region : null,
    p_limit: limit,
  });

  if (error) {
    console.error("Error fetching declining queries:", error);
    return [];
  }

  return (data || []).map((item: any) => ({
    query: item.query,
    currentCount: item.current_count,
    previousCount: item.previous_count,
    decline: Number(item.decline),
    platforms: item.platforms || [],
  }));
}

// =============================================
// TRENDING - Query Momentum (RPC)
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

  const defaultRange = getDefaultDateRange();
  const startDate = fromDate || defaultRange.from;
  const endDate = toDate || defaultRange.to;

  const { data, error } = await supabase.rpc("get_query_momentum", {
    p_project_id: projectId,
    p_from_date: startDate.toISOString(),
    p_to_date: endDate.toISOString(),
    p_platform: platform && platform !== "all" ? platform : null,
    p_region: region && region !== "GLOBAL" ? region : null,
    p_limit: limit,
  });

  if (error) {
    console.error("Error fetching query momentum:", error);
    return [];
  }

  return (data || []).map((item: any) => ({
    query: item.query,
    volume: item.volume,
    growth: Number(item.growth),
    quadrant: item.quadrant as "star" | "rising" | "stable" | "declining",
  }));
}

// =============================================
// TRENDING - Emerging Queries (RPC)
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
  const { format } = await import("date-fns");

  const defaultRange = getDefaultDateRange();
  const startDate = fromDate || defaultRange.from;
  const endDate = toDate || defaultRange.to;

  const { data, error } = await supabase.rpc("get_emerging_queries", {
    p_project_id: projectId,
    p_from_date: startDate.toISOString(),
    p_to_date: endDate.toISOString(),
    p_platform: platform && platform !== "all" ? platform : null,
    p_region: region && region !== "GLOBAL" ? region : null,
    p_limit: limit,
  });

  if (error) {
    console.error("Error fetching emerging queries:", error);
    return [];
  }

  return (data || []).map((item: any) => ({
    query: item.query,
    count: item.count,
    firstSeen: format(new Date(item.first_seen), "MMM dd, yyyy"),
    platforms: item.platforms || [],
  }));
}
