"use server";

import { createClient } from "@/lib/supabase/server";
import { subDays, startOfDay, endOfDay } from "date-fns";
import type { ReportPeriod } from "@/components/reports/period-selector";

export interface CompetitorMetric {
  id: string;
  name: string;
  domain?: string;
  value: number;
  percentageChange: number;
  previousValue: number;
}

export interface ReportSectionData {
  topCompetitors: CompetitorMetric[];
  brandValue: number;
  brandPercentageChange: number;
}

export interface NewCompetitor {
  id: string;
  name: string;
  domain: string;
  mentions: number;
  firstMentionDate: string;
  platforms: string[];
  created_at: string; // When competitor was created in the app
}

export interface DetailedReportData {
  visibilityScore: ReportSectionData;
  shareOfVoice: ReportSectionData;
  sentiment: ReportSectionData;
  newCompetitors: NewCompetitor[];
}

function getDateRange(period: ReportPeriod): { from: Date; to: Date; previousFrom: Date; previousTo: Date } {
  const to = endOfDay(new Date());
  let from: Date;
  let previousTo: Date;
  let previousFrom: Date;

  switch (period) {
    case "yesterday":
      from = startOfDay(subDays(new Date(), 1));
      previousTo = endOfDay(subDays(new Date(), 2));
      previousFrom = startOfDay(subDays(new Date(), 2));
      break;
    case "last-week":
      from = startOfDay(subDays(new Date(), 7));
      previousTo = endOfDay(subDays(new Date(), 8));
      previousFrom = startOfDay(subDays(new Date(), 14));
      break;
    case "last-month":
      from = startOfDay(subDays(new Date(), 30));
      previousTo = endOfDay(subDays(new Date(), 31));
      previousFrom = startOfDay(subDays(new Date(), 60));
      break;
    case "last-3-months":
      from = startOfDay(subDays(new Date(), 90));
      previousTo = endOfDay(subDays(new Date(), 91));
      previousFrom = startOfDay(subDays(new Date(), 180));
      break;
  }

  return { from, to, previousFrom, previousTo };
}

/**
 * Calculate Visibility Score: Total citations/mentions count
 */
