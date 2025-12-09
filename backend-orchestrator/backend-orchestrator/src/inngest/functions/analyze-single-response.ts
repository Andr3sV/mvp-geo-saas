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
      limit: 5, // Matches Inngest plan limit
    },
    retries: 3,
  },
  { event: 'brand/analyze-response' },
  async ({ event, step }) => {
    const { ai_response_id, project_id } = event.data;
    const supabase = createSupabaseClient();

    logInfo('analyze-single-response', `Starting brand analysis for response ${ai_response_id}`);

    // 1. Fetch AI response and project data with retries for missing rows
    const responseData = await step.run('fetch-response-data', async () => {
      const MAX_ATTEMPTS = 2;
      let responseMeta: { id: string; project_id: string; status: string } | null = null;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const { data: responseMetaArray, error: metaError } = await supabase
          .from('ai_responses')
          .select('id, project_id, status')
          .eq('id', ai_response_id)
          .limit(1);

        if (metaError) {
          throw new Error(`Failed to fetch AI response metadata: ${metaError.message}`);
        }

        if (responseMetaArray && responseMetaArray.length > 0) {
          responseMeta = responseMetaArray[0];
          break;
        }

        if (attempt < MAX_ATTEMPTS) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      if (!responseMeta) {
        return { missing: true };
      }

      if (responseMeta.status !== 'success') {
        return { missing: false, notSuccessful: true, status: responseMeta.status };
      }

      // Query 2: Get only response_text separately to avoid JSON serialization issues
      // Use limit(1) instead of single() to avoid serialization problems
      const { data: responseTextArray, error: textError } = await supabase
        .from('ai_responses')
        .select('response_text')
        .eq('id', ai_response_id)
        .limit(1);

      if (textError) {
        throw new Error(`Failed to fetch AI response text: ${textError.message}`);
      }

      if (!responseTextArray || responseTextArray.length === 0 || !responseTextArray[0]?.response_text) {
        return { missing: false, notSuccessful: true, status: 'no_text' };
      }

      const responseTextData = responseTextArray[0];

      // Combine metadata and text
      const response = {
        ...responseMeta,
        response_text: responseTextData.response_text,
      };

      // Fetch project to get brand name
      // Use limit(1) instead of single() to avoid serialization problems
      const { data: projectArray, error: projectError } = await supabase
        .from('projects')
        .select('id, brand_name, name')
        .eq('id', project_id)
        .limit(1);

      if (projectError) {
        throw new Error(`Failed to fetch project: ${projectError.message}`);
      }

      if (!projectArray || projectArray.length === 0) {
        throw new Error(`Project not found: ${project_id}`);
      }

      const project = projectArray[0];

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
        missing: false,
        notSuccessful: false,
        response,
        project,
        competitors: competitors || [],
      };
    });

    if (responseData.missing) {
      logInfo('analyze-single-response', 'AI response not found after retries, skipping', {
        aiResponseId: ai_response_id,
      });
      return { message: 'AI response not found, skipped', skipped: true };
    }

    if (responseData.notSuccessful) {
      const status = (responseData as any).status;
      logInfo('analyze-single-response', 'AI response not successful, skipping analysis', {
        aiResponseId: ai_response_id,
        status,
      });

      // Mark brand analysis as error to avoid re-processing
      await supabase
        .from('ai_responses')
        .update({
          brand_analysis_status: 'error',
          brand_analysis_error: `Response status not successful (${status})`,
        })
        .eq('id', ai_response_id);

      return { message: 'AI response not successful, skipped', skipped: true };
    }

    const { response, project, competitors } = responseData as any;
    const responseText = response.response_text!;
    const brandName = project.brand_name || project.name;
    const competitorNames = competitors.map((c: any) => c.name);

    logInfo('analyze-single-response', 'Fetched response data', {
      aiResponseId: ai_response_id,
      brandName,
      competitorCount: competitorNames.length,
      responseLength: responseText.length,
      responseTextSizeKB: Math.round(responseText.length / 1024), // Log size in KB for monitoring
    });

    // 2. Check if already analyzed
    const alreadyAnalyzed = await step.run('check-if-analyzed', async () => {
      const { data, error } = await supabase
        .from('brand_mentions')
        .select('id')
        .eq('ai_response_id', ai_response_id)
        .limit(1);

      if (error) {
        logError('analyze-single-response', 'Error checking existing analysis', error);
        return false; // If there's an error, assume not analyzed
      }

      return !!(data && data.length > 0);
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

        // Mark brand analysis as error
        await supabase
          .from('ai_responses')
          .update({
            brand_analysis_status: 'error',
            brand_analysis_error: error.message?.slice(0, 500) || 'Brand analysis failed',
          })
          .eq('id', ai_response_id);

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

        // Mark brand analysis as success
        await supabase
          .from('ai_responses')
          .update({
            brand_analysis_status: 'success',
            brand_analysis_error: null,
          })
          .eq('id', ai_response_id);

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

