"use server";

import { createClient } from "@/lib/supabase/server";

export interface PromptCitationSummary {
  promptId: string;
  brandCitations: {
    count: number;
    platforms: string[];
    citations: Array<{
      id: string;
      text: string | null;
      platform: string;
      url: string | null;
      domain: string | null;
      created_at: string;
    }>;
  };
  competitorCitations: {
    count: number;
    competitors: Array<{
      name: string;
      citations: number;
      platforms: string[];
    }>;
    citations: Array<{
      id: string;
      competitor_name: string;
      citation_text: string;
      platform: string;
      sentiment: string;
      created_at: string;
    }>;
  };
  totalResponses: number;
  lastAnalysis?: string;
}

/**
 * Get citation summary for a specific prompt
 * Shows both brand citations and competitor citations found in AI responses
 */
export async function getPromptCitationSummary(
  promptId: string
): Promise<PromptCitationSummary | null> {
  const supabase = await createClient();

  try {
    // Get AI responses for this prompt
    const { data: aiResponses } = await supabase
      .from("ai_responses")
      .select("id, platform, created_at")
      .eq("prompt_tracking_id", promptId)
      .eq("status", "success")
      .order("created_at", { ascending: false });

    if (!aiResponses || aiResponses.length === 0) {
      return null;
    }

    const responseIds = aiResponses.map(r => r.id);

    // Get brand citations for these responses
    const { data: brandCitations } = await supabase
      .from("citations")
      .select(`
        id,
        text,
        url,
        domain,
        created_at,
        ai_responses!inner(platform)
      `)
      .in("ai_response_id", responseIds)
      .not("url", "is", null); // Only citations with URLs

    // Get competitor citations for these responses
    const { data: competitorCitations } = await supabase
      .from("competitor_citations")
      .select(`
        id,
        citation_text,
        sentiment,
        created_at,
        competitors!inner(name),
        ai_responses!inner(platform)
      `)
      .in("ai_response_id", responseIds);

    // Process brand citations
    const brandPlatforms = new Set<string>();
    
    brandCitations?.forEach((citation: any) => {
      brandPlatforms.add(citation.ai_responses.platform);
    });

    // Process competitor citations
    const competitorMap = new Map<string, { citations: number; platforms: Set<string> }>();
    
    competitorCitations?.forEach((citation: any) => {
      const competitorName = citation.competitors.name;
      const platform = citation.ai_responses.platform;
      
      if (!competitorMap.has(competitorName)) {
        competitorMap.set(competitorName, { citations: 0, platforms: new Set() });
      }
      
      const competitor = competitorMap.get(competitorName)!;
      competitor.citations++;
      competitor.platforms.add(platform);
    });

    const competitorSummary = Array.from(competitorMap.entries()).map(([name, data]) => ({
      name,
      citations: data.citations,
      platforms: Array.from(data.platforms),
    }));

    return {
      promptId,
      brandCitations: {
        count: brandCitations?.length || 0,
        platforms: Array.from(brandPlatforms),
        citations: (brandCitations || []).map((c: any) => ({
          id: c.id,
          text: c.text,
          platform: c.ai_responses.platform,
          url: c.url,
          domain: c.domain,
          created_at: c.created_at,
        })),
      },
      competitorCitations: {
        count: competitorCitations?.length || 0,
        competitors: competitorSummary,
        citations: (competitorCitations || []).map((c: any) => ({
          id: c.id,
          competitor_name: c.competitors.name,
          citation_text: c.citation_text,
          platform: c.ai_responses.platform,
          sentiment: c.sentiment || "neutral",
          created_at: c.created_at,
        })),
      },
      totalResponses: aiResponses.length,
      lastAnalysis: aiResponses[0]?.created_at,
    };
  } catch (error) {
    console.error("Error fetching prompt citation summary:", error);
    return null;
  }
}
