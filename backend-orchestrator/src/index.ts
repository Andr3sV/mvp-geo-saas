import { Elysia } from "elysia";
import { serve } from "inngest/elysia";
import { inngest } from "./inngest/client";
import { scheduleAnalysis } from "./inngest/functions/schedule-analysis";
import { processPrompt } from "./inngest/functions/process-prompt";

const app = new Elysia()
  .get("/", () => "Prompt Analysis Orchestrator Running")
  .use(
    serve({
      client: inngest,
      functions: [scheduleAnalysis, processPrompt],
    })
  )
  .listen(process.env.PORT || 3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

