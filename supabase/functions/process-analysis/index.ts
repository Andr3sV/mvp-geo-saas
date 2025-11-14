// =============================================
// EDGE FUNCTION: process-analysis
// Description: Processes AI responses to extract and analyze citations
// =============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import type { ProcessAnalysisRequest, ProcessAnalysisResponse } from '../shared/types.ts';
import {
  corsHeaders,
  errorResponse,
  successResponse,
  authenticateRequest,
  logInfo,
  logError,
} from '../shared/utils.ts';

// =============================================
// MAIN HANDLER
// =============================================

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authenticate request
    const { user, supabase } = await authenticateRequest(req);
    logInfo('process-analysis', `Request from user: ${user.id}`);

    // Parse request body
    const body = (await req.json()) as ProcessAnalysisRequest;
    const { job_id, ai_response_id } = body;

    // Validate required fields
    if (!job_id || !ai_response_id) {
      return errorResponse('Missing required fields: job_id, ai_response_id');
    }

    logInfo('process-analysis', `Processing analysis for AI response: ${ai_response_id}`);

    // Get AI response
    const { data: aiResponse, error: fetchError } = await supabase
      .from('ai_responses')
      .select('*')
      .eq('id', ai_response_id)
      .single();

    if (fetchError || !aiResponse) {
      return errorResponse('AI response not found');
    }

    // Get project details
    const { data: project } = await supabase
      .from('projects')
      .select('name, client_url')
      .eq('id', aiResponse.project_id)
      .single();

    if (!project) {
      return errorResponse('Project not found');
    }

    // Extract citations
    const brandName = project.name;
    const citations = extractCitations(aiResponse.response_text || '', brandName);

    logInfo('process-analysis', `Found ${citations.length} citations`);

    // Insert citations into database
    if (citations.length > 0) {
      const citationRecords = citations.map((citation) => ({
        ai_response_id: aiResponse.id,
        project_id: aiResponse.project_id,
        citation_text: citation.text,
        context_before: citation.context_before,
        context_after: citation.context_after,
        position_in_response: citation.position,
        is_direct_mention: citation.is_direct_mention,
        confidence_score: citation.confidence_score,
        sentiment: analyzeSentiment(citation.text),
      }));

      const { error: insertError } = await supabase
        .from('citations_detail')
        .insert(citationRecords);

      if (insertError) {
        logError('process-analysis', 'Failed to insert citations', insertError);
        return errorResponse('Failed to save citations');
      }
    }

    // Update metrics (simplified for MVP)
    await updateProjectMetrics(supabase, aiResponse.project_id, citations.length);

    const response: ProcessAnalysisResponse = {
      citations_found: citations.length,
      success: true,
      message: `Successfully processed ${citations.length} citations`,
    };

    return successResponse(response);
  } catch (error) {
    logError('process-analysis', 'Unexpected error', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
});

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
  const positive = ['great', 'excellent', 'good', 'best', 'love', 'amazing', 'wonderful', 'fantastic'];
  const negative = ['bad', 'poor', 'worst', 'hate', 'terrible', 'awful', 'horrible'];

  const lowerText = text.toLowerCase();
  const positiveCount = positive.filter((word) => lowerText.includes(word)).length;
  const negativeCount = negative.filter((word) => lowerText.includes(word)).length;

  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

// =============================================
// HELPER: UPDATE PROJECT METRICS
// =============================================

async function updateProjectMetrics(supabase: any, projectId: string, citationsCount: number) {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Check if metrics exist for today
    const { data: existingMetrics } = await supabase
      .from('metrics_daily')
      .select('*')
      .eq('project_id', projectId)
      .eq('date', today)
      .single();

    if (existingMetrics) {
      // Update existing metrics
      await supabase
        .from('metrics_daily')
        .update({
          citations_count: (existingMetrics.citations_count || 0) + citationsCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingMetrics.id);
    } else {
      // Create new metrics record
      await supabase.from('metrics_daily').insert({
        project_id: projectId,
        date: today,
        citations_count: citationsCount,
        impressions: 0,
        clicks: 0,
      });
    }

    logInfo('process-analysis', `Updated metrics for project ${projectId}`);
  } catch (error) {
    logError('process-analysis', 'Failed to update metrics', error);
  }
}

