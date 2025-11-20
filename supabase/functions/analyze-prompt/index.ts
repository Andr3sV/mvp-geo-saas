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

    // Get prompt details including region
    const { data: promptData, error: promptError } = await supabase
      .from('prompt_tracking')
      .select('region')
      .eq('id', prompt_tracking_id)
      .single();

    if (promptError) {
      logError('analyze-prompt', 'Failed to fetch prompt details', promptError);
      return errorResponse('Failed to fetch prompt details');
    }

    const promptRegion = promptData?.region || 'GLOBAL';
    logInfo('analyze-prompt', `Prompt region: ${promptRegion}`);

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
      processPromptForPlatform(supabase, job.id, project_id, prompt_tracking_id, prompt_text, platform, promptRegion)
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
// HELPER: ENRICH PROMPT WITH REGION CONTEXT
// =============================================

function enrichPromptWithRegion(prompt: string, region: string): string {
  if (!region || region === 'GLOBAL') {
    return prompt;
  }

  // Add regional context using the ISO country code
  // Modern LLMs understand ISO 3166-1 alpha-2 country codes (e.g., ES, US, GB)
  return `${prompt}\n\nNote: Please provide information relevant to ${region}. Focus on local context, regional brands, and country-specific information when applicable.`;
}

// =============================================
// HELPER: PROCESS PROMPT FOR SINGLE PLATFORM
// =============================================

async function processPromptForPlatform(
  supabase: any,
  jobId: string,
  projectId: string,
  promptTrackingId: string,
  promptText: string,
  platform: AIProvider,
  region: string = 'GLOBAL'
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

    // Enrich prompt with region context if region is specified
    const enrichedPrompt = enrichPromptWithRegion(promptText, region);
    
    if (region !== 'GLOBAL') {
      logInfo('analyze-prompt', `Enriched prompt with region context: ${region}`);
    }

    // Call AI platform with enriched prompt
    const result = await callAI(platform, enrichedPrompt, {
      apiKey,
      temperature: 0.7,
      maxTokens: 2000,
      region, // Pass region for reference (already included in enriched prompt)
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
        metadata: {
          has_web_search: result.has_web_search || false,
          citations_count: result.citations?.length || 0,
        },
      })
      .eq('id', aiResponse.id);

    logInfo('analyze-prompt', `${platform} completed successfully in ${Date.now() - startTime}ms`);

    // Trigger citation processing (asynchronous)
    await triggerCitationProcessing(
      supabase,
      aiResponse.id,
      jobId,
      projectId,
      result.text,
      result.citations || [] // Pass URLs from web search
    );
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
  responseText: string,
  citationUrls: string[] = [] // URLs from web search
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

    // Get active competitors for the project
    const { data: competitors, error: competitorsError } = await supabase
      .from('competitors')
      .select('id, name, domain')
      .eq('project_id', projectId)
      .eq('is_active', true);

    if (competitorsError) {
      logError('analyze-prompt', 'Failed to fetch competitors', competitorsError);
    }

    const activeCompetitors = competitors || [];
    logInfo('analyze-prompt', `Found ${activeCompetitors.length} active competitors for competitive analysis`);
    if (activeCompetitors.length > 0) {
      logInfo('analyze-prompt', `Competitor names: ${activeCompetitors.map(c => c.name).join(', ')}`)
    }

    // Extract citations for brand (with URLs if available)
    const brandName = project.name;
    const brandCitations = extractCitations(responseText, brandName, citationUrls);
    logInfo('analyze-prompt', `Found ${brandCitations.length} brand citations for ${brandName}${citationUrls.length > 0 ? ` with ${citationUrls.length} URLs` : ''}`);

    // Insert brand citations
    if (brandCitations.length > 0) {
      const citationRecords = brandCitations.map((citation) => ({
        ai_response_id: aiResponseId,
        project_id: projectId,
        citation_text: citation.text,
        context_before: citation.context_before,
        context_after: citation.context_after,
        position_in_response: citation.position,
        is_direct_mention: citation.is_direct_mention,
        confidence_score: citation.confidence_score,
        sentiment: analyzeSentiment(citation.text),
        cited_url: citation.cited_url || null,
        cited_domain: citation.cited_domain || null,
      }));

      await supabase.from('citations_detail').insert(citationRecords);
    }

    // IMPORTANT: Save ALL URLs from the LLM response, even if no brand mentions
    // This ensures we don't lose any URLs used by the LLM
    // Each URL gets its own record in citations_detail
    if (citationUrls.length > 0) {
      logInfo('analyze-prompt', `Saving ${citationUrls.length} URLs from LLM response`);
      
      const urlRecords = citationUrls.map((url: string, index: number) => ({
        ai_response_id: aiResponseId,
        project_id: projectId,
        citation_text: null, // No specific mention text, just the URL
        context_before: null,
        context_after: null,
        position_in_response: null,
        is_direct_mention: false, // Not a direct mention, just a source URL
        confidence_score: 1.0, // High confidence - URL came directly from LLM
        sentiment: null, // No sentiment for URLs alone
        cited_url: url,
        cited_domain: extractDomain(url),
      }));

      const { error: urlError } = await supabase.from('citations_detail').insert(urlRecords);
      
      if (urlError) {
        logError('analyze-prompt', 'Failed to insert URL records', urlError);
      } else {
        logInfo('analyze-prompt', `Successfully saved ${urlRecords.length} URLs to citations_detail`);
      }
    }

    // Extract and insert competitor citations
    for (const competitor of activeCompetitors) {
      logInfo('analyze-prompt', `Checking for citations of competitor: ${competitor.name}`);
      
      const competitorCitations = extractCitations(responseText, competitor.name, citationUrls);
      
      if (competitorCitations.length > 0) {
        logInfo('analyze-prompt', `Found ${competitorCitations.length} citations for competitor: ${competitor.name}`);
        
        const competitorCitationRecords = competitorCitations.map((citation) => ({
          ai_response_id: aiResponseId,
          project_id: projectId,
          competitor_id: competitor.id,
          citation_text: citation.text,
          context_before: citation.context_before,
          context_after: citation.context_after,
          position_in_response: citation.position,
          is_direct_mention: citation.is_direct_mention,
          confidence_score: citation.confidence_score,
          sentiment: analyzeSentiment(citation.text),
          compared_with_brand: checkIfComparedWithBrand(citation.text, brandName),
          competitive_context: extractCompetitiveContext(citation.text, brandName, competitor.name),
        }));

        logInfo('analyze-prompt', `Inserting ${competitorCitationRecords.length} competitor citation records`);
        
        const { error: insertError } = await supabase
          .from('competitor_citations')
          .insert(competitorCitationRecords);
        
        if (insertError) {
          logError('analyze-prompt', `Failed to insert competitor citations for ${competitor.name}`, insertError);
        } else {
          logInfo('analyze-prompt', `Successfully inserted ${competitorCitationRecords.length} citations for ${competitor.name}`);
        }
      } else {
        logInfo('analyze-prompt', `No citations found for competitor: ${competitor.name}`);
      }
    }
  } catch (error) {
    logError('analyze-prompt', 'Citation processing failed', error);
  }
}

