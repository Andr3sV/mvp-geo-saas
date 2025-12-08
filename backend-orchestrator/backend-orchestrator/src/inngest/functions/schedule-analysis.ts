import { inngest } from "../client";
import { createSupabaseClient, logInfo, logError } from "../../lib/utils";
import { getAPIKey, getAvailableProviders } from "../../lib/ai-clients";
import type { AIProvider } from "../../lib/types";

export const scheduleAnalysis = inngest.createFunction(
  { 
    id: "schedule-daily-analysis",
    name: "Schedule Daily Analysis"
  },
  { cron: "0 2 * * *" }, // Runs at 2:00 AM daily
  async ({ step }) => {
    const supabase = createSupabaseClient();
    
    logInfo("schedule-analysis", "Starting daily analysis trigger");

    // 1. Fetch all active prompts
    // We use pagination to handle large numbers of prompts
    const prompts = await step.run("fetch-active-prompts", async () => {
      let allPrompts: { id: string; project_id: string }[] = [];
      let from = 0;
      const limit = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("prompt_tracking")
          .select("id, project_id")
          .eq("is_active", true)
          .range(from, from + limit - 1);

        if (error) {
          throw new Error(`Failed to fetch prompts: ${error.message}`);
        }

        if (data && data.length > 0) {
          allPrompts = [...allPrompts, ...data];
          from += limit;
        } else {
          hasMore = false;
        }
      }
      
      logInfo("schedule-analysis", `Found ${allPrompts.length} active prompts`);
      return allPrompts;
    });

    if (prompts.length === 0) {
      return { message: "No active prompts found" };
    }

    // 2. Get available platforms
    const availablePlatforms = getAvailableProviders();
    logInfo("schedule-analysis", `Available platforms: ${availablePlatforms.join(', ')}`);

    // 3. For each prompt, check which platforms already have successful responses TODAY
    // Only send events for platforms that don't have successful responses today
    const batchId = crypto.randomUUID();
    const events = await step.run("check-existing-responses", async () => {
      const eventsToSend: Array<{
        name: string;
        data: {
          prompt_tracking_id: string;
          project_id: string;
          platforms_to_process: string[];
          batch_id: string;
        };
      }> = [];

      // Calculate start and end of today
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      for (const prompt of prompts) {
        // Check which platforms already have successful responses today
        const { data: todayResponses, error: responseError } = await supabase
          .from("ai_responses")
          .select("platform")
          .eq("prompt_tracking_id", prompt.id)
          .eq("status", "success")
          .gte("created_at", startOfToday.toISOString())
          .lte("created_at", endOfToday.toISOString());

        if (responseError) {
          logError("schedule-analysis", `Failed to check existing responses for prompt ${prompt.id}`, responseError);
          // Continue processing - better to process than skip
          const platformsToProcess = availablePlatforms;
          if (platformsToProcess.length > 0) {
            eventsToSend.push({
              name: "analysis/process-prompt",
              data: {
                prompt_tracking_id: prompt.id,
                project_id: prompt.project_id,
                platforms_to_process: platformsToProcess,
                batch_id: batchId,
              },
            });
          }
          continue;
        }

        const successfulPlatforms = new Set(
          (todayResponses || []).map((r) => r.platform)
        );
        const platformsToProcess = availablePlatforms.filter(
          (p) => !successfulPlatforms.has(p)
        );

        // Only send event if there are platforms to process
        if (platformsToProcess.length > 0) {
          eventsToSend.push({
            name: "analysis/process-prompt",
            data: {
              prompt_tracking_id: prompt.id,
              project_id: prompt.project_id,
              platforms_to_process: platformsToProcess,
              batch_id: batchId,
            },
          });

          logInfo("schedule-analysis", `Prompt ${prompt.id}: processing ${platformsToProcess.join(', ')}, skipping ${Array.from(successfulPlatforms).join(', ')} (already successful today)`);
        } else {
          logInfo("schedule-analysis", `Prompt ${prompt.id}: all platforms already have successful responses today, skipping`);
        }
      }

      return eventsToSend;
    });

    if (events.length === 0) {
      return { 
        message: "All prompts already have successful responses for all platforms today",
        batch_id: batchId 
      };
    }

    // 4. Send events in batches
    const BATCH_SIZE = 1000;
    let eventsSent = 0;

    for (let i = 0; i < events.length; i += BATCH_SIZE) {
      const chunk = events.slice(i, i + BATCH_SIZE);
      await step.sendEvent("trigger-prompt-processing", chunk);
      eventsSent += chunk.length;
    }

    logInfo("schedule-analysis", `Scheduled ${eventsSent} events for analysis`);

    return { 
      message: `Scheduled ${eventsSent} prompts for analysis`,
      batch_id: batchId,
      total_prompts: prompts.length,
      events_sent: eventsSent
    };
  }
);

