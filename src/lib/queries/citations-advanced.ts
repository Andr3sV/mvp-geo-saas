"use server";

import { createClient } from "@/lib/supabase/server";

// =============================================
// QUICK LOOK METRICS
// =============================================

/**
 * Get Quick Look Metrics (4 key stats at the top)
 * - Total Citation Pages
 * - My Pages Cited
 * - Domains Mentioning Me
 * - Your Domain Rating
 */
export async function getQuickLookMetrics(projectId: string) {
  const supabase = await createClient();

  // Total Citation Pages - count unique citing sources
  const { count: totalCitationPages } = await supabase
    .from("citation_sources")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId);

  // My Pages Cited - count unique pages from cited_pages linked to this project
  const { data: myBrandDomain } = await supabase
    .from("project_domains")
    .select("domain_id")
    .eq("project_id", projectId)
    .eq("relationship_type", "my_brand")
    .single();

  let myPagesCited = 0;
  if (myBrandDomain) {
    const { count } = await supabase
      .from("cited_pages")
      .select("*", { count: "exact", head: true })
      .eq("domain_id", myBrandDomain.domain_id)
      .gt("citation_count", 0);
    myPagesCited = count || 0;
  }

  // Domains Mentioning Me - count unique citing domains
  const { data: citingSources } = await supabase
    .from("citation_sources")
    .select("citing_domain_id")
    .eq("project_id", projectId);

  const uniqueDomains = new Set(citingSources?.map((s) => s.citing_domain_id) || []);
  const domainsMentioningMe = uniqueDomains.size;

  // Your Domain Rating - get from domains table
  let yourDomainRating = 0;
  if (myBrandDomain) {
    const { data: domainData } = await supabase
      .from("domains")
      .select("domain_rating")
      .eq("id", myBrandDomain.domain_id)
      .single();
    yourDomainRating = domainData?.domain_rating || 0;
  }

  return {
    totalCitationPages: totalCitationPages || 0,
    myPagesCited,
    domainsMentioningMe,
    yourDomainRating,
  };
}

// =============================================
// CITATIONS OVER TIME
// =============================================

/**
 * Get citation timeline data showing gains/losses over time
 */
export async function getCitationsOverTime(
  projectId: string,
  days: number = 30
) {
  const supabase = await createClient();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from("citation_daily_stats")
    .select("*")
    .eq("project_id", projectId)
    .is("domain_id", null) // Aggregate stats for entire project
    .gte("stat_date", startDate.toISOString().split("T")[0])
    .order("stat_date", { ascending: true });

  if (error) {
    console.error("Error fetching citations over time:", error);
    return [];
  }

  return (
    data?.map((item) => ({
      date: item.stat_date,
      gained: item.new_citations || 0,
      lost: item.lost_citations || 0,
      netChange: item.net_change || 0,
      total: item.total_citations || 0,
    })) || []
  );
}

// =============================================
// CITATION DR BREAKDOWN
// =============================================

/**
 * Get citation breakdown by Domain Rating tiers
 */
export async function getCitationDRBreakdown(projectId: string) {
  const supabase = await createClient();

  // Get all citation sources with domain ratings
  const { data, error } = await supabase
    .from("citation_sources")
    .select(
      `
      *,
      citing_domain:domains!citation_sources_citing_domain_id_fkey(
        domain_rating,
        authority_category
      )
    `
    )
    .eq("project_id", projectId);

  if (error) {
    console.error("Error fetching DR breakdown:", error);
    return {
      high: 0,
      medium: 0,
      low: 0,
      unverified: 0,
    };
  }

  const breakdown = {
    high: 0,
    medium: 0,
    low: 0,
    unverified: 0,
  };

  data?.forEach((item) => {
    const category = (item.citing_domain as any)?.authority_category;
    if (category && breakdown.hasOwnProperty(category)) {
      breakdown[category as keyof typeof breakdown]++;
    }
  });

  return breakdown;
}

// =============================================
// MOST CITED DOMAINS IN AI ANSWERS
// =============================================

/**
 * Get ranking of most cited domains (yours + competitors + third party)
 */
