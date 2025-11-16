"use server";

import { createClient } from "@/lib/supabase/server";

// =============================================
// QUICK LOOK METRICS (REAL DATA)
// =============================================

/**
 * Get Quick Look Metrics using REAL data from AI analysis
 * - Total Citation Pages: Unique AI responses mentioning the brand
 * - My Pages Cited: Count of citations across all platforms
 * - Domains Mentioning Me: Unique platforms citing the brand
 * - Your Domain Rating: Sentiment-based score (0-100)
 */
export async function getQuickLookMetrics(projectId: string) {
  const supabase = await createClient();

  // Execute all queries in parallel for better performance
  const [
    responsesWithCitationsResult,
    myPagesCitedResult,
    platformsResult,
    sentimentsResult
  ] = await Promise.all([
    // Total Citation Pages - count DISTINCT ai_response_id from citations
    supabase
      .from("citations_detail")
      .select("ai_response_id")
      .eq("project_id", projectId),
    
    // My Pages Cited - total citations
    supabase
      .from("citations_detail")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId),
    
    // Domains Mentioning Me - unique platforms
    supabase
      .from("ai_responses")
      .select("platform")
      .eq("project_id", projectId)
      .eq("status", "success"),
    
    // Sentiments for rating calculation
    supabase
      .from("citations_detail")
      .select("sentiment")
      .eq("project_id", projectId)
  ]);

  // Total Citation Pages - count unique responses with citations
  const uniqueResponses = new Set(
    responsesWithCitationsResult.data?.map((c) => c.ai_response_id) || []
  );
  const totalCitationPages = uniqueResponses.size;

  // My Pages Cited
  const myPagesCited = myPagesCitedResult.count || 0;

  // Domains Mentioning Me - count unique platforms
  const uniquePlatforms = new Set(
    platformsResult.data?.map((p) => p.platform) || []
  );
  const domainsMentioningMe = uniquePlatforms.size;

  // Your Domain Rating - sentiment-based score
  let yourDomainRating = 50; // Default neutral
  const sentiments = sentimentsResult.data;
  
  if (sentiments && sentiments.length > 0) {
    const positiveCount = sentiments.filter((s) => s.sentiment === "positive").length;
    const neutralCount = sentiments.filter((s) => s.sentiment === "neutral").length;
    const negativeCount = sentiments.filter((s) => s.sentiment === "negative").length;
    
    // Rating: positive=100, neutral=50, negative=0, averaged
    const totalScore =
      positiveCount * 100 + neutralCount * 50 + negativeCount * 0;
    yourDomainRating = Math.round(totalScore / sentiments.length);
  }

  return {
    totalCitationPages,
    myPagesCited,
    domainsMentioningMe,
    yourDomainRating,
  };
}

// =============================================
// CITATIONS OVER TIME (REAL DATA)
// =============================================

/**
 * Get citation timeline from real AI analysis data
 */
export async function getCitationsOverTime(
  projectId: string,
  days: number = 30
) {
  const supabase = await createClient();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get citations grouped by date
  const { data: citations } = await supabase
    .from("citations_detail")
    .select("created_at")
    .eq("project_id", projectId)
    .gte("created_at", startDate.toISOString());

  if (!citations) return [];

  // Group by date
  const dateMap = new Map<string, number>();
  citations.forEach((citation) => {
    const date = new Date(citation.created_at).toISOString().split("T")[0];
    dateMap.set(date, (dateMap.get(date) || 0) + 1);
  });

  // Fill in missing dates
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const count = dateMap.get(dateStr) || 0;
    
    result.push({
      date: dateStr,
      gained: count,
      lost: 0, // We don't track losses yet
      netChange: count,
      total: count,
    });
  }

  // Calculate cumulative total
  let cumulative = 0;
  result.forEach((item) => {
    cumulative += item.netChange;
    item.total = cumulative;
  });

  return result;
}

// =============================================
// DR BREAKDOWN (REAL DATA)
// =============================================

/**
 * Citation breakdown by authority level (based on platform)
 */
export async function getDRBreakdown(projectId: string) {
  const supabase = await createClient();

  // Get citations with platform info joined
  const { data: citationsWithPlatform } = await supabase
    .from("citations_detail")
    .select(`
      id,
      ai_response_id,
      ai_responses!inner(platform)
    `)
    .eq("project_id", projectId);

  if (!citationsWithPlatform) {
    return { high: 0, medium: 0, low: 0, unverified: 0 };
  }

  // Count by platform and map to authority levels
  let high = 0;
  let medium = 0;
  let low = 0;
  let unverified = 0;

  citationsWithPlatform.forEach((citation: any) => {
    const platform = citation.ai_responses?.platform;
    
    // Map platforms to authority levels (simulated DR)
    switch (platform) {
      case "gemini": // Google = highest authority
        high++;
        break;
      case "openai": // OpenAI = high authority
      case "claude": // Claude = high authority
        high++;
        break;
      case "perplexity": // Perplexity = medium authority
        medium++;
        break;
      default:
        unverified++;
    }
  });

  return { high, medium, low, unverified };
}

