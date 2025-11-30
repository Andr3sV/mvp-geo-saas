import { createClient } from "@/lib/supabase/server";
import { SentimentFilterOptions } from "./sentiment-analysis";

// Note: These functions are server-side only

export interface ExecutiveMetrics {
  visibilityScore: number; // 0-100
  sentimentScore: number; // 0-100
  competitiveRank: number; // 1, 2, 3, etc.
  totalCompetitors: number;
  weeklyInsights: WeeklyInsight[];
}

export interface WeeklyInsight {
  id: string;
  title: string;
  description: string;
  type: "positive" | "warning" | "info";
  date: string;
}

/**
 * Calculate Visibility Score based on:
 * - Total citations
 * - Share of voice percentage
 * - Platform presence
 * - Citation pages
 */
export async function getVisibilityScore(
  projectId: string,
  filters: SentimentFilterOptions
): Promise<number> {
  const supabase = await createClient();

  try {
    // Get total citations for brand
    const { count: totalCitations } = await supabase
      .from("citations_detail")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId)
      .not("cited_url", "is", null);

    // Get share of voice
    const { getShareOfVoice } = await import("./share-of-voice");
    const sovData = await getShareOfVoice(
      projectId,
      filters.dateRange?.from,
      filters.dateRange?.to,
      filters.platform === "all" ? undefined : filters.platform,
      filters.region === "GLOBAL" ? undefined : filters.region
    );

    // Get platform presence (how many platforms have citations)
    const { data: platforms } = await supabase
      .from("ai_responses")
      .select("platform")
      .eq("project_id", projectId)
      .eq("status", "success")
      .not("response_text", "is", null);

    const uniquePlatforms = new Set(platforms?.map((p) => p.platform) || []);
    const platformPresence = (uniquePlatforms.size / 4) * 100; // 4 total platforms

    // Get citation pages
    const { data: citationPages } = await supabase
      .rpc("count_distinct_citation_pages", {
        p_project_id: projectId,
        p_from_date: filters.dateRange?.from?.toISOString() || null,
        p_to_date: filters.dateRange?.to?.toISOString() || null,
        p_platform: filters.platform === "all" ? null : filters.platform,
        p_region: filters.region === "GLOBAL" ? null : filters.region,
        p_topic_id: null,
      });

    // Calculate visibility score (weighted average)
    const shareOfVoice = sovData?.brand?.percentage || 0;
    const citationsScore = Math.min((totalCitations || 0) / 100, 1) * 30; // Max 30 points
    const sovScore = (shareOfVoice / 100) * 40; // Max 40 points
    const platformScore = (platformPresence / 100) * 20; // Max 20 points
    const pagesScore = Math.min((citationPages || 0) / 50, 1) * 10; // Max 10 points

    const visibilityScore = Math.round(citationsScore + sovScore + platformScore + pagesScore);
    return Math.min(visibilityScore, 100);
  } catch (error) {
    console.error("Error calculating visibility score:", error);
    return 0;
  }
}

/**
 * Calculate Sentiment Score based on:
 * - Overall sentiment distribution
 * - Positive vs negative ratio
 */
export async function getSentimentScore(
  projectId: string,
  filters: SentimentFilterOptions
): Promise<number> {
  const supabase = await createClient();

  try {
    const { getSentimentMetrics } = await import("./sentiment-analysis");
    const metrics = await getSentimentMetrics(projectId, filters);

    if (!metrics) return 50; // Default neutral

    const positive = metrics.positivePercentage || 0;
    const negative = metrics.negativePercentage || 0;
    const neutral = metrics.neutralPercentage || 0;

    // Calculate score: positive weighted more, negative weighted less
    const sentimentScore = positive * 1.2 + neutral * 0.5 - negative * 0.8;
    return Math.max(0, Math.min(100, Math.round(50 + sentimentScore)));
  } catch (error) {
    console.error("Error calculating sentiment score:", error);
    return 50;
  }
}

/**
 * Calculate Competitive Rank based on share of voice
 */
export async function getCompetitiveRank(
  projectId: string,
  filters: SentimentFilterOptions
): Promise<{ rank: number; totalCompetitors: number }> {
  try {
    const { getShareOfVoice } = await import("./share-of-voice");
    const sovData = await getShareOfVoice(
      projectId,
      filters.dateRange?.from,
      filters.dateRange?.to,
      filters.platform === "all" ? undefined : filters.platform,
      filters.region === "GLOBAL" ? undefined : filters.region
    );

    if (!sovData || !sovData.competitors || sovData.competitors.length === 0) {
      return { rank: 1, totalCompetitors: 0 };
    }

    const brandPercentage = sovData.brand?.percentage || 0;
    const competitors = [...sovData.competitors];
    
    // Sort competitors by percentage (descending)
    competitors.sort((a, b) => (b.percentage || 0) - (a.percentage || 0));

    // Find brand's rank
    let rank = 1;
    for (const competitor of competitors) {
      if ((competitor.percentage || 0) > brandPercentage) {
        rank++;
      } else {
        break;
      }
    }

    return { rank, totalCompetitors: competitors.length + 1 };
  } catch (error) {
    console.error("Error calculating competitive rank:", error);
    return { rank: 1, totalCompetitors: 0 };
  }
}

