"use server";

import { createClient } from "@/lib/supabase/server";
import { SentimentFilterOptions } from "./sentiment-analysis";

// =============================================
// EXECUTIVE OVERVIEW QUERIES
// =============================================
// MIGRATED: Now uses brand_mentions and citations tables
// instead of legacy citations_detail

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
 * - Total mentions (from brand_mentions)
 * - Total citations (from citations)
 * - Share of voice percentage
 * - Platform presence
 */
export async function getVisibilityScore(
  projectId: string,
  filters: SentimentFilterOptions
): Promise<number> {
  const supabase = await createClient();

  try {
    // Get total mentions for brand (from brand_mentions)
    const { count: totalMentions } = await supabase
      .from("brand_mentions")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("brand_type", "client");

    // Get total URL citations for brand (from citations)
    const { count: totalCitations } = await supabase
      .from("citations")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("citation_type", "brand");

    // Get share of voice
    const { getShareOfVoice } = await import("./share-of-voice");
    const platformFilter = filters.platform === "all" ? undefined : filters.platform;
    const regionFilter = filters.region === "GLOBAL" ? undefined : filters.region;
    const topicFilter = filters.topicId === "all" ? undefined : filters.topicId;
    
    const sovData = await getShareOfVoice(
      projectId,
      filters.dateRange?.from,
      filters.dateRange?.to,
      platformFilter,
      regionFilter,
      topicFilter
    );

    // Get platform presence
    const { data: platforms } = await supabase
      .from("ai_responses")
      .select("platform")
      .eq("project_id", projectId)
      .eq("status", "success")
      .not("response_text", "is", null);

    const uniquePlatforms = new Set(platforms?.map((p) => p.platform) || []);
    const platformPresence = (uniquePlatforms.size / 4) * 100;

    // Get distinct domains from citations
    const { data: citedDomains } = await supabase
      .from("citations")
      .select("domain")
      .eq("project_id", projectId)
      .eq("citation_type", "brand")
      .not("domain", "is", null);

    const uniqueDomains = new Set(citedDomains?.map((c: any) => c.domain) || []);

    // Calculate visibility score (weighted average)
    const shareOfVoice = sovData?.brand?.percentage || 0;
    const mentionsScore = Math.min((totalMentions || 0) / 100, 1) * 25; // Max 25 points
    const citationsScore = Math.min((totalCitations || 0) / 50, 1) * 15; // Max 15 points
    const sovScore = (shareOfVoice / 100) * 40; // Max 40 points
    const platformScore = (platformPresence / 100) * 15; // Max 15 points
    const domainsScore = Math.min(uniqueDomains.size / 20, 1) * 5; // Max 5 points

    const visibilityScore = Math.round(
      mentionsScore + citationsScore + sovScore + platformScore + domainsScore
    );
    return Math.min(visibilityScore, 100);
  } catch (error) {
    console.error("Error calculating visibility score:", error);
    return 0;
  }
}

