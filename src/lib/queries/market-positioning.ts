"use server";

import { createClient } from "@/lib/supabase/server";
import { getExecutiveBaseData } from "./executive-overview";
import { type SentimentFilterOptions } from "./sentiment-analysis";
import { getEntitySentimentsFromEvaluations } from "./brand-evaluations";

export interface MarketPositioningData {
  brandId: string;
  brandName: string;
  brandDomain?: string;
  brandColor?: string;
  isBrand: boolean;
  shareOfMentions: number; // X-axis: Share of Voice (Market Share)
  growthVelocity: number; // Y-axis: Growth Velocity (percentage change in share)
  sentimentScore: number; // For sentiment pulse indicator (0-1)
  sentiment?: 'positive' | 'neutral' | 'negative';
}

/**
 * Get market positioning matrix data
 * Combines share of mentions with sentiment score
 */
export async function getMarketPositioningData(
  projectId: string,
  filters: SentimentFilterOptions
): Promise<MarketPositioningData[]> {
  const supabase = await createClient();

  // Get base data (includes share of voice)
  const baseData = await getExecutiveBaseData(projectId, filters);

  // Get project info
  const { data: project } = await supabase
    .from("projects")
    .select("name, client_url, color")
    .eq("id", projectId)
    .single();

  // Get all active competitors
  const { data: competitors } = await supabase
    .from("competitors")
    .select("id, name, domain, color")
    .eq("project_id", projectId)
    .eq("is_active", true);

  const results: MarketPositioningData[] = [];

  // Get sentiment data using same source as Sentiment Pulse and Executive Overview
  const entitySentiments = await getEntitySentimentsFromEvaluations(
    projectId,
    filters.dateRange?.from,
    filters.dateRange?.to
  );

  // Get brand sentiment (using same source and calculation as Sentiment Pulse)
  const brandEntity = entitySentiments.find(e => e.analysisType === 'brand');
  const brandSentimentLabel: 'positive' | 'neutral' | 'negative' = brandEntity?.sentimentLabel || 'neutral';
  const brandSentimentScore = brandEntity?.averageSentiment || 0.5;

  // Add brand data
  if (baseData.currentSov.brand) {
    // Calculate growth velocity (change in share percentage)
    const currentShare = baseData.currentSov.brand.percentage;
    const previousShare = baseData.previousSov?.brand?.percentage || currentShare;
    const growthVelocity = currentShare - previousShare;

    results.push({
      brandId: "brand",
      brandName: project?.name || "Your Brand",
      brandDomain: project?.client_url || undefined,
      brandColor: project?.color || undefined,
      isBrand: true,
      shareOfMentions: currentShare,
      growthVelocity: growthVelocity,
      sentimentScore: brandSentimentScore,
      sentiment: brandSentimentLabel,
    });
  }

  // Add competitor data
  if (baseData.currentSov.competitors && competitors) {
    for (const competitor of competitors) {
      const compSov = baseData.currentSov.competitors.find((c: any) => c.id === competitor.id);
      const prevCompSov = baseData.previousSov?.competitors?.find((c: any) => c.id === competitor.id);
      
      if (compSov) {
        // Calculate growth velocity (change in share percentage)
        const currentShare = compSov.percentage;
        const previousShare = prevCompSov?.percentage || currentShare;
        const growthVelocity = currentShare - previousShare;

        // Get sentiment for competitor using same source as Sentiment Pulse and Executive Overview
        const competitorEntity = entitySentiments.find(e => 
          e.analysisType === 'competitor' && 
          (e.entityName.toLowerCase() === competitor.name.toLowerCase() || 
           e.entityDomain === competitor.domain)
        );

        // Use the sentimentLabel that comes directly from getEntitySentimentsFromEvaluations
        // This uses the same calculation as Sentiment Pulse (based on averageSentiment)
        const compSentimentLabel: 'positive' | 'neutral' | 'negative' = competitorEntity?.sentimentLabel || 'neutral';
        const compSentimentScore = competitorEntity?.averageSentiment || 0.5;

        results.push({
          brandId: competitor.id,
          brandName: competitor.name,
          brandDomain: competitor.domain || undefined,
          brandColor: competitor.color || undefined,
          isBrand: false,
          shareOfMentions: currentShare,
          growthVelocity: growthVelocity,
          sentimentScore: compSentimentScore,
          sentiment: compSentimentLabel,
        });
      }
    }
  }

  return results;
}