/**
 * Get weekly insights based on recent data
 */
export async function getWeeklyInsights(
  projectId: string,
  filters: SentimentFilterOptions
): Promise<WeeklyInsight[]> {
  const supabase = await createClient();
  const insights: WeeklyInsight[] = [];

  try {
    // Get data from last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Insight 1: Citation growth
    const { count: recentCitations } = await supabase
      .from("citations_detail")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId)
      .not("cited_url", "is", null)
      .gte("created_at", weekAgo.toISOString());

    const { count: previousCitations } = await supabase
      .from("citations_detail")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId)
      .not("cited_url", "is", null)
      .gte("created_at", new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .lt("created_at", weekAgo.toISOString());

    if (recentCitations && previousCitations) {
      const growth = ((recentCitations - previousCitations) / Math.max(previousCitations, 1)) * 100;
      if (Math.abs(growth) > 10) {
        insights.push({
          id: "1",
          title: growth > 0 ? "Citation Growth" : "Citation Decline",
          description: `Your citations ${growth > 0 ? "increased" : "decreased"} by ${Math.abs(growth).toFixed(0)}% compared to the previous week.`,
          type: growth > 0 ? "positive" : "warning",
          date: new Date().toISOString(),
        });
      }
    }

    // Insight 2: Sentiment trend
    const { getSentimentMetrics } = await import("./sentiment-analysis");
    const recentMetrics = await getSentimentMetrics(projectId, {
      ...filters,
      dateRange: { from: weekAgo, to: new Date() },
    });

    if (recentMetrics && recentMetrics.positivePercentage > 60) {
      insights.push({
        id: "2",
        title: "Strong Positive Sentiment",
        description: `${recentMetrics.positivePercentage.toFixed(0)}% of mentions are positive this week.`,
        type: "positive",
        date: new Date().toISOString(),
      });
    } else if (recentMetrics && recentMetrics.negativePercentage > 40) {
      insights.push({
        id: "2",
        title: "Negative Sentiment Alert",
        description: `${recentMetrics.negativePercentage.toFixed(0)}% of mentions are negative. Consider reviewing your brand messaging.`,
        type: "warning",
        date: new Date().toISOString(),
      });
    }

    // Insight 3: Share of voice position
    const { getShareOfVoice } = await import("./share-of-voice");
    const sovData = await getShareOfVoice(
      projectId,
      weekAgo,
      new Date(),
      filters.platform === "all" ? undefined : filters.platform,
      filters.region === "GLOBAL" ? undefined : filters.region
    );

    if (sovData && sovData.brand) {
      const rank = await getCompetitiveRank(projectId, {
        dateRange: { from: weekAgo, to: new Date() },
        platform: filters.platform,
        region: filters.region,
      });

      if (rank.rank === 1) {
        insights.push({
          id: "3",
          title: "Market Leader",
          description: `You're leading with ${sovData.brand.percentage.toFixed(1)}% share of voice.`,
          type: "positive",
          date: new Date().toISOString(),
        });
      } else if (rank.rank <= 3) {
        insights.push({
          id: "3",
          title: "Top Performer",
          description: `You rank #${rank.rank} with ${sovData.brand.percentage.toFixed(1)}% share of voice.`,
          type: "info",
          date: new Date().toISOString(),
        });
      }
    }

    return insights.slice(0, 5); // Max 5 insights
  } catch (error) {
    console.error("Error fetching weekly insights:", error);
    return insights;
  }
}

/**
 * Get all executive metrics
 */
export async function getExecutiveMetrics(
  projectId: string,
  filters: SentimentFilterOptions
): Promise<ExecutiveMetrics> {
  const [visibilityScore, sentimentScore, competitiveRank, weeklyInsights] = await Promise.all([
    getVisibilityScore(projectId, filters),
    getSentimentScore(projectId, filters),
    getCompetitiveRank(projectId, filters),
    getWeeklyInsights(projectId, filters),
  ]);

  return {
    visibilityScore,
    sentimentScore,
    competitiveRank: competitiveRank.rank,
    totalCompetitors: competitiveRank.totalCompetitors,
    weeklyInsights,
  };
}

