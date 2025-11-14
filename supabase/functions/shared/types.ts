// =============================================
// SHARED TYPES FOR EDGE FUNCTIONS
// =============================================

export type AIProvider = 'openai' | 'gemini' | 'claude' | 'perplexity';

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
}

export interface AICompletionResult {
  text: string;
  tokens_used: number;
  model: string;
  cost: number;
  execution_time_ms: number;
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
}

export interface CitationAnalysisResult {
  citations: ExtractedCitation[];
  overall_sentiment: SentimentType;
  total_mentions: number;
  brand_mentioned: boolean;
}

