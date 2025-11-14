// =============================================
// EDGE FUNCTION: analyze-prompt
// Description: Executes a prompt across multiple AI platforms
// =============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import type { AIProvider, AnalyzePromptRequest, AnalyzePromptResponse } from '../shared/types.ts';
import {
  corsHeaders,
  jsonResponse,
  errorResponse,
  successResponse,
  authenticateRequest,
  validateProjectAccess,
  logInfo,
  logError,
  checkRateLimit,
} from '../shared/utils.ts';
import { callAI, getAPIKey } from '../shared/ai-clients.ts';

// =============================================
// MAIN HANDLER
// =============================================

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body first
    const body = (await req.json()) as AnalyzePromptRequest;
    const { prompt_tracking_id, project_id, prompt_text, platforms } = body;

    // Validate required fields
    if (!prompt_tracking_id || !project_id || !prompt_text) {
      return errorResponse('Missing required fields: prompt_tracking_id, project_id, prompt_text');
    }

    logInfo('analyze-prompt', `Starting analysis for project: ${project_id}`);

    // Create Supabase client with service role (for internal operations)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return errorResponse('Supabase configuration missing', 500);
    }

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.3');
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Default platforms if not specified (filter only available ones)
    const allPlatforms: AIProvider[] = ['openai', 'gemini', 'claude', 'perplexity'];
    const availablePlatforms = allPlatforms.filter(p => {
      try {
        const key = getAPIKey(p);
        return key !== null;
      } catch {
        return false;
      }
    });
    
    const targetPlatforms: AIProvider[] = platforms 
      ? platforms.filter(p => availablePlatforms.includes(p))
      : availablePlatforms;

    logInfo('analyze-prompt', `Starting analysis for prompt: ${prompt_tracking_id}`);
    logInfo('analyze-prompt', `Target platforms: ${targetPlatforms.join(', ')}`);

    // Create analysis job
    const { data: job, error: jobError } = await supabase
      .from('analysis_jobs')
      .insert({
        project_id,
        prompt_tracking_id,
        status: 'running',
        total_platforms: targetPlatforms.length,
        completed_platforms: 0,
        failed_platforms: 0,
        started_at: new Date().toISOString(),
        created_by: null, // Service role execution
      })
      .select()
      .single();

    if (jobError) {
      logError('analyze-prompt', 'Failed to create analysis job', jobError);
      return errorResponse('Failed to create analysis job');
    }

    // Process each platform in parallel
    const platformPromises = targetPlatforms.map((platform) =>
      processPromptForPlatform(supabase, job.id, project_id, prompt_tracking_id, prompt_text, platform)
    );

    // Execute all platforms and wait for results
    const results = await Promise.allSettled(platformPromises);

    // Count successes and failures
    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    const failureCount = results.filter((r) => r.status === 'rejected').length;

    // Update analysis job
    const jobStatus = failureCount === targetPlatforms.length ? 'failed' : 'completed';
    await supabase
      .from('analysis_jobs')
      .update({
        status: jobStatus,
        completed_platforms: successCount,
        failed_platforms: failureCount,
        completed_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    logInfo(
      'analyze-prompt',
      `Analysis completed. Success: ${successCount}, Failed: ${failureCount}`
    );

    const response: AnalyzePromptResponse = {
      job_id: job.id,
      status: jobStatus,
      message: `Analysis ${jobStatus}. ${successCount}/${targetPlatforms.length} platforms completed successfully.`,
    };

    return successResponse(response);
  } catch (error) {
    logError('analyze-prompt', 'Unexpected error', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
});

// =============================================
// HELPER: PROCESS PROMPT FOR SINGLE PLATFORM
// =============================================

async function processPromptForPlatform(
  supabase: any,
  jobId: string,
  projectId: string,
  promptTrackingId: string,
  promptText: string,
  platform: AIProvider
): Promise<void> {
  const startTime = Date.now();

  try {
    logInfo('analyze-prompt', `Processing ${platform}...`);

    // Get API key for platform
    const apiKey = getAPIKey(platform);
    
    if (!apiKey) {
      throw new Error(`API key not configured for ${platform}`);
    }

    // Create pending AI response record
    const { data: aiResponse, error: insertError } = await supabase
      .from('ai_responses')
      .insert({
        prompt_tracking_id: promptTrackingId,
        project_id: projectId,
        platform,
        model_version: 'auto', // Will be updated with actual model
        prompt_text: promptText,
        status: 'processing',
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to create AI response record: ${insertError.message}`);
    }

    // Call AI platform
    const result = await callAI(platform, promptText, {
      apiKey,
      temperature: 0.7,
      maxTokens: 2000,
    });

    // Update AI response with results
    await supabase
      .from('ai_responses')
      .update({
        response_text: result.text,
        model_version: result.model,
        tokens_used: result.tokens_used,
        cost: result.cost,
        execution_time_ms: result.execution_time_ms,
        status: 'success',
      })
      .eq('id', aiResponse.id);

    logInfo('analyze-prompt', `${platform} completed successfully in ${Date.now() - startTime}ms`);

    // Trigger citation processing (asynchronous)
    await triggerCitationProcessing(supabase, aiResponse.id, jobId, projectId, result.text);
  } catch (error) {
    logError('analyze-prompt', `${platform} failed`, error);

    // Update AI response with error
    await supabase
      .from('ai_responses')
      .update({
        status: 'error',
        error_message: error.message,
        execution_time_ms: Date.now() - startTime,
      })
      .eq('prompt_tracking_id', promptTrackingId)
      .eq('platform', platform)
      .eq('status', 'processing');

    throw error;
  }
}

// =============================================
// HELPER: TRIGGER CITATION PROCESSING
// =============================================

async function triggerCitationProcessing(
  supabase: any,
  aiResponseId: string,
  jobId: string,
  projectId: string,
  responseText: string
): Promise<void> {
  try {
    // Get project details to extract brand/client name
    const { data: project } = await supabase
      .from('projects')
      .select('name, client_url')
      .eq('id', projectId)
      .single();

    if (!project) {
      logError('analyze-prompt', 'Project not found for citation processing');
      return;
    }

    // Simple citation extraction (brand name mentions)
    const brandName = project.name;
    const citations = extractCitations(responseText, brandName);

    logInfo('analyze-prompt', `Found ${citations.length} citations for ${brandName}`);

    // Insert citations
    if (citations.length > 0) {
      const citationRecords = citations.map((citation) => ({
        ai_response_id: aiResponseId,
        project_id: projectId,
        citation_text: citation.text,
        context_before: citation.context_before,
        context_after: citation.context_after,
        position_in_response: citation.position,
        is_direct_mention: citation.is_direct_mention,
        confidence_score: citation.confidence_score,
        sentiment: analyzeSentiment(citation.text),
      }));

      await supabase.from('citations_detail').insert(citationRecords);
    }
  } catch (error) {
    logError('analyze-prompt', 'Citation processing failed', error);
  }
}

// =============================================
// HELPER: EXTRACT CITATIONS
// =============================================

function extractCitations(text: string, brandName: string) {
  const citations: any[] = [];
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim());

  sentences.forEach((sentence, index) => {
    const lowerSentence = sentence.toLowerCase();
    const lowerBrand = brandName.toLowerCase();

    if (lowerSentence.includes(lowerBrand)) {
      citations.push({
        text: sentence.trim(),
        context_before: index > 0 ? sentences[index - 1]?.trim() || '' : '',
        context_after: index < sentences.length - 1 ? sentences[index + 1]?.trim() || '' : '',
        position: index,
        is_direct_mention: true,
        confidence_score: 0.95,
      });
    }
  });

  return citations;
}

// =============================================
// HELPER: ANALYZE SENTIMENT
// =============================================

function analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
  const positive = ['great', 'excellent', 'good', 'best', 'love', 'amazing', 'wonderful'];
  const negative = ['bad', 'poor', 'worst', 'hate', 'terrible', 'awful'];

  const lowerText = text.toLowerCase();
  const positiveCount = positive.filter((word) => lowerText.includes(word)).length;
  const negativeCount = negative.filter((word) => lowerText.includes(word)).length;

  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

