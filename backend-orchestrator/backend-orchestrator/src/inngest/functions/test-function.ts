import { inngest } from "../client";
import { createSupabaseClient, logInfo, logError } from "../../lib/utils";

// Test function that can be manually invoked
export const testFunction = inngest.createFunction(
  { 
    id: "test-function",
    name: "Test Function"
  },
  { event: "test/ping" },
  async ({ event, step }) => {
    logInfo("test-function", "Test function invoked", { eventData: event.data });
    
    const supabase = createSupabaseClient();
    
    // Test Supabase connection
    const { data, error } = await step.run("test-supabase-connection", async () => {
      const { data, error } = await supabase
        .from("prompt_tracking")
        .select("count")
        .limit(1);
      
      if (error) {
        logError("test-function", "Supabase connection failed", error);
        throw error;
      }
      
      logInfo("test-function", "Supabase connection successful");
      return { success: true, message: "Supabase connected" };
    });
    
    return { 
      message: "Test function executed successfully",
      timestamp: new Date().toISOString(),
      supabaseTest: data,
      eventData: event.data
    };
  }
);

// Also create a simpler version of schedule-analysis that can be invoked manually
export const manualScheduleAnalysis = inngest.createFunction(
  { 
    id: "manual-schedule-analysis",
    name: "Manual Schedule Analysis"
  },
  { event: "analysis/manual-trigger" },
  async ({ step }) => {
    const supabase = createSupabaseClient();
    
    logInfo("manual-schedule-analysis", "Starting manual analysis trigger");

    // 1. Fetch all active prompts
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
      
      logInfo("manual-schedule-analysis", `Found ${allPrompts.length} active prompts`);
      return allPrompts;
    });

    if (prompts.length === 0) {
      return { message: "No active prompts found" };
    }

    // 2. Send events to Inngest to process each prompt
    const batchId = crypto.randomUUID();
    
    const events = prompts.map((p) => ({
      name: "analysis/process-prompt",
      data: {
        prompt_tracking_id: p.id,
        project_id: p.project_id,
        batch_id: batchId,
      },
    }));

    // Send events in batches
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

