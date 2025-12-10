import { inngest } from "../client";
import { createSupabaseClient, logInfo, logError } from "../../lib/utils";
import { callAI, getAPIKey } from "../../lib/ai-clients";
import { triggerCitationProcessing } from "../../lib/citation-processing";
import { saveCitations } from "../../lib/citation-storage";
import { waitForRateLimit } from "../../lib/rate-limiter";
import type { AIProvider, AICompletionResult, AIClientConfig } from "../../lib/types";

/**
 * Call AI with automatic retry for rate limits
 * Retries up to maxRetries times if rate limit is hit
 */
async function callAIWithRetry(
  platform: AIProvider,
  prompt: string,
  config: AIClientConfig,
  maxRetries: number = 3
): Promise<AICompletionResult> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Wait for rate limit before calling AI
      const waitTime = await waitForRateLimit(platform);
      if (waitTime > 0 && attempt === 1) {
        logInfo("process-prompt", `Waited ${Math.round(waitTime / 1000)}s for ${platform} rate limit`, {
          platform,
          attempt
        });
      }

      // Call AI
      return await callAI(platform, prompt, config);
    } catch (err: any) {
      const isRateLimit = err?.isRateLimit || err?.statusCode === 429;
      
      if (isRateLimit && attempt < maxRetries) {
        const waitTime = err?.retryAfter || 60000; // Default 60s if not specified
        logInfo("process-prompt", `Rate limit hit for ${platform}, waiting ${Math.round(waitTime / 1000)}s before retry ${attempt + 1}/${maxRetries}`, {
          platform,
          attempt,
          retryAfter: waitTime,
          quotaLimit: err?.quotaLimit
        });
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue; // Retry
      }
      
      // Re-throw if not rate limit or max retries reached
      throw err;
    }
  }
  
  // Should never reach here, but TypeScript needs it
  throw new Error(`Failed to call ${platform} after ${maxRetries} attempts`);
}