async function getVisibilityScore(
  projectId: string,
  from: Date,
  to: Date,
  previousFrom: Date,
  previousTo: Date
): Promise<ReportSectionData> {
  const supabase = await createClient();

  // Current period: brand citations
  const { count: brandCurrent } = await supabase
    .from("citations_detail")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId)
    .gte("created_at", from.toISOString())
    .lte("created_at", to.toISOString());

  // Previous period: brand citations
  const { count: brandPrevious } = await supabase
    .from("citations_detail")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId)
    .gte("created_at", previousFrom.toISOString())
    .lte("created_at", previousTo.toISOString());

  // Current period: competitor citations grouped by competitor
  const { data: competitorCitations } = await supabase
    .from("competitor_citations")
    .select("competitor_id, competitors!inner(name, domain)")
    .eq("project_id", projectId)
    .gte("created_at", from.toISOString())
    .lte("created_at", to.toISOString())
    .limit(50000);

  // Previous period: competitor citations grouped by competitor
  const { data: competitorCitationsPrevious } = await supabase
    .from("competitor_citations")
    .select("competitor_id, competitors!inner(name, domain)")
    .eq("project_id", projectId)
    .gte("created_at", previousFrom.toISOString())
    .lte("created_at", previousTo.toISOString())
    .limit(50000);

  // Group and count current period
  const competitorCountsCurrent: Record<string, { count: number; name: string; domain?: string }> = {};
  competitorCitations?.forEach((cc: any) => {
    const compId = cc.competitor_id;
    if (!competitorCountsCurrent[compId]) {
      competitorCountsCurrent[compId] = {
        count: 0,
        name: cc.competitors.name,
        domain: cc.competitors.domain,
      };
    }
    competitorCountsCurrent[compId].count++;
  });

  // Group and count previous period
  const competitorCountsPrevious: Record<string, number> = {};
  competitorCitationsPrevious?.forEach((cc: any) => {
    const compId = cc.competitor_id;
    competitorCountsPrevious[compId] = (competitorCountsPrevious[compId] || 0) + 1;
  });

  // Build top competitors with percentage change
  const topCompetitors: CompetitorMetric[] = Object.entries(competitorCountsCurrent)
    .map(([id, data]) => {
      const previousValue = competitorCountsPrevious[id] || 0;
      const percentageChange =
        previousValue > 0 ? ((data.count - previousValue) / previousValue) * 100 : data.count > 0 ? 100 : 0;

      return {
        id,
        name: data.name,
        domain: data.domain,
        value: data.count,
        percentageChange,
        previousValue,
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const brandValue = brandCurrent || 0;
  const brandPreviousValue = brandPrevious || 0;
  const brandPercentageChange =
    brandPreviousValue > 0 ? ((brandValue - brandPreviousValue) / brandPreviousValue) * 100 : brandValue > 0 ? 100 : 0;

  return {
    topCompetitors,
    brandValue,
    brandPercentageChange,
  };
}

/**
 * Calculate Share of Voice: Percentage of mentions
 */
async function getShareOfVoiceData(
  projectId: string,
  from: Date,
  to: Date,
  previousFrom: Date,
  previousTo: Date
): Promise<ReportSectionData> {
  const supabase = await createClient();

  // Current period: total citations (brand + competitors)
  const { count: brandCurrent } = await supabase
    .from("citations_detail")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId)
    .gte("created_at", from.toISOString())
    .lte("created_at", to.toISOString());

  const { data: competitorCitations } = await supabase
    .from("competitor_citations")
    .select("competitor_id, competitors!inner(name, domain)")
    .eq("project_id", projectId)
    .gte("created_at", from.toISOString())
    .lte("created_at", to.toISOString())
    .limit(50000);

  // Previous period: total citations
  const { count: brandPrevious } = await supabase
    .from("citations_detail")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId)
    .gte("created_at", previousFrom.toISOString())
    .lte("created_at", previousTo.toISOString());

  const { data: competitorCitationsPrevious } = await supabase
    .from("competitor_citations")
    .select("competitor_id, competitors!inner(name, domain)")
    .eq("project_id", projectId)
    .gte("created_at", previousFrom.toISOString())
    .lte("created_at", previousTo.toISOString())
    .limit(50000);

  const totalCurrent = (brandCurrent || 0) + (competitorCitations?.length || 0);
  const totalPrevious = (brandPrevious || 0) + (competitorCitationsPrevious?.length || 0);

  // Calculate percentages
  const brandValue = totalCurrent > 0 ? ((brandCurrent || 0) / totalCurrent) * 100 : 0;
  const brandPreviousValue = totalPrevious > 0 ? ((brandPrevious || 0) / totalPrevious) * 100 : 0;
  const brandPercentageChange = brandPreviousValue > 0 
    ? ((brandValue - brandPreviousValue) / brandPreviousValue) * 100 
    : brandValue > 0 ? 100 : 0;

  // Group competitors and calculate percentages
  const competitorCountsCurrent: Record<string, { count: number; name: string; domain?: string }> = {};
  competitorCitations?.forEach((cc: any) => {
    const compId = cc.competitor_id;
    if (!competitorCountsCurrent[compId]) {
      competitorCountsCurrent[compId] = {
        count: 0,
        name: cc.competitors.name,
        domain: cc.competitors.domain,
      };
    }
    competitorCountsCurrent[compId].count++;
  });

  const competitorCountsPrevious: Record<string, number> = {};
  competitorCitationsPrevious?.forEach((cc: any) => {
    const compId = cc.competitor_id;
    competitorCountsPrevious[compId] = (competitorCountsPrevious[compId] || 0) + 1;
  });

  const topCompetitors: CompetitorMetric[] = Object.entries(competitorCountsCurrent)
    .map(([id, data]) => {
      const currentPercentage = totalCurrent > 0 ? (data.count / totalCurrent) * 100 : 0;
      const previousCount = competitorCountsPrevious[id] || 0;
      const previousPercentage = totalPrevious > 0 ? (previousCount / totalPrevious) * 100 : 0;
      const percentageChange =
        previousPercentage > 0 ? ((currentPercentage - previousPercentage) / previousPercentage) * 100 : currentPercentage > 0 ? 100 : 0;

      return {
        id,
        name: data.name,
        domain: data.domain,
        value: currentPercentage,
        percentageChange,
        previousValue: previousPercentage,
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  return {
    topCompetitors,
    brandValue,
    brandPercentageChange,
  };
}

/**
 * Calculate Sentiment: Average sentiment scores
 * Now uses brand_sentiment_attributes instead of legacy sentiment_analysis table
 */
async function getSentimentData(
  projectId: string,
  from: Date,
  to: Date,
  previousFrom: Date,
  previousTo: Date
): Promise<ReportSectionData> {
  const supabase = await createClient();

  // Current period: brand sentiment (using brand_sentiment_attributes)
  const { data: brandSentimentCurrent } = await supabase
    .from("brand_sentiment_attributes")
    .select("sentiment_rating")
    .eq("project_id", projectId)
    .eq("brand_type", "client")
    .gte("created_at", from.toISOString())
    .lte("created_at", to.toISOString())
    .limit(10000);

  // Previous period: brand sentiment
  const { data: brandSentimentPrevious } = await supabase
    .from("brand_sentiment_attributes")
    .select("sentiment_rating")
    .eq("project_id", projectId)
    .eq("brand_type", "client")
    .gte("created_at", previousFrom.toISOString())
    .lte("created_at", previousTo.toISOString())
    .limit(10000);

  // Current period: competitor sentiment
  const { data: competitorSentimentCurrent } = await supabase
    .from("brand_sentiment_attributes")
    .select("sentiment_rating, competitor_id, competitors!inner(name, domain)")
    .eq("project_id", projectId)
    .eq("brand_type", "competitor")
    .not("competitor_id", "is", null)
    .gte("created_at", from.toISOString())
    .lte("created_at", to.toISOString())
    .limit(10000);

  // Previous period: competitor sentiment
  const { data: competitorSentimentPrevious } = await supabase
    .from("brand_sentiment_attributes")
    .select("sentiment_rating, competitor_id")
    .eq("project_id", projectId)
    .eq("brand_type", "competitor")
    .not("competitor_id", "is", null)
    .gte("created_at", previousFrom.toISOString())
    .lte("created_at", previousTo.toISOString())
    .limit(10000);

  // Calculate brand average sentiment (sentiment_rating is -1 to 1, normalized to 0-1)
  const brandCurrentAvg =
    brandSentimentCurrent && brandSentimentCurrent.length > 0
      ? brandSentimentCurrent.reduce((sum, s) => {
          // Convert from -1..1 to 0..1 range
          const normalized = (s.sentiment_rating + 1) / 2;
          return sum + normalized;
        }, 0) / brandSentimentCurrent.length
      : 0.5; // Default to neutral (0.5)
  
  const brandPreviousAvg =
    brandSentimentPrevious && brandSentimentPrevious.length > 0
      ? brandSentimentPrevious.reduce((sum, s) => {
          const normalized = (s.sentiment_rating + 1) / 2;
          return sum + normalized;
        }, 0) / brandSentimentPrevious.length
      : 0.5;
  
  const brandPercentageChange =
    brandPreviousAvg > 0 ? ((brandCurrentAvg - brandPreviousAvg) / brandPreviousAvg) * 100 : brandCurrentAvg > 0.5 ? 100 : 0;

  // Group competitors by average sentiment
  const competitorSentimentsCurrent: Record<string, { sum: number; count: number; name: string; domain?: string }> = {};
  competitorSentimentCurrent?.forEach((cs: any) => {
    const compId = cs.competitor_id;
    if (!competitorSentimentsCurrent[compId]) {
      competitorSentimentsCurrent[compId] = {
        sum: 0,
        count: 0,
        name: cs.competitors.name,
        domain: cs.competitors.domain,
      };
    }
    // Convert sentiment_rating from -1..1 to 0..1
    const normalized = (cs.sentiment_rating + 1) / 2;
    competitorSentimentsCurrent[compId].sum += normalized;
    competitorSentimentsCurrent[compId].count++;
  });

  const competitorSentimentsPrevious: Record<string, { sum: number; count: number }> = {};
  competitorSentimentPrevious?.forEach((cs: any) => {
    const compId = cs.competitor_id;
    if (!competitorSentimentsPrevious[compId]) {
      competitorSentimentsPrevious[compId] = { sum: 0, count: 0 };
    }
    const normalized = (cs.sentiment_rating + 1) / 2;
    competitorSentimentsPrevious[compId].sum += normalized;
    competitorSentimentsPrevious[compId].count++;
  });

  const topCompetitors: CompetitorMetric[] = Object.entries(competitorSentimentsCurrent)
    .map(([id, data]) => {
      const currentAvg = data.count > 0 ? data.sum / data.count : 0.5;
      const previous = competitorSentimentsPrevious[id] || { sum: 0, count: 0 };
      const previousAvg = previous.count > 0 ? previous.sum / previous.count : 0.5;
      const percentageChange =
        previousAvg > 0 ? ((currentAvg - previousAvg) / previousAvg) * 100 : currentAvg > 0.5 ? 100 : 0;

      return {
        id,
        name: data.name,
        domain: data.domain,
        value: currentAvg * 100, // Convert to percentage (0-100)
        percentageChange,
        previousValue: previousAvg * 100,
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  return {
    topCompetitors,
    brandValue: brandCurrentAvg * 100,
    brandPercentageChange,
  };
}

/**
 * Get new competitors that have mentions in AI responses
 * These are competitors created in the app that appeared in AI responses during the period
 */
async function getNewCompetitors(
  projectId: string,
  from: Date,
  to: Date
): Promise<NewCompetitor[]> {
  const supabase = await createClient();

  // Get all competitors for this project
  const { data: competitors, error: competitorsError } = await supabase
    .from("competitors")
    .select("id, name, domain, created_at")
    .eq("project_id", projectId)
    .eq("is_active", true);

  if (competitorsError || !competitors || competitors.length === 0) {
    return [];
  }

  // Get competitor citations in the period
  const { data: citations, error: citationsError } = await supabase
    .from("competitor_citations")
    .select(`
      competitor_id,
      created_at,
      ai_responses!inner(platform)
    `)
    .eq("project_id", projectId)
    .gte("created_at", from.toISOString())
    .lte("created_at", to.toISOString())
    .limit(50000);

  if (citationsError || !citations) {
    return [];
  }

  // Group citations by competitor
  const competitorStats: Record<string, {
    mentions: number;
    firstMentionDate: Date | null;
    platforms: Set<string>;
    competitor: typeof competitors[0];
  }> = {};

  competitors.forEach((comp) => {
    competitorStats[comp.id] = {
      mentions: 0,
      firstMentionDate: null,
      platforms: new Set(),
      competitor: comp,
    };
  });

  citations.forEach((citation: any) => {
    const compId = citation.competitor_id;
    if (competitorStats[compId]) {
      competitorStats[compId].mentions++;
      
      const mentionDate = new Date(citation.created_at);
      if (!competitorStats[compId].firstMentionDate || mentionDate < competitorStats[compId].firstMentionDate!) {
        competitorStats[compId].firstMentionDate = mentionDate;
      }
      
      if (citation.ai_responses?.platform) {
        competitorStats[compId].platforms.add(citation.ai_responses.platform);
      }
    }
  });

  // Convert to array and filter only those with mentions
  const newCompetitors: NewCompetitor[] = Object.values(competitorStats)
    .filter((stat) => stat.mentions > 0)
    .map((stat) => ({
      id: stat.competitor.id,
      name: stat.competitor.name,
      domain: stat.competitor.domain,
      mentions: stat.mentions,
      firstMentionDate: stat.firstMentionDate?.toISOString() || new Date().toISOString(),
      platforms: Array.from(stat.platforms),
      created_at: stat.competitor.created_at,
    }))
    .sort((a, b) => {
      // Sort by mentions descending, then by first mention date (most recent first)
      if (b.mentions !== a.mentions) {
        return b.mentions - a.mentions;
      }
      return new Date(b.firstMentionDate).getTime() - new Date(a.firstMentionDate).getTime();
    });

  return newCompetitors;
}

/**
 * Get complete detailed report data
 */
export async function getDetailedReportData(
  projectId: string,
  period: ReportPeriod
): Promise<DetailedReportData | null> {
  try {
    const { from, to, previousFrom, previousTo } = getDateRange(period);

    const [visibilityScore, shareOfVoice, sentiment, newCompetitors] = await Promise.all([
      getVisibilityScore(projectId, from, to, previousFrom, previousTo),
      getShareOfVoiceData(projectId, from, to, previousFrom, previousTo),
      getSentimentData(projectId, from, to, previousFrom, previousTo),
      getNewCompetitors(projectId, from, to),
    ]);

    return {
      visibilityScore,
      shareOfVoice,
      sentiment,
      newCompetitors,
    };
  } catch (error) {
    console.error("Error fetching detailed report data:", error);
    return null;
  }
}