// =============================================
// HELPER: EXTRACT CITATIONS WITH URLs
// =============================================

function extractCitations(text: string, brandName: string, citationUrls: string[] = []) {
  const citations: any[] = [];
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim());

  sentences.forEach((sentence, index) => {
    const lowerSentence = sentence.toLowerCase();
    const lowerBrand = brandName.toLowerCase();

    if (lowerSentence.includes(lowerBrand)) {
      // Find URL closest to this mention (if URLs available from web search)
      let citedUrl: string | undefined;
      let citedDomain: string | undefined;

      if (citationUrls.length > 0) {
        // For now, assign URLs round-robin to mentions
        // In a more sophisticated version, we'd parse markdown links or proximity
        citedUrl = citationUrls[citations.length % citationUrls.length];
        citedDomain = extractDomain(citedUrl);
      }

      citations.push({
        text: sentence.trim(),
        context_before: index > 0 ? sentences[index - 1]?.trim() || '' : '',
        context_after: index < sentences.length - 1 ? sentences[index + 1]?.trim() || '' : '',
        position: index,
        is_direct_mention: true,
        confidence_score: 0.95,
        cited_url: citedUrl,
        cited_domain: citedDomain,
      });
    }
  });

  return citations;
}

// =============================================
// HELPER: EXTRACT DOMAIN FROM URL
// =============================================

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url.split('/')[2]?.replace('www.', '') || url;
  }
}

// =============================================
// HELPER: ANALYZE SENTIMENT
// =============================================

function analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
  // Expanded positive keywords (with weights)
  const positiveKeywords: Record<string, number> = {
    // Strong positive
    'excellent': 3, 'outstanding': 3, 'exceptional': 3, 'superb': 3, 'fantastic': 3,
    'amazing': 3, 'wonderful': 3, 'brilliant': 3, 'perfect': 3, 'ideal': 3,
    // Moderate positive
    'great': 2, 'good': 2, 'best': 2, 'top': 2, 'leading': 2, 'preferred': 2,
    'recommended': 2, 'popular': 2, 'trusted': 2, 'reliable': 2, 'effective': 2,
    'successful': 2, 'innovative': 2, 'advanced': 2, 'powerful': 2, 'efficient': 2,
    // Mild positive
    'nice': 1, 'decent': 1, 'solid': 1, 'fine': 1, 'okay': 1, 'adequate': 1,
    'suitable': 1, 'helpful': 1, 'useful': 1, 'valuable': 1, 'beneficial': 1,
    // Positive verbs
    'love': 2, 'enjoy': 2, 'appreciate': 2, 'prefer': 2, 'choose': 1, 'select': 1,
    // Positive phrases
    'high quality': 2, 'well known': 2, 'well-established': 2, 'highly rated': 2,
    'customer favorite': 2, 'industry leader': 2, 'market leader': 2,
  };

  // Expanded negative keywords (with weights)
  const negativeKeywords: Record<string, number> = {
    // Strong negative
    'terrible': 3, 'awful': 3, 'horrible': 3, 'worst': 3, 'disastrous': 3,
    'catastrophic': 3, 'unacceptable': 3, 'appalling': 3, 'dreadful': 3,
    // Moderate negative
    'bad': 2, 'poor': 2, 'weak': 2, 'inferior': 2, 'subpar': 2, 'mediocre': 2,
    'disappointing': 2, 'frustrating': 2, 'problematic': 2, 'unreliable': 2,
    'ineffective': 2, 'inefficient': 2, 'outdated': 2, 'limited': 2, 'restrictive': 2,
    // Mild negative
    'not great': 1, 'not good': 1, 'not ideal': 1, 'could be better': 1,
    'lacks': 1, 'missing': 1, 'incomplete': 1, 'insufficient': 1,
    // Negative verbs
    'hate': 2, 'dislike': 2, 'avoid': 1, 'complain': 1, 'criticize': 1,
    // Negative phrases
    'not recommended': 2, 'stay away': 2, 'poor quality': 2, 'low quality': 2,
    'customer complaints': 2, 'frequent issues': 2, 'many problems': 2,
  };

  const lowerText = text.toLowerCase();
  
  // Calculate positive score
  let positiveScore = 0;
  for (const [keyword, weight] of Object.entries(positiveKeywords)) {
    if (lowerText.includes(keyword)) {
      positiveScore += weight;
    }
  }

  // Calculate negative score
  let negativeScore = 0;
  for (const [keyword, weight] of Object.entries(negativeKeywords)) {
    if (lowerText.includes(keyword)) {
      negativeScore += weight;
    }
  }

  // Check for negations that flip sentiment (e.g., "not good" = negative)
  const negationPatterns = [
    /\bnot\s+(good|great|excellent|best|ideal|recommended|suitable)/gi,
    /\bno\s+(good|great|excellent|best|ideal)/gi,
    /\bdoesn't\s+(work|help|solve)/gi,
    /\bcan't\s+(recommend|use|trust)/gi,
    /\bfails?\s+to/gi,
    /\blacks?\s+(features?|support|quality)/gi,
  ];

  let negationPenalty = 0;
  for (const pattern of negationPatterns) {
    if (pattern.test(text)) {
      negationPenalty += 2; // Penalty for negations
    }
  }

  // Adjust scores with negation penalty
  positiveScore = Math.max(0, positiveScore - negationPenalty);
  negativeScore += negationPenalty;

  // Determine sentiment based on weighted scores
  const threshold = 2; // Minimum score difference to determine sentiment

  if (positiveScore > negativeScore && positiveScore >= threshold) {
    return 'positive';
  }
  if (negativeScore > positiveScore && negativeScore >= threshold) {
    return 'negative';
  }
  
  // Default to neutral if scores are close or both below threshold
  return 'neutral';
}

// =============================================
// HELPER: CHECK IF COMPARED WITH BRAND
// =============================================

function checkIfComparedWithBrand(text: string, brandName: string): boolean {
  const lowerText = text.toLowerCase();
  const lowerBrand = brandName.toLowerCase();
  
  // Keywords that indicate comparison
  const comparisonKeywords = [
    'vs', 'versus', 'compared to', 'comparison', 'better than', 'worse than',
    'similar to', 'like', 'unlike', 'alternative to', 'instead of', 'rather than'
  ];
  
  // Check if both brand and comparison keywords are present
  return comparisonKeywords.some(keyword => lowerText.includes(keyword)) && 
         lowerText.includes(lowerBrand);
}

// =============================================
// HELPER: EXTRACT COMPETITIVE CONTEXT
// =============================================

function extractCompetitiveContext(text: string, brandName: string, competitorName: string): string {
  const lowerText = text.toLowerCase();
  const lowerBrand = brandName.toLowerCase();
  const lowerCompetitor = competitorName.toLowerCase();
  
  // Patterns that indicate competitive positioning
  const betterPatterns = ['better', 'superior', 'outperforms', 'leads', 'ahead of'];
  const worsePatterns = ['inferior', 'behind', 'lacks', 'falls short'];
  const similarPatterns = ['similar', 'comparable', 'like', 'same as', 'equivalent'];
  
  // Determine context
  if (betterPatterns.some(pattern => lowerText.includes(pattern))) {
    return lowerText.indexOf(lowerCompetitor) < lowerText.indexOf(lowerBrand) 
      ? 'competitor_better' 
      : 'brand_better';
  }
  
  if (worsePatterns.some(pattern => lowerText.includes(pattern))) {
    return lowerText.indexOf(lowerCompetitor) < lowerText.indexOf(lowerBrand)
      ? 'competitor_worse'
      : 'brand_worse';
  }
  
  if (similarPatterns.some(pattern => lowerText.includes(pattern))) {
    return 'similar';
  }
  
  return 'mentioned_together';
}

