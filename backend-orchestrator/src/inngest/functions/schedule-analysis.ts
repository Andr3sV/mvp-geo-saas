import { inngest } from "../client";
import { createSupabaseClient, logInfo, logError } from "../../lib/utils";

export const scheduleAnalysis = inngest.createFunction(
  { id: "schedule-daily-analysis" },
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

    // 2. Send events to Inngest to process each prompt
    // Inngest handles the fan-out and queuing
    const batchId = crypto.randomUUID();
    
    const events = prompts.map((p) => ({
      name: "analysis/process-prompt",
      data: {
        prompt_tracking_id: p.id,
        project_id: p.project_id,
        batch_id: batchId,
      },
    }));

    // Send events in batches to avoid payload limits if necessary (though Inngest client handles large batches well)
    // We'll chunk it just in case to be safe with the SDK
    const BATCH_SIZE = 1000;
    let eventsSent = 0;

    for (let i = 0; i < events.length; i += BATCH_SIZE) {
      const chunk = events.slice(i, i + BATCH_SIZE);
      await step.sendEvent("trigger-prompt-processing", chunk);
      eventsSent += chunk.length;
    }

    return { 
      message: `Scheduled ${eventsSent} prompts for analysis`,
      batch_id: batchId 
    };
  }
);

