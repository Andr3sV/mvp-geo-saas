import { Elysia } from "elysia";
import { serve } from "inngest/bun";
import { inngest } from "./inngest/client";
import { scheduleAnalysis } from "./inngest/functions/schedule-analysis";
import { processPrompt } from "./inngest/functions/process-prompt";
import { testFunction, manualScheduleAnalysis } from "./inngest/functions/test-function";

// Create Inngest handler
const handler = serve({
  client: inngest,
  functions: [scheduleAnalysis, processPrompt, testFunction, manualScheduleAnalysis],
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
console.log(`✅ Functions registered: schedule-daily-analysis, process-single-prompt, test-function, manual-schedule-analysis`);
