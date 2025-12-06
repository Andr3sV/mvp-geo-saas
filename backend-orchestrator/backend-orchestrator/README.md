# Prompt Analysis Orchestrator

A production-ready service for analyzing prompts across multiple AI providers (OpenAI, Gemini, Claude, Perplexity) with reliable orchestration, rate limiting, and error handling. Built with **Elysia** (Bun-based web framework) and **Inngest** (serverless event-driven orchestrator).

## 🏗️ Architecture

### Components

- **Elysia**: Fast Bun-based web framework that serves the API endpoints
- **Inngest**: Reliable event-driven orchestrator that handles:
  - Scheduled cron jobs
  - Workflow execution with automatic retries
  - Concurrency management
  - Long-running task orchestration
- **Supabase**: PostgreSQL database storing:
  - Prompts (`prompt_tracking`)
  - AI responses (`ai_responses`)
  - Analysis jobs (`analysis_jobs`)
  - Citations and sentiment analysis

### Key Features

- ✅ **Multi-LLM Support**: Processes prompts across 4 AI providers simultaneously
- ✅ **Rate Limiting**: Per-platform rate limiting to prevent 429 errors
- ✅ **Automatic Retries**: Inngest handles retries with exponential backoff
- ✅ **Concurrency Control**: Configurable concurrency limits per function
- ✅ **Error Handling**: Comprehensive error logging and graceful degradation
- ✅ **Citation Processing**: Automatic extraction and analysis of citations from AI responses
- ✅ **Sentiment Analysis**: Integration with sentiment analysis workflows

## 📋 Workflows

### 1. Schedule Daily Analysis (`schedule-daily-analysis`)

**Trigger**: Cron job (runs daily at 2:00 AM UTC)

**Process**:

1. Fetches all active prompts from `prompt_tracking` table
2. Paginates through results to handle large datasets
3. Creates a batch ID for tracking
4. Sends `analysis/process-prompt` events to Inngest for each prompt

**Configuration**:

- Runs at `0 2 * * *` (2:00 AM daily)
- Handles unlimited prompts via pagination (1000 per batch)

### 2. Process Single Prompt (`process-single-prompt`)

**Trigger**: Event `analysis/process-prompt`

**Process**:

1. Fetches prompt data from `prompt_tracking`
2. Creates an `analysis_jobs` record
3. For each configured AI platform (OpenAI, Gemini, Claude, Perplexity):
   - Applies rate limiting (waits if necessary)
   - Creates pending `ai_responses` record
   - Calls AI provider API
   - Updates response with results
   - Triggers citation processing
4. Updates job status (completed/failed)

**Configuration**:

- Concurrency limit: 5 (configurable based on Inngest plan)
- Retries: 3 automatic retries on failure
- Platforms: All available platforms run in parallel

**Rate Limiting**:

