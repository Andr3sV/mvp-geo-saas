// =============================================
// SHARED TYPES
// =============================================

export type AIProvider = 'openai' | 'gemini' | 'claude' | 'perplexity' | 'groq';

export type AnalysisJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export type AIResponseStatus = 'pending' | 'processing' | 'success' | 'error';

export type SentimentType = 'positive' | 'neutral' | 'negative' | 'mixed';

// =============================================
// REQUEST/RESPONSE TYPES
// =============================================

export interface AnalyzePromptRequest {
  prompt_tracking_id: string;
  project_id: string;
  prompt_text: string;
  platforms?: AIProvider[];
}

export interface AnalyzePromptResponse {
  job_id: string;
  status: AnalysisJobStatus;
  message: string;
}

export interface ProcessAnalysisRequest {
  job_id: string;
  ai_response_id: string;
}

export interface ProcessAnalysisResponse {
  citations_found: number;
  success: boolean;
  message: string;
}

// =============================================
// AI RESPONSE TYPES
// =============================================

export interface AIResponse {
  id: string;
  prompt_tracking_id: string;
  project_id: string;
  platform: AIProvider;
  model_version: string;
  prompt_text: string;
  response_text: string | null;
  tokens_used: number | null;
  cost: number | null;
  execution_time_ms: number | null;
  status: AIResponseStatus;
  error_message: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AnalysisJob {
  id: string;
  project_id: string;
  prompt_tracking_id: string;
  status: AnalysisJobStatus;
  total_platforms: number;
  completed_platforms: number;
  failed_platforms: number;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CitationDetail {
  id?: string;
  ai_response_id: string;
  project_id: string;
  citation_text: string;
  context_before: string | null;
  context_after: string | null;
  sentiment: SentimentType | null;
  is_direct_mention: boolean;
  confidence_score: number;
  position_in_response: number;
  metadata: Record<string, any>;
}

// =============================================
// AI CLIENT TYPES
// =============================================

export interface AIClientConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  region?: string; // Optional region for regional context
}

export interface AICompletionResult {
  text: string;
  tokens_used: number;
  model: string;
  cost: number;
  execution_time_ms: number;
  citations?: string[]; // URLs from web search results (for backward compatibility)
  has_web_search?: boolean; // Whether this model used web search
  citationsData?: CitationData[]; // Structured citation data with complete metadata
  webSearchQueries?: string[]; // Array of web search queries used (Gemini only)
  domains?: string[]; // Array of unique domains from citations (Gemini only) - kept for backward compatibility
  uriSources?: string[]; // Array of original URIs from Gemini groundingChunks (may include vertexaisearch redirects)
  urlSources?: string[]; // Array of transformed/generic URLs extracted from URIs
}

export interface AIClientError {
  provider: AIProvider;
  error: string;
  code?: string;
}

// =============================================
// CITATION EXTRACTION TYPES
// =============================================

export interface ExtractedCitation {
  text: string;
  context_before: string;
  context_after: string;
  position: number;
  is_direct_mention: boolean;
  confidence_score: number;
  cited_url?: string; // URL of the source (from web search)
  cited_domain?: string; // Domain extracted from URL
}

export interface CitationAnalysisResult {
  citations: ExtractedCitation[];
  overall_sentiment: SentimentType;
  total_mentions: number;
  brand_mentioned: boolean;
}

// =============================================
// STRUCTURED CITATION TYPES
// =============================================

/**
 * Structured citation data extracted from AI API responses
 * Used for storing complete citation metadata in the citations table
 */
export interface CitationData {
  web_search_query?: string; // Web search query used (from Gemini webSearchQueries)
  uri?: string; // Original URI from Vertex (Gemini) or similar
  url?: string; // Real URL after transforming URI if needed
  domain?: string; // Domain extracted from title (Gemini) or URL
  start_index?: number; // Start index of cited text fragment
  end_index?: number; // End index of cited text fragment
  text?: string; // Text fragment that was cited
  metadata?: Record<string, any>; // Additional platform-specific metadata
}

/**
 * Gemini-specific citation structure from groundingMetadata
 */
export interface GeminiGroundingCitation {
  groundingChunk: {
    web?: {
      uri?: string;
      title?: string;
    };
  };
  groundingSupport: {
    segment?: {
      startIndex?: number;
      endIndex?: number;
      text?: string;
    };
    groundingChunkIndices?: number[];
  };
  webSearchQueries?: string[];
}

/**
 * OpenAI-specific citation structure from annotations
 */
export interface OpenAICitation {
  type: 'url_citation';
  start_index: number;
  end_index: number;
  url: string;
  title?: string;
}

// =============================================
// BRAND ANALYSIS TYPES
// =============================================

/**
 * Brand analysis result from Groq AI
 */
export interface BrandAnalysisResult {
  client_brand_mentioned: boolean;
  mentioned_competitors: string[];
  client_brand_sentiment: 'positive' | 'negative' | 'neutral' | 'not_mentioned';
  client_brand_sentiment_rating: number; // -1 to 1
  client_brand_sentiment_ratio: number; // 0 to 1
  competitor_sentiments: CompetitorSentiment[];
  client_brand_attributes: {
    positive: string[];
    negative: string[];
  };
  competitor_attributes: CompetitorAttributes[];
  other_brands_detected: string[];
}

export interface CompetitorSentiment {
  competitor: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  sentiment_rating: number; // -1 to 1
  sentiment_ratio: number; // 0 to 1
}

export interface CompetitorAttributes {
  competitor: string;
  positive: string[];
  negative: string[];
}

/**
 * Brand mention data for database storage
 */
export interface BrandMentionData {
  brand_type: 'client' | 'competitor';
  competitor_id?: string;
  entity_name: string;
  mentioned_text: string;
  start_index?: number;
  end_index?: number;
  confidence_score: number;
  metadata?: Record<string, any>;
}

/**
 * Brand sentiment attributes data for database storage
 */
export interface BrandSentimentAttributesData {
  brand_type: 'client' | 'competitor';
  competitor_id?: string;
  entity_name: string;
  sentiment: 'positive' | 'negative' | 'neutral' | 'not_mentioned';
  sentiment_rating: number;
  sentiment_ratio: number;
  positive_attributes: string[];
  negative_attributes: string[];
  analyzed_text: string;
  metadata?: Record<string, any>;
}

/**
 * Potential competitor data for database storage
 */
export interface PotentialCompetitorData {
  brand_name: string;
  context?: string;
}