/**
 * Calculate Sentiment Score based on:
 * - Overall sentiment distribution from brand_sentiment_attributes
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

    if (!metrics) return 50;

    const total = metrics.sentimentDistribution.positive + 
                  metrics.sentimentDistribution.neutral + 
                  metrics.sentimentDistribution.negative;
    
    if (total === 0) return 50;

    const positive = (metrics.sentimentDistribution.positive / total) * 100;
    const negative = (metrics.sentimentDistribution.negative / total) * 100;
    const neutral = (metrics.sentimentDistribution.neutral / total) * 100;

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
    const platformFilter = filters.platform === "all" ? undefined : filters.platform;
    const regionFilter = filters.region === "GLOBAL" ? undefined : filters.region;
    const topicFilter = filters.topicId === "all" ? undefined : filters.topicId;
    
    const sovData = await getShareOfVoice(
      projectId,
      filters.dateRange?.from,
      filters.dateRange?.to,
      platformFilter,
      regionFilter,
      topicFilter
    );

    if (!sovData || !sovData.competitors || sovData.competitors.length === 0) {
      return { rank: 1, totalCompetitors: 0 };
    }

    const brandPercentage = sovData.brand?.percentage || 0;
    const competitors = [...sovData.competitors];
    
    competitors.sort((a, b) => (b.percentage || 0) - (a.percentage || 0));

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
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    // =============================================
    // Insight 1: Mention growth (from brand_mentions)
    // =============================================
    const { count: recentMentions } = await supabase
      .from("brand_mentions")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("brand_type", "client")
      .gte("created_at", weekAgo.toISOString());

    const { count: previousMentions } = await supabase
      .from("brand_mentions")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("brand_type", "client")
      .gte("created_at", new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .lt("created_at", weekAgo.toISOString());

    if (recentMentions && previousMentions) {
      const growth = ((recentMentions - previousMentions) / Math.max(previousMentions, 1)) * 100;
      if (Math.abs(growth) > 10) {
        insights.push({
          id: "1",
          title: growth > 0 ? "Mention Growth" : "Mention Decline",
          description: `Your mentions ${growth > 0 ? "increased" : "decreased"} by ${Math.abs(growth).toFixed(0)}% compared to the previous week.`,
          type: growth > 0 ? "positive" : "warning",
          date: new Date().toISOString(),
        });
      }
    }

    // =============================================
    // Insight 2: Sentiment trend (from brand_sentiment_attributes)
    // =============================================
    const { getSentimentMetrics } = await import("./sentiment-analysis");
    const recentMetrics = await getSentimentMetrics(projectId, {
      ...filters,
      dateRange: { from: weekAgo, to: new Date() },
    });

    if (recentMetrics) {
      const total = recentMetrics.sentimentDistribution.positive + 
                    recentMetrics.sentimentDistribution.neutral + 
                    recentMetrics.sentimentDistribution.negative;
      
      if (total > 0) {
        const positivePercentage = (recentMetrics.sentimentDistribution.positive / total) * 100;
        const negativePercentage = (recentMetrics.sentimentDistribution.negative / total) * 100;
        
        if (positivePercentage > 60) {
          insights.push({
            id: "2",
            title: "Strong Positive Sentiment",
            description: `${positivePercentage.toFixed(0)}% of mentions are positive this week.`,
            type: "positive",
            date: new Date().toISOString(),
          });
        } else if (negativePercentage > 40) {
          insights.push({
            id: "2",
            title: "Negative Sentiment Alert",
            description: `${negativePercentage.toFixed(0)}% of mentions are negative. Consider reviewing your brand messaging.`,
            type: "warning",
            date: new Date().toISOString(),
          });
        }
      }
    }

    // =============================================
    // Insight 3: Share of voice position
    // =============================================
    const { getShareOfVoice } = await import("./share-of-voice");
    const platformFilter = filters.platform === "all" ? undefined : filters.platform;
    const regionFilter = filters.region === "GLOBAL" ? undefined : filters.region;
    const topicFilter = filters.topicId === "all" ? undefined : filters.topicId;
    
    const sovData = await getShareOfVoice(
      projectId,
      weekAgo,
      new Date(),
      platformFilter,
      regionFilter,
      topicFilter
    );

    if (sovData && sovData.brand) {
      const rank = await getCompetitiveRank(projectId, {
        dateRange: { from: weekAgo, to: new Date() },
        platform: filters.platform,
        region: filters.region,
        topicId: filters.topicId,
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

    return insights.slice(0, 5);
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

// =============================================
// NEW CEO DASHBOARD QUERIES
// =============================================

export interface CompetitorBattleData {
  id: string;
  name: string;
  domain: string;
  color?: string;
  isBrand: boolean;
  mentionsShare: number;
  citationsShare: number;
  mentions: number;
  citations: number;
  trend: number; // percentage change vs last period
  rank: number;
}

export interface CompetitiveBattlefieldData {
  brand: CompetitorBattleData;
  competitors: CompetitorBattleData[];
  leader: CompetitorBattleData;
  gapToLeader: number; // percentage points
  positionChange: number; // positions gained/lost
  totalMentions: number;
  totalCitations: number;
}

/**
 * Get competitive battlefield data for the CEO dashboard
 * Combines mentions and citations share with trend data
 */
