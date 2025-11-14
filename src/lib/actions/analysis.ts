"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// =============================================
// TYPES
// =============================================

export type AIProvider = "openai" | "gemini" | "claude" | "perplexity";

export interface AnalyzePromptParams {
  prompt_tracking_id: string;
  project_id: string;
  prompt_text: string;
  platforms?: AIProvider[];
}

export interface AnalysisJob {
  id: string;
  project_id: string;
  prompt_tracking_id: string;
  status: string;
  total_platforms: number;
  completed_platforms: number;
  failed_platforms: number;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
}

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
  status: string;
  error_message: string | null;
  created_at: string;
}

export interface CitationDetail {
  id: string;
  ai_response_id: string;
  project_id: string;
  citation_text: string;
  context_before: string | null;
  context_after: string | null;
  sentiment: string | null;
  is_direct_mention: boolean;
  confidence_score: number;
  position_in_response: number;
  created_at: string;
}

// =============================================
// SERVER ACTION: START ANALYSIS
// =============================================

export async function startAnalysis(params: AnalyzePromptParams) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated", data: null };
    }

    // Get session for auth token
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return { error: "No active session", data: null };
    }

    // Call Edge Function
    const { data, error } = await supabase.functions.invoke("analyze-prompt", {
      body: params,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      console.error("Edge Function error:", error);
      return { error: error.message, data: null };
    }

    revalidatePath("/dashboard/analysis");
    return { error: null, data: data.data };
  } catch (error: any) {
    console.error("startAnalysis error:", error);
    return { error: error.message || "Failed to start analysis", data: null };
  }
}

// =============================================
// SERVER ACTION: GET ANALYSIS JOBS
// =============================================

export async function getAnalysisJobs(projectId: string) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated", data: null };
    }

    const { data, error } = await supabase
      .from("analysis_jobs")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      return { error: error.message, data: null };
    }

    return { error: null, data: data as AnalysisJob[] };
  } catch (error: any) {
    return { error: error.message || "Failed to fetch analysis jobs", data: null };
  }
}

// =============================================
// SERVER ACTION: GET AI RESPONSES FOR JOB
// =============================================

export async function getAIResponses(jobId: string) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated", data: null };
    }

    // First get the job to get prompt_tracking_id
    const { data: job, error: jobError } = await supabase
      .from("analysis_jobs")
      .select("prompt_tracking_id")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      return { error: "Job not found", data: null };
    }

    // Get all AI responses for this prompt
    const { data, error } = await supabase
      .from("ai_responses")
      .select("*")
      .eq("prompt_tracking_id", job.prompt_tracking_id)
      .order("created_at", { ascending: false });

    if (error) {
      return { error: error.message, data: null };
    }

    return { error: null, data: data as AIResponse[] };
  } catch (error: any) {
    return {
      error: error.message || "Failed to fetch AI responses",
      data: null,
    };
  }
}

// =============================================
// SERVER ACTION: GET CITATIONS FOR RESPONSE
// =============================================

export async function getCitationsForResponse(aiResponseId: string) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated", data: null };
    }

    const { data, error } = await supabase
      .from("citations_detail")
      .select("*")
      .eq("ai_response_id", aiResponseId)
      .order("position_in_response", { ascending: true });

    if (error) {
      return { error: error.message, data: null };
    }

    return { error: null, data: data as CitationDetail[] };
  } catch (error: any) {
    return { error: error.message || "Failed to fetch citations", data: null };
  }
}

// =============================================
// SERVER ACTION: GET CITATIONS BY PROJECT
// =============================================

export async function getCitationsByProject(projectId: string, limit = 50) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated", data: null };
    }

    const { data, error } = await supabase
      .from("citations_detail")
      .select("*, ai_responses:ai_response_id(platform, model_version)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return { error: error.message, data: null };
    }

    return { error: null, data };
  } catch (error: any) {
    return { error: error.message || "Failed to fetch citations", data: null };
  }
}

// =============================================
// SERVER ACTION: GET ANALYSIS STATS
// =============================================

export async function getAnalysisStats(projectId: string) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated", data: null };
    }

    // Get total jobs
    const { count: totalJobs } = await supabase
      .from("analysis_jobs")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId);

    // Get completed jobs
    const { count: completedJobs } = await supabase
      .from("analysis_jobs")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("status", "completed");

    // Get total citations
    const { count: totalCitations } = await supabase
      .from("citations_detail")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId);

    // Get total AI responses
    const { count: totalResponses } = await supabase
      .from("ai_responses")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("status", "success");

    // Calculate total cost
    const { data: costData } = await supabase
      .from("ai_responses")
      .select("cost")
      .eq("project_id", projectId)
      .eq("status", "success");

    const totalCost = costData?.reduce((sum, row) => sum + (row.cost || 0), 0) || 0;

    return {
      error: null,
      data: {
        totalJobs: totalJobs || 0,
        completedJobs: completedJobs || 0,
        totalCitations: totalCitations || 0,
        totalResponses: totalResponses || 0,
        totalCost: parseFloat(totalCost.toFixed(4)),
      },
    };
  } catch (error: any) {
    return { error: error.message || "Failed to fetch stats", data: null };
  }
}

// =============================================
// SERVER ACTION: DELETE ANALYSIS JOB
// =============================================

export async function deleteAnalysisJob(jobId: string) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated", data: null };
    }

    // Delete will cascade to ai_responses and citations_detail
    const { error } = await supabase
      .from("analysis_jobs")
      .delete()
      .eq("id", jobId);

    if (error) {
      return { error: error.message, data: null };
    }

    revalidatePath("/dashboard/analysis");
    return { error: null, data: { success: true } };
  } catch (error: any) {
    return { error: error.message || "Failed to delete analysis job", data: null };
  }
}

