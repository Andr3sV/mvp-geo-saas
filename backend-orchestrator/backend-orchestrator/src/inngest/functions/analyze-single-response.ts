// =============================================
// SINGLE RESPONSE BRAND ANALYSIS
// =============================================

import { inngest } from '../client';
import { createSupabaseClient, logInfo, logError } from '../../lib/utils';
import { analyzeBrandMentions } from '../../lib/brand-analysis';
import { saveBrandAnalysis } from '../../lib/brand-storage';
import { getGroqAPIKey } from '../../lib/groq-client';

/**
 * Analyze a single AI response for brand mentions, sentiment, and attributes
 * Event-driven function that can be triggered after a response is saved
 */
export const analyzeSingleResponse = inngest.createFunction(
  {
    id: 'analyze-single-response',
    name: 'Analyze Single Response Brands',
    concurrency: {
      limit: 10, // Can process more concurrently as Groq is fast
    },
    retries: 3,
  },
  { event: 'brand/analyze-response' },
  async ({ event, step }) => {
    const { ai_response_id, project_id } = event.data;
    const supabase = createSupabaseClient();

    logInfo('analyze-single-response', `Starting brand analysis for response ${ai_response_id}`);

    // 1. Fetch AI response and project data
    const responseData = await step.run('fetch-response-data', async () => {
      const { data: response, error: responseError } = await supabase
        .from('ai_responses')
        .select('id, project_id, response_text, status')
        .eq('id', ai_response_id)
        .single();

      if (responseError) {
        throw new Error(`Failed to fetch AI response: ${responseError.message}`);
      }

      if (!response) {
        throw new Error(`AI response not found: ${ai_response_id}`);
      }

      if (response.status !== 'success') {
        throw new Error(`AI response not successful (status: ${response.status})`);
      }

      if (!response.response_text) {
        throw new Error(`AI response has no text content`);
      }

      // Fetch project to get brand name
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id, brand_name, name')
        .eq('id', project_id)
        .single();

      if (projectError) {
        throw new Error(`Failed to fetch project: ${projectError.message}`);
      }

      // Get active competitors
      const { data: competitors, error: competitorsError } = await supabase
        .from('competitors')
        .select('id, name')
        .eq('project_id', project_id)
        .eq('is_active', true);

      if (competitorsError) {
        logError('analyze-single-response', 'Failed to fetch competitors', competitorsError);
      }

      return {
        response,
        project,
        competitors: competitors || [],
      };
    });

    const { response, project, competitors } = responseData;
    const responseText = response.response_text!;
    const brandName = project.brand_name || project.name;
    const competitorNames = competitors.map((c) => c.name);

    logInfo('analyze-single-response', 'Fetched response data', {
      aiResponseId: ai_response_id,
      brandName,
      competitorCount: competitorNames.length,
      responseLength: responseText.length,
    });

    // 2. Check if already analyzed
    const alreadyAnalyzed = await step.run('check-if-analyzed', async () => {
      const { data, error } = await supabase
        .from('brand_mentions')
        .select('id')
        .eq('ai_response_id', ai_response_id)
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is fine
        logError('analyze-single-response', 'Error checking existing analysis', error);
      }

      return !!data;
    });

    if (alreadyAnalyzed) {
      logInfo('analyze-single-response', 'Response already analyzed, skipping', {
        aiResponseId: ai_response_id,
      });
      return { message: 'Response already analyzed', skipped: true };
    }

    // 3. Check Groq API key
    const groqApiKey = getGroqAPIKey();
    if (!groqApiKey) {
      logError('analyze-single-response', 'Missing GROQ_API_KEY, skipping analysis', {
        aiResponseId: ai_response_id,
      });
      return { message: 'Missing GROQ_API_KEY, skipping analysis', skipped: true };
    }

    // 4. Analyze brand mentions, sentiment, and attributes
    const analysis = await step.run('analyze-brands', async () => {
      try {
        logInfo('analyze-single-response', 'Calling Groq for brand analysis', {
          aiResponseId: ai_response_id,
          brandName,
          competitorCount: competitorNames.length,
        });

        const result = await analyzeBrandMentions(
          responseText,
          brandName,
          competitorNames,
          {
            apiKey: groqApiKey,
            model: 'openai/gpt-oss-20b',
            temperature: 0.3,
            maxTokens: 2000,
          }
        );

        logInfo('analyze-single-response', 'Brand analysis completed', {
          aiResponseId: ai_response_id,
          clientBrandMentioned: result.client_brand_mentioned,
          competitorsMentioned: result.mentioned_competitors.length,
          otherBrandsDetected: result.other_brands_detected.length,
        });

        return result;
      } catch (error: any) {
        logError('analyze-single-response', 'Brand analysis failed', {
          error: error.message,
          aiResponseId: ai_response_id,
        });
        throw error;
      }
    });

    // 5. Save analysis results to database
    const saveResult = await step.run('save-analysis', async () => {
      try {
        const result = await saveBrandAnalysis(
          supabase,
          ai_response_id,
          project_id,
          brandName,
          responseText,
          analysis
        );

        logInfo('analyze-single-response', 'Brand analysis saved to database', {
          aiResponseId: ai_response_id,
          mentionsSaved: result.mentionsSaved,
          sentimentSaved: result.sentimentSaved,
          potentialCompetitorsSaved: result.potentialCompetitorsSaved,
        });

        return result;
      } catch (error: any) {
        logError('analyze-single-response', 'Failed to save brand analysis', {
          error: error.message,
          aiResponseId: ai_response_id,
        });
        throw error;
      }
    });

    return {
      message: 'Brand analysis completed successfully',
      ai_response_id,
      results: {
        mentionsSaved: saveResult.mentionsSaved,
        sentimentSaved: saveResult.sentimentSaved,
        potentialCompetitorsSaved: saveResult.potentialCompetitorsSaved,
      },
      analysis: {
        clientBrandMentioned: analysis.client_brand_mentioned,
        competitorsMentioned: analysis.mentioned_competitors.length,
        otherBrandsDetected: analysis.other_brands_detected.length,
      },
    };
  }
);