export const processPrompt = inngest.createFunction(
  { 
    id: "process-single-prompt",
    name: "Process Single Prompt",
    // Configure concurrency to avoid rate limits
    concurrency: {
      limit: 5, // Matches Inngest plan limit
    },
    // Automatic retries on failure
    retries: 3
  },
  { event: "analysis/process-prompt" },
  async ({ event, step }) => {
    const { prompt_tracking_id, project_id } = event.data;
    const supabase = createSupabaseClient();

    logInfo("process-prompt", `Processing prompt ${prompt_tracking_id} for project ${project_id}`);

    // 1. Fetch Prompt Data
    const promptData = await step.run("fetch-prompt", async () => {
      const { data, error } = await supabase
        .from("prompt_tracking")
        .select("prompt, region")
        .eq("id", prompt_tracking_id)
        .single();

      if (error) throw new Error(`Prompt not found: ${error.message}`);
      return data;
    });

    const promptText = promptData.prompt;
    const promptRegion = promptData.region || 'GLOBAL';

    // 2. Determine Platforms
    // Use platforms_to_process from event if provided, otherwise use all available platforms
    const platforms: AIProvider[] = ['openai', 'gemini' /*, 'claude' - disabled temporarily */, /* 'perplexity' - disabled temporarily */];
    const allAvailablePlatforms = platforms.filter(p => getAPIKey(p) !== null);
    
    // If platforms_to_process is provided in event, use only those (filtered by availability)
    const requestedPlatforms = event.data.platforms_to_process as string[] | undefined;
    const availablePlatforms = requestedPlatforms
      ? requestedPlatforms.filter((p): p is AIProvider => 
          allAvailablePlatforms.includes(p as AIProvider)
        )
      : allAvailablePlatforms;
    
    logInfo("process-prompt", `Platforms to process: ${availablePlatforms.join(', ')}`, {
      requested: requestedPlatforms?.join(', ') || 'all',
      available: allAvailablePlatforms.join(', ')
    });
    
    if (availablePlatforms.length === 0) {
      logInfo("process-prompt", "No platforms to process (all already completed or no API keys)");
      return { 
        message: "No platforms to process",
        results: []
      };
    }

    // 3. Create Analysis Job Record
    const job = await step.run("create-job-record", async () => {
      const { data, error } = await supabase
        .from("analysis_jobs")
        .insert({
          project_id,
          prompt_tracking_id,
          status: "running",
          total_platforms: availablePlatforms.length,
          completed_platforms: 0,
          failed_platforms: 0,
          started_at: new Date().toISOString(),
          created_by: null, // Service role execution - no user ID
        })
        .select()
        .single();

      if (error) throw new Error(`Failed to create job: ${error.message}`);
      return data;
    });

    // 4. Run AI Analysis for Each Platform in Parallel
    // We use step.run for each platform to isolate failures, but we want them to run in parallel.
    // Inngest steps run sequentially by default. To run in parallel, we can use Promise.all inside a single step
    // OR assume that the function execution time is long enough that we want to use Inngest's parallelism.
    // Since we want to be robust, running them in parallel inside one function execution is fine given Inngest's timeout is long (hours).
    
    const results = await step.run("execute-ai-models", async () => {
      const platformPromises = availablePlatforms.map(async (platform) => {
        try {
          logInfo("process-prompt", `Starting ${platform}...`);
          
          // Double-check: Verify if already has successful response TODAY (race condition protection)
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          const endOfToday = new Date();
          endOfToday.setHours(23, 59, 59, 999);
          
          const { data: existingResponse } = await supabase
            .from("ai_responses")
            .select("id")
            .eq("prompt_tracking_id", prompt_tracking_id)
            .eq("platform", platform)
            .eq("status", "success")
            .gte("created_at", startOfToday.toISOString())
            .lte("created_at", endOfToday.toISOString())
            .maybeSingle();

          if (existingResponse) {
            logInfo("process-prompt", `Skipping ${platform} - already has successful response today`, {
              aiResponseId: existingResponse.id,
              platform,
              prompt_tracking_id
            });
            return { platform, status: "skipped", reason: "already_exists_today" };
          }
          
          // Create pending AI response
          const { data: aiResponse, error: insertError } = await supabase
            .from("ai_responses")
            .insert({
              prompt_tracking_id,
              project_id,
              platform,
              model_version: "auto",
              prompt_text: promptText,
              status: "processing",
              brand_analysis_status: "pending",
            })
            .select()
            .single();

          if (insertError) throw new Error(`Failed to create AI response: ${insertError.message}`);

          // Enrich prompt
          const enrichedPrompt = enrichPromptWithRegion(promptText, promptRegion);
          const apiKey = getAPIKey(platform);
          if (!apiKey) throw new Error(`Missing API key for ${platform}`);

          // Call AI with automatic retry for rate limits
          const result = await callAIWithRetry(
            platform,
            enrichedPrompt,
            {
              apiKey,
              temperature: 0.7,
              maxTokens: 2000,
              region: promptRegion,
            },
            3 // maxRetries
          );

          // Update Response
          const updateResult = await supabase
            .from("ai_responses")
            .update({
              response_text: result.text,
              model_version: result.model,
              tokens_used: result.tokens_used,
              cost: result.cost,
              execution_time_ms: result.execution_time_ms,
              status: "success",
              brand_analysis_status: "pending", // ready for brand analysis
              brand_analysis_error: null,
              metadata: {
                has_web_search: result.has_web_search || false,
                citations_count: result.citations?.length || 0,
              },
            })
            .eq("id", aiResponse.id);

          if (updateResult.error) {
            logError("process-prompt", `Failed to update AI response for ${platform}`, updateResult.error);
            throw new Error(`Failed to update response: ${updateResult.error.message}`);
          }
          
          logInfo("process-prompt", `${platform} saved successfully to ai_responses`, {
            aiResponseId: aiResponse.id,
            model: result.model,
            tokensUsed: result.tokens_used
          });

          // Save structured citations to citations table
          logInfo("process-prompt", `Checking citationsData for ${platform}`, {
            aiResponseId: aiResponse.id,
            platform,
            hasCitationsData: !!result.citationsData,
            citationsDataLength: result.citationsData?.length || 0
          });

          if (result.citationsData && result.citationsData.length > 0) {
            try {
              logInfo("process-prompt", `Attempting to save ${result.citationsData.length} citations for ${platform}`, {
                aiResponseId: aiResponse.id,
                platform,
                sampleCitation: result.citationsData[0]
              });

              const citationsSaved = await saveCitations(
                supabase,
                aiResponse.id,
                result.citationsData
              );
              logInfo("process-prompt", `Saved ${citationsSaved} structured citations for ${platform}`, {
                aiResponseId: aiResponse.id,
                platform,
                expected: result.citationsData.length
              });
            } catch (citationError: any) {
              logError("process-prompt", `Failed to save structured citations for ${platform}`, {
                error: citationError.message,
                stack: citationError.stack,
                aiResponseId: aiResponse.id,
                platform
              });
              // Don't throw - citation saving is not critical for the main flow
            }
          } else {
            logInfo("process-prompt", `No citationsData to save for ${platform}`, {
              aiResponseId: aiResponse.id,
              platform,
              hasWebSearch: result.has_web_search
            });
          }

          // Process Citations (Async but awaited here to ensure completion)
          // This handles sentiment analysis and brand mentions (citations_detail table)
          await triggerCitationProcessing(
            supabase,
            aiResponse.id,
            job.id,
            project_id,
            result.text,
            result.citations || []
          );

          // Return aiResponseId so we can dispatch brand analysis events outside this step
          return { platform, status: "success", aiResponseId: aiResponse.id };

        } catch (err: any) {
          const errorMessage = err?.message || String(err);
          const errorStack = err?.stack || '';
          const isRateLimit = err?.isRateLimit || err?.statusCode === 429;
          
          // Special handling for rate limits - log but don't fail the entire job
          if (isRateLimit) {
            logError("process-prompt", `${platform} rate limit exceeded: ${errorMessage}`, {
              platform,
              prompt_tracking_id,
              retryAfter: err?.retryAfter,
              quotaLimit: err?.quotaLimit
            });
          } else {
            logError("process-prompt", `${platform} failed: ${errorMessage}`, {
              platform,
              prompt_tracking_id,
              error: errorMessage,
              stack: errorStack
            });
          }
          
          // Try to update error status - but don't fail if this fails
          try {
          await supabase
            .from("ai_responses")
            .update({
              status: "error",
              brand_analysis_status: "error",
              brand_analysis_error: errorMessage,
                error_message: isRateLimit 
                  ? `Rate limit exceeded. ${err?.quotaLimit || 'Quota exceeded'}. Will retry on next run.`
                  : errorMessage,
            })
            .eq("prompt_tracking_id", prompt_tracking_id)
            .eq("platform", platform)
            .eq("status", "processing");
          } catch (updateError: any) {
            logError("process-prompt", `Failed to update error status for ${platform}`, updateError);
          }

          return { 
            platform, 
            status: "failed", 
            error: errorMessage,
            isRateLimit: isRateLimit || false
          };
        }
      });

      return await Promise.all(platformPromises);
    });

    // 4.5. Dispatch brand analysis events (outside of execute-ai-models step)
    // This ensures brand analysis is fully async and doesn't block process-prompt
    const brandAnalysisEvents = await step.run("dispatch-brand-analysis", async () => {
      const successfulResponses = results
        .filter((r: any) => r.status === "success" && r.aiResponseId)
        .map((r: any) => ({
          name: "brand/analyze-response",
          data: {
            ai_response_id: r.aiResponseId,
            project_id,
          },
        }));

      if (successfulResponses.length > 0) {
        await step.sendEvent(`dispatch-brand-analysis-${job.id}`, successfulResponses);
        logInfo("process-prompt", `Dispatched ${successfulResponses.length} brand analysis events`, {
          prompt_tracking_id,
          project_id,
          aiResponseIds: results
            .filter((r: any) => r.status === "success" && r.aiResponseId)
            .map((r: any) => r.aiResponseId),
        });
      }

      return { eventsDispatched: successfulResponses.length };
    });

    // 5. Update Job Status
    await step.run("update-job-status", async () => {
      const successCount = results.filter(r => r.status === "success").length;
      const failureCount = results.filter(r => r.status === "failed").length;
      const skippedCount = results.filter(r => r.status === "skipped").length;
      const jobStatus = failureCount === availablePlatforms.length ? "failed" : "completed";

      await supabase
        .from("analysis_jobs")
        .update({
          status: jobStatus,
          completed_platforms: successCount,
          failed_platforms: failureCount,
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);
        
      return { successCount, failureCount, skippedCount, jobStatus };
    });

    return { 
      message: "Analysis completed", 
      results 
    };
  }
);

function enrichPromptWithRegion(prompt: string, region: string): string {
  if (!region || region === 'GLOBAL') {
    return prompt;
  }
  return `${prompt}\n\nNote: Please provide information relevant to ${region}. Focus on local context, regional brands, and country-specific information when applicable.`;
}

