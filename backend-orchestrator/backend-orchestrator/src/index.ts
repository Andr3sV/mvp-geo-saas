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
import { scheduleSentimentEvaluation } from "./inngest/functions/schedule-sentiment-evaluation";
import { processSingleSentimentEvaluation } from "./inngest/functions/process-single-sentiment-evaluation";

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
    scheduleSentimentEvaluation,
    processSingleSentimentEvaluation,
  ],
});

// Create Elysia app with CORS support
const app = new Elysia()
  // CORS headers for all routes
  .onBeforeHandle(({ request, set }) => {
    const origin = request.headers.get("origin");
    
    if (origin) {
      // Allow localhost for development (any port)
      const isLocalhost = origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:");
      
      // Production allowed origins from env
      const allowedProductionOrigins = [
        process.env.NEXT_PUBLIC_APP_URL,
        process.env.APP_URL,
      ].filter((url): url is string => typeof url === "string");

      if (isLocalhost || allowedProductionOrigins.includes(origin)) {
        set.headers["Access-Control-Allow-Origin"] = origin;
        set.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS";
        set.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
        set.headers["Access-Control-Allow-Credentials"] = "true";
      }
    }
  })
  .options("/*", ({ set }) => {
    set.status = 204;
    return "";
  })
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
  // This route must be defined BEFORE /api/inngest to avoid conflicts
  .post("/analyze-brand-website", async ({ body, request }) => {
    try {
      // Elysia should parse JSON automatically, but handle both cases
      let parsedBody: any;
      if (typeof body === 'string') {
        try {
          parsedBody = JSON.parse(body);
        } catch {
          // If body is string but not JSON, read from request
          parsedBody = await request.json();
        }
      } else if (body && typeof body === 'object') {
        parsedBody = body;
      } else {
        // Fallback: read from request
        parsedBody = await request.json();
      }

      console.log(`[DEBUG] Received body type: ${typeof body}, parsedBody:`, JSON.stringify(parsedBody));

      const { project_id, client_url, force_refresh, prompts_quantity } = parsedBody as {
        project_id: string;
        client_url: string;
        force_refresh?: boolean;
        prompts_quantity?: number;
      };

      if (!project_id || !client_url) {
        console.error(`[ERROR] Missing project_id or client_url. Received:`, JSON.stringify(parsedBody));
        return { success: false, error: "Missing project_id or client_url" };
      }

      console.log(`[INFO] Received brand website analysis request for project ${project_id}, URL: ${client_url}`);

      const event = await inngest.send({
        name: "brand/analyze-website",
        data: {
          project_id,
          client_url,
          force_refresh: force_refresh || false,
          prompts_quantity: prompts_quantity || 50, // Default to 50 if not provided
        }
      });

      console.log(`[INFO] Brand website analysis triggered for project ${project_id}, event ID: ${event.ids[0]}`);
      return { success: true, eventId: event.ids[0], message: "Brand website analysis triggered" };
    } catch (error: any) {
      console.error(`[ERROR] Failed to trigger brand website analysis:`, error.message, error.stack);
      return { success: false, error: error.message || "Unknown error" };
    }
  })
  // Trigger prompt processing (called when a prompt is created)
  // This route must be defined BEFORE /api/inngest to avoid conflicts
  .post("/process-prompt", async ({ body, request }) => {
    try {
      // Parse body (same logic as /analyze-brand-website)
      let parsedBody: any;
      if (typeof body === 'string') {
        try {
          parsedBody = JSON.parse(body);
        } catch {
          // If body is string but not JSON, read from request
          parsedBody = await request.json();
        }
      } else if (body && typeof body === 'object') {
        parsedBody = body;
      } else {
        // Fallback: read from request
        parsedBody = await request.json();
      }

      const { prompt_tracking_id, project_id, platforms_to_process } = parsedBody as {
        prompt_tracking_id: string;
        project_id: string;
        platforms_to_process?: string[];
      };

      if (!prompt_tracking_id || !project_id) {
        console.error(`[ERROR] Missing prompt_tracking_id or project_id. Received:`, JSON.stringify(parsedBody));
        return { success: false, error: "Missing prompt_tracking_id or project_id" };
      }

      console.log(`[INFO] Received process-prompt request for prompt ${prompt_tracking_id}, project ${project_id}`);

      const event = await inngest.send({
        name: "analysis/process-prompt",
        data: {
          prompt_tracking_id,
          project_id,
          platforms_to_process: platforms_to_process || undefined,
        }
      });

      console.log(`[INFO] Process-prompt triggered for prompt ${prompt_tracking_id}, event ID: ${event.ids[0]}`);
      return { success: true, eventId: event.ids[0], message: "Prompt processing triggered" };
    } catch (error: any) {
      console.error(`[ERROR] Failed to trigger process-prompt:`, error.message, error.stack);
      return { success: false, error: error.message || "Unknown error" };
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
console.log(`✅ Functions registered: schedule-daily-analysis, process-single-prompt, test-function, manual-schedule-analysis, analyze-brands-batch, analyze-single-response, aggregate-daily-stats, backfill-project-stats, analyze-brand-website, schedule-sentiment-evaluation, process-single-sentiment-evaluation`);
console.log(`🔗 Endpoints available: /analyze-brand-website, /process-prompt`);
