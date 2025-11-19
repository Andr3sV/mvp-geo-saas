"use server";

import { createClient } from "@/lib/supabase/server";

// =============================================
// SHARE OF VOICE METRICS
// =============================================

/**
 * Calculate Share of Voice for brand vs competitors
 * Returns percentage of mentions across all tracked entities
 */
export async function getShareOfVoice(projectId: string, days: number = 30) {
  const supabase = await createClient();

  // Get project info (name and client_url for favicon)
  const { data: project } = await supabase
    .from("projects")
    .select("name, client_url")
    .eq("id", projectId)
    .single();

  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get brand citations in period
  const { data: brandCitations } = await supabase
    .from("citations_detail")
    .select("id, created_at")
    .eq("project_id", projectId)
    .gte("created_at", startDate.toISOString());

  // Get competitor citations in period with competitor info
  const { data: competitorCitations } = await supabase
    .from("competitor_citations")
    .select(`
      id,
      created_at,
      competitor_id,
      competitors!inner(name, domain, is_active)
    `)
    .eq("project_id", projectId)
    .gte("created_at", startDate.toISOString());

  // Count brand mentions
  const brandMentions = brandCitations?.length || 0;

  // Count competitor mentions by competitor
  const competitorStats = new Map<string, { id: string; name: string; domain: string; mentions: number }>();
  
  competitorCitations?.forEach((citation: any) => {
    const competitor = citation.competitors;
    if (!competitor || !competitor.is_active) return;

    if (!competitorStats.has(competitor.name)) {
      competitorStats.set(competitor.name, {
        id: citation.competitor_id,
        name: competitor.name,
        domain: competitor.domain || "",
        mentions: 0,
      });
    }
    competitorStats.get(competitor.name)!.mentions++;
  });

  // Calculate totals
  const competitorMentions = Array.from(competitorStats.values()).reduce(
    (sum, comp) => sum + comp.mentions,
    0
  );
  const totalMentions = brandMentions + competitorMentions;

  // Calculate percentages
  const brandPercentage = totalMentions > 0 ? (brandMentions / totalMentions) * 100 : 0;

  const competitors = Array.from(competitorStats.values()).map((comp) => ({
    id: comp.id,
    name: comp.name,
    domain: comp.domain,
    mentions: comp.mentions,
    percentage: totalMentions > 0 ? Number(((comp.mentions / totalMentions) * 100).toFixed(1)) : 0,
  }));

  // Sort competitors by percentage descending (highest first)
  competitors.sort((a, b) => b.percentage - a.percentage);

  // Determine market position
  const allEntities = [
    { name: project?.name || "Your Brand", mentions: brandMentions, percentage: brandPercentage },
    ...competitors,
  ].sort((a, b) => b.mentions - a.mentions);

  const marketPosition = allEntities.findIndex((e) => e.name === (project?.name || "Your Brand")) + 1;

  return {
    brand: {
      name: project?.name || "Your Brand",
      domain: project?.client_url || "",
      mentions: brandMentions,
      percentage: Number(brandPercentage.toFixed(1)),
    },
    competitors,
    totalMentions,
    marketPosition,
  };
}

// =============================================
// SHARE OF VOICE TRENDS
// =============================================

/**
 * Calculate Share of Voice trends by comparing current vs previous period
 */
