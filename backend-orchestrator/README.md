# Prompt Analysis Orchestrator

This service handles the daily analysis of prompts using multiple AI providers (OpenAI, Gemini, Claude, Perplexity). It uses **Elysia** as the server framework and **Inngest** for reliable event orchestration.

## Architecture

- **Elysia:** Serves the API endpoints (specifically `/api/inngest`).
- **Inngest:** Manages the workflow execution, retries, and concurrency.
- **Supabase:** Stores prompts and analysis results.

## Workflows

1.  **Schedule Analysis (`schedule-daily-analysis`)**:

    - Runs daily at 2:00 AM via Cron.
    - Fetches all active prompts from Supabase.
    - Triggers `analysis/process-prompt` events for each prompt.

2.  **Process Prompt (`process-single-prompt`)**:
    - triggered by `analysis/process-prompt`.
    - Fetches the prompt text.
    - Calls all configured AI providers in parallel.
    - Saves results to `ai_responses`.
    - Performs citation and sentiment analysis.

## Development

1.  Install dependencies:

    ```bash
    bun install
    ```

2.  Run development server:

    ```bash
    bun dev
    ```

3.  Start Inngest Dev Server (in a separate terminal):
    ```bash
    npx inngest-cli@latest dev
    ```

## Deployment

This service is designed to be deployed as a Docker container on platforms like Railway, Fly.io, or Render.

### Environment Variables

The following environment variables are required:

```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Providers
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
CLAUDE_API_KEY=sk-ant-...
PERPLEXITY_API_KEY=pplx-...

# Inngest
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...
```
