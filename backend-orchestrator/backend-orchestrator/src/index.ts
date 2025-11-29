import { Elysia } from "elysia";
import { serve } from "inngest/bun";
import { inngest } from "./inngest/client";
import { scheduleAnalysis } from "./inngest/functions/schedule-analysis";
import { processPrompt } from "./inngest/functions/process-prompt";

const handler = serve({
  client: inngest,
  functions: [scheduleAnalysis, processPrompt],
});

const inngestHandler = new Elysia().all("/api/inngest/*", ({ request }) =>
  handler(request)
);

// Register the handler with Elysia
const app = new Elysia()
  .get("/", () => "Prompt Analysis Orchestrator Running")
  .use(inngestHandler)
  .listen(process.env.PORT || 3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
console.log(`📡 Inngest endpoint available at /api/inngest`);
