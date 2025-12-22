"use server";

import { createClient } from "@/lib/supabase/server";
import { format, subDays } from "date-fns";

// =============================================
// BRAND EVALUATIONS QUERIES
// =============================================
// These queries fetch sentiment evaluations from the brand_evaluations table
// populated by the daily-sentiment-evaluation Inngest function

export interface BrandEvaluation {
  id: string;
  project_id: string;
  entity_type: "brand" | "competitor";
  entity_name: string;
  competitor_id: string | null;
  topic: string;
  evaluation_prompt: string;
  response_text: string | null;
  sentiment_score: number | null;
  positive_theme_ids?: string[] | null;
  negative_theme_ids?: string[] | null;
  total_positive_attributes?: number;
  total_negative_attributes?: number;
  natural_response: string | null;
  region: string | null;
  query_search: string[] | null;
  uri_sources: string[] | null;
  url_sources: string[] | null;
  platform: string;
  created_at: string;
  updated_at: string;
}

export interface SentimentTheme {
  id: string;
  project_id: string;
  name: string;
  type: "positive" | "negative";
  created_at: string;
  updated_at: string;
}

export interface TopicSentimentSummary {
  topic: string;
  brand_sentiment: "positive" | "neutral" | "negative" | "mixed" | null;
  brand_score: number | null;
  competitors: Array<{
    competitor_id: string;
    name: string;
    sentiment: "positive" | "neutral" | "negative" | "mixed" | null;
    score: number | null;
  }>;
}

export interface EntityEvaluationSummary {
  entity_type: "brand" | "competitor";
  entity_name: string;
  competitor_id: string | null;
  total_evaluations: number;
  avg_sentiment_score: number | null;
  sentiment_distribution: {
    positive: number;
    neutral: number;
    negative: number;
    mixed: number;
  };
  top_strengths: string[];
  top_weaknesses: string[];
}

// =============================================
// GET EVALUATIONS BY PROJECT
// =============================================

/**
 * Get all evaluations for a project with optional filters
 */
export async function getBrandEvaluations(
  projectId: string,
  options?: {
    entityType?: "brand" | "competitor";
    competitorId?: string;
    topic?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }
): Promise<BrandEvaluation[]> {
  const supabase = await createClient();

  let query = supabase
    .from("brand_evaluations")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (options?.entityType) {
    query = query.eq("entity_type", options.entityType);
  }

  if (options?.competitorId) {
    query = query.eq("competitor_id", options.competitorId);
  }

  if (options?.topic) {
    query = query.eq("topic", options.topic);
  }

  if (options?.startDate) {
    query = query.gte("created_at", options.startDate.toISOString());
  }

  if (options?.endDate) {
    query = query.lte("created_at", options.endDate.toISOString());
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching brand evaluations:", error);
    return [];
  }

  return (data || []) as BrandEvaluation[];
}

// =============================================
// GET EVALUATIONS BY TOPIC
// =============================================

/**
 * Get evaluations for a specific topic across brand and competitors
 */
export async function getBrandEvaluationsByTopic(
  projectId: string,
  topic: string,
  startDate?: Date,
  endDate?: Date
): Promise<BrandEvaluation[]> {
  return getBrandEvaluations(projectId, {
    topic,
    startDate,
    endDate,
  });
}

// =============================================
// GET TOPIC SENTIMENT TREND
// =============================================

/**
 * Get sentiment trend for a specific entity and topic over time
 */
export async function getTopicSentimentTrend(
  projectId: string,
  entityType: "brand" | "competitor",
  topic: string,
  competitorId?: string,
  days: number = 30
): Promise<
  Array<{
    date: string;
    sentiment: string | null;
    score: number | null;
  }>