export async function getCompetitiveBattlefield(
  projectId: string,
  filters: SentimentFilterOptions
): Promise<CompetitiveBattlefieldData | null> {
  const supabase = await createClient();
  const { format, subDays } = await import("date-fns");

  try {
    // Get project info with color
    const { data: project } = await supabase
      .from("projects")
      .select("name, client_url, color")
      .eq("id", projectId)
      .single();

    // Get current period data
    const { getShareOfVoice } = await import("./share-of-voice");
    const { getCitationsRanking } = await import("./citations-real");

    const platformFilter = filters.platform === "all" ? undefined : filters.platform;
    const regionFilter = filters.region === "GLOBAL" ? undefined : filters.region;
    const topicFilter = filters.topicId === "all" ? undefined : filters.topicId;

    const currentSov = await getShareOfVoice(
      projectId,
      filters.dateRange?.from,
      filters.dateRange?.to,
      platformFilter,
      regionFilter,
      topicFilter
    );

    const currentCitations = await getCitationsRanking(
      projectId,
      filters.dateRange?.from,
      filters.dateRange?.to,
      platformFilter,
      regionFilter,
      topicFilter
    );

    if (!currentSov || !currentCitations) return null;

    // Calculate previous period for trends
    const periodDays = filters.dateRange?.from && filters.dateRange?.to
      ? Math.ceil((filters.dateRange.to.getTime() - filters.dateRange.from.getTime()) / (1000 * 60 * 60 * 24))
      : 7;

    const previousFrom = filters.dateRange?.from 
      ? subDays(filters.dateRange.from, periodDays)
      : subDays(new Date(), periodDays * 2);
    const previousTo = filters.dateRange?.from 
      ? subDays(filters.dateRange.from, 1)
      : subDays(new Date(), periodDays);

    const previousSov = await getShareOfVoice(
      projectId,
      previousFrom,
      previousTo,
      platformFilter,
      regionFilter,
      topicFilter
    );

    // Build brand data
    const brandTrend = previousSov?.brand?.percentage
      ? currentSov.brand.percentage - previousSov.brand.percentage
      : 0;

    const brand: CompetitorBattleData = {
      id: "brand",
      name: project?.name || "Your Brand",
      domain: project?.client_url || "",
      color: project?.color || "#3B82F6",
      isBrand: true,
      mentionsShare: currentSov.brand.percentage,
      citationsShare: currentCitations.brand.percentage,
      mentions: currentSov.brand.mentions,
      citations: currentCitations.brand.citations,
      trend: Number(brandTrend.toFixed(1)),
      rank: 1,
    };

    // Build competitors data
    const competitors: CompetitorBattleData[] = currentSov.competitors.map((comp: any) => {
      const citationsComp = currentCitations.competitors.find((c: any) => c.id === comp.id);
      const previousComp = previousSov?.competitors?.find((c: any) => c.id === comp.id);
      const trend = previousComp?.percentage
        ? comp.percentage - previousComp.percentage
        : 0;

      return {
        id: comp.id,
        name: comp.name,
        domain: comp.domain,
        color: comp.color,
        isBrand: false,
        mentionsShare: comp.percentage,
        citationsShare: citationsComp?.percentage || 0,
        mentions: comp.mentions,
        citations: citationsComp?.citations || 0,
        trend: Number(trend.toFixed(1)),
        rank: 0,
      };
    });

    // Sort all by mentions share and assign ranks
    const allEntities = [brand, ...competitors].sort((a, b) => b.mentionsShare - a.mentionsShare);
    allEntities.forEach((entity, index) => {
      entity.rank = index + 1;
    });

    // Find leader and calculate gap
    const leader = allEntities[0];
    const brandRank = allEntities.find(e => e.isBrand)?.rank || 1;
    const gapToLeader = leader.isBrand ? 0 : leader.mentionsShare - brand.mentionsShare;

    // Calculate position change
    let previousRank = 1;
    if (previousSov) {
      const previousAllEntities = [
        { percentage: previousSov.brand.percentage, isBrand: true },
        ...(previousSov.competitors || []).map((c: any) => ({ percentage: c.percentage, isBrand: false })),
      ].sort((a, b) => b.percentage - a.percentage);
      previousRank = previousAllEntities.findIndex(e => e.isBrand) + 1;
    }
    const positionChange = previousRank - brandRank; // Positive = moved up

    return {
      brand: allEntities.find(e => e.isBrand) as CompetitorBattleData,
      competitors: allEntities.filter(e => !e.isBrand) as CompetitorBattleData[],
      leader,
      gapToLeader: Number(gapToLeader.toFixed(1)),
      positionChange,
      totalMentions: currentSov.totalMentions,
      totalCitations: currentCitations.totalCitations,
    };
  } catch (error) {
    console.error("Error getting competitive battlefield:", error);
    return null;
  }
}