// =============================================
// MOST CITED DOMAINS (REAL DATA)
// =============================================

/**
 * Get most cited platforms/sources
 */
export async function getMostCitedDomains(projectId: string, limit: number = 10) {
  const supabase = await createClient();

  // Get citations with platform info joined
  const { data: citationsWithPlatform } = await supabase
    .from("citations_detail")
    .select(`
      id,
      ai_response_id,
      ai_responses!inner(platform)
    `)
    .eq("project_id", projectId);

  if (!citationsWithPlatform) return [];

  // Count by platform
  const platformCounts = new Map<string, number>();
  citationsWithPlatform.forEach((citation: any) => {
    const platform = citation.ai_responses?.platform;
    if (platform) {
      platformCounts.set(platform, (platformCounts.get(platform) || 0) + 1);
    }
  });

  // Map platform to domain info
  const domainMap: Record<string, any> = {
    openai: { domain: "openai.com", dr: 95, type: "AI Platform" },
    claude: { domain: "anthropic.com", dr: 90, type: "AI Platform" },
    gemini: { domain: "google.com", dr: 100, type: "AI Platform" },
    perplexity: { domain: "perplexity.ai", dr: 85, type: "AI Platform" },
  };

  // Convert to array and sort
  const domains = Array.from(platformCounts.entries())
    .map(([platform, count]) => ({
      domain: domainMap[platform]?.domain || platform,
      citations: count,
      dr: domainMap[platform]?.dr || 70,
      type: domainMap[platform]?.type || "Unknown",
      changePercent: 0, // TODO: Calculate trend
    }))
    .sort((a, b) => b.citations - a.citations)
    .slice(0, limit);

  return domains;
}

// =============================================
// HIGH VALUE OPPORTUNITIES (REAL DATA)
// =============================================

/**
 * Find platforms mentioning competitors but not you
 * OPTIMIZED: Single query with aggregation
 */
export async function getHighValueOpportunities(projectId: string, limit: number = 10) {
  const supabase = await createClient();

  // Get all brand citations
  const { data: brandCitations } = await supabase
    .from("citations_detail")
    .select("ai_response_id")
    .eq("project_id", projectId);

  const responseIdsWithBrand = new Set(
    brandCitations?.map((c) => c.ai_response_id) || []
  );

  // Get competitor citations with response info
  const { data: compCitations } = await supabase
    .from("competitor_citations")
    .select(`
      ai_response_id,
      competitor_id,
      ai_responses!inner(platform)
    `)
    .eq("project_id", projectId);

  if (!compCitations) return [];

  // Group by response and filter out those with brand citations
  const opportunityMap = new Map<string, any>();

  compCitations.forEach((citation: any) => {
    const responseId = citation.ai_response_id;
    
    // Skip if this response has brand citations
    if (responseIdsWithBrand.has(responseId)) return;

    const platform = citation.ai_responses?.platform || "unknown";
    const key = `${responseId}-${platform}`;

    if (!opportunityMap.has(key)) {
      opportunityMap.set(key, {
        domain: platform,
        dr: platform === "gemini" ? 100 : platform === "openai" ? 95 : 90,
        competitorsCited: 0,
        estimatedTraffic: "High",
        topicRelevance: "High",
      });
    }

    opportunityMap.get(key)!.competitorsCited++;
  });

  return Array.from(opportunityMap.values())
    .sort((a, b) => b.competitorsCited - a.competitorsCited)
    .slice(0, limit);
}

// =============================================
// TOP PERFORMING PAGES (REAL DATA)
// =============================================

/**
 * Get prompts with most citations
 * OPTIMIZED: Batch queries with JOINs
 */
