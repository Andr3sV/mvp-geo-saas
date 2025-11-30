"use server";

import { createClient } from "@/lib/supabase/server";
import type { ReportSectionData, NewCompetitor } from "@/lib/queries/detailed-report";

/**
 * Generate AI-powered insights for a report section
 */
export async function generateSectionInsights(
  sectionType: "visibility" | "share-of-voice" | "sentiment",
  data: ReportSectionData,
  brandName: string,
  periodLabel: string
): Promise<string> {
  try {
    // For now, return a template-based insight
    // TODO: Implement actual LLM integration for dynamic insights
    const topCompetitor = data.topCompetitors[0];
    const brandChange = data.brandPercentageChange;

    const changeLabel = brandChange > 0 ? "increased" : brandChange < 0 ? "decreased" : "remained stable";
    const changeValue = Math.abs(brandChange).toFixed(1);

    switch (sectionType) {
      case "visibility":
        return `During ${periodLabel}, ${brandName} registered ${data.brandValue.toLocaleString()} mentions, ${changeLabel} by ${changeValue}% compared to the previous period. ${topCompetitor ? `${topCompetitor.name} led the ranking with ${topCompetitor.value.toLocaleString()} mentions.` : ""} Overall sector visibility shows consistent activity.`;

      case "share-of-voice":
        return `${brandName} represented ${data.brandValue.toFixed(1)}% of total Share of Voice, ${changeLabel} by ${changeValue} percentage points. ${topCompetitor ? `${topCompetitor.name} maintains ${topCompetitor.value.toFixed(1)}% of the market.` : ""} Share distribution shows active competition in the sector.`;

      case "sentiment":
        return `Average sentiment towards ${brandName} was ${data.brandValue.toFixed(1)}/100, ${changeLabel} by ${changeValue}% compared to the previous period. ${topCompetitor ? `${topCompetitor.name} registered ${topCompetitor.value.toFixed(1)} sentiment points.` : ""} Sector perceptions maintain relative stability.`;

      default:
        return "Analysis in progress...";
    }
  } catch (error) {
    console.error("Error generating insights:", error);
    return "Unable to generate insights at this time.";
  }
}

/**
 * Generate insights for new competitors section
 */
export async function generateNewCompetitorsInsight(
  competitors: NewCompetitor[],
  brandName: string,
  periodLabel: string
): Promise<string> {
  try {
    if (competitors.length === 0) {
      return `No competitors tracked in your app appeared in AI responses during ${periodLabel}. This could indicate low competitor visibility or that tracked competitors are not being mentioned by AI assistants.`;
    }

    const topCompetitor = competitors[0];
    const totalMentions = competitors.reduce((sum, comp) => sum + comp.mentions, 0);
    const uniquePlatforms = new Set(competitors.flatMap(comp => comp.platforms));

    return `During ${periodLabel}, ${competitors.length} ${competitors.length === 1 ? 'competitor' : 'competitors'} tracked in your app appeared in AI responses, generating ${totalMentions} total mentions across ${uniquePlatforms.size} ${uniquePlatforms.size === 1 ? 'platform' : 'platforms'}. ${topCompetitor.name} led with ${topCompetitor.mentions} mentions. These competitors are actively being referenced by AI assistants, indicating their presence in the competitive landscape.`;
  } catch (error) {
    console.error("Error generating new competitors insights:", error);
    return "Unable to generate insights at this time.";
  }
}