export interface WeeklyBattleReportData {
  mentionsChange: {
    current: number;
    previous: number;
    change: number;
    changePercent: number;
  };
  citationsChange: {
    current: number;
    previous: number;
    change: number;
    changePercent: number;
  };
  shareChange: {
    current: number;
    previous: number;
    change: number;
  };
  competitorChanges: Array<{
    id: string;
    name: string;
    color?: string;
    mentionsChange: number;
    shareChange: number;
    isGrowing: boolean;
  }>;
  biggestGainer: { name: string; change: number } | null;
  biggestLoser: { name: string; change: number } | null;
}

/**
 * Get weekly battle report comparing current vs previous period
 */
export async function getWeeklyBattleReport(
  projectId: string,
  filters: SentimentFilterOptions
): Promise<WeeklyBattleReportData | null> {
  const { subDays } = await import("date-fns");

  try {
    const { getShareOfVoice } = await import("./share-of-voice");
    const { getCitationsRanking } = await import("./citations-real");

    const platformFilter = filters.platform === "all" ? undefined : filters.platform;
    const regionFilter = filters.region === "GLOBAL" ? undefined : filters.region;
    const topicFilter = filters.topicId === "all" ? undefined : filters.topicId;

    // Current period
    const currentSov = await getShareOfVoice(
      projectId,
      filters.dateRange?.from,
      filters.dateRange?.to,
      platformFilter,
      regionFilter,
      topicFilter
    );

    const currentCitations = await getCitationsRanking(
      projectId,
      filters.dateRange?.from,
      filters.dateRange?.to,
      platformFilter,
      regionFilter,
      topicFilter
    );

    if (!currentSov || !currentCitations) return null;

    // Calculate previous period
    const periodDays = filters.dateRange?.from && filters.dateRange?.to
      ? Math.ceil((filters.dateRange.to.getTime() - filters.dateRange.from.getTime()) / (1000 * 60 * 60 * 24))
      : 7;

    const previousFrom = filters.dateRange?.from 
      ? subDays(filters.dateRange.from, periodDays)
      : subDays(new Date(), periodDays * 2);
    const previousTo = filters.dateRange?.from 
      ? subDays(filters.dateRange.from, 1)
      : subDays(new Date(), periodDays);

    const previousSov = await getShareOfVoice(
      projectId,
      previousFrom,
      previousTo,
      platformFilter,
      regionFilter,
      topicFilter
    );

    const previousCitations = await getCitationsRanking(
      projectId,
      previousFrom,
      previousTo,
      platformFilter,
      regionFilter,
      topicFilter
    );

    // Calculate changes
    const currentMentions = currentSov.brand.mentions;
    const previousMentions = previousSov?.brand?.mentions || 0;
    const mentionsChange = currentMentions - previousMentions;
    const mentionsChangePercent = previousMentions > 0 
      ? ((mentionsChange / previousMentions) * 100) 
      : 0;

    const currentCitationsCount = currentCitations.brand.citations;
    const previousCitationsCount = previousCitations?.brand?.citations || 0;
    const citationsChange = currentCitationsCount - previousCitationsCount;
    const citationsChangePercent = previousCitationsCount > 0 
      ? ((citationsChange / previousCitationsCount) * 100) 
      : 0;

    const currentShare = currentSov.brand.percentage;
    const previousShare = previousSov?.brand?.percentage || 0;
    const shareChange = currentShare - previousShare;

    // Competitor changes
    const competitorChanges = currentSov.competitors.map((comp: any) => {
      const prevComp = previousSov?.competitors?.find((c: any) => c.id === comp.id);
      const mentionsChg = comp.mentions - (prevComp?.mentions || 0);
      const shareChg = comp.percentage - (prevComp?.percentage || 0);

      return {
        id: comp.id,
        name: comp.name,
        color: comp.color,
        mentionsChange: mentionsChg,
        shareChange: Number(shareChg.toFixed(1)),
        isGrowing: shareChg > 0,
      };
    });

    // Find biggest gainer and loser
    const allChanges = [
      { name: currentSov.brand.name, change: shareChange },
      ...competitorChanges.map(c => ({ name: c.name, change: c.shareChange })),
    ];

    const sortedByChange = [...allChanges].sort((a, b) => b.change - a.change);
    const biggestGainer = sortedByChange[0]?.change > 0 ? sortedByChange[0] : null;
    const biggestLoser = sortedByChange[sortedByChange.length - 1]?.change < 0 
      ? sortedByChange[sortedByChange.length - 1] 
      : null;

    return {
      mentionsChange: {
        current: currentMentions,
        previous: previousMentions,
        change: mentionsChange,
        changePercent: Number(mentionsChangePercent.toFixed(1)),
      },
      citationsChange: {
        current: currentCitationsCount,
        previous: previousCitationsCount,
        change: citationsChange,
        changePercent: Number(citationsChangePercent.toFixed(1)),
      },
      shareChange: {
        current: Number(currentShare.toFixed(1)),
        previous: Number(previousShare.toFixed(1)),
        change: Number(shareChange.toFixed(1)),
      },
      competitorChanges,
      biggestGainer,
      biggestLoser,
    };
  } catch (error) {
    console.error("Error getting weekly battle report:", error);
    return null;
  }
}

