"use server";

import { createClient } from "@/lib/supabase/server";

// =============================================
// Types
// =============================================

export interface AIResponseListItem {
  id: string;
  prompt_text: string;
  platform: string;
  model_version: string;
  status: string;
  created_at: string;
  region?: string;
  topic_name?: string;
  mentions_count: number;
  citations_count: number;
}

export interface AIResponseDetail {
  id: string;
  prompt_text: string;
  response_text: string | null;
  platform: string;
  model_version: string;
  status: string;
  error_message: string | null;
  tokens_used: number | null;
  execution_time_ms: number | null;
  created_at: string;
  prompt_tracking: {
    id: string;
    prompt: string;
    region: string | null;
    topic: {
      id: string;
      name: string;
    } | null;
  } | null;
  citations: Array<{
    id: string;
    web_search_query: string | null;
    url: string | null;
    domain: string | null;
  }>;
  brand_mentions: Array<{
    id: string;
    entity_name: string;
    brand_type: string;
    mentioned_text: string;
    start_index: number | null;
    end_index: number | null;
    competitor_id: string | null;
  }>;
  brand_visibility: {
    is_mentioned: boolean;
    position: number | null;
    total_mentions: number;
  };
}

export interface GetAIResponsesFilters {
  search?: string;
  platform?: string;
  status?: string;
  fromDate?: Date;
  toDate?: Date;
}

