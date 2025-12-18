"use server";

import { createClient } from "@/lib/supabase/server";

// =============================================
// CITATION STATS QUERIES
// =============================================
// MIGRATED: Now uses brand_mentions and citations tables
// instead of legacy citations_detail

/**
 * Get citation and mention stats for a project
 */
export async function getCitationStats(projectId: string) {
  const supabase = await createClient();

  // =============================================
  // TOTAL MENTIONS (from brand_mentions - client only)
  // =============================================
  const { count: totalMentions } = await supabase
    .from("brand_mentions")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("brand_type", "client");

  // =============================================
  // TOTAL CITATIONS (from citations table - brand URLs)
  // =============================================
  const { count: totalCitations } = await supabase
    .from("citations")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("citation_type", "brand");

  // =============================================
  // MENTIONS BY PLATFORM (from brand_mentions)
  // =============================================
  const { data: mentionsByPlatform } = await supabase
    .from("brand_mentions")
    .select("ai_responses!inner(platform)")
    .eq("project_id", projectId)
    .eq("brand_type", "client");

  // Group by platform
  const platformCounts: Record<string, number> = {};
  mentionsByPlatform?.forEach((item: any) => {
    const platform = item.ai_responses?.platform;
    if (platform) {
      platformCounts[platform] = (platformCounts[platform] || 0) + 1;
    }
  });

  const platformData = Object.entries(platformCounts).map(([name, count]) => ({
    name,
    citations: count,
    percentage: totalMentions ? (count / totalMentions) * 100 : 0,
  }));

  // =============================================
  // RECENT MENTIONS (last 20 from brand_mentions)
  // =============================================
  const { data: recentMentions } = await supabase
    .from("brand_mentions")
    .select(`
      id,
      entity_name,
      mentioned_text,
      confidence_score,
      created_at,
      ai_responses!inner(
        platform,
        prompt_text
      )
    `)
    .eq("project_id", projectId)
    .eq("brand_type", "client")
    .order("created_at", { ascending: false })
    .limit(20);

  // Transform to match old format
  const recentCitations = (recentMentions || []).map((mention: any) => ({
    id: mention.id,
    citation_text: mention.mentioned_text,
    sentiment: null, // Sentiment is now in brand_sentiment_attributes
    confidence_score: mention.confidence_score,
    created_at: mention.created_at,
    ai_responses: mention.ai_responses,
  }));

  // =============================================
  // WEEKLY STATS
  // =============================================
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const { count: thisWeekCount } = await supabase
    .from("brand_mentions")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("brand_type", "client")
    .gte("created_at", oneWeekAgo.toISOString());

  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const { count: lastWeekCount } = await supabase
    .from("brand_mentions")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("brand_type", "client")
    .gte("created_at", twoWeeksAgo.toISOString())
    .lt("created_at", oneWeekAgo.toISOString());

  // Calculate trend
  const trend = lastWeekCount && thisWeekCount !== null && lastWeekCount > 0
    ? ((thisWeekCount - lastWeekCount) / lastWeekCount) * 100
    : 0;

  return {
    totalCitations: totalMentions || 0, // Keep old name for backwards compatibility
    totalUrlCitations: totalCitations || 0, // New: actual URL citations
    thisWeek: thisWeekCount || 0,
    lastWeek: lastWeekCount || 0,
    trend: Math.round(trend * 10) / 10,
    avgPerDay: thisWeekCount ? Math.round(thisWeekCount / 7) : 0,
    platformData: platformData.sort((a, b) => b.citations - a.citations),
    recentCitations: recentCitations || [],
  };
}

// =============================================
// CITATION DOMAINS
// =============================================

/**
 * Get top domains from citations table
 */
export async function getTopCitedDomains(
  projectId: string,
  limit: number = 10,
  citationType?: "brand" | "competitor" | "other"
) {
  const supabase = await createClient();

  let query = supabase
    .from("citations")
    .select("domain, citation_type, url")
    .eq("project_id", projectId)
    .not("domain", "is", null);

  if (citationType) {
    query = query.eq("citation_type", citationType);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching cited domains:", error);
    return [];
  }

  // Group by domain
  const domainCounts = new Map<string, { count: number; citation_type: string }>();

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

  return Array.from(domainCounts.entries())
    .map(([domain, data]) => ({ domain, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// =============================================
// CITATION STATS BY TYPE
// =============================================

/**
 * Get citation breakdown by type (brand, competitor, other)
 */
export async function getCitationsByType(projectId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("citations")
    .select("citation_type")
    .eq("project_id", projectId);

  if (error) {
    console.error("Error fetching citations by type:", error);
    return { brand: 0, competitor: 0, other: 0, total: 0 };
  }

  const stats = {
    brand: 0,
    competitor: 0,
    other: 0,
    total: data?.length || 0,
  };

  data?.forEach((item: any) => {
    if (item.citation_type === "brand") stats.brand++;
    else if (item.citation_type === "competitor") stats.competitor++;
    else stats.other++;
  });

  return stats;
}

// =============================================
// RECENT CITATIONS WITH URLS
// =============================================

/**
 * Get recent URL citations from citations table
 */
export async function getRecentUrlCitations(
  projectId: string,
  limit: number = 20,
  citationType?: "brand" | "competitor" | "other"
) {
  const supabase = await createClient();

  let query = supabase
    .from("citations")
    .select(`
      id,
      url,
      domain,
      citation_type,
      competitor_id,
      text,
      created_at,
      ai_responses!inner(
        platform,
        prompt_text
      ),
      competitors(name)
    `)
    .eq("project_id", projectId)
    .not("url", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (citationType) {
    query = query.eq("citation_type", citationType);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching recent URL citations:", error);
    return [];
  }

  return data || [];
}