export async function getTopPerformingPages(projectId: string, limit: number = 10) {
  const supabase = await createClient();

  // Get citations with prompt info in single query
  const { data: citations } = await supabase
    .from("citations_detail")
    .select(`
      id,
      ai_response_id,
      ai_responses!inner(
        prompt_tracking_id,
        prompt_tracking!inner(prompt)
      )
    `)
    .eq("project_id", projectId);

  if (!citations) return [];

  // Get all responses for impression count
  const { data: allResponses } = await supabase
    .from("ai_responses")
    .select("id, prompt_tracking_id")
    .eq("project_id", projectId)
    .eq("status", "success")
    .not("prompt_tracking_id", "is", null);

  // Group by prompt
  const promptStats = new Map<string, any>();

  // Count impressions (responses) per prompt
  allResponses?.forEach((response) => {
    const promptId = response.prompt_tracking_id;
    if (!promptId) return;

    if (!promptStats.has(promptId)) {
      promptStats.set(promptId, {
        promptId,
        prompt: null,
        citations: 0,
        impressions: 0,
      });
    }
    promptStats.get(promptId)!.impressions++;
  });

  // Count citations per prompt
  citations.forEach((citation: any) => {
    const promptData = citation.ai_responses?.prompt_tracking;
    const promptId = citation.ai_responses?.prompt_tracking_id;
    
    if (!promptId) return;

    if (!promptStats.has(promptId)) {
      promptStats.set(promptId, {
        promptId,
        prompt: promptData?.prompt || "Unknown prompt",
        citations: 0,
        impressions: 0,
      });
    }

    const stats = promptStats.get(promptId)!;
    stats.citations++;
    if (!stats.prompt && promptData?.prompt) {
      stats.prompt = promptData.prompt;
    }
  });

  // Convert to array and calculate rates
  const performance = Array.from(promptStats.values())
    .filter((stats) => stats.impressions > 0)
    .map((stats) => ({
      url: stats.prompt || "Unknown prompt",
      citations: stats.citations,
      impressions: stats.impressions,
      citationRate: ((stats.citations / stats.impressions) * 100).toFixed(1),
      avgPosition: 1, // Simulated
    }))
    .sort((a, b) => b.citations - a.citations)
    .slice(0, limit);

  return performance;
}

// =============================================
// COMPETITIVE TOPIC ANALYSIS (REAL DATA)
// =============================================

/**
 * Analyze competitive performance by topic/prompt category
 * OPTIMIZED: Batch queries, no nested loops
 */
export async function getCompetitiveTopicAnalysis(projectId: string) {
  const supabase = await createClient();

  // Get all data in parallel
  const [promptsResult, competitorsResult, brandCitationsResult, compCitationsResult] = 
    await Promise.all([
      // Get prompts with categories
      supabase
        .from("prompt_tracking")
        .select("id, category")
        .eq("project_id", projectId),
      
      // Get active competitors
      supabase
        .from("competitors")
        .select("id, name")
        .eq("project_id", projectId)
        .eq("is_active", true),
      
      // Get brand citations with prompt category
      supabase
        .from("citations_detail")
        .select(`
          id,
          ai_responses!inner(
            prompt_tracking_id,
            prompt_tracking!inner(category)
          )
        `)
        .eq("project_id", projectId),
      
      // Get competitor citations with prompt category and competitor name
      supabase
        .from("competitor_citations")
        .select(`
          id,
          competitor_id,
          competitors!inner(name),
          ai_responses!inner(
            prompt_tracking_id,
            prompt_tracking!inner(category)
          )
        `)
        .eq("project_id", projectId)
    ]);

  const prompts = promptsResult.data || [];
  const competitors = competitorsResult.data || [];
  const brandCitations = brandCitationsResult.data || [];
  const compCitations = compCitationsResult.data || [];

  if (prompts.length === 0) return [];

  // Get unique categories
  const categories = new Set(prompts.map((p) => p.category || "general"));
  
  // Count citations by category
  const categoryStats = new Map<string, any>();

  // Initialize categories
  categories.forEach((category) => {
    categoryStats.set(category, {
      topic: category,
      yourBrand: 0,
      competitors: {} as Record<string, number>,
    });
  });

  // Count brand citations by category
  brandCitations.forEach((citation: any) => {
    const category = citation.ai_responses?.prompt_tracking?.category || "general";
    if (categoryStats.has(category)) {
      categoryStats.get(category)!.yourBrand++;
    }
  });

  // Count competitor citations by category
  compCitations.forEach((citation: any) => {
    const category = citation.ai_responses?.prompt_tracking?.category || "general";
    const competitorName = citation.competitors?.name;
    
    if (categoryStats.has(category) && competitorName) {
      const stats = categoryStats.get(category)!;
      if (!stats.competitors[competitorName]) {
        stats.competitors[competitorName] = 0;
      }
      stats.competitors[competitorName]++;
    }
  });

  // Convert to array with calculated metrics matching component interface
  const analysis = Array.from(categoryStats.values()).map((stats) => {
    const totalCompetitorCitations = Object.values(stats.competitors).reduce(
      (sum: number, count: any) => sum + count,
      0
    );
    const totalCitations = stats.yourBrand + totalCompetitorCitations;
    const yourShare = totalCitations > 0 
      ? (stats.yourBrand / totalCitations) * 100 
      : 0;

    // Determine dominance level
    let dominanceLevel = "absent";
    if (yourShare >= 50) dominanceLevel = "leader";
    else if (yourShare >= 30) dominanceLevel = "competitor";
    else if (yourShare > 0) dominanceLevel = "follower";

    // Calculate opportunity score (inverse of your share)
    const opportunityScore = Math.round(100 - yourShare);

    return {
      topic: stats.topic,
      yourCitations: stats.yourBrand,
      yourShare: Number(yourShare.toFixed(1)),
      competitorData: stats.competitors,
      totalCitations,
      dominanceLevel,
      opportunityScore,
    };
  });

  return analysis;
}

