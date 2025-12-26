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

    if ('notSuccessful' in responseData && responseData.notSuccessful) {
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

    // 6. Incremental aggregation - update daily_brand_stats immediately for today (after 4:30 AM)
    const incrementalAggregation = await step.run('incremental-aggregation', async () => {
      try {
        // Get current time and check if after 4:30 AM today (UTC)
        const now = new Date();
        const cutoffTime = new Date(now);
        cutoffTime.setUTCHours(4, 30, 0, 0);
        
        if (now < cutoffTime) {
          // Before 4:30 AM, skip incremental aggregation (daily aggregation handles this)
          logInfo('analyze-single-response', 'Skipping incremental aggregation (before 4:30 AM cutoff)', {
            aiResponseId: ai_response_id,
            currentTime: now.toISOString(),
            cutoffTime: cutoffTime.toISOString(),
          });
          return { skipped: true, reason: 'before_cutoff' };
        }
        
        // Fetch ai_response with dimensions (platform, region_id, topic_id)
        const { data: aiResponseWithDims, error: dimError } = await supabase
          .from('ai_responses')
          .select('platform, prompt_tracking(region_id, topic_id)')
          .eq('id', ai_response_id)
          .single();
        
        if (dimError || !aiResponseWithDims) {
          logError('analyze-single-response', 'Failed to fetch ai_response dimensions for incremental aggregation', dimError);
          return { skipped: true, reason: 'no_dimensions' };
        }
        
        const platform = aiResponseWithDims.platform;
        const promptTracking = aiResponseWithDims.prompt_tracking as any;
        // Handle both array and object returns from Supabase join
        let regionId: string | null = null;
        let topicId: string | null = null;
        
        if (Array.isArray(promptTracking) && promptTracking.length > 0) {
          regionId = promptTracking[0]?.region_id || null;
          topicId = promptTracking[0]?.topic_id || null;
        } else if (promptTracking && typeof promptTracking === 'object') {
          regionId = promptTracking.region_id || null;
          topicId = promptTracking.topic_id || null;
        }
        
        // Get region code from region_id
        let regionCode = 'GLOBAL';
        if (regionId) {
          const { data: region, error: regionError } = await supabase
            .from('regions')
            .select('code')
            .eq('id', regionId)
            .eq('project_id', project_id)
            .eq('is_active', true)
            .single();
          
          if (regionError) {
            logError('analyze-single-response', 'Failed to fetch region code', regionError);
          } else if (region) {
            regionCode = region.code;
          }
        }
        
        const todayStr = now.toISOString().split('T')[0];
        
        // Aggregate brand stats incrementally if brand was mentioned
        // Use incremental function that only counts mentions for this specific ai_response_id
        if (saveResult.mentionsSaved > 0 && analysis.client_brand_mentioned) {
          const { error: brandAggError } = await supabase.rpc('aggregate_brand_stats_incremental', {
            p_project_id: project_id,
            p_ai_response_id: ai_response_id,
            p_stat_date: todayStr,
            p_platform: platform,
            p_region_id: regionId || null,
            p_topic_id: topicId,
          });
          
          if (brandAggError) {
            logError('analyze-single-response', 'Failed to aggregate brand stats incrementally', brandAggError);
          } else {
            logInfo('analyze-single-response', 'Incremental brand stats aggregation completed', {
              aiResponseId: ai_response_id,
              platform,
              regionId,
              regionCode,
              topicId,
            });
          }
        }
        
        // Aggregate competitor stats incrementally for each mentioned competitor
        // Use incremental function that only counts mentions for this specific ai_response_id
        if (analysis.mentioned_competitors.length > 0) {
          for (const competitorName of analysis.mentioned_competitors) {
            const competitor = competitors.find((c: any) => c.name === competitorName);
            if (competitor) {
              const { error: compAggError } = await supabase.rpc('aggregate_competitor_stats_incremental', {
                p_project_id: project_id,
                p_competitor_id: competitor.id,
                p_ai_response_id: ai_response_id,
                p_stat_date: todayStr,
                p_platform: platform,
                p_region_id: regionId || null,
                p_topic_id: topicId,
              });
              
              if (compAggError) {
                logError('analyze-single-response', 'Failed to aggregate competitor stats incrementally', {
                  error: compAggError,
                  competitorId: competitor.id,
                  competitorName,
                });
              } else {
                logInfo('analyze-single-response', 'Incremental competitor stats aggregation completed', {
                  aiResponseId: ai_response_id,
                  competitorId: competitor.id,
                  competitorName,
                  platform,
                  regionId,
                  regionCode,
                  topicId,
                });
              }
            }
          }
        }
        
        return { success: true };
      } catch (error: any) {
        // Don't throw - this is non-critical, data will still be aggregated at 4:30 AM
        logError('analyze-single-response', 'Incremental aggregation failed (non-critical)', {
          error: error.message,
          aiResponseId: ai_response_id,
        });
        return { success: false, error: error.message };
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