export async function getShareOfVoiceTrends(projectId: string, days: number = 30) {
  const supabase = await createClient();

  // Current period
  const currentEndDate = new Date();
  const currentStartDate = new Date();
  currentStartDate.setDate(currentStartDate.getDate() - days);

  // Previous period (same duration)
  const previousEndDate = new Date(currentStartDate);
  const previousStartDate = new Date(currentStartDate);
  previousStartDate.setDate(previousStartDate.getDate() - days);

  // Get current period data
  const [currentBrandResult, currentCompResult] = await Promise.all([
    supabase
      .from("citations_detail")
      .select("id")
      .eq("project_id", projectId)
      .gte("created_at", currentStartDate.toISOString())
      .lte("created_at", currentEndDate.toISOString()),
    
    supabase
      .from("competitor_citations")
      .select(`
        id,
        competitor_id,
        competitors!inner(name, is_active)
      `)
      .eq("project_id", projectId)
      .gte("created_at", currentStartDate.toISOString())
      .lte("created_at", currentEndDate.toISOString()),
  ]);

  // Get previous period data
  const [previousBrandResult, previousCompResult] = await Promise.all([
    supabase
      .from("citations_detail")
      .select("id")
      .eq("project_id", projectId)
      .gte("created_at", previousStartDate.toISOString())
      .lte("created_at", previousEndDate.toISOString()),
    
    supabase
      .from("competitor_citations")
      .select(`
        id,
        competitor_id,
        competitors!inner(name, is_active)
      `)
      .eq("project_id", projectId)
      .gte("created_at", previousStartDate.toISOString())
      .lte("created_at", previousEndDate.toISOString()),
  ]);

  // Calculate current period stats
  const currentBrandMentions = currentBrandResult.data?.length || 0;
  const currentCompMentions = currentCompResult.data?.length || 0;
  const currentTotal = currentBrandMentions + currentCompMentions;
  const currentBrandShare = currentTotal > 0 
    ? (currentBrandMentions / currentTotal) * 100 
    : 0;

  // Calculate previous period stats
  const previousBrandMentions = previousBrandResult.data?.length || 0;
  const previousCompMentions = previousCompResult.data?.length || 0;
  const previousTotal = previousBrandMentions + previousCompMentions;
  const previousBrandShare = previousTotal > 0 
    ? (previousBrandMentions / previousTotal) * 100 
    : 0;

  // Calculate trend
  const shareTrend = currentBrandShare - previousBrandShare;

  // Calculate competitor trends
  const competitorTrends = new Map<string, { current: number; previous: number }>();

  // Current competitor stats
  currentCompResult.data?.forEach((citation: any) => {
    const name = citation.competitors?.name;
    if (!name) return;
    if (!competitorTrends.has(name)) {
      competitorTrends.set(name, { current: 0, previous: 0 });
    }
    competitorTrends.get(name)!.current++;
  });

  // Previous competitor stats
  previousCompResult.data?.forEach((citation: any) => {
    const name = citation.competitors?.name;
    if (!name) return;
    if (!competitorTrends.has(name)) {
      competitorTrends.set(name, { current: 0, previous: 0 });
    }
    competitorTrends.get(name)!.previous++;
  });

  // Calculate percentage trends for each competitor
  const competitorTrendsList = Array.from(competitorTrends.entries()).map(
    ([name, stats]) => {
      const currentShare = currentTotal > 0 ? (stats.current / currentTotal) * 100 : 0;
      const previousShare = previousTotal > 0 ? (stats.previous / previousTotal) * 100 : 0;
      const trend = currentShare - previousShare;

      return {
        name,
        trend: Number(trend.toFixed(1)),
        currentMentions: stats.current,
        previousMentions: stats.previous,
      };
    }
  );

  return {
    brandTrend: Number(shareTrend.toFixed(1)),
    competitorTrends: competitorTrendsList,
  };
}

// =============================================
// SHARE OF VOICE INSIGHTS
// =============================================

/**
 * Generate AI-powered insights based on Share of Voice data
 */
export async function getShareOfVoiceInsights(projectId: string) {
  const [sovData, trendsData] = await Promise.all([
    getShareOfVoice(projectId, 30),
    getShareOfVoiceTrends(projectId, 30),
  ]);

  const insights: Array<{
    type: "success" | "info" | "warning" | "opportunity";
    title: string;
    description: string;
  }> = [];

  // Market leader insight
  if (sovData.marketPosition === 1) {
    insights.push({
      type: "success",
      title: "📈 You're leading the market",
      description: `Your brand has the highest share of voice at ${sovData.brand.percentage}%, maintaining a strong lead over competitors.`,
    });
  } else {
    const leader = sovData.competitors[0];
    insights.push({
      type: "info",
      title: `🎯 Market Position #${sovData.marketPosition}`,
      description: `${leader.name} leads with ${leader.percentage}%. You have ${sovData.brand.percentage}% share of voice.`,
    });
  }

  // Trend insight
  if (trendsData.brandTrend > 2) {
    insights.push({
      type: "success",
      title: "🚀 Growing momentum",
      description: `Your share of voice increased by ${trendsData.brandTrend}% compared to the previous period. Keep up the great work!`,
    });
  } else if (trendsData.brandTrend < -2) {
    insights.push({
      type: "warning",
      title: "⚠️ Share declining",
      description: `Your share of voice decreased by ${Math.abs(trendsData.brandTrend)}%. Consider reviewing your content strategy.`,
    });
  }

  // Competitor opportunity
  const decliningCompetitors = trendsData.competitorTrends
    .filter((c) => c.trend < -1)
    .sort((a, b) => a.trend - b.trend);

  if (decliningCompetitors.length > 0) {
    const topDeclining = decliningCompetitors[0];
    insights.push({
      type: "opportunity",
      title: "💡 Opportunity detected",
      description: `${topDeclining.name} is losing ground (${topDeclining.trend}%). Focus on their key topics to capture their audience.`,
    });
  }

  // Low competition insight
  if (sovData.competitors.length === 0) {
    insights.push({
      type: "info",
      title: "👥 Add competitors",
      description: "Track competitors to get comparative insights and identify market opportunities.",
    });
  }

  return insights;
}

