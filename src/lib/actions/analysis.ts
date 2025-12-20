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

    // Validate user has access to the project
    const { data: projectMember } = await supabase
      .from("project_members")
      .select("id")
      .eq("project_id", params.project_id)
      .eq("user_id", user.id)
      .single();

    if (!projectMember) {
      return { error: "Access denied to this project", data: null };
    }

    // Call Edge Function - Supabase automatically passes the user's auth token
    console.log("Calling Edge Function analyze-prompt with params:", {
      prompt_tracking_id: params.prompt_tracking_id,
      project_id: params.project_id,
      prompt_text: params.prompt_text.substring(0, 50) + "...",
      platforms: params.platforms,
    });

    // Ensure all required fields are present and properly formatted
    const requestBody = {
      prompt_tracking_id: params.prompt_tracking_id,
      project_id: params.project_id,
      prompt_text: params.prompt_text,
      ...(params.platforms && params.platforms.length > 0 && { platforms: params.platforms }),
    };

    console.log("Sending request body to Edge Function:", {
      ...requestBody,
      prompt_text: requestBody.prompt_text.substring(0, 50) + "...",
    });

    const { data, error } = await supabase.functions.invoke("analyze-prompt", {
      body: requestBody,
    });

    if (error) {
      console.error("Edge Function error:", error);
      console.error("Error status:", error.status);
      console.error("Error message:", error.message);
      console.error("Error details:", JSON.stringify(error, null, 2));
      
      // Check if it's a 422 (validation error) and try to extract the error message
      if (error.status === 422 || error.message?.includes('422')) {
        const errorMessage = data?.error || error.message || "Validation error: Invalid request data";
        console.error("422 Validation Error:", errorMessage);
        return { error: errorMessage, data: null };
      }
      
      return { error: error.message || "Failed to invoke Edge Function", data: null };
    }

    // Check if response indicates an error even if no error object
    if (data && typeof data === 'object' && 'error' in data) {
      console.error("Edge Function returned error in response:", data.error);
      return { error: data.error || "Edge Function returned an error", data: null };
    }

    console.log("Edge Function response:", data);
    return { error: null, data: data?.data || data };
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

    return { error: null, data: { success: true } };
  } catch (error: any) {
    return { error: error.message || "Failed to delete analysis job", data: null };
  }
}