export async function getMostCitedDomains(projectId: string, limit: number = 10) {
  const supabase = await createClient();

  // Get project domain relationships
  const { data: projectDomains } = await supabase
    .from("project_domains")
    .select(
      `
      domain_id,
      relationship_type,
      domains(domain, domain_rating)
    `
    )
    .eq("project_id", projectId);

  // Get citation counts per cited domain
  const { data: citationData } = await supabase
    .from("citation_sources")
    .select(
      `
      cited_domain_id,
      citation_count
    `
    )
    .eq("project_id", projectId);

  // Aggregate by domain
  const domainCounts = new Map<
    string,
    { count: number; rating: number; type: string; domain: string }
  >();

  citationData?.forEach((item) => {
    const domainInfo = projectDomains?.find((pd) => pd.domain_id === item.cited_domain_id);
    if (!domainInfo) return;

    const domainData = domainInfo.domains as any;
    const existing = domainCounts.get(item.cited_domain_id) || {
      count: 0,
      rating: domainData?.domain_rating || 0,
      type: domainInfo.relationship_type,
      domain: domainData?.domain || "",
    };

    existing.count += item.citation_count || 0;
    domainCounts.set(item.cited_domain_id, existing);
  });

  // Convert to array and sort
  const sorted = Array.from(domainCounts.values())
    .map((data) => ({
      domain: data.domain,
      domainRating: data.rating,
      type: data.type,
      totalCitations: data.count,
      aiAnswers: data.count, // Simplified
    }))
    .sort((a, b) => b.totalCitations - a.totalCitations)
    .slice(0, limit);

  return sorted;
}

// =============================================
// HIGH VALUE SOURCES NOT MENTIONING YOU
// =============================================

/**
 * Get high-authority domains that cite competitors but not you
 */
export async function getHighValueOpportunities(
  projectId: string,
  limit: number = 10
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("high_value_opportunities")
    .select(
      `
      *,
      domain:domains(domain, domain_rating)
    `
    )
    .eq("project_id", projectId)
    .order("opportunity_score", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching high value opportunities:", error);
    return [];
  }

  return (
    data?.map((item) => ({
      domain: (item.domain as any)?.domain || "",
      domainRating: (item.domain as any)?.domain_rating || 0,
      competitorsMentioned: item.competitors_mentioned || [],
      citationFrequency: item.citation_frequency || 0,
      opportunityScore: item.opportunity_score || 0,
      priority: item.priority,
      topics: item.topics || [],
    })) || []
  );
}

// =============================================
// TOP PERFORMING PAGES
// =============================================

/**
 * Get your top-performing pages by citation count
 */
export async function getTopPerformingPages(
  projectId: string,
  limit: number = 10
) {
  const supabase = await createClient();

  // Get my brand domain
  const { data: myBrandDomain } = await supabase
    .from("project_domains")
    .select("domain_id")
    .eq("project_id", projectId)
    .eq("relationship_type", "my_brand")
    .single();

  if (!myBrandDomain) return [];

  const { data, error } = await supabase
    .from("cited_pages")
    .select("*")
    .eq("domain_id", myBrandDomain.domain_id)
    .order("citation_count", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching top performing pages:", error);
    return [];
  }

  return (
    data?.map((item) => ({
      pageUrl: item.url,
      pageTitle: item.title || item.url,
      totalCitations: item.citation_count || 0,
      uniqueAiAnswers: item.citation_count || 0, // Simplified
      trend: undefined,
      platformBreakdown: {},
    })) || []
  );
}

// =============================================
// COMPETITIVE CITATION ANALYSIS BY TOPIC
// =============================================

/**
 * Get competitive analysis matrix by topic
 */