export interface GetAIResponsesResult {
  data: AIResponseListItem[];
  total: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

// =============================================
// Get AI Responses List (Paginated)
// =============================================

export async function getAIResponses(
  projectId: string,
  filters: GetAIResponsesFilters = {},
  page: number = 1,
  pageSize: number = 20
): Promise<GetAIResponsesResult> {
  const supabase = await createClient();

  // Calculate offset
  const offset = (page - 1) * pageSize;

  // Build base query for counting
  let countQuery = supabase
    .from("ai_responses")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("status", "success"); // Only show successful responses

  // Build data query
  let dataQuery = supabase
    .from("ai_responses")
    .select(`
      id,
      prompt_text,
      platform,
      model_version,
      status,
      created_at,
      prompt_tracking:prompt_tracking_id (
        region,
        topics:topic_id (
          name
        )
      )
    `)
    .eq("project_id", projectId)
    .eq("status", "success");

  // Apply filters
  if (filters.search) {
    const searchPattern = `%${filters.search}%`;
    countQuery = countQuery.ilike("prompt_text", searchPattern);
    dataQuery = dataQuery.ilike("prompt_text", searchPattern);
  }

  if (filters.platform && filters.platform !== "all") {
    countQuery = countQuery.eq("platform", filters.platform);
    dataQuery = dataQuery.eq("platform", filters.platform);
  }

  if (filters.status && filters.status !== "all") {
    countQuery = countQuery.eq("status", filters.status);
    dataQuery = dataQuery.eq("status", filters.status);
  }

  if (filters.fromDate) {
    countQuery = countQuery.gte("created_at", filters.fromDate.toISOString());
    dataQuery = dataQuery.gte("created_at", filters.fromDate.toISOString());
  }

  if (filters.toDate) {
    countQuery = countQuery.lte("created_at", filters.toDate.toISOString());
    dataQuery = dataQuery.lte("created_at", filters.toDate.toISOString());
  }

  // Execute count query
  const { count, error: countError } = await countQuery;

  if (countError) {
    console.error("Error counting AI responses:", countError);
    return { data: [], total: 0, totalPages: 0, page, pageSize };
  }

  // Execute data query with pagination
  const { data: responses, error: dataError } = await dataQuery
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (dataError) {
    console.error("Error fetching AI responses:", dataError);
    return { data: [], total: 0, totalPages: 0, page, pageSize };
  }

  // Get mentions and citations counts for each response
  const responseIds = responses?.map((r) => r.id) || [];

  // Fetch mentions counts
  const { data: mentionsCounts } = await supabase
    .from("brand_mentions")
    .select("ai_response_id")
    .in("ai_response_id", responseIds);

  // Fetch citations counts
  const { data: citationsCounts } = await supabase
    .from("citations")
    .select("ai_response_id")
    .in("ai_response_id", responseIds);

  // Create lookup maps
  const mentionsMap = new Map<string, number>();
  const citationsMap = new Map<string, number>();

  mentionsCounts?.forEach((m: any) => {
    mentionsMap.set(m.ai_response_id, (mentionsMap.get(m.ai_response_id) || 0) + 1);
  });

  citationsCounts?.forEach((c: any) => {
    citationsMap.set(c.ai_response_id, (citationsMap.get(c.ai_response_id) || 0) + 1);
  });

  // Transform data
  const data: AIResponseListItem[] = (responses || []).map((r: any) => ({
    id: r.id,
    prompt_text: r.prompt_text,
    platform: r.platform,
    model_version: r.model_version,
    status: r.status,
    created_at: r.created_at,
    region: r.prompt_tracking?.region || null,
    topic_name: r.prompt_tracking?.topics?.name || null,
    mentions_count: mentionsMap.get(r.id) || 0,
    citations_count: citationsMap.get(r.id) || 0,
  }));

  const total = count || 0;
  const totalPages = Math.ceil(total / pageSize);

  return { data, total, totalPages, page, pageSize };
}

// =============================================
// Get AI Response Detail
// =============================================

export async function getAIResponseDetail(
  responseId: string
): Promise<AIResponseDetail | null> {
  const supabase = await createClient();

  // Fetch main response with prompt_tracking
  const { data: response, error: responseError } = await supabase
    .from("ai_responses")
    .select(`
      id,
      prompt_text,
      response_text,
      platform,
      model_version,
      status,
      error_message,
      tokens_used,
      execution_time_ms,
      created_at,
      prompt_tracking:prompt_tracking_id (
        id,
        prompt,
        region,
        topics:topic_id (
          id,
          name
        )
      )
    `)
    .eq("id", responseId)
    .single();

  if (responseError || !response) {
    console.error("Error fetching AI response detail:", responseError);
    return null;
  }

  // Fetch citations
  const { data: citations } = await supabase
    .from("citations")
    .select("id, web_search_query, url, uri, domain")
    .eq("ai_response_id", responseId)
    .order("created_at", { ascending: true });

  // Fetch brand mentions
  const { data: brandMentions } = await supabase
    .from("brand_mentions")
    .select("id, entity_name, brand_type, mentioned_text, start_index, end_index, competitor_id")
    .eq("ai_response_id", responseId)
    .order("start_index", { ascending: true });

  // Calculate brand visibility
  const clientMentions = brandMentions?.filter((m: any) => m.brand_type === "client") || [];
  const allMentions = brandMentions || [];

  // Find position of first client brand mention
  let brandPosition: number | null = null;
  if (clientMentions.length > 0 && response.response_text) {
    // Sort all mentions by start_index to find position
    const sortedMentions = [...allMentions].sort(
      (a: any, b: any) => (a.start_index || 0) - (b.start_index || 0)
    );
    const firstClientMentionIndex = sortedMentions.findIndex(
      (m: any) => m.brand_type === "client"
    );
    brandPosition = firstClientMentionIndex >= 0 ? firstClientMentionIndex + 1 : null;
  }

  // Transform prompt_tracking
  const promptTracking = response.prompt_tracking
    ? {
        id: (response.prompt_tracking as any).id,
        prompt: (response.prompt_tracking as any).prompt,
        region: (response.prompt_tracking as any).region,
        topic: (response.prompt_tracking as any).topics
          ? {
              id: (response.prompt_tracking as any).topics.id,
              name: (response.prompt_tracking as any).topics.name,
            }
          : null,
      }
    : null;

  return {
    id: response.id,
    prompt_text: response.prompt_text,
    response_text: response.response_text,
    platform: response.platform,
    model_version: response.model_version,
    status: response.status,
    error_message: response.error_message,
    tokens_used: response.tokens_used,
    execution_time_ms: response.execution_time_ms,
    created_at: response.created_at,
    prompt_tracking: promptTracking,
    citations: (citations || []).map((c: any) => ({
      id: c.id,
      web_search_query: c.web_search_query,
      url: c.url,
      uri: c.uri,
      domain: c.domain,
    })),
    brand_mentions: (brandMentions || []).map((m: any) => ({
      id: m.id,
      entity_name: m.entity_name,
      brand_type: m.brand_type,
      mentioned_text: m.mentioned_text,
      start_index: m.start_index,
      end_index: m.end_index,
      competitor_id: m.competitor_id,
    })),
    brand_visibility: {
      is_mentioned: clientMentions.length > 0,
      position: brandPosition,
      total_mentions: allMentions.length,
    },
  };
}
