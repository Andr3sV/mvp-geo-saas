import { Elysia } from "elysia";
import { serve } from "inngest";
import { inngest } from "./inngest/client";
import { scheduleAnalysis } from "./inngest/functions/schedule-analysis";
import { processPrompt } from "./inngest/functions/process-prompt";

// Create the Inngest serve handler
const inngestServe = serve({
  client: inngest,
  functions: [scheduleAnalysis, processPrompt],
});

const app = new Elysia()
  .get("/", () => "Prompt Analysis Orchestrator Running")
  .all("/api/inngest", async ({ request }) => {
    return inngestServe(request);
  })
  .listen(process.env.PORT || 3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