> {
  const supabase = await createClient();
  const startDate = subDays(new Date(), days);

  let query = supabase
    .from("brand_evaluations")
    .select("created_at, sentiment_score")
    .eq("project_id", projectId)
    .eq("entity_type", entityType)
    .eq("topic", topic)
    .gte("created_at", startDate.toISOString())
    .order("created_at", { ascending: true });

  if (competitorId) {
    query = query.eq("competitor_id", competitorId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching topic sentiment trend:", error);
    return [];
  }

  return (data || []).map((item) => ({
    date: format(new Date(item.created_at), "yyyy-MM-dd"),
    sentiment: null, // sentiment field removed, using sentiment_score only
    score: item.sentiment_score,
  }));
}

// =============================================
// GET LATEST EVALUATIONS
// =============================================

/**
 * Get the most recent evaluations for a project
 */
export async function getLatestEvaluations(
  projectId: string,
  limit: number = 10
): Promise<BrandEvaluation[]> {
  return getBrandEvaluations(projectId, { limit });
}

// =============================================
// GET TOPIC SENTIMENT SUMMARY
// =============================================

/**
 * Get a summary of sentiment across all topics for brand vs competitors
 * Returns the latest evaluation for each topic/entity combination
 */
export async function getTopicSentimentSummary(
  projectId: string
): Promise<TopicSentimentSummary[]> {
  const supabase = await createClient();

  // Get unique topics for this project
  const { data: topicsData, error: topicsError } = await supabase
    .from("brand_evaluations")
    .select("topic")
    .eq("project_id", projectId);

  if (topicsError) {
    console.error("Error fetching topics:", topicsError);
    return [];
  }

  const uniqueTopics = [...new Set(topicsData?.map((t) => t.topic) || [])];

  const summaries: TopicSentimentSummary[] = [];

  for (const topic of uniqueTopics) {
    // Get latest brand evaluation for this topic
    const { data: brandEval } = await supabase
      .from("brand_evaluations")
      .select("sentiment_score")
      .eq("project_id", projectId)
      .eq("entity_type", "brand")
      .eq("topic", topic)
      .order("created_at", { ascending: false })
      .limit(1);

    // Get latest competitor evaluations for this topic
    const { data: competitorEvals } = await supabase
      .from("brand_evaluations")
      .select("competitor_id, entity_name, sentiment_score, created_at")
      .eq("project_id", projectId)
      .eq("entity_type", "competitor")
      .eq("topic", topic)
      .order("created_at", { ascending: false });

    // Group by competitor and get latest
    const latestByCompetitor = new Map<
      string,
      {
        competitor_id: string;
        name: string;
        sentiment: string | null;
        score: number | null;
      }
    >();

    competitorEvals?.forEach((eval_) => {
      if (eval_.competitor_id && !latestByCompetitor.has(eval_.competitor_id)) {
        latestByCompetitor.set(eval_.competitor_id, {
          competitor_id: eval_.competitor_id,
          name: eval_.entity_name,
          sentiment: null, // sentiment field removed, using sentiment_score only
          score: eval_.sentiment_score,
        });
      }
    });

    summaries.push({
      topic,
      brand_sentiment: null, // sentiment field removed, using sentiment_score only
      brand_score: brandEval?.[0]?.sentiment_score || null,
      competitors: Array.from(latestByCompetitor.values()) as Array<{
        competitor_id: string;
        name: string;
        sentiment: "positive" | "neutral" | "negative" | "mixed" | null;
        score: number | null;
      }>,
    });
  }

  return summaries;
}

// =============================================
// GET ENTITY EVALUATION SUMMARY
// =============================================

/**
 * Get aggregated evaluation summary for an entity (brand or competitor)
 */
export async function getEntityEvaluationSummary(
  projectId: string,
  entityType: "brand" | "competitor",
  competitorId?: string,
  days: number = 30
): Promise<EntityEvaluationSummary | null> {
  const supabase = await createClient();
  const startDate = subDays(new Date(), days);

  let query = supabase
    .from("brand_evaluations")
    .select("entity_name, sentiment_score, positive_theme_ids, negative_theme_ids")
    .eq("project_id", projectId)
    .eq("entity_type", entityType)
    .gte("created_at", startDate.toISOString());

  if (competitorId) {
    query = query.eq("competitor_id", competitorId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching entity evaluation summary:", error);
    return null;
  }

  if (!data || data.length === 0) {
    return null;
  }

  // Calculate sentiment distribution (based on sentiment_score, not sentiment field)
  const distribution = { positive: 0, neutral: 0, negative: 0, mixed: 0 };
  let totalScore = 0;
  let scoreCount = 0;
  const allPositiveThemeIds: string[] = [];
  const allNegativeThemeIds: string[] = [];

  data.forEach((eval_) => {
    // Calculate sentiment distribution from sentiment_score
    if (eval_.sentiment_score !== null) {
      if (eval_.sentiment_score >= 0.5) {
        distribution.positive++;
      } else if (eval_.sentiment_score <= -0.5) {
        distribution.negative++;
      } else {
        distribution.neutral++;
      }
      totalScore += eval_.sentiment_score;
      scoreCount++;
    }
    if (eval_.positive_theme_ids) {
      allPositiveThemeIds.push(...eval_.positive_theme_ids);
    }
    if (eval_.negative_theme_ids) {
      allNegativeThemeIds.push(...eval_.negative_theme_ids);
    }
  });

  // Fetch theme names for top themes
  const getTopThemeNames = async (themeIds: string[], type: "positive" | "negative"): Promise<string[]> => {
    if (themeIds.length === 0) return [];
    
    // Count occurrences
    const counts = new Map<string, number>();
    themeIds.forEach((id) => counts.set(id, (counts.get(id) || 0) + 1));
    
    // Get top 5 theme IDs by frequency
    const topThemeIds = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);
    
    // Fetch theme names
    const { data: themes } = await supabase
      .from("sentiment_themes")
      .select("id, name")
      .eq("project_id", projectId)
      .eq("type", type)
      .in("id", topThemeIds);
    
    // Map IDs to names in frequency order
    const themeMap = new Map((themes || []).map(t => [t.id, t.name]));
    return topThemeIds.map(id => themeMap.get(id) || id).filter(Boolean);
  };

  const topStrengths = await getTopThemeNames(allPositiveThemeIds, "positive");
  const topWeaknesses = await getTopThemeNames(allNegativeThemeIds, "negative");

  return {
    entity_type: entityType,
    entity_name: data[0].entity_name,
    competitor_id: competitorId || null,
    total_evaluations: data.length,
    avg_sentiment_score: scoreCount > 0 ? totalScore / scoreCount : null,
    sentiment_distribution: distribution,
    top_strengths: topStrengths,
    top_weaknesses: topWeaknesses,
  };
}

// =============================================
// GET PROJECT TOPICS
// =============================================

/**
 * Get the extracted topics for a project
 */
export async function getProjectTopics(
  projectId: string
): Promise<{
  industry: string | null;
  topics: string[];
  topics_extracted_at: string | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("projects")
    .select("industry, extracted_topics, topics_extracted_at")
    .eq("id", projectId)
    .limit(1);

  if (error) {
    console.error("Error fetching project topics:", error);
    return { industry: null, topics: [], topics_extracted_at: null };
  }

  const project = data?.[0];

  return {
    industry: project?.industry || null,
    topics: (project?.extracted_topics as string[]) || [],
    topics_extracted_at: project?.topics_extracted_at || null,
  };
}

// =============================================
// TRIGGER WEBSITE ANALYSIS (Server Action)
// =============================================

/**
 * Trigger the brand website analysis function
 * This is a server action that can be called from the frontend
 */
export async function triggerWebsiteAnalysis(
  projectId: string,
  clientUrl: string,
  forceRefresh: boolean = false
): Promise<{ success: boolean; message: string }> {
  // This will be called via API to trigger the Inngest function
  // For now, we'll return a placeholder response
  // The actual trigger should go through the backend-orchestrator API

  try {
    const response = await fetch(
      `${process.env.BACKEND_ORCHESTRATOR_URL || "http://localhost:3000"}/api/trigger-website-analysis`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project_id: projectId,
          client_url: clientUrl,
          force_refresh: forceRefresh,
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to trigger website analysis");
    }

    return { success: true, message: "Website analysis triggered" };
  } catch (error) {
    console.error("Error triggering website analysis:", error);
    return { success: false, message: "Failed to trigger website analysis" };
  }
}

// =============================================
// COMPARISON HELPERS
// =============================================

/**
 * Compare brand sentiment with competitors on a specific topic
 */
export async function compareSentimentByTopic(
  projectId: string,
  topic: string
): Promise<
  Array<{
    entity_type: "brand" | "competitor";
    entity_name: string;
    competitor_id: string | null;
    sentiment: string | null;
    score: number | null;
    strengths: string[];
    weaknesses: string[];
  }>
> {
  const evaluations = await getBrandEvaluationsByTopic(projectId, topic);

  // Get latest evaluation for each entity
  const latestByEntity = new Map<
    string,
    {
      entity_type: "brand" | "competitor";
      entity_name: string;
      competitor_id: string | null;
      sentiment: string | null;
      score: number | null;
      strengths: string[];
      weaknesses: string[];
    }
  >();

  // Fetch theme names for all theme IDs
  const supabase = await createClient();
  const allThemeIds = new Set<string>();
  evaluations.forEach((eval_) => {
    if (eval_.positive_theme_ids) {
      eval_.positive_theme_ids.forEach((id: string) => allThemeIds.add(id));
    }
    if (eval_.negative_theme_ids) {
      eval_.negative_theme_ids.forEach((id: string) => allThemeIds.add(id));
    }
  });

  const { data: themes } = await supabase
    .from("sentiment_themes")
    .select("id, name, type")
    .eq("project_id", projectId)
    .in("id", Array.from(allThemeIds));

  const themeMap = new Map<string, string>((themes || []).map((t: { id: string; name: string }) => [t.id, t.name]));

  evaluations.forEach((eval_) => {
    const key =
      eval_.entity_type === "brand" ? "brand" : eval_.competitor_id || "";

    if (!latestByEntity.has(key)) {
      const strengths = (eval_.positive_theme_ids || []).map((id: string) => themeMap.get(id) || id).filter(Boolean) as string[];
      const weaknesses = (eval_.negative_theme_ids || []).map((id: string) => themeMap.get(id) || id).filter(Boolean) as string[];
      
      latestByEntity.set(key, {
        entity_type: eval_.entity_type,
        entity_name: eval_.entity_name,
        competitor_id: eval_.competitor_id,
        sentiment: null, // sentiment field removed, using sentiment_score only
        score: eval_.sentiment_score,
        strengths,
        weaknesses,
      });
    }
  });

  // Sort: brand first, then competitors by score
  return Array.from(latestByEntity.values()).sort((a, b) => {
    if (a.entity_type === "brand") return -1;
    if (b.entity_type === "brand") return 1;
    return (b.score || 0) - (a.score || 0);
  });
}

// =============================================
// STRATEGIC METRICS QUERIES
// =============================================

/**
 * Get topic performance matrix data for heatmap visualization
 * Returns aggregated sentiment scores by topic and entity
 */
export async function getTopicPerformanceMatrix(
  projectId: string,
  startDate?: Date,
  endDate?: Date
): Promise<
  Array<{
    topic: string;
    entity_name: string;
    entity_type: "brand" | "competitor";
    competitor_id: string | null;
    avg_sentiment_score: number;
    evaluation_count: number;
  }>
> {
  const supabase = await createClient();

  let query = supabase
    .from("brand_evaluations")
    .select("topic, entity_name, entity_type, competitor_id, sentiment_score, created_at")
    .eq("project_id", projectId);

  if (startDate) {
    query = query.gte("created_at", startDate.toISOString());
  }

  if (endDate) {
    const endDatePlusOne = new Date(endDate);
    endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
    endDatePlusOne.setMilliseconds(endDatePlusOne.getMilliseconds() - 1);
    query = query.lte("created_at", endDatePlusOne.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching topic performance matrix:", error);
    return [];
  }

  // Group by topic and entity
  const matrix = new Map<string, Map<string, { scores: number[]; count: number }>>();

  (data || []).forEach((eval_) => {
    if (eval_.sentiment_score === null) return;

    const topic = eval_.topic;
    const entityKey =
      eval_.entity_type === "brand"
        ? "brand"
        : `${eval_.competitor_id || eval_.entity_name}`;

    if (!matrix.has(topic)) {
      matrix.set(topic, new Map());
    }

    const topicMap = matrix.get(topic)!;
    if (!topicMap.has(entityKey)) {
      topicMap.set(entityKey, { scores: [], count: 0 });
    }

    const entityData = topicMap.get(entityKey)!;
    entityData.scores.push(eval_.sentiment_score);
    entityData.count++;
  });

  // Convert to array format
  const result: Array<{
    topic: string;
    entity_name: string;
    entity_type: "brand" | "competitor";
    competitor_id: string | null;
    avg_sentiment_score: number;
    evaluation_count: number;
  }> = [];

  matrix.forEach((topicMap, topic) => {
    // Get latest entity name for each entity
    const entityNames = new Map<string, { name: string; type: "brand" | "competitor"; competitor_id: string | null }>();

    (data || [])
      .filter((e) => e.topic === topic)
      .forEach((eval_) => {
        const entityKey =
          eval_.entity_type === "brand"
            ? "brand"
            : `${eval_.competitor_id || eval_.entity_name}`;

        if (!entityNames.has(entityKey)) {
          entityNames.set(entityKey, {
            name: eval_.entity_name,
            type: eval_.entity_type,
            competitor_id: eval_.competitor_id,
          });
        }
      });

    topicMap.forEach((entityData, entityKey) => {
      const entityInfo = entityNames.get(entityKey);
      if (entityInfo) {
        const avgScore =
          entityData.scores.reduce((sum, score) => sum + score, 0) /
          entityData.scores.length;

        result.push({
          topic,
          entity_name: entityInfo.name,
          entity_type: entityInfo.type,
          competitor_id: entityInfo.competitor_id,
          avg_sentiment_score: avgScore,
          evaluation_count: entityData.count,
        });
      }
    });
  });

  return result;
}

/**
 * Get topic sentiment trends over time
 * Returns sentiment scores by topic and date
 */
export async function getTopicSentimentTrends(
  projectId: string,
  topic?: string,
  entityType?: "brand" | "competitor",
  competitorId?: string,
  startDate?: Date,
  endDate?: Date,
  limitTopics: number = 10
): Promise<
  Array<{
    date: string;
    topic: string;
    avg_sentiment_score: number;
    evaluation_count: number;
  }>
> {
  const supabase = await createClient();

  let query = supabase
    .from("brand_evaluations")
    .select("topic, sentiment_score, created_at")
    .eq("project_id", projectId);

  if (topic) {
    query = query.eq("topic", topic);
  }

  if (entityType) {
    query = query.eq("entity_type", entityType);
  }

  if (competitorId) {
    query = query.eq("competitor_id", competitorId);
  }

  if (startDate) {
    query = query.gte("created_at", startDate.toISOString());
  }

  if (endDate) {
    const endDatePlusOne = new Date(endDate);
    endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
    endDatePlusOne.setMilliseconds(endDatePlusOne.getMilliseconds() - 1);
    query = query.lte("created_at", endDatePlusOne.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching topic sentiment trends:", error);
    return [];
  }

  // Group by date and topic
  const trends = new Map<string, Map<string, number[]>>();

  (data || []).forEach((eval_) => {
    if (eval_.sentiment_score === null) return;

    const date = format(new Date(eval_.created_at), "yyyy-MM-dd");
    const topicName = eval_.topic;

    if (!trends.has(date)) {
      trends.set(date, new Map());
    }

    const dateMap = trends.get(date)!;
    if (!dateMap.has(topicName)) {
      dateMap.set(topicName, []);
    }

    dateMap.get(topicName)!.push(eval_.sentiment_score);
  });

  // If no specific topic, get top topics by frequency
  const topicCounts = new Map<string, number>();
  (data || []).forEach((eval_) => {
    topicCounts.set(eval_.topic, (topicCounts.get(eval_.topic) || 0) + 1);
  });

  const topTopics = Array.from(topicCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limitTopics)
    .map(([topic]) => topic);

  // Convert to array format
  const result: Array<{
    date: string;
    topic: string;
    avg_sentiment_score: number;
    evaluation_count: number;
  }> = [];

  trends.forEach((dateMap, date) => {
    dateMap.forEach((scores, topicName) => {
      if (!topic || topicName === topic) {
        if (!topic && !topTopics.includes(topicName)) {
          return; // Skip if not in top topics
        }

        const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        result.push({
          date,
          topic: topicName,
          avg_sentiment_score: avgScore,
          evaluation_count: scores.length,
        });
      }
    });
  });

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get regional sentiment comparison
 * Returns average sentiment scores by region and entity
 */
export async function getRegionalSentimentComparison(
  projectId: string,
  topic?: string,
  startDate?: Date,
  endDate?: Date
): Promise<
  Array<{
    region: string;
    entity_name: string;
    entity_type: "brand" | "competitor";
    competitor_id: string | null;
    avg_sentiment_score: number;
    evaluation_count: number;
  }>
> {
  const supabase = await createClient();

  let query = supabase
    .from("brand_evaluations")
    .select("region, entity_name, entity_type, competitor_id, sentiment_score, created_at")
    .eq("project_id", projectId);

  if (topic) {
    query = query.eq("topic", topic);
  }

  if (startDate) {
    query = query.gte("created_at", startDate.toISOString());
  }

  if (endDate) {
    const endDatePlusOne = new Date(endDate);
    endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
    endDatePlusOne.setMilliseconds(endDatePlusOne.getMilliseconds() - 1);
    query = query.lte("created_at", endDatePlusOne.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching regional sentiment comparison:", error);
    return [];
  }

  // Group by region and entity
  const regional = new Map<string, Map<string, number[]>>();

  (data || []).forEach((eval_) => {
    if (eval_.sentiment_score === null) return;

    const region = eval_.region || "GLOBAL";
    const entityKey =
      eval_.entity_type === "brand"
        ? "brand"
        : `${eval_.competitor_id || eval_.entity_name}`;

    if (!regional.has(region)) {
      regional.set(region, new Map());
    }

    const regionMap = regional.get(region)!;
    if (!regionMap.has(entityKey)) {
      regionMap.set(entityKey, []);
    }

    regionMap.get(entityKey)!.push(eval_.sentiment_score);
  });

  // Convert to array format
  const result: Array<{
    region: string;
    entity_name: string;
    entity_type: "brand" | "competitor";
    competitor_id: string | null;
    avg_sentiment_score: number;
    evaluation_count: number;
  }> = [];

  const entityNames = new Map<string, { name: string; type: "brand" | "competitor"; competitor_id: string | null }>();

  (data || []).forEach((eval_) => {
    const entityKey =
      eval_.entity_type === "brand"
        ? "brand"
        : `${eval_.competitor_id || eval_.entity_name}`;

    if (!entityNames.has(entityKey)) {
      entityNames.set(entityKey, {
        name: eval_.entity_name,
        type: eval_.entity_type,
        competitor_id: eval_.competitor_id,
      });
    }
  });

  regional.forEach((regionMap, region) => {
    regionMap.forEach((scores, entityKey) => {
      const entityInfo = entityNames.get(entityKey);
      if (entityInfo) {
        const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

        result.push({
          region,
          entity_name: entityInfo.name,
          entity_type: entityInfo.type,
          competitor_id: entityInfo.competitor_id,
          avg_sentiment_score: avgScore,
          evaluation_count: scores.length,
        });
      }
    });
  });

  return result;
}

/**
 * Get attribute evolution over time
 * Returns frequency of attributes by date
 */
export async function getAttributeEvolution(
  projectId: string,
  topic?: string,
  attributeType: "positive" | "negative" | "both" = "both",
  startDate?: Date,
  endDate?: Date
): Promise<
  Array<{
    date: string;
    attribute: string;
    frequency: number;
    type: "positive" | "negative";
  }>
> {
  const supabase = await createClient();

  let query = supabase
    .from("brand_evaluations")
    .select("positive_theme_ids, negative_theme_ids, created_at, topic")
    .eq("project_id", projectId);

  if (topic) {
    query = query.eq("topic", topic);
  }

  if (startDate) {
    query = query.gte("created_at", startDate.toISOString());
  }

  if (endDate) {
    const endDatePlusOne = new Date(endDate);
    endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
    endDatePlusOne.setMilliseconds(endDatePlusOne.getMilliseconds() - 1);
    query = query.lte("created_at", endDatePlusOne.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching attribute evolution:", error);
    return [];
  }

  // Fetch all unique theme IDs and their names
  const allThemeIds = new Set<string>();
  (data || []).forEach((eval_) => {
    if (eval_.positive_theme_ids) {
      eval_.positive_theme_ids.forEach((id: string) => allThemeIds.add(id));
    }
    if (eval_.negative_theme_ids) {
      eval_.negative_theme_ids.forEach((id: string) => allThemeIds.add(id));
    }
  });

  const { data: themes } = await supabase
    .from("sentiment_themes")
    .select("id, name, type")
    .eq("project_id", projectId)
    .in("id", Array.from(allThemeIds));

  const themeMap = new Map((themes || []).map(t => [t.id, { name: t.name, type: t.type }]));

  // Group by date and theme
  const evolution = new Map<string, Map<string, { positive: number; negative: number }>>();

  (data || []).forEach((eval_) => {
    const date = format(new Date(eval_.created_at), "yyyy-MM-dd");

    if (!evolution.has(date)) {
      evolution.set(date, new Map());
    }

    const dateMap = evolution.get(date)!;

    // Process positive themes
    if (
      (attributeType === "positive" || attributeType === "both") &&
      eval_.positive_theme_ids
    ) {
      eval_.positive_theme_ids.forEach((themeId: string) => {
        const theme = themeMap.get(themeId);
        if (!theme) return;
        const themeName = theme.name;
        if (!dateMap.has(themeName)) {
          dateMap.set(themeName, { positive: 0, negative: 0 });
        }
        dateMap.get(themeName)!.positive++;
      });
    }

    // Process negative themes
    if (
      (attributeType === "negative" || attributeType === "both") &&
      eval_.negative_theme_ids
    ) {
      eval_.negative_theme_ids.forEach((themeId: string) => {
        const theme = themeMap.get(themeId);
        if (!theme) return;
        const themeName = theme.name;
        if (!dateMap.has(themeName)) {
          dateMap.set(themeName, { positive: 0, negative: 0 });
        }
        dateMap.get(themeName)!.negative++;
      });
    }
  });

  // Convert to array format
  const result: Array<{
    date: string;
    attribute: string;
    frequency: number;
    type: "positive" | "negative";
  }> = [];

  evolution.forEach((dateMap, date) => {
    dateMap.forEach((counts, attribute) => {
      if (attributeType === "positive" || attributeType === "both") {
        if (counts.positive > 0) {
          result.push({
            date,
            attribute,
            frequency: counts.positive,
            type: "positive",
          });
        }
      }

      if (attributeType === "negative" || attributeType === "both") {
        if (counts.negative > 0) {
          result.push({
            date,
            attribute,
            frequency: counts.negative,
            type: "negative",
          });
        }
      }
    });
  });

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get topic gap analysis - identifies topics where brand is behind competitors
 */
export async function getTopicGapAnalysis(
  projectId: string,
  startDate?: Date,
  endDate?: Date
): Promise<
  Array<{
    topic: string;
    brand_score: number;
    best_competitor_score: number;
    avg_competitor_score: number;
    gap: number;
    best_competitor_name: string;
  }>
> {
  const supabase = await createClient();

  let query = supabase
    .from("brand_evaluations")
    .select("topic, entity_type, entity_name, competitor_id, sentiment_score, created_at")
    .eq("project_id", projectId);

  if (startDate) {
    query = query.gte("created_at", startDate.toISOString());
  }

  if (endDate) {
    const endDatePlusOne = new Date(endDate);
    endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
    endDatePlusOne.setMilliseconds(endDatePlusOne.getMilliseconds() - 1);
    query = query.lte("created_at", endDatePlusOne.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching topic gap analysis:", error);
    return [];
  }

  // Group by topic and get latest scores
  const topicData = new Map<
    string,
    {
      brand: { score: number; count: number };
      competitors: Map<string, { name: string; score: number; count: number }>;
    }
  >();

  (data || []).forEach((eval_) => {
    if (eval_.sentiment_score === null) return;

    const topic = eval_.topic;

    if (!topicData.has(topic)) {
      topicData.set(topic, {
        brand: { score: 0, count: 0 },
        competitors: new Map(),
      });
    }

    const data = topicData.get(topic)!;

    if (eval_.entity_type === "brand") {
      data.brand.score += eval_.sentiment_score;
      data.brand.count++;
    } else {
      const compKey = eval_.competitor_id || eval_.entity_name;
      if (!data.competitors.has(compKey)) {
        data.competitors.set(compKey, {
          name: eval_.entity_name,
          score: 0,
          count: 0,
        });
      }

      const compData = data.competitors.get(compKey)!;
      compData.score += eval_.sentiment_score;
      compData.count++;
    }
  });

  // Calculate gaps
  const gaps: Array<{
    topic: string;
    brand_score: number;
    best_competitor_score: number;
    avg_competitor_score: number;
    gap: number;
    best_competitor_name: string;
  }> = [];

  topicData.forEach((data, topic) => {
    const brandAvg = data.brand.count > 0 ? data.brand.score / data.brand.count : 0;

    const competitorScores: number[] = [];
    let bestCompetitor = { name: "", score: -Infinity };

    data.competitors.forEach((compData) => {
      const avg = compData.count > 0 ? compData.score / compData.count : 0;
      competitorScores.push(avg);

      if (avg > bestCompetitor.score) {
        bestCompetitor = { name: compData.name, score: avg };
      }
    });

    const avgCompetitor =
      competitorScores.length > 0
        ? competitorScores.reduce((sum, score) => sum + score, 0) / competitorScores.length
        : 0;

    const gap = bestCompetitor.score - brandAvg;

    gaps.push({
      topic,
      brand_score: brandAvg,
      best_competitor_score: bestCompetitor.score !== -Infinity ? bestCompetitor.score : 0,
      avg_competitor_score: avgCompetitor,
      gap,
      best_competitor_name: bestCompetitor.name || "",
    });
  });

  // Sort by gap (largest gap first - topics where brand is most behind)
  return gaps.sort((a, b) => b.gap - a.gap);
}

/**
 * Get sentiment distribution data for histogram visualization
 */
export async function getSentimentDistribution(
  projectId: string,
  entityType?: "brand" | "competitor",
  competitorId?: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  brand_distribution: Array<{ score_range: string; count: number }>;
  competitor_distribution: Array<{ score_range: string; count: number }>;
}> {
  const supabase = await createClient();

  let query = supabase
    .from("brand_evaluations")
    .select("entity_type, competitor_id, sentiment_score, created_at")
    .eq("project_id", projectId);

  if (entityType) {
    query = query.eq("entity_type", entityType);
  }

  if (competitorId) {
    query = query.eq("competitor_id", competitorId);
  }

  if (startDate) {
    query = query.gte("created_at", startDate.toISOString());
  }

  if (endDate) {
    const endDatePlusOne = new Date(endDate);
    endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
    endDatePlusOne.setMilliseconds(endDatePlusOne.getMilliseconds() - 1);
    query = query.lte("created_at", endDatePlusOne.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching sentiment distribution:", error);
    return { brand_distribution: [], competitor_distribution: [] };
  }

  // Create bins for sentiment scores (-1 to 1, divided into 20 bins)
  const bins = 20;
  const binSize = 2 / bins; // from -1 to 1

  const brandBins = new Array(bins).fill(0).map((_, i) => ({
    score_range: `${(-1 + i * binSize).toFixed(2)} to ${(-1 + (i + 1) * binSize).toFixed(2)}`,
    count: 0,
  }));

  const competitorBins = new Array(bins).fill(0).map((_, i) => ({
    score_range: `${(-1 + i * binSize).toFixed(2)} to ${(-1 + (i + 1) * binSize).toFixed(2)}`,
    count: 0,
  }));

  (data || []).forEach((eval_) => {
    if (eval_.sentiment_score === null) return;

    const binIndex = Math.min(
      Math.floor((eval_.sentiment_score + 1) / binSize),
      bins - 1
    );

    if (eval_.entity_type === "brand") {
      brandBins[binIndex].count++;
    } else {
      competitorBins[binIndex].count++;
    }
  });

  return {
    brand_distribution: brandBins,
    competitor_distribution: competitorBins,
  };
}

/**
 * Get top performing topics with aggregated metrics
 */
export async function getTopPerformingTopics(
  projectId: string,
  startDate?: Date,
  endDate?: Date,
  limit: number = 10
): Promise<
  Array<{
    topic: string;
    avg_sentiment_score: number;
    evaluation_count: number;
    brand_score: number;
    best_competitor_score: number;
    competitive_advantage: number; // brand_score - best_competitor_score
    improvement_30d: number | null; // Change in score over last 30 days
  }>
> {
  const evaluations = await getBrandEvaluations(projectId, {
    startDate,
    endDate,
  });

  // Group by topic
  const topicMap = new Map<
    string,
    {
      brandScores: number[];
      competitorScores: number[];
      allScores: number[];
      dates: Map<string, number[]>; // date -> scores
    }
  >();

  evaluations.forEach((eval_) => {
    if (eval_.sentiment_score === null) return;

    const topic = eval_.topic;

    if (!topicMap.has(topic)) {
      topicMap.set(topic, {
        brandScores: [],
        competitorScores: [],
        allScores: [],
        dates: new Map(),
      });
    }

    const data = topicMap.get(topic)!;
    data.allScores.push(eval_.sentiment_score);

    const date = format(new Date(eval_.created_at), "yyyy-MM-dd");
    if (!data.dates.has(date)) {
      data.dates.set(date, []);
    }
    data.dates.get(date)!.push(eval_.sentiment_score);

    if (eval_.entity_type === "brand") {
      data.brandScores.push(eval_.sentiment_score);
    } else {
      data.competitorScores.push(eval_.sentiment_score);
    }
  });

  // Calculate metrics
  const results: Array<{
    topic: string;
    avg_sentiment_score: number;
    evaluation_count: number;
    brand_score: number;
    best_competitor_score: number;
    competitive_advantage: number;
    improvement_30d: number | null;
  }> = [];

  topicMap.forEach((data, topic) => {
    const avgScore =
      data.allScores.length > 0
        ? data.allScores.reduce((sum, score) => sum + score, 0) / data.allScores.length
        : 0;

    const brandAvg =
      data.brandScores.length > 0
        ? data.brandScores.reduce((sum, score) => sum + score, 0) / data.brandScores.length
        : 0;

    const competitorAvg =
      data.competitorScores.length > 0
        ? data.competitorScores.reduce((sum, score) => sum + score, 0) /
          data.competitorScores.length
        : 0;

    const competitive_advantage = brandAvg - competitorAvg;

    // Calculate improvement over last 30 days
    const sortedDates = Array.from(data.dates.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );

    let improvement30d: number | null = null;
    if (sortedDates.length >= 2) {
      const firstHalf = sortedDates.slice(0, Math.floor(sortedDates.length / 2));
      const secondHalf = sortedDates.slice(Math.floor(sortedDates.length / 2));

      const firstAvg =
        firstHalf.reduce((sum, [, scores]) => {
          const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
          return sum + avg;
        }, 0) / firstHalf.length;

      const secondAvg =
        secondHalf.reduce((sum, [, scores]) => {
          const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
          return sum + avg;
        }, 0) / secondHalf.length;

      improvement30d = secondAvg - firstAvg;
    }

    results.push({
      topic,
      avg_sentiment_score: avgScore,
      evaluation_count: data.allScores.length,
      brand_score: brandAvg,
      best_competitor_score: competitorAvg,
      competitive_advantage,
      improvement_30d: improvement30d,
    });
  });

  // Sort by competitive advantage (best first)
  return results.sort((a, b) => b.competitive_advantage - a.competitive_advantage).slice(0, limit);
}

/**
 * Get sentiment trends over time from brand_evaluations
 * Returns data in the same format as SentimentTrend from sentiment-analysis.ts
 */
export async function getSentimentTrendsFromEvaluations(
  projectId: string,
  entityType?: "brand" | "competitor",
  competitorId?: string,
  startDate?: Date,
  endDate?: Date
): Promise<
  Array<{
    date: string;
    positive: number;
    neutral: number;
    negative: number;
    totalAnalyses: number;
    averageSentiment: number;
  }>
> {
  const supabase = await createClient();

  let query = supabase
    .from("brand_evaluations")
    .select("sentiment_score, total_positive_attributes, total_negative_attributes, created_at")
    .eq("project_id", projectId);

  if (entityType) {
    query = query.eq("entity_type", entityType);
  }

  if (competitorId) {
    query = query.eq("competitor_id", competitorId);
  }

  if (startDate) {
    query = query.gte("created_at", startDate.toISOString());
  }

  if (endDate) {
    const endDatePlusOne = new Date(endDate);
    endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
    endDatePlusOne.setMilliseconds(endDatePlusOne.getMilliseconds() - 1);
    query = query.lte("created_at", endDatePlusOne.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching sentiment trends from evaluations:", error);
    return [];
  }

  // Group by date
  const trendMap = new Map<
    string,
    {
      positive: number;
      neutral: number;
      negative: number;
      mixed: number;
      totalAnalyses: number;
      sentimentSum: number;
    }
  >();

  (data || []).forEach((eval_) => {
    const date = format(new Date(eval_.created_at), "yyyy-MM-dd");

    if (!trendMap.has(date)) {
      trendMap.set(date, {
        positive: 0,
        neutral: 0,
        negative: 0,
        mixed: 0,
        totalAnalyses: 0,
        sentimentSum: 0,
      });
    }

    const dayData = trendMap.get(date)!;
    dayData.totalAnalyses++;

    // Sum attribute counts instead of counting evaluations by sentiment
    dayData.positive += eval_.total_positive_attributes || 0;
    dayData.negative += eval_.total_negative_attributes || 0;
    dayData.neutral = 0; // Only count attributes

    // Convert sentiment_score from -1..1 to 0..1 range for average calculation
    if (eval_.sentiment_score !== null) {
      const normalizedSentiment = (eval_.sentiment_score + 1) / 2;
      dayData.sentimentSum += normalizedSentiment;
    } else {
      // Default to 0.5 (neutral) if no score
      dayData.sentimentSum += 0.5;
    }

    trendMap.set(date, dayData);
  });

  // Convert to array format matching SentimentTrend interface
  return Array.from(trendMap.entries())
    .map(([date, metrics]) => ({
      date,
      positive: metrics.positive,
      neutral: metrics.neutral + metrics.mixed, // Combine mixed with neutral for consistency
      negative: metrics.negative,
      totalAnalyses: metrics.totalAnalyses,
      averageSentiment:
        metrics.totalAnalyses > 0 ? metrics.sentimentSum / metrics.totalAnalyses : 0.5,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get entity sentiments from brand_evaluations (equivalent to getEntitySentiments but using brand_evaluations)
 */
export async function getEntitySentimentsFromEvaluations(
  projectId: string,
  startDate?: Date,
  endDate?: Date
): Promise<
  Array<{
    entityName: string;
    entityDomain: string;
    analysisType: "brand" | "competitor";
    totalMentions: number;
    averageSentiment: number;
    sentimentLabel: "positive" | "neutral" | "negative";
    confidenceScore: number;
    positiveCount: number;
    neutralCount: number;
    negativeCount: number;
    topPositiveAttributes: Array<{ name: string; count: number }>;
    topNegativeAttributes: Array<{ name: string; count: number }>;
    recentAnalyses: Array<{
      id: string;
      analyzedText: string;
      overallSentiment: number;
      sentimentLabel: string;
      aiReasoning: string;
      createdAt: string;
      platform: string;
    }>;
  }>
> {
  const supabase = await createClient();

  let query = supabase
    .from("brand_evaluations")
    .select("id, entity_name, entity_type, competitor_id, sentiment_score, positive_theme_ids, negative_theme_ids, total_positive_attributes, total_negative_attributes, natural_response, created_at")
    .eq("project_id", projectId);

  if (startDate) {
    query = query.gte("created_at", startDate.toISOString());
  }

  if (endDate) {
    const endDatePlusOne = new Date(endDate);
    endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
    endDatePlusOne.setMilliseconds(endDatePlusOne.getMilliseconds() - 1);
    query = query.lte("created_at", endDatePlusOne.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching entity sentiments from evaluations:", error);
    return [];
  }

  // Group by entity
  const entityMap = new Map<string, any[]>();

  (data || []).forEach((eval_) => {
    const entityKey =
      eval_.entity_type === "brand"
        ? "brand"
        : `${eval_.competitor_id || eval_.entity_name}`;

    if (!entityMap.has(entityKey)) {
      entityMap.set(entityKey, []);
    }
    entityMap.get(entityKey)!.push(eval_);
  });

  // Fetch all unique theme IDs and their names upfront
  const allThemeIds = new Set<string>();
  Array.from(entityMap.values()).forEach((evaluations) => {
    evaluations.forEach((e: any) => {
      if (e.positive_theme_ids) {
        e.positive_theme_ids.forEach((id: string) => allThemeIds.add(id));
      }
      if (e.negative_theme_ids) {
        e.negative_theme_ids.forEach((id: string) => allThemeIds.add(id));
      }
    });
  });

  const themeSupabase = await createClient();
  const { data: themes } = await themeSupabase
    .from("sentiment_themes")
    .select("id, name")
    .eq("project_id", projectId)
    .in("id", Array.from(allThemeIds));

  const themeMap = new Map<string, string>((themes || []).map((t: { id: string; name: string }) => [t.id, t.name]));

  // Process each entity
  return Array.from(entityMap.entries()).map(([key, evaluations]) => {
    const firstEval = evaluations[0];
    const entityName = firstEval.entity_name || "Unknown";
    const totalEvaluations = evaluations.length;

    // Calculate sentiment distribution by summing attribute counts
    const positiveCount = evaluations.reduce((sum, e) => sum + (e.total_positive_attributes || 0), 0);
    const negativeCount = evaluations.reduce((sum, e) => sum + (e.total_negative_attributes || 0), 0);
    const neutralCount = 0; // Only count attributes, not neutral evaluations

    // Calculate average sentiment (convert from -1..1 to 0..1)
    const scores = evaluations
      .map((e) => e.sentiment_score)
      .filter((s) => s !== null) as number[];
    const averageSentiment =
      scores.length > 0
        ? scores.reduce((sum, score) => sum + (score + 1) / 2, 0) / scores.length
        : 0.5;

    // Determine sentiment label
    let sentimentLabel: "positive" | "neutral" | "negative" = "neutral";
    if (averageSentiment >= 0.6) sentimentLabel = "positive";
    else if (averageSentiment <= 0.4) sentimentLabel = "negative";

    // Extract top theme IDs and fetch their names
    const allPositiveThemeIds = evaluations.flatMap((e) => e.positive_theme_ids || []);
    const allNegativeThemeIds = evaluations.flatMap((e) => e.negative_theme_ids || []);

    // Count theme ID occurrences
    const positiveThemeIdCounts = new Map<string, number>();
    allPositiveThemeIds.forEach((id: string) => {
      positiveThemeIdCounts.set(id, (positiveThemeIdCounts.get(id) || 0) + 1);
    });
    const negativeThemeIdCounts = new Map<string, number>();
    allNegativeThemeIds.forEach((id: string) => {
      negativeThemeIdCounts.set(id, (negativeThemeIdCounts.get(id) || 0) + 1);
    });

    // Get top theme IDs with counts
    const topPositiveThemeIdsWithCounts = Array.from(positiveThemeIdCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const topNegativeThemeIdsWithCounts = Array.from(negativeThemeIdCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Map theme IDs to names using pre-fetched themeMap, keeping counts
    const topPositiveAttributes = topPositiveThemeIdsWithCounts
      .map(([id, count]) => ({ name: themeMap.get(id) || id, count }))
      .filter((attr) => attr.name);
    const topNegativeAttributes = topNegativeThemeIdsWithCounts
      .map(([id, count]) => ({ name: themeMap.get(id) || id, count }))
      .filter((attr) => attr.name);

    // Get recent evaluations
    const recentAnalyses = evaluations
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map((e) => ({
        id: e.id,
        analyzedText: e.natural_response || "",
        overallSentiment: e.sentiment_score !== null ? (e.sentiment_score + 1) / 2 : 0.5,
        sentimentLabel: e.sentiment_score !== null ? (e.sentiment_score >= 0.5 ? "positive" : e.sentiment_score <= -0.5 ? "negative" : "neutral") : "neutral",
        aiReasoning: "gemini-2.5-flash-lite",
        createdAt: e.created_at,
        platform: "gemini",
      }));

    // Get competitor info if it's a competitor
    let entityDomain = "";
    if (firstEval.entity_type === "competitor" && firstEval.competitor_id) {
      // We could fetch competitor domain here if needed, but for now leave empty
      // or fetch it in a separate query if required
    }

    return {
      entityName,
      entityDomain,
      analysisType: firstEval.entity_type,
      totalMentions: totalEvaluations,
      averageSentiment,
      sentimentLabel,
      confidenceScore: scores.length > 0 ? 0.8 : 0.5, // Placeholder confidence
      positiveCount,
      neutralCount, // Only count attributes, not neutral evaluations
      negativeCount,
      topPositiveAttributes,
      topNegativeAttributes,
      recentAnalyses,
    };
  });
}

/**
 * Get attribute breakdown from brand_evaluations (equivalent to getAttributeBreakdown but using brand_evaluations)
 */
export async function getAttributeBreakdownFromEvaluations(
  projectId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  brandAttributes: {
    positive: Array<{ attribute: string; count: number; percentage: number }>;
    neutral: Array<{ attribute: string; count: number; percentage: number }>;
    negative: Array<{ attribute: string; count: number; percentage: number }>;
  };
  competitorAttributes: {
    positive: Array<{ attribute: string; count: number; percentage: number }>;
    neutral: Array<{ attribute: string; count: number; percentage: number }>;
    negative: Array<{ attribute: string; count: number; percentage: number }>;
  };
}> {
  const supabase = await createClient();

  let query = supabase
    .from("brand_evaluations")
    .select("entity_type, competitor_id, positive_theme_ids, negative_theme_ids, sentiment")
    .eq("project_id", projectId);

  if (startDate) {
    query = query.gte("created_at", startDate.toISOString());
  }

  if (endDate) {
    const endDatePlusOne = new Date(endDate);
    endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
    endDatePlusOne.setMilliseconds(endDatePlusOne.getMilliseconds() - 1);
    query = query.lte("created_at", endDatePlusOne.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching attribute breakdown from evaluations:", error);
    return {
      brandAttributes: { positive: [], neutral: [], negative: [] },
      competitorAttributes: { positive: [], neutral: [], negative: [] },
    };
  }

  // Fetch all theme IDs and their names
  const allThemeIds = new Set<string>();
  (data || []).forEach((eval_) => {
    if (eval_.positive_theme_ids) {
      eval_.positive_theme_ids.forEach((id: string) => allThemeIds.add(id));
    }
    if (eval_.negative_theme_ids) {
      eval_.negative_theme_ids.forEach((id: string) => allThemeIds.add(id));
    }
  });

  const themeSupabase = await createClient();
  const { data: themes } = await themeSupabase
    .from("sentiment_themes")
    .select("id, name, type")
    .eq("project_id", projectId)
    .in("id", Array.from(allThemeIds));

  const themeMap = new Map<string, { name: string; type: string }>((themes || []).map((t: { id: string; name: string; type: string }) => [t.id, { name: t.name, type: t.type }]));

  const processAttributes = (
    evaluations: any[],
    type: "positive" | "negative"
  ) => {
    const frequencyMap = new Map<string, number>();
    const totalCount = evaluations.length;

    evaluations.forEach((eval_) => {
      const themeIds = eval_[`${type}_theme_ids`] || [];
      if (Array.isArray(themeIds)) {
        themeIds.forEach((themeId: string) => {
          const theme = themeMap.get(themeId);
          if (!theme || theme.type !== type) return;
          const attribute = theme.name;
          frequencyMap.set(attribute, (frequencyMap.get(attribute) || 0) + 1);
        });
      }
    });

    return Array.from(frequencyMap.entries())
      .map(([attribute, count]) => ({
        attribute,
        count,
        percentage: totalCount > 0 ? (count / totalCount) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  const brandEvaluations = (data || []).filter((e) => e.entity_type === "brand");
  const competitorEvaluations = (data || []).filter((e) => e.entity_type === "competitor");

  // For neutral attributes, we can use attributes from neutral sentiment evaluations
  const getNeutralAttributes = (evaluations: any[]) => {
    // Filter evaluations with neutral sentiment_score (between -0.5 and 0.5)
    const neutralEvals = evaluations.filter((e) => {
      if (e.sentiment_score === null) return true;
      return e.sentiment_score >= -0.5 && e.sentiment_score <= 0.5;
    });
    return processAttributes(neutralEvals, "positive"); // Use positive attributes from neutral sentiment
  };

  return {
    brandAttributes: {
      positive: processAttributes(brandEvaluations, "positive") as any,
      neutral: getNeutralAttributes(brandEvaluations) as any,
      negative: processAttributes(brandEvaluations, "negative") as any,
    },
    competitorAttributes: {
      positive: processAttributes(competitorEvaluations, "positive") as any,
      neutral: getNeutralAttributes(competitorEvaluations) as any,
      negative: processAttributes(competitorEvaluations, "negative") as any,
    },
  };
}

/**
 * Get source quality metrics - analyze domains used in evaluations
 */
export async function getSourceQualityMetrics(
  projectId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  top_domains: Array<{ domain: string; frequency: number; percentage: number }>;
  unique_domain_count: number;
  total_evaluations: number;
  diversity_score: number; // unique domains / total evaluations
}> {
  const supabase = await createClient();

  let query = supabase
    .from("brand_evaluations")
    .select("url_sources, created_at")
    .eq("project_id", projectId);

  if (startDate) {
    query = query.gte("created_at", startDate.toISOString());
  }

  if (endDate) {
    const endDatePlusOne = new Date(endDate);
    endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
    endDatePlusOne.setMilliseconds(endDatePlusOne.getMilliseconds() - 1);
    query = query.lte("created_at", endDatePlusOne.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching source quality metrics:", error);
    return {
      top_domains: [],
      unique_domain_count: 0,
      total_evaluations: 0,
      diversity_score: 0,
    };
  }

  const domainCounts = new Map<string, number>();
  let totalEvaluations = 0;

  (data || []).forEach((eval_) => {
    totalEvaluations++;

    // Extract domains from url_sources
    if (eval_.url_sources && Array.isArray(eval_.url_sources)) {
      eval_.url_sources.forEach((url: string) => {
        try {
          const urlObj = new URL(url);
          const domain = urlObj.hostname.replace(/^www\./, '');
          domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
        } catch {
          // If URL parsing fails, skip
        }
      });
    }
  });

  const uniqueDomainCount = domainCounts.size;
  const diversityScore = totalEvaluations > 0 ? uniqueDomainCount / totalEvaluations : 0;

  // Get top domains
  const topDomains = Array.from(domainCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([domain, frequency]) => ({
      domain,
      frequency,
      percentage: totalEvaluations > 0 ? (frequency / totalEvaluations) * 100 : 0,
    }));

  return {
    top_domains: topDomains,
    unique_domain_count: uniqueDomainCount,
    total_evaluations: totalEvaluations,
    diversity_score: diversityScore,
  };
}

/**
 * Get theme frequency matrix for competitive positioning
 * Returns theme frequencies (how often each theme appears) by entity
 */
export async function getThemeFrequencyMatrix(
  projectId: string,
  startDate?: Date,
  endDate?: Date
): Promise<
  Array<{
    theme_name: string;
    theme_category: "positive" | "negative";
    entity_name: string;
    entity_type: "brand" | "competitor";
    competitor_id: string | null;
    frequency: number; // How many times this theme appears for this entity
    total_evaluations: number; // Total evaluations for this entity
  }>
> {
  const supabase = await createClient();

  // First, get all themes for this project
  const { data: themes, error: themesError } = await supabase
    .from("sentiment_themes")
    .select("id, name, type")
    .eq("project_id", projectId);

  if (themesError) {
    console.error("Error fetching themes:", themesError);
    return [];
  }

  if (!themes || themes.length === 0) {
    return [];
  }

  // Create theme map
  const themeMap = new Map<string, { name: string; category: "positive" | "negative" }>();
  themes.forEach((theme) => {
    themeMap.set(theme.id, {
      name: theme.name,
      category: theme.type as "positive" | "negative",
    });
  });

  // Get all evaluations
  let query = supabase
    .from("brand_evaluations")
    .select("entity_name, entity_type, competitor_id, positive_theme_ids, negative_theme_ids, created_at")
    .eq("project_id", projectId);

  if (startDate) {
    query = query.gte("created_at", startDate.toISOString());
  }

  if (endDate) {
    const endDatePlusOne = new Date(endDate);
    endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
    endDatePlusOne.setMilliseconds(endDatePlusOne.getMilliseconds() - 1);
    query = query.lte("created_at", endDatePlusOne.toISOString());
  }

  const { data: evaluations, error: evaluationsError } = await query;

  if (evaluationsError) {
    console.error("Error fetching evaluations:", evaluationsError);
    return [];
  }

  // Count theme frequencies by entity
  const frequencyMap = new Map<
    string,
    Map<
      string,
      {
        frequency: number;
        totalEvaluations: number;
        entityName: string;
        entityType: "brand" | "competitor";
        competitorId: string | null;
      }
    >
  >();

  // First pass: count total evaluations per entity
  const entityEvaluationCounts = new Map<string, number>();
  (evaluations || []).forEach((eval_) => {
    const entityKey =
      eval_.entity_type === "brand"
        ? "brand"
        : `${eval_.competitor_id || eval_.entity_name}`;
    entityEvaluationCounts.set(entityKey, (entityEvaluationCounts.get(entityKey) || 0) + 1);
  });

  // Debug logging
  console.log(`[getThemeFrequencyMatrix] Found ${themes?.length || 0} themes for project ${projectId}`);
  console.log(`[getThemeFrequencyMatrix] Found ${evaluations?.length || 0} evaluations`);
  
  // Second pass: count theme frequencies
  let unmatchedThemeIds = new Set<string>();
  (evaluations || []).forEach((eval_) => {
    const entityKey =
      eval_.entity_type === "brand"
        ? "brand"
        : `${eval_.competitor_id || eval_.entity_name}`;

    // Count positive themes
    if (eval_.positive_theme_ids && Array.isArray(eval_.positive_theme_ids)) {
      eval_.positive_theme_ids.forEach((themeId: string) => {
        // Validate that themeId is a valid string
        if (!themeId || typeof themeId !== 'string') {
          console.warn(`[getThemeFrequencyMatrix] Invalid theme ID:`, themeId, { projectId, entityKey });
          return;
        }
        const theme = themeMap.get(themeId);
        if (theme) {
          const themeKey = `${theme.name}|${theme.category}`;
          if (!frequencyMap.has(themeKey)) {
            frequencyMap.set(themeKey, new Map());
          }
          const themeMap_ = frequencyMap.get(themeKey)!;
          if (!themeMap_.has(entityKey)) {
            themeMap_.set(entityKey, {
              frequency: 0,
              totalEvaluations: entityEvaluationCounts.get(entityKey) || 0,
              entityName: eval_.entity_name,
              entityType: eval_.entity_type,
              competitorId: eval_.competitor_id,
            });
          }
          const entityData = themeMap_.get(entityKey)!;
          entityData.frequency++;
        } else {
          unmatchedThemeIds.add(themeId);
        }
      });
    }

    // Count negative themes
    if (eval_.negative_theme_ids && Array.isArray(eval_.negative_theme_ids)) {
      eval_.negative_theme_ids.forEach((themeId: string) => {
        // Validate that themeId is a valid string
        if (!themeId || typeof themeId !== 'string') {
          console.warn(`[getThemeFrequencyMatrix] Invalid theme ID:`, themeId, { projectId, entityKey });
          return;
        }
        const theme = themeMap.get(themeId);
        if (theme) {
          const themeKey = `${theme.name}|${theme.category}`;
          if (!frequencyMap.has(themeKey)) {
            frequencyMap.set(themeKey, new Map());
          }
          const themeMap_ = frequencyMap.get(themeKey)!;
          if (!themeMap_.has(entityKey)) {
            themeMap_.set(entityKey, {
              frequency: 0,
              totalEvaluations: entityEvaluationCounts.get(entityKey) || 0,
              entityName: eval_.entity_name,
              entityType: eval_.entity_type,
              competitorId: eval_.competitor_id,
            });
          }
          const entityData = themeMap_.get(entityKey)!;
          entityData.frequency++;
        } else {
          unmatchedThemeIds.add(themeId);
        }
      });
    }
  });

  // Log unmatched theme IDs for debugging
  if (unmatchedThemeIds.size > 0) {
    console.warn(`[getThemeFrequencyMatrix] Found ${unmatchedThemeIds.size} unmatched theme IDs:`, Array.from(unmatchedThemeIds));
  }

  // Convert to array format
  const result: Array<{
    theme_name: string;
    theme_category: "positive" | "negative";
    entity_name: string;
    entity_type: "brand" | "competitor";
    competitor_id: string | null;
    frequency: number;
    total_evaluations: number;
  }> = [];

  frequencyMap.forEach((entityMap, themeKey) => {
    const [themeName, themeCategory] = themeKey.split("|");
    entityMap.forEach((entityData) => {
      result.push({
        theme_name: themeName,
        theme_category: themeCategory as "positive" | "negative",
        entity_name: entityData.entityName,
        entity_type: entityData.entityType,
        competitor_id: entityData.competitorId,
        frequency: entityData.frequency,
        total_evaluations: entityData.totalEvaluations,
      });
    });
  });

  console.log(`[getThemeFrequencyMatrix] Returning ${result.length} theme frequency entries`);
  return result;
}

// =============================================
// GET THEMES WITH METRICS
// =============================================

export interface ThemeWithMetrics {
  theme_id: string;
  theme_name: string;
  sentiment: "positive" | "negative";
  occurrences: number;
  previous_occurrences: number;
  change: number;
  change_percentage: number | null;
}

/**
 * Get all themes with their occurrences and trend calculations
 * @param entityFilter Optional filter by entity: { entityType: "brand" | "competitor", competitorId?: string }
 */
export async function getThemesWithMetrics(
  projectId: string,
  startDate?: Date,
  endDate?: Date,
  previousStartDate?: Date,
  previousEndDate?: Date,
  entityFilter?: { entityType: "brand" | "competitor"; competitorId?: string | null }
): Promise<ThemeWithMetrics[]> {
  const supabase = await createClient();

  // Get all themes for this project
  const { data: themes, error: themesError } = await supabase
    .from("sentiment_themes")
    .select("id, name, type")
    .eq("project_id", projectId);

  if (themesError) {
    console.error("Error fetching themes:", themesError);
    return [];
  }

  if (!themes || themes.length === 0) {
    return [];
  }

  // Get all evaluations for the project (we'll filter in memory for efficiency with GIN indexes)
  const getAllEvaluations = async (start?: Date, end?: Date) => {
    let query = supabase
      .from("brand_evaluations")
      .select("positive_theme_ids, negative_theme_ids, created_at, entity_type, competitor_id")
      .eq("project_id", projectId);

    // Apply entity filter if provided
    if (entityFilter) {
      query = query.eq("entity_type", entityFilter.entityType);
      if (entityFilter.entityType === "competitor" && entityFilter.competitorId) {
        query = query.eq("competitor_id", entityFilter.competitorId);
      }
    }

    if (start) {
      query = query.gte("created_at", start.toISOString());
    }
    if (end) {
      const endDatePlusOne = new Date(end);
      endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
      endDatePlusOne.setMilliseconds(endDatePlusOne.getMilliseconds() - 1);
      query = query.lte("created_at", endDatePlusOne.toISOString());
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching evaluations:", error);
      return [];
    }
    return data || [];
  };

  // Helper function to count occurrences for a theme in evaluations
  const countOccurrences = (evaluations: any[], themeId: string): number => {
    return evaluations.filter((eval_) => {
      const inPositive =
        Array.isArray(eval_.positive_theme_ids) &&
        eval_.positive_theme_ids.includes(themeId);
      const inNegative =
        Array.isArray(eval_.negative_theme_ids) &&
        eval_.negative_theme_ids.includes(themeId);
      return inPositive || inNegative;
    }).length;
  };

  // Fetch evaluations for current and previous periods
  const [currentEvaluations, previousEvaluations] = await Promise.all([
    getAllEvaluations(startDate, endDate),
    previousStartDate && previousEndDate
      ? getAllEvaluations(previousStartDate, previousEndDate)
      : Promise.resolve([]),
  ]);

  // Calculate metrics for each theme
  const themesWithMetrics: ThemeWithMetrics[] = themes.map((theme) => {
    const occurrences = countOccurrences(currentEvaluations, theme.id);
    const previousOccurrences = countOccurrences(previousEvaluations, theme.id);

    const change = occurrences - previousOccurrences;
    const changePercentage =
      previousOccurrences > 0
        ? ((change / previousOccurrences) * 100)
        : null;

    return {
      theme_id: theme.id,
      theme_name: theme.name,
      sentiment: theme.type as "positive" | "negative",
      occurrences,
      previous_occurrences: previousOccurrences,
      change,
      change_percentage: changePercentage,
    };
  });

  // Sort by occurrences descending
  return themesWithMetrics.sort((a, b) => b.occurrences - a.occurrences);
}

// =============================================
// GET EVALUATIONS BY THEME
// =============================================

export interface EvaluationByTheme {
  id: string;
  evaluation_prompt: string;
  response_text: string | null;
  natural_response: string | null;
  query_search: string[] | null;
  url_sources: string[] | null;
  uri_sources: string[] | null;
  topic: string;
  entity_name: string;
  entity_type: "brand" | "competitor";
  competitor_id: string | null;
  sentiment: string | null;
  sentiment_score: number | null;
  created_at: string;
  is_positive_theme: boolean;
}

/**
 * Get evaluations that mention a specific theme for the gallery
 */
export async function getEvaluationsByTheme(
  themeId: string,
  projectId: string,
  startDate?: Date,
  endDate?: Date,
  limit: number = 50,
  offset: number = 0
): Promise<EvaluationByTheme[]> {
  const supabase = await createClient();

  // Fetch all evaluations and filter in memory (more efficient with GIN indexes)
  let query = supabase
    .from("brand_evaluations")
    .select(
      "id, evaluation_prompt, response_text, natural_response, query_search, url_sources, uri_sources, topic, entity_name, entity_type, competitor_id, sentiment, sentiment_score, created_at, positive_theme_ids, negative_theme_ids"
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (startDate) {
    query = query.gte("created_at", startDate.toISOString());
  }
  if (endDate) {
    const endDatePlusOne = new Date(endDate);
    endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
    endDatePlusOne.setMilliseconds(endDatePlusOne.getMilliseconds() - 1);
    query = query.lte("created_at", endDatePlusOne.toISOString());
  }

  const { data: allEvaluations, error } = await query;

  if (error) {
    console.error("Error fetching evaluations by theme:", error);
    return [];
  }

  if (!allEvaluations) {
    return [];
  }

  // Filter evaluations that contain the theme
  const filteredEvaluations = allEvaluations.filter((eval_) => {
    const inPositive =
      Array.isArray(eval_.positive_theme_ids) &&
      eval_.positive_theme_ids.includes(themeId);
    const inNegative =
      Array.isArray(eval_.negative_theme_ids) &&
      eval_.negative_theme_ids.includes(themeId);
    return inPositive || inNegative;
  });

  // Apply pagination
  const paginatedEvaluations = filteredEvaluations.slice(offset, offset + limit);

  // Map to the return type and determine if theme is positive
  return paginatedEvaluations.map((eval_) => {
    const isPositiveTheme =
      Array.isArray(eval_.positive_theme_ids) &&
      eval_.positive_theme_ids.includes(themeId);

    return {
      id: eval_.id,
      evaluation_prompt: eval_.evaluation_prompt,
      response_text: eval_.response_text,
      natural_response: eval_.natural_response,
      query_search: eval_.query_search,
      url_sources: eval_.url_sources,
      uri_sources: eval_.uri_sources,
      topic: eval_.topic,
      entity_name: eval_.entity_name,
      entity_type: eval_.entity_type,
      competitor_id: eval_.competitor_id,
      sentiment: eval_.sentiment,
      sentiment_score: eval_.sentiment_score,
      created_at: eval_.created_at,
      is_positive_theme: isPositiveTheme,
    };
  });
}

