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
  sentiment: "positive" | "neutral" | "negative" | "mixed" | null;
  sentiment_score: number | null;
  attributes: {
    strengths?: string[];
    weaknesses?: string[];
    attributes?: string[];
    summary?: string;
  };
  natural_response: string | null;
  region: string | null;
  query_search: string[] | null;
  domains: string[] | null;
  platform: string;
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
    .select("created_at, sentiment, sentiment_score")
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
    sentiment: item.sentiment,
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
      .select("sentiment, sentiment_score")
      .eq("project_id", projectId)
      .eq("entity_type", "brand")
      .eq("topic", topic)
      .order("created_at", { ascending: false })
      .limit(1);

    // Get latest competitor evaluations for this topic
    const { data: competitorEvals } = await supabase
      .from("brand_evaluations")
      .select("competitor_id, entity_name, sentiment, sentiment_score, created_at")
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
          sentiment: eval_.sentiment,
          score: eval_.sentiment_score,
        });
      }
    });

    summaries.push({
      topic,
      brand_sentiment: brandEval?.[0]?.sentiment || null,
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
    .select("entity_name, sentiment, sentiment_score, attributes")
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

  // Calculate sentiment distribution
  const distribution = { positive: 0, neutral: 0, negative: 0, mixed: 0 };
  let totalScore = 0;
  let scoreCount = 0;
  const allStrengths: string[] = [];
  const allWeaknesses: string[] = [];

  data.forEach((eval_) => {
    if (eval_.sentiment) {
      distribution[eval_.sentiment as keyof typeof distribution]++;
    }
    if (eval_.sentiment_score !== null) {
      totalScore += eval_.sentiment_score;
      scoreCount++;
    }
    if (eval_.attributes?.strengths) {
      allStrengths.push(...eval_.attributes.strengths);
    }
    if (eval_.attributes?.weaknesses) {
      allWeaknesses.push(...eval_.attributes.weaknesses);
    }
  });

  // Get top strengths and weaknesses by frequency
  const countOccurrences = (arr: string[]) => {
    const counts = new Map<string, number>();
    arr.forEach((item) => counts.set(item, (counts.get(item) || 0) + 1));
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([item]) => item);
  };

  return {
    entity_type: entityType,
    entity_name: data[0].entity_name,
    competitor_id: competitorId || null,
    total_evaluations: data.length,
    avg_sentiment_score: scoreCount > 0 ? totalScore / scoreCount : null,
    sentiment_distribution: distribution,
    top_strengths: countOccurrences(allStrengths),
    top_weaknesses: countOccurrences(allWeaknesses),
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

  evaluations.forEach((eval_) => {
    const key =
      eval_.entity_type === "brand" ? "brand" : eval_.competitor_id || "";

    if (!latestByEntity.has(key)) {
      latestByEntity.set(key, {
        entity_type: eval_.entity_type,
        entity_name: eval_.entity_name,
        competitor_id: eval_.competitor_id,
        sentiment: eval_.sentiment,
        score: eval_.sentiment_score,
        strengths: eval_.attributes?.strengths || [],
        weaknesses: eval_.attributes?.weaknesses || [],
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

