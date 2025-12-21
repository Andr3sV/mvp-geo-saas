import { Elysia } from "elysia";
import { serve } from "inngest/bun";
import { inngest } from "./inngest/client";
import { scheduleAnalysis } from "./inngest/functions/schedule-analysis";
import { processPrompt } from "./inngest/functions/process-prompt";
import { testFunction, manualScheduleAnalysis } from "./inngest/functions/test-function";
import { analyzeBrandsBatch } from "./inngest/functions/analyze-brands-batch";
import { analyzeSingleResponse } from "./inngest/functions/analyze-single-response";
import { aggregateDailyStats, backfillProjectStats } from "./inngest/functions/aggregate-daily-stats";
import { analyzeBrandWebsite } from "./inngest/functions/analyze-brand-website";
import { dailySentimentEvaluation, manualSentimentEvaluation } from "./inngest/functions/daily-sentiment-evaluation";

// Create Inngest handler
const handler = serve({
  client: inngest,
  functions: [
    scheduleAnalysis,
    processPrompt,
    testFunction,
    manualScheduleAnalysis,
    analyzeBrandsBatch,
    analyzeSingleResponse,
    aggregateDailyStats,
    backfillProjectStats,
    analyzeBrandWebsite,
    dailySentimentEvaluation,
    manualSentimentEvaluation,
  ],
});

// Create Elysia app
const app = new Elysia()
  .get("/", () => "Prompt Analysis Orchestrator Running")
  .get("/health", () => ({ status: "ok", timestamp: new Date().toISOString() }))
  // Test endpoint to trigger functions manually
  .post("/test/trigger-test", async () => {
    try {
      const event = await inngest.send({
        name: "test/ping",
        data: { message: "Manual test trigger", timestamp: new Date().toISOString() }
      });
      return { success: true, eventId: event.ids[0], message: "Test event sent" };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  })
  .post("/test/trigger-manual-schedule", async () => {
    try {
      const event = await inngest.send({
        name: "analysis/manual-trigger",
        data: { triggeredAt: new Date().toISOString() }
      });
      return { success: true, eventId: event.ids[0], message: "Manual schedule trigger sent" };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  })
  // Trigger brand website analysis (called when a project is created with a client_url)
  .post("/api/analyze-brand-website", async ({ body }: { body: any }) => {
    try {
      const { project_id, client_url, force_refresh } = body as {
        project_id: string;
        client_url: string;
        force_refresh?: boolean;
      };

      if (!project_id || !client_url) {
        return { success: false, error: "Missing project_id or client_url" };
      }

      const event = await inngest.send({
        name: "brand/analyze-website",
        data: {
          project_id,
          client_url,
          force_refresh: force_refresh || false,
        }
      });

      console.log(`[INFO] Brand website analysis triggered for project ${project_id}`);
      return { success: true, eventId: event.ids[0], message: "Brand website analysis triggered" };
    } catch (error: any) {
      console.error(`[ERROR] Failed to trigger brand website analysis:`, error.message);
      return { success: false, error: error.message };
    }
  })
  .all("/api/inngest", async ({ request }) => {
    return handler(request);
  })
  .all("/api/inngest/*", async ({ request }) => {
    return handler(request);
  })
  .listen(process.env.PORT || 3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
console.log(`📡 Inngest endpoint available at /api/inngest`);
console.log(`✅ Functions registered: schedule-daily-analysis, process-single-prompt, test-function, manual-schedule-analysis, analyze-brands-batch, analyze-single-response, aggregate-daily-stats, backfill-project-stats, analyze-brand-website, daily-sentiment-evaluation, manual-sentiment-evaluation`);