export interface PlatformDominanceData {
  platforms: Array<{
    id: string;
    name: string;
    icon: string;
  }>;
  entities: Array<{
    id: string;
    name: string;
    color?: string;
    isBrand: boolean;
    platformRanks: Record<string, number>; // platform_id -> rank
    totalMentions: number;
  }>;
  brandLeadsCount: number; // How many platforms brand is #1
}

/**
 * Get platform dominance data - shows rank by platform
 */
export async function getPlatformDominance(
  projectId: string,
  filters: SentimentFilterOptions
): Promise<PlatformDominanceData | null> {
  const supabase = await createClient();
  const { format } = await import("date-fns");

  try {
    // Get project info
    const { data: project } = await supabase
      .from("projects")
      .select("name, client_url, color")
      .eq("id", projectId)
      .single();

    // Get competitors
    const { data: competitors } = await supabase
      .from("competitors")
      .select("id, name, domain, color")
      .eq("project_id", projectId)
      .eq("is_active", true);

    // Date range
    const endDate = filters.dateRange?.to || new Date();
    const startDate = filters.dateRange?.from || new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startDateStr = format(startDate, "yyyy-MM-dd");
    const endDateStr = format(endDate, "yyyy-MM-dd");

    // Build query with filters
    let query = supabase
      .from("daily_brand_stats")
      .select("platform, entity_type, competitor_id, mentions_count")
      .eq("project_id", projectId)
      .gte("stat_date", startDateStr)
      .lte("stat_date", endDateStr);

    // Apply region filter
    if (filters.region && filters.region !== "GLOBAL") {
      query = query.eq("region", filters.region);
    }

    // Apply topic filter
    if (filters.topicId && filters.topicId !== "all") {
      query = query.eq("topic_id", filters.topicId);
    }

    const { data: stats } = await query;

    if (!stats) return null;

    // Define platforms
    const platformsList = [
      { id: "openai", name: "OpenAI", icon: "openai" },
      { id: "gemini", name: "Gemini", icon: "gemini" },
      { id: "perplexity", name: "Perplexity", icon: "perplexity" },
      { id: "claude", name: "Claude", icon: "claude" },
    ];

    // Aggregate by platform and entity
    const platformEntityMentions: Record<string, Record<string, number>> = {};

    platformsList.forEach(p => {
      platformEntityMentions[p.id] = { brand: 0 };
      competitors?.forEach(c => {
        platformEntityMentions[p.id][c.id] = 0;
      });
    });

    stats.forEach((stat: any) => {
      const platform = stat.platform;
      if (!platformEntityMentions[platform]) return;

      if (stat.entity_type === "brand" && !stat.competitor_id) {
        platformEntityMentions[platform]["brand"] += stat.mentions_count || 0;
      } else if (stat.entity_type === "competitor" && stat.competitor_id) {
        platformEntityMentions[platform][stat.competitor_id] = 
          (platformEntityMentions[platform][stat.competitor_id] || 0) + (stat.mentions_count || 0);
      }
    });

    // Calculate ranks for each platform
    const entities: PlatformDominanceData["entities"] = [];
    
    // Brand
    const brandPlatformRanks: Record<string, number> = {};
    let brandTotalMentions = 0;
    
    platformsList.forEach(p => {
      const platformMentions = Object.entries(platformEntityMentions[p.id])
        .map(([id, mentions]) => ({ id, mentions }))
        .sort((a, b) => b.mentions - a.mentions);
      
      const brandIdx = platformMentions.findIndex(e => e.id === "brand");
      brandPlatformRanks[p.id] = brandIdx + 1;
      brandTotalMentions += platformEntityMentions[p.id]["brand"] || 0;
    });

    entities.push({
      id: "brand",
      name: project?.name || "Your Brand",
      color: project?.color,
      isBrand: true,
      platformRanks: brandPlatformRanks,
      totalMentions: brandTotalMentions,
    });

    // Competitors
    competitors?.forEach(comp => {
      const compPlatformRanks: Record<string, number> = {};
      let compTotalMentions = 0;

      platformsList.forEach(p => {
        const platformMentions = Object.entries(platformEntityMentions[p.id])
          .map(([id, mentions]) => ({ id, mentions }))
          .sort((a, b) => b.mentions - a.mentions);
        
        const compIdx = platformMentions.findIndex(e => e.id === comp.id);
        compPlatformRanks[p.id] = compIdx >= 0 ? compIdx + 1 : platformMentions.length + 1;
        compTotalMentions += platformEntityMentions[p.id][comp.id] || 0;
      });

      entities.push({
        id: comp.id,
        name: comp.name,
        color: comp.color,
        isBrand: false,
        platformRanks: compPlatformRanks,
        totalMentions: compTotalMentions,
      });
    });

    // Count platforms where brand leads
    const brandLeadsCount = Object.values(brandPlatformRanks).filter(rank => rank === 1).length;

    return {
      platforms: platformsList,
      entities: entities.sort((a, b) => b.totalMentions - a.totalMentions),
      brandLeadsCount,
    };
  } catch (error) {
    console.error("Error getting platform dominance:", error);
    return null;
  }
}

