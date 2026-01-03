"use server";

import { createClient } from "@/lib/supabase/server";
import { getShareOfVoice } from "./share-of-voice";
import { getShareOfVoiceTrends } from "./share-of-voice";
import { subDays } from "date-fns";

export interface BattlefieldMatrixData {
  topicId: string;
  topicName: string;
  topicColor?: string;
  brandId: string;
  brandName: string;
  brandDomain?: string;
  brandColor?: string;
  isBrand: boolean;
  share: number;
  trend?: number;
}

/**
 * Get battlefield matrix data - share of mentions by topic for each brand
 */
export async function getBattlefieldMatrixData(
  projectId: string,
  fromDate?: Date,
  toDate?: Date,
  platform?: string,
  region?: string
): Promise<BattlefieldMatrixData[]> {
  const supabase = await createClient();

  // Get all topics for the project
  const { data: topics, error: topicsError } = await supabase
    .from("topics")
    .select("id, name, color")
    .eq("project_id", projectId)
    .order("name", { ascending: true });

  if (topicsError || !topics) {
    console.error("Error fetching topics:", topicsError);
    return [];
  }

  // Get project info for brand data
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

  const results: BattlefieldMatrixData[] = [];

  // Calculate previous period for trends
  const periodDays = fromDate && toDate
    ? Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24))
    : 7;

  const previousFrom = fromDate 
    ? subDays(fromDate, periodDays)
    : subDays(new Date(), periodDays * 2);
  const previousTo = fromDate 
    ? subDays(fromDate, 1)
    : subDays(new Date(), periodDays);

  // For each topic, get share of voice data
  for (const topic of topics) {
    // Get current period data
    const currentSov = await getShareOfVoice(
      projectId,
      fromDate,
      toDate,
      platform,
      region,
      topic.id
    );

    // Get previous period data for trends
    const previousSov = await getShareOfVoice(
      projectId,
      previousFrom,
      previousTo,
      platform,
      region,
      topic.id
    );

    // Calculate total mentions for share calculation
    const currentTotal = currentSov.totalMentions;
    const previousTotal = previousSov?.totalMentions || 0;

    // Add brand data
    if (currentSov.brand) {
      const currentShare = currentSov.brand.percentage;
      const previousShare = previousSov?.brand?.percentage || 0;
      const trend = currentShare - previousShare;

      results.push({
        topicId: topic.id,
        topicName: topic.name,
        topicColor: topic.color || undefined,
        brandId: "brand",
        brandName: project?.name || "Your Brand",
        brandDomain: project?.client_url || undefined,
        brandColor: project?.color || undefined,
        isBrand: true,
        share: currentShare,
        trend: Math.abs(trend) > 0.1 ? trend : undefined, // Only show trend if significant
      });
    }

    // Add competitor data
    if (currentSov.competitors && competitors) {
      for (const competitor of competitors) {
        const compData = currentSov.competitors.find((c: any) => c.id === competitor.id);
        if (compData) {
          const currentShare = compData.percentage;
          const prevCompData = previousSov?.competitors?.find((c: any) => c.id === competitor.id);
          const previousShare = prevCompData?.percentage || 0;
          const trend = currentShare - previousShare;

          results.push({
            topicId: topic.id,
            topicName: topic.name,
            topicColor: topic.color || undefined,
            brandId: competitor.id,
            brandName: competitor.name,
            brandDomain: competitor.domain || undefined,
            brandColor: competitor.color || undefined,
            isBrand: false,
            share: currentShare,
            trend: Math.abs(trend) > 0.1 ? trend : undefined, // Only show trend if significant
          });
        }
      }
    }
  }

  return results;
}

