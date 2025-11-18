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
  // ⚠️ IMPORTANT: Filter by cited_url IS NOT NULL - only show REAL citations with URLs from web search
  const [
    responsesWithCitationsResult,
    myPagesCitedResult,
    platformsResult,
    sentimentsResult
  ] = await Promise.all([
    // Total Citation Pages - count DISTINCT ai_response_id from citations WITH URLs
    supabase
      .from("citations_detail")
      .select("ai_response_id")
      .eq("project_id", projectId)
      .not("cited_url", "is", null), // ✅ Only real citations with URLs
    
    // My Pages Cited - total citations WITH URLs
    supabase
      .from("citations_detail")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId)
      .not("cited_url", "is", null), // ✅ Only real citations with URLs
    
    // Domains Mentioning Me - unique platforms WITH real citations
    supabase
      .from("ai_responses")
      .select("platform")
      .eq("project_id", projectId)
      .eq("status", "success"),
    
    // Sentiments for rating calculation - only citations WITH URLs
    supabase
      .from("citations_detail")
      .select("sentiment")
      .eq("project_id", projectId)
      .not("cited_url", "is", null) // ✅ Only real citations with URLs
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

  // Get citations grouped by date - only citations WITH URLs
  const { data: citations } = await supabase
    .from("citations_detail")
    .select("created_at")
    .eq("project_id", projectId)
    .not("cited_url", "is", null) // ✅ Only real citations with URLs
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

  // Get citations with platform info joined - only citations WITH URLs
  const { data: citationsWithPlatform } = await supabase
    .from("citations_detail")
    .select(`
      id,
      ai_response_id,
      ai_responses!inner(platform)
    `)
    .eq("project_id", projectId)
    .not("cited_url", "is", null); // ✅ Only real citations with URLs

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
 * Get most cited domains/sources that mention your brand
 * This shows the actual websites (deportesroman.com, nike.com, etc.)
 * that AI models are using as sources when they cite your brand
 */
export async function getMostCitedDomains(projectId: string, limit: number = 10) {
  const supabase = await createClient();

  // Get citations with domain and platform info - only citations WITH URLs
  const { data: citations } = await supabase
    .from("citations_detail")
    .select(`
      id,
      cited_domain,
      cited_url,
      sentiment,
      ai_responses!inner(platform)
    `)
    .eq("project_id", projectId)
    .not("cited_url", "is", null) // Only real citations with URLs
    .not("cited_domain", "is", null); // Only citations with domains

  if (!citations) return [];

  // Count citations by domain
  const domainStats = new Map<string, {
    domain: string;
    citations: number;
    platforms: Set<string>;
    sentiments: string[];
    sampleUrl: string;
  }>();

  citations.forEach((citation: any) => {
    const domain = citation.cited_domain;
    if (!domain) return;

    if (!domainStats.has(domain)) {
      domainStats.set(domain, {
        domain,
        citations: 0,
        platforms: new Set(),
        sentiments: [],
        sampleUrl: citation.cited_url,
      });
    }

    const stats = domainStats.get(domain)!;
    stats.citations++;
    if (citation.ai_responses?.platform) {
      stats.platforms.add(citation.ai_responses.platform);
    }
    if (citation.sentiment) {
      stats.sentiments.push(citation.sentiment);
    }
  });

  // Convert to array and calculate metrics
  const domains = Array.from(domainStats.values())
    .map((stats) => {
      // Calculate dominant sentiment
      const sentimentCounts = stats.sentiments.reduce((acc, s) => {
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const dominantSentiment = Object.entries(sentimentCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || "neutral";

      // Estimate DR based on citation count (simulated)
      // In real GEO, you'd integrate with Ahrefs/SEMrush API
      const estimatedDR = Math.min(100, 40 + (stats.citations * 10));

      return {
        domain: stats.domain,
        citations: stats.citations,
        dr: estimatedDR,
        type: "Web Source",
        platforms: Array.from(stats.platforms),
        sentiment: dominantSentiment,
        changePercent: 0, // TODO: Calculate trend comparing with previous period
      };
    })
    .sort((a, b) => b.citations - a.citations)
    .slice(0, limit);

  return domains;
}

// =============================================
// HIGH VALUE OPPORTUNITIES (REAL DATA)
// =============================================

/**
 * Find high-authority domains that cite competitors but NOT your brand
 * These are actionable opportunities for content strategy and PR
 * 
 * Example: If forbes.com cites Nike and Adidas but not your brand,
 * it's a high-value opportunity to build presence there.
 */
export async function getHighValueOpportunities(projectId: string, limit: number = 10) {
  const supabase = await createClient();

  // Get all brand citations WITH URLs only (domains where we ARE mentioned)
  const { data: brandCitations } = await supabase
    .from("citations_detail")
    .select("cited_domain, ai_response_id")
    .eq("project_id", projectId)
    .not("cited_url", "is", null)
    .not("cited_domain", "is", null);

  // Create a Set of domains where brand is already cited
  const domainsWithBrand = new Set(
    brandCitations?.map((c) => c.cited_domain) || []
  );

  // Get competitor citations with domain info
  // Note: competitor_citations doesn't have cited_url/cited_domain yet
  // So we need to get it from the brand citations in the same ai_response
  
  // First, get all brand citation domains grouped by ai_response_id
  const brandCitationsByResponse = new Map<string, Set<string>>();
  brandCitations?.forEach((citation) => {
    if (!brandCitationsByResponse.has(citation.ai_response_id)) {
      brandCitationsByResponse.set(citation.ai_response_id, new Set());
    }
    if (citation.cited_domain) {
      brandCitationsByResponse.get(citation.ai_response_id)!.add(citation.cited_domain);
    }
  });

  // Get ALL citations_detail (brand citations) to know which domains exist
  const { data: allCitations } = await supabase
    .from("citations_detail")
    .select(`
      cited_domain,
      ai_response_id,
      sentiment
    `)
    .eq("project_id", projectId)
    .not("cited_url", "is", null)
    .not("cited_domain", "is", null);

  // Get competitor citations (these tell us about competitor presence)
  const { data: compCitations } = await supabase
    .from("competitor_citations")
    .select(`
      ai_response_id,
      competitor_id,
      competitors!inner(name)
    `)
    .eq("project_id", projectId);

  if (!allCitations || !compCitations) return [];

  // Build a map of domains with their competitor presence
  const domainOpportunities = new Map<string, {
    domain: string;
    competitorsMentioned: string[];
    citationFrequency: number;
    sentiments: string[];
    responseIds: Set<string>;
  }>();

  // For each competitor citation, find the domains in that response
  compCitations.forEach((compCitation: any) => {
    const responseId = compCitation.ai_response_id;
    const competitorName = compCitation.competitors?.name;
    
    // Find all domains cited in this response
    const domainsInResponse = allCitations
      .filter(c => c.ai_response_id === responseId)
      .map(c => c.cited_domain)
      .filter(d => d != null);

    // Check if brand is cited in this same response
    const brandCitedInResponse = brandCitationsByResponse.has(responseId);

    // For each domain in this response where competitor is mentioned
    domainsInResponse.forEach((domain) => {
      // Skip if brand is already cited in this response/domain
      if (brandCitedInResponse) return;
      // Skip if brand is cited in this domain in any response
      if (domainsWithBrand.has(domain)) return;

      if (!domainOpportunities.has(domain)) {
        domainOpportunities.set(domain, {
          domain,
          competitorsMentioned: [],
          citationFrequency: 0,
          sentiments: [],
          responseIds: new Set(),
        });
      }

      const opp = domainOpportunities.get(domain)!;
      
      if (competitorName && !opp.competitorsMentioned.includes(competitorName)) {
        opp.competitorsMentioned.push(competitorName);
      }
      
      opp.citationFrequency++;
      opp.responseIds.add(responseId);
      
      // Get sentiment from the citation
      const citation = allCitations.find(
        c => c.ai_response_id === responseId && c.cited_domain === domain
      );
      if (citation?.sentiment) {
        opp.sentiments.push(citation.sentiment);
      }
    });
  });

  // Calculate opportunity scores and format results
  const opportunities = Array.from(domainOpportunities.values())
    .map((opp) => {
      // Estimate DR based on citation frequency (simulated)
      const estimatedDR = Math.min(100, 50 + (opp.citationFrequency * 8));
      
      // Calculate opportunity score
      // Higher score = more competitors + higher DR + more citations
      const competitorWeight = opp.competitorsMentioned.length * 15;
      const frequencyWeight = Math.min(30, opp.citationFrequency * 5);
      const drWeight = estimatedDR * 0.4;
      const opportunityScore = Math.min(100, competitorWeight + frequencyWeight + drWeight);
      
      // Determine priority
      let priority: "high" | "medium" | "low" = "medium";
      if (opportunityScore >= 75 || opp.competitorsMentioned.length >= 3) {
        priority = "high";
      } else if (opportunityScore >= 50 || opp.competitorsMentioned.length >= 2) {
        priority = "medium";
      } else {
        priority = "low";
      }

      return {
        domain: opp.domain,
        domainRating: estimatedDR,
        competitorsMentioned: opp.competitorsMentioned,
        citationFrequency: opp.citationFrequency,
        opportunityScore: Math.round(opportunityScore),
        priority,
        topics: ["GEO Opportunity"], // Could be enhanced with actual topic detection
      };
    })
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, limit);

  return opportunities;
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

  // Get citations with prompt info in single query - only citations WITH URLs
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
    .eq("project_id", projectId)
    .not("cited_url", "is", null); // ✅ Only real citations with URLs

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
      
      // Get brand citations with prompt category - only citations WITH URLs
      supabase
        .from("citations_detail")
        .select(`
          id,
          ai_responses!inner(
            prompt_tracking_id,
            prompt_tracking!inner(category)
          )
        `)
        .eq("project_id", projectId)
        .not("cited_url", "is", null), // ✅ Only real citations with URLs
      
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

// =============================================
// CITATION SOURCES (INDIVIDUAL URLs)
// =============================================

/**
 * Get individual citation sources with URLs
 * Shows the actual articles/pages that cited the brand
 */
export async function getCitationSources(projectId: string, limit: number = 20) {
  const supabase = await createClient();

  const { data: citations } = await supabase
    .from("citations_detail")
    .select(`
      id,
      citation_text,
      cited_url,
      cited_domain,
      sentiment,
      created_at,
      ai_responses!inner(platform)
    `)
    .eq("project_id", projectId)
    .not("cited_url", "is", null) // Only citations with URLs
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!citations) return [];

  return citations.map((citation: any) => ({
    id: citation.id,
    citationText: citation.citation_text,
    citedUrl: citation.cited_url,
    citedDomain: citation.cited_domain,
    platform: citation.ai_responses?.platform || "unknown",
    sentiment: citation.sentiment || "neutral",
    createdAt: citation.created_at,
  }));
}