export interface MomentumScoreData {
  score: number; // -100 to 100 (negative = losing, positive = winning)
  velocity: number; // rate of change
  direction: "up" | "down" | "stable";
  weekOverWeekChange: number;
  isOutperformingMarket: boolean;
  competitorAvgChange: number;
}

/**
 * Calculate momentum score - how fast brand is growing vs competition
 */
export async function getMomentumScore(
  projectId: string,
  filters: SentimentFilterOptions
): Promise<MomentumScoreData> {
  const { subDays } = await import("date-fns");

  try {
    const { getShareOfVoice } = await import("./share-of-voice");

    const platformFilter = filters.platform === "all" ? undefined : filters.platform;
    const regionFilter = filters.region === "GLOBAL" ? undefined : filters.region;
    const topicFilter = filters.topicId === "all" ? undefined : filters.topicId;

    // Get current period
    const currentSov = await getShareOfVoice(
      projectId,
      filters.dateRange?.from,
      filters.dateRange?.to,
      platformFilter,
      regionFilter,
      topicFilter
    );

    // Calculate previous period
    const periodDays = filters.dateRange?.from && filters.dateRange?.to
      ? Math.ceil((filters.dateRange.to.getTime() - filters.dateRange.from.getTime()) / (1000 * 60 * 60 * 24))
      : 7;

    const previousFrom = filters.dateRange?.from 
      ? subDays(filters.dateRange.from, periodDays)
      : subDays(new Date(), periodDays * 2);
    const previousTo = filters.dateRange?.from 
      ? subDays(filters.dateRange.from, 1)
      : subDays(new Date(), periodDays);

    const previousSov = await getShareOfVoice(
      projectId,
      previousFrom,
      previousTo,
      platformFilter,
      regionFilter,
      topicFilter
    );

    if (!currentSov || !previousSov) {
      return {
        score: 0,
        velocity: 0,
        direction: "stable",
        weekOverWeekChange: 0,
        isOutperformingMarket: false,
        competitorAvgChange: 0,
      };
    }

    // Calculate brand change
    const brandChange = currentSov.brand.percentage - (previousSov.brand?.percentage || 0);

    // Calculate average competitor change
    let totalCompetitorChange = 0;
    let competitorCount = 0;
    
    currentSov.competitors?.forEach((comp: any) => {
      const prevComp = previousSov.competitors?.find((c: any) => c.id === comp.id);
      if (prevComp) {
        totalCompetitorChange += comp.percentage - prevComp.percentage;
        competitorCount++;
      }
    });

    const avgCompetitorChange = competitorCount > 0 ? totalCompetitorChange / competitorCount : 0;

    // Calculate momentum score (-100 to 100)
    // Positive = outperforming market, Negative = underperforming
    const relativePerformance = brandChange - avgCompetitorChange;
    const score = Math.max(-100, Math.min(100, relativePerformance * 10)); // Scale

    // Determine direction
    let direction: "up" | "down" | "stable" = "stable";
    if (brandChange > 0.5) direction = "up";
    else if (brandChange < -0.5) direction = "down";

    return {
      score: Math.round(score),
      velocity: Number(brandChange.toFixed(1)),
      direction,
      weekOverWeekChange: Number(brandChange.toFixed(1)),
      isOutperformingMarket: brandChange > avgCompetitorChange,
      competitorAvgChange: Number(avgCompetitorChange.toFixed(1)),
    };
  } catch (error) {
    console.error("Error calculating momentum score:", error);
    return {
      score: 0,
      velocity: 0,
      direction: "stable",
      weekOverWeekChange: 0,
      isOutperformingMarket: false,
      competitorAvgChange: 0,
    };
  }
}