- Each platform call respects per-platform rate limits
- Automatic waiting when limits are approached
- See [Rate Limits](#rate-limits) section for details

### 3. Test Functions

**Test Function** (`test-function`):

- Event: `test/ping`
- Purpose: Test Supabase connectivity and basic function execution

**Manual Schedule Analysis** (`manual-schedule-analysis`):

- Event: `analysis/manual-trigger`
- Purpose: Manually trigger the scheduling workflow without waiting for cron

## 🚀 Getting Started

### Prerequisites

- **Bun** runtime (v1.3.3+)
- **Supabase** project with required tables
- **Inngest** account
- API keys for at least one AI provider

### Installation

1. Install dependencies:

```bash
bun install
```

2. Set up environment variables (see [Environment Variables](#environment-variables))

3. Run development server:

```bash
bun dev
```

4. Start Inngest Dev Server (in a separate terminal):

```bash
npx inngest-cli@latest dev
```

This will start the Inngest Dev Server at `http://localhost:8288` where you can:

- View function definitions
- Test function invocations
- Monitor execution logs

### Environment Variables

#### Required

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# At least one AI provider API key is required
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
CLAUDE_API_KEY=sk-ant-...
PERPLEXITY_API_KEY=pplx-...
```

#### Optional

```env
# Server Configuration
PORT=3000  # Default: 3000

# Inngest Configuration (auto-configured when syncing)
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...
```

#### Where to Find API Keys

- **Supabase**: Project Settings → API
- **OpenAI**: https://platform.openai.com/api-keys
- **Gemini**: https://aistudio.google.com/app/apikey
- **Claude**: https://console.anthropic.com/settings/keys
- **Perplexity**: https://www.perplexity.ai/settings/api

## 📊 Rate Limits

The service implements per-platform rate limiting to prevent 429 (Rate Limit Exceeded) errors. Limits are configured based on official API documentation:

| Platform       | RPM   | TPM     | Notes                            |
| -------------- | ----- | ------- | -------------------------------- |
| **OpenAI**     | 5,000 | 450,000 | Most models                      |
| **Gemini**     | 10    | 250,000 | Free tier (Gemini 2.0 Flash Exp) |
| **Claude**     | 50    | 30,000  | Tier 1                           |
| **Perplexity** | 50    | -       | Tier 0                           |

**How it works**:

- Before each API call, the service checks current request count
- If limit is reached, it waits until the next minute window
- Waits are logged for monitoring
- Each platform has an independent rate limit tracker

**Note**: Rate limiting is per-instance (in-memory). For distributed systems with multiple instances, consider using Redis-based rate limiting.

## 🐳 Deployment

### Railway

1. Connect your GitHub repository to Railway
2. Set the **Root Directory** to `backend-orchestrator/backend-orchestrator`
3. Configure all environment variables in Railway dashboard
4. Railway will automatically detect the Dockerfile and deploy

**Railway Configuration**:

- Root Directory: `backend-orchestrator/backend-orchestrator`
- Build Command: (auto-detected from Dockerfile)
- Start Command: (auto-detected from Dockerfile)

### Docker

Build and run locally:

```bash
docker build -t prompt-orchestrator .
docker run -p 3000:3000 --env-file .env prompt-orchestrator
```

### Inngest Sync

After deployment, sync your functions with Inngest:

1. Go to Inngest Dashboard → Getting Started → Sync your app
2. Enter your deployment URL: `https://your-domain.com/api/inngest`
3. Click "Sync app here"
4. Verify functions appear in the Functions list

**Important**: The endpoint must be accessible at `/api/inngest` for Inngest to sync.

## 📁 Project Structure

```
backend-orchestrator/
├── src/
│   ├── index.ts                 # Elysia server and Inngest endpoint
│   ├── inngest/
│   │   ├── client.ts           # Inngest client initialization
│   │   └── functions/
│   │       ├── schedule-analysis.ts    # Daily cron workflow
│   │       ├── process-prompt.ts       # Prompt processing workflow
│   │       └── test-function.ts        # Test and manual trigger functions
│   └── lib/
│       ├── ai-clients.ts       # AI provider API clients
│       ├── rate-limiter.ts     # Rate limiting per platform
│       ├── citation-processing.ts  # Citation extraction and analysis
│       ├── types.ts            # TypeScript type definitions
│       └── utils.ts            # Shared utilities (Supabase client, logging)
├── Dockerfile                  # Docker configuration
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript configuration
└── README.md                  # This file
```

## 🔍 Monitoring & Debugging

### Logs

The service uses structured logging with context:

```
[INFO] [process-prompt] Processing prompt abc123 for project xyz789
[INFO] [process-prompt] Available platforms: openai, gemini, claude, perplexity
[INFO] [rate-limiter] Rate limit reached for gemini. Waiting 25s
[ERROR] [process-prompt] gemini failed: Rate limit exceeded...
```

### Inngest Dashboard

Monitor function execution:

- **Runs**: View all function executions with status, duration, and errors
- **Events**: See incoming events and their data
- **Logs**: Detailed step-by-step execution logs

### Railway Logs

Access logs via Railway dashboard:

- Real-time log streaming
- Historical log search
- Error tracking

### Common Issues

#### Functions not executing

1. Check Inngest sync status
2. Verify environment variables are set
3. Check Railway logs for startup errors
4. Verify `/api/inngest` endpoint is accessible

#### Rate limit errors (429)

1. Check rate limit logs to see wait times
2. Consider reducing concurrency limit
3. Verify rate limits match your API tier
4. For distributed systems, implement Redis-based rate limiting

#### Missing AI responses

1. Check `ai_responses` table for records with `status: "error"`
2. Review error messages in `error_message` column
3. Verify API keys are valid and have sufficient quota
4. Check logs for specific platform failures

## 🔧 Configuration

### Concurrency Limits

Adjust in `src/inngest/functions/process-prompt.ts`:

```typescript
concurrency: {
  limit: 5, // Adjust based on your Inngest plan
}
```

### Rate Limits

Update in `src/lib/rate-limiter.ts`:

```typescript
export const RATE_LIMITS: Record<AIProvider, { rpm: number }> = {
  gemini: { rpm: 10 }, // Update based on your API tier
  // ...
};
```

### Cron Schedule

Modify in `src/inngest/functions/schedule-analysis.ts`:

```typescript
{
  cron: "0 2 * * *";
} // Change to your preferred schedule
```

## 📝 API Endpoints

### Health Check

```
GET /
```

Returns: `"Prompt Analysis Orchestrator Running"`

### Health Status

```
GET /health
```

Returns:

```json
{
  "status": "ok",
  "timestamp": "2025-01-29T12:00:00.000Z"
}
```

### Inngest Endpoint

```
ALL /api/inngest
```

This endpoint is used by Inngest to sync and invoke functions. Do not call this directly.

### Test Endpoints (Development)

```
POST /test/trigger-test
```

Manually triggers the test function.

```
POST /test/trigger-manual-schedule
```

Manually triggers the schedule analysis workflow.

## 🔐 Security

- **Service Role Key**: Uses Supabase service role key for database access (bypasses RLS)
- **API Keys**: Stored as environment variables, never committed to code
- **Error Messages**: Sanitized to avoid exposing sensitive information
- **HTTPS**: Always use HTTPS in production

## 🚦 Production Checklist

- [ ] All environment variables configured
- [ ] Inngest app synced with production URL
- [ ] Rate limits match your API tier
- [ ] Concurrency limits match your Inngest plan
- [ ] Monitoring and alerting configured
- [ ] Error tracking set up
- [ ] Database backups enabled
- [ ] Logs retention configured

## 📚 Additional Resources

- [Inngest Documentation](https://www.inngest.com/docs)
- [Elysia Documentation](https://elysiajs.com)
- [Supabase Documentation](https://supabase.com/docs)
- [Bun Documentation](https://bun.sh/docs)

## 🤝 Contributing

1. Make changes in a feature branch
2. Test locally with `bun dev` and Inngest Dev Server
3. Verify functions sync correctly
4. Submit pull request with clear description

## 📄 License

Part of the Ateneai MVP Geo SaaS platform.