export async function getCompetitiveTopicAnalysis(projectId: string) {
  const supabase = await createClient();

  // Get topics for this project
  const { data: topics, error: topicsError } = await supabase
    .from("citation_topics")
    .select("*")
    .eq("project_id", projectId);

  if (topicsError) {
    console.error("Error fetching topics:", topicsError);
    return [];
  }

  // For each topic, get performance data
  const results = await Promise.all(
    (topics || []).map(async (topic) => {
      const { data: performance } = await supabase
        .from("citation_topic_performance")
        .select(
          `
          *,
          domain:domains(domain, domain_rating)
        `
        )
        .eq("topic_id", topic.id)
        .eq("project_id", projectId);

      // Get my brand domain
      const { data: myBrandDomain } = await supabase
        .from("project_domains")
        .select("domain_id")
        .eq("project_id", projectId)
        .eq("relationship_type", "my_brand")
        .single();

      const myPerformance = performance?.find((p) => p.domain_id === myBrandDomain?.domain_id);
      const yourCitations = myPerformance?.citation_count || 0;
      
      const totalCitations = performance?.reduce((sum, p) => sum + (p.citation_count || 0), 0) || 0;
      const yourShare = totalCitations > 0 ? (yourCitations / totalCitations) * 100 : 0;

      // Build competitor data
      const competitorData: Record<string, number> = {};
      performance?.forEach((p) => {
        if (p.domain_id !== myBrandDomain?.domain_id) {
          const domainInfo = p.domain as any;
          if (domainInfo?.domain) {
            competitorData[domainInfo.domain] = p.citation_count || 0;
          }
        }
      });

      // Determine dominance
      let dominanceLevel: "leader" | "competitor" | "follower" | "absent" = "absent";
      if (yourCitations === 0) {
        dominanceLevel = "absent";
      } else if (yourShare >= 40) {
        dominanceLevel = "leader";
      } else if (yourShare >= 25) {
        dominanceLevel = "competitor";
      } else {
        dominanceLevel = "follower";
      }

      // Calculate opportunity score (inverse of your share, higher when you're weak)
      const opportunityScore = yourCitations === 0 ? 100 : Math.min(100, Math.round(100 - yourShare));

      return {
        topic: topic.topic_name,
        category: topic.topic_category,
        yourCitations,
        yourShare: Number(yourShare.toFixed(1)),
        competitorData,
        totalCitations,
        dominanceLevel,
        opportunityScore,
      };
    })
  );

  return results.sort((a, b) => b.opportunityScore - a.opportunityScore);
}

// =============================================
// COMPETITOR BRANDS
// =============================================

/**
 * Get list of competitor brands being tracked
 */
export async function getCompetitorBrands(projectId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("project_domains")
    .select(
      `
      *,
      domains(domain, name)
    `
    )
    .eq("project_id", projectId)
    .eq("relationship_type", "competitor")
    .eq("is_active", true);

  if (error) {
    console.error("Error fetching competitor brands:", error);
    return [];
  }

  return (
    data?.map((item) => ({
      id: item.id,
      brandName: (item.domains as any)?.name || (item.domains as any)?.domain || "",
      domain: (item.domains as any)?.domain,
    })) || []
  );
}

/**
 * Add a new competitor brand
 */
export async function addCompetitorBrand(
  projectId: string,
  brandName: string,
  domain?: string
) {
  const supabase = await createClient();

  // First, create or get the domain
  let domainId: string;
  
  if (domain) {
    const { data: existingDomain } = await supabase
      .from("domains")
      .select("id")
      .eq("domain", domain)
      .single();

    if (existingDomain) {
      domainId = existingDomain.id;
    } else {
      const { data: newDomain, error: domainError } = await supabase
        .from("domains")
        .insert({
          domain: domain,
          domain_type: "competitor",
          name: brandName,
        })
        .select()
        .single();

      if (domainError) {
        return { error: domainError.message, data: null };
      }
      domainId = newDomain.id;
    }

    // Link domain to project
    const { data, error } = await supabase
      .from("project_domains")
      .insert({
        project_id: projectId,
        domain_id: domainId,
        relationship_type: "competitor",
        label: brandName,
      })
      .select()
      .single();

    if (error) {
      return { error: error.message, data: null };
    }

    return { data, error: null };
  }

  return { error: "Domain is required", data: null };
}

/**
 * Remove a competitor brand
 */
export async function removeCompetitorBrand(projectDomainId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("project_domains")
    .update({ is_active: false })
    .eq("id", projectDomainId);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}
