import { inngest } from "../client";
import { createSupabaseClient, logInfo, logError } from "../../lib/utils";
import { callAI, getAPIKey } from "../../lib/ai-clients";
import { triggerCitationProcessing } from "../../lib/citation-processing";
import type { AIProvider } from "../../lib/types";

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
    // We want to run all available platforms
    const platforms: AIProvider[] = ['openai', 'gemini', 'claude', 'perplexity'];
    const availablePlatforms = platforms.filter(p => getAPIKey(p) !== null);
    
    logInfo("process-prompt", `Available platforms: ${availablePlatforms.join(', ')}`);
    if (availablePlatforms.length === 0) {
      throw new Error('No API keys configured for any AI platform');
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
            })
            .select()
            .single();

          if (insertError) throw new Error(`Failed to create AI response: ${insertError.message}`);

          // Enrich prompt
          const enrichedPrompt = enrichPromptWithRegion(promptText, promptRegion);
          const apiKey = getAPIKey(platform);
          if (!apiKey) throw new Error(`Missing API key for ${platform}`);

          // Call AI
          const result = await callAI(platform, enrichedPrompt, {
            apiKey,
            temperature: 0.7,
            maxTokens: 2000,
            region: promptRegion,
          });

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

          // Process Citations (Async but awaited here to ensure completion)
          await triggerCitationProcessing(
            supabase,
            aiResponse.id,
            job.id,
            project_id,
            result.text,
            result.citations || []
          );

          return { platform, status: "success" };

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

    // 5. Update Job Status
    await step.run("update-job-status", async () => {
      const successCount = results.filter(r => r.status === "success").length;
      const failureCount = results.filter(r => r.status === "failed").length;
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
        
      return { successCount, failureCount, jobStatus };
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

