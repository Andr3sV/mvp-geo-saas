# Architecture Documentation

## System Overview

The Prompt Analysis Orchestrator is a microservice designed to process large volumes of prompts across multiple AI providers in a reliable, scalable manner.

## High-Level Architecture

```
┌─────────────────┐
│   Supabase      │
│   (Database)    │
│                 │
│ - prompt_tracking
│ - ai_responses  │
│ - analysis_jobs │
│ - brand_mentions│
│ - brand_sentiment_attributes
│ - potential_competitors
└────────┬────────┘
         │
         │ (queries)
         │
┌────────▼──────────────────────────────────────┐
│         Backend Orchestrator Service          │
│                                               │
│  ┌────────────────────────────────────────┐  │
│  │         Elysia Server (Bun)            │  │
│  │  - HTTP endpoints                      │  │
│  │  - /api/inngest (Inngest handler)      │  │
│  └──────────────┬─────────────────────────┘  │
│                 │                             │
│  ┌──────────────▼─────────────────────────┐  │
│  │         Inngest Orchestrator           │  │
│  │                                         │  │
│  │  ┌──────────────────────────────────┐  │  │
│  │  │  schedule-daily-analysis         │  │  │
│  │  │  (Cron: 2 AM daily)              │  │  │
│  │  └──────────┬───────────────────────┘  │  │
│  │             │                           │  │
│  │             │ emits events              │  │
│  │             │                           │  │
│  │  ┌──────────▼───────────────────────┐  │  │
│  │  │  process-single-prompt           │  │  │
│  │  │  (Concurrency: 5)                │  │  │
│  │  └──────────┬───────────────────────┘  │  │
│  │             │                           │  │
│  │  ┌──────────┴───────────────────────┐  │  │
│  │  │  analyze-brands-batch           │  │  │
│  │  │  (Cron: 4 AM & 6 AM daily)        │  │  │
│  │  └──────────┬───────────────────────┘  │  │
│  │             │                           │  │
│  │             │ emits events              │  │
│  │             │                           │  │
│  │  ┌──────────▼───────────────────────┐  │  │
│  │  │  analyze-single-response         │  │  │
│  │  │  (Concurrency: 5)                │  │  │
│  │  └──────────┬───────────────────────┘  │  │
│  └─────────────┼───────────────────────────┘  │
│                │                               │
│  ┌─────────────▼─────────────────────────┐   │
│  │  AI Clients Layer                     │   │
│  │  - Rate Limiter                       │   │
│  │  - OpenAI Client                      │   │
│  │  - Gemini Client                      │   │
│  │  - Claude Client                      │   │
│  │  - Perplexity Client                  │   │
│  │  - Groq Client (Brand Analysis)       │   │
│  └─────────────┬─────────────────────────┘   │
└────────────────┼───────────────────────────────┘
                 │
                 │ (API calls)
                 │
      ┌──────────┼──────────┐
      │          │          │
┌─────▼─────┐ ┌─▼──────┐ ┌─▼──────────┐ ┌─▼──────┐
│  OpenAI   │ │ Gemini │ │  Claude    │ │  Groq  │
│  API      │ │  API   │ │  API       │ │  API   │
└───────────┘ └────────┘ └────────────┘ └────────┘
```

## Component Details

### 1. Elysia Server

**Purpose**: HTTP server that exposes Inngest endpoint

**Key Responsibilities**:

- Serves Inngest HTTP endpoint at `/api/inngest`
- Handles health check endpoints
- Provides test endpoints for manual triggering

**Technology**: ElysiaJS (Bun-based)

### 2. Inngest Orchestrator

**Purpose**: Event-driven workflow orchestration

**Key Features**:

- **Scheduled Jobs**: Cron-based triggers
- **Event-Driven**: Reactive to events
- **Retries**: Automatic retry with exponential backoff
- **Concurrency Control**: Limits parallel execution
- **Step Isolation**: Each step can fail independently

**Workflows**:

#### schedule-daily-analysis

- **Type**: Scheduled (Cron)
- **Schedule**: `0 2 * * *` (2:00 AM daily)
- **Steps**:
  1. Fetch active prompts (paginated)
  2. For each prompt, check which platforms already have successful responses TODAY
  3. Only send events for platforms that don't have successful responses today
  4. Generate batch ID
  5. Send `analysis/process-prompt` events with `platforms_to_process` field
- **Duplicate Prevention**: Verifies existing successful responses from today to avoid processing platforms that already succeeded
- **Event Structure**: Includes `platforms_to_process` array to specify which platforms need processing

#### process-single-prompt

- **Type**: Event-Driven
- **Trigger**: `analysis/process-prompt` event
- **Concurrency**: 5
- **Processing Mode**: **SEQUENTIAL** (to respect Gemini Tier 1 rate limits)
- **Steps**:
  1. Fetch prompt data
  2. Determine platforms to process (from event `platforms_to_process` or all available)
  3. For each platform, double-check if already has successful response TODAY (race condition protection)
  4. Create analysis job record
  5. **Process platforms SEQUENTIALLY** (OpenAI first, then Gemini) using `callAIWithRetry`
     - **Why Sequential?** Gemini Tier 1 has strict rate limits (8 RPM)
     - With 5 concurrent functions, parallel processing would cause ~5-10 Gemini calls/second
     - Sequential processing spaces calls naturally: OpenAI (~10s) → Gemini (~10s)
     - This prevents rate limit saturation across concurrent instances
  6. Save AI responses
  7. Process citations
  8. Dispatch brand analysis events (asynchronously)
  9. Update job status
- **Retry Logic**: Automatically retries up to 3 times if rate limit is hit, waiting for the time specified by the API
- **Duplicate Prevention**: Double-checks for existing successful responses before processing each platform
- **Rate Limit Handling**: Uses `callAIWithRetry` which automatically handles rate limit errors with exponential backoff
- **Future Optimization**: Code includes commented PARALLEL implementation for when Gemini is upgraded to Tier 2+ (>$250 USD invested, 1000+ RPM)

#### analyze-brands-batch

- **Type**: Scheduled (Cron)
- **Schedule**: `0 4 * * *` (4:00 AM daily)
- **Concurrency**: 5
- **Steps**:
  1. Fetch pending AI responses (not yet analyzed)
  2. Filter out already-analyzed responses
  3. Send `brand/analyze-response` events

#### analyze-brands-batch-6am

- **Type**: Scheduled (Cron)
- **Schedule**: `0 6 * * *` (6:00 AM daily)
- **Concurrency**: 5
- **Steps**:
  1. Fetch pending AI responses (not yet analyzed)
  2. Filter out already-analyzed responses
  3. Send `brand/analyze-response` events
- **Purpose**: Catches any responses that were generated after the 4 AM batch

#### analyze-single-response

- **Type**: Event-Driven
- **Trigger**: `brand/analyze-response` event
- **Concurrency**: 5
- **Steps**:
  1. Fetch response and project data
  2. Check if already analyzed (idempotent)
  3. Analyze brands via Groq API
  4. Save results to brand analysis tables

### 3. AI Clients Layer

**Purpose**: Abstract AI provider APIs

**Components**:

#### Rate Limiter

- **Location**: `src/lib/rate-limiter.ts`
- **Method**: In-memory timestamp tracking (per instance)
- **Behavior**:
  - Waits when rate limit approached
  - For Gemini: Ensures minimum 7.5 seconds between requests (8 RPM conservative limit)
  - Detailed logging when rate limits are hit
- **Limits**:
  - OpenAI: 5,000 RPM
  - **Gemini: 8 RPM** (conservative, leaving 2 req/min margin for safety)
    - **Tier 1 (Current)**: 8 RPM, 250K TPM, 5 RPD
    - **Tier 2** (requires >$250 USD invested): 1000+ RPM
    - **Tier 3** (requires >$1000 USD invested): 2000+ RPM
  - Claude: 50 RPM
  - Perplexity: 50 RPM
- **Note**: Rate limiter is per-instance. For distributed systems with multiple instances, consider Redis-based rate limiting in the future.

##### Gemini Rate Limit Strategy

**Problem**: With 5 concurrent `process-single-prompt` functions and parallel platform processing, Gemini receives ~5-10 simultaneous requests, exceeding the 8 RPM limit.

**Solution**: Sequential platform processing within each function:
1. Process OpenAI first (~10 seconds)
2. Then process Gemini (~10 seconds)
3. This naturally spaces Gemini calls across the 5 concurrent instances
4. Result: ~6-8 Gemini calls/minute (within limit)

**Future**: When upgraded to Gemini Tier 2+, switch back to parallel processing for faster execution (code is commented in `process-prompt.ts`).

#### AI Clients

- **OpenAI**: GPT-4 Turbo Preview
- **Gemini**: Gemini 2.0 Flash Exp (with Google Search)
- **Claude**: Claude Haiku 4.5
- **Perplexity**: Sonar Pro (with web search)

### 4. Data Flow

#### Daily Analysis Flow

```
1. Cron Trigger (2:00 AM)
   ↓
2. schedule-daily-analysis function
   ↓
3. Query prompt_tracking (is_active = true)
   ↓
4. For each prompt:
   - Check which platforms have successful responses TODAY
   - Only emit "analysis/process-prompt" event for missing platforms
   - Include platforms_to_process in event data
   ↓
5. Inngest queues events
   ↓
6. process-single-prompt functions execute (max 5 parallel)
   - Double-check for existing responses (race condition protection)
   - Use callAIWithRetry for automatic retry on rate limits
```

#### Single Prompt Processing Flow

```
1. Event "analysis/process-prompt" received
   ↓
2. Fetch prompt data from prompt_tracking
   ↓
3. Determine platforms to process (from event.platforms_to_process or all available)
   ↓
4. SEQUENTIAL processing for each platform (to respect Gemini Tier 1 limits):
   a. Process OpenAI first (~10 seconds):
      - Double-check if already has successful response TODAY (skip if exists)
      - Create ai_responses record (status: "processing")
      - Apply rate limiting (with automatic retry via callAIWithRetry)
      - Call OpenAI API (with automatic retry up to 3 times on rate limit)
      - Update ai_responses (status: "success"/"error")
      - Save citations
      - Trigger citation processing
   
   b. Then process Gemini (~10 seconds):
      - Double-check if already has successful response TODAY (skip if exists)
      - Create ai_responses record (status: "processing")
      - Apply rate limiting (with automatic retry via callAIWithRetry)
      - Call Gemini API (with automatic retry up to 3 times on rate limit)
      - Update ai_responses (status: "success"/"error")
      - Save citations
      - Trigger citation processing
   
   c. Sequential spacing prevents rate limit saturation:
      - 5 concurrent functions × 1 Gemini call every ~20s
      - Results in ~6-8 Gemini calls/minute (within 8 RPM limit)
   ↓
5. Dispatch brand analysis events (asynchronously)
   ↓
6. Update analysis_jobs (status: "completed"/"failed")

Note: When upgraded to Gemini Tier 2+ (1000+ RPM), switch to PARALLEL 
processing for faster execution (see commented code in process-prompt.ts)
```

## Data Models

### Analysis Jobs

Tracks the overall analysis execution:

```typescript
{
  id: UUID;
  project_id: UUID;
  prompt_tracking_id: UUID;
  status: "pending" | "running" | "completed" | "failed";
  total_platforms: number;
  completed_platforms: number;
  failed_platforms: number;
  started_at: timestamp;
  completed_at: timestamp;
  created_by: UUID | null;
}
```

### AI Responses

Stores individual platform responses:

```typescript
{
  id: UUID;
  prompt_tracking_id: UUID;
  project_id: UUID;
  platform: "openai" | "gemini" | "claude" | "perplexity";
  model_version: string;
  prompt_text: text;
  response_text: text;
  status: "processing" | "success" | "error";
  tokens_used: number;
  cost: number;
  execution_time_ms: number;
  metadata: jsonb;
  error_message: text;
}
```

## Error Handling

### Strategy

1. **Platform Isolation**: Failure in one platform doesn't stop others
2. **Graceful Degradation**: Partial success is acceptable
3. **Error Logging**: All errors logged with context
4. **Status Tracking**: Errors stored in database for debugging

### Error Types

#### Rate Limit Errors (429)

- **Handling**: Automatic retry with delay
- **Logging**: Detailed rate limit information
- **Status**: Marked as error with rate limit message

#### API Errors

- **Handling**: Caught per platform
- **Logging**: Full error message and stack trace
- **Status**: Marked as error in ai_responses

#### Database Errors

- **Handling**: Fail fast, retry at function level
- **Logging**: Database error details
- **Status**: Function marked as failed

## Scalability Considerations

### Current Limitations

1. **Rate Limiting**: In-memory (not shared across instances)
2. **Concurrency**: Limited by Inngest plan (currently 5)
3. **Database Connections**: Single Supabase client per instance

### Scaling Strategies

#### Horizontal Scaling

**Current State**: Single instance

**Challenges**:

- Rate limiting not shared
- Database connection pooling needed
- Event ordering not guaranteed

**Solutions**:

1. **Redis-based Rate Limiting**: Shared rate limit state
2. **Connection Pooling**: Use Supabase connection pooling
3. **Idempotency**: Make functions idempotent

#### Vertical Scaling

**Options**:

1. Increase Inngest concurrency limit (upgrade plan)
2. Increase Railway instance size
3. Optimize database queries

### Performance Optimization

1. **Parallel Execution**: All platforms called in parallel
2. **Pagination**: Handles large prompt lists efficiently
3. **Batch Processing**: Events sent in batches (1000 at a time)
4. **Rate Limiting**: Prevents API throttling

## Monitoring & Observability

### Logs

Structured logging with context:

- Function name
- Step name
- Timestamp
- Error details

### Metrics to Track

1. **Function Execution**:

   - Success rate
   - Average duration
   - Error rate by platform

2. **Rate Limiting**:

   - Wait times per platform
   - Rate limit hit frequency

3. **Database**:
   - Query performance
   - Connection pool usage

### Alerting

Recommended alerts:

- High error rate (>10%)
- Rate limit errors increasing
- Function execution failures
- Database connection errors

## Security

### Authentication

- **Supabase**: Service role key (bypasses RLS)
- **AI APIs**: API keys from environment variables

### Data Protection

- API keys never logged
- Error messages sanitized
- HTTPS required in production

### Access Control

- Inngest endpoint protected by signing keys
- Database access via service role (restricted)

## Deployment Architecture

### Railway Deployment

```
GitHub Repository
      │
      │ (auto-deploy on push)
      │
      ▼
Railway Platform
      │
      │ (builds Docker image)
      │
      ▼
Docker Container
      │
      │ (runs Elysia server)
      │
      ▼
Public URL (https://...)
      │
      │ (Inngest syncs)
      │
      ▼
Inngest Cloud
```

### Environment Isolation

- **Development**: Local with Inngest Dev Server
- **Production**: Railway + Inngest Cloud

## AI APIs Integration & Citation Extraction

### OpenAI API Integration

#### Overview

We use OpenAI's **Responses API** with the `web_search` tool to get structured citations and guaranteed web search functionality.

#### Configuration

- **Endpoint**: `https://api.openai.com/v1/responses`
- **Model**: `gpt-4.1-mini` (default, non-reasoning model for faster, cheaper responses)
- **API Type**: Responses API (not Chat Completions)

#### Request Structure

```typescript
{
  model: "gpt-4.1-mini",
  tools: [{ type: "web_search" }],
  tool_choice: "required",  // Forces web search usage
  input: "user prompt text"  // Truncated to 6000 chars max
}
```

**Important Parameters**:

- `tool_choice: "required"` ensures web search is always used
- Prompt is capped at 6000 characters to control token usage
- `max_tokens` and `temperature` are NOT included (Responses API doesn't support them)

#### Response Structure

The Responses API returns an array of `output` items:

```json
{
  "output": [
    {
      "type": "web_search_call",
      "id": "ws_...",
      "status": "completed",
      "action": {
        "action": "search",
        "query": "search query text"
      }
    },
    {
      "type": "message",
      "id": "msg_...",
      "status": "completed",
      "content": [
        {
          "type": "output_text",
          "text": "Response text with citations",
          "annotations": [
            {
              "type": "url_citation",
              "start_index": 0,
              "end_index": 50,
              "url": "https://example.com",
              "title": "Page Title"
            }
          ]
        }
      ]
    }
  ],
  "usage": {
    "total_tokens": 1500
  }
}
```

#### Citation Extraction Process

1. **Extract Web Search Queries**:

   - Look for `web_search_call` items in `output` array
   - Extract `action.query` from search actions
   - Sanitize queries: decode Unicode escapes, remove "Note:" sections

2. **Extract Citations**:

   - Find `message` items with `output_text` content
   - Extract `annotations` array (type: `url_citation`)
   - For each annotation:
     - Extract `url`, `title`, `start_index`, `end_index`
     - Get text fragment from response using indices
     - Extract domain from URL or title
     - Associate with web search query

3. **Query Sanitization**:
   - Decode Unicode escape sequences (`\u00bf` → `¿`, `\u00e9` → `é`)
   - Remove literal `\n\nNote:` patterns and everything after
   - Remove surrounding quotes and trailing parentheses/brackets
   - Trim whitespace

#### Citation Data Structure

Each citation is stored with:

```typescript
{
  web_search_query: string,      // Sanitized query
  uri: string,                   // Same as url (backfilled)
  url: string,                   // Citation URL
  domain: string,                // Extracted domain
  start_index: number,           // Start position in response text
  end_index: number,             // End position in response text
  text: string,                  // Text fragment being cited
  metadata: {
    title: string,
    platform: "openai",
    api_type: "responses"
  }
}
```

#### Example Flow

```typescript
// 1. API Call
const response = await fetch("https://api.openai.com/v1/responses", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    model: "gpt-4.1-mini",
    tools: [{ type: "web_search" }],
    tool_choice: "required",
    input: truncatedPrompt,
  }),
});

// 2. Extract Response Text
const outputItems = data.output || [];
const responseText =
  outputItems
    .find((item) => item.type === "message")
    ?.content?.find((content) => content.type === "output_text")?.text || "";

// 3. Extract Citations
const citations = extractOpenAICitations(data, responseText);

// 4. Save to Database
await saveCitations(supabase, aiResponseId, citations);
```

---

### Gemini API Integration

#### Overview

We use Gemini's `generateContent` API with `google_search` tool to enable web search and grounding.

#### Configuration

- **Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}`
- **Model**: `gemini-2.0-flash-exp` (default)
- **API Type**: Generate Content API

#### Request Structure

```typescript
{
  contents: [
    {
      parts: [
        {
          text: "user prompt text"
        }
      ]
    }
  ],
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 2000
  },
  tools: [
    {
      google_search: {}  // Enables Google Search grounding
    }
  ]
}
```

#### Response Structure

```json
{
  "candidates": [
    {
      "content": {
        "parts": [
          {
            "text": "Response text with citations"
          }
        ]
      },
      "groundingMetadata": {
        "webSearchQueries": ["search query 1", "search query 2"],
        "groundingChunks": [
          {
            "web": {
              "uri": "gs://...",
              "title": "Example Domain"
            }
          }
        ],
        "groundingSupports": [
          {
            "segment": {
              "startIndex": 0,
              "endIndex": 50,
              "text": "Text fragment"
            },
            "groundingChunkIndices": [0, 1]
          }
        ]
      }
    }
  ]
}
```

#### Citation Extraction Process

1. **Extract Grounding Metadata**:

   - Access `candidates[0].groundingMetadata`
   - Extract `webSearchQueries` array
   - Extract `groundingChunks` (sources)
   - Extract `groundingSupports` (text segments with source links)

2. **Create Citations (One per Fragment+Source)**:

   - For each `groundingSupport`:
     - Get `segment` (text fragment with indices)
     - For each `groundingChunkIndex`:
       - Get corresponding `groundingChunk`
       - Transform URI to URL if needed
       - Extract domain from title or URL
       - Create citation linking fragment to source

3. **URI to URL Transformation**:
   - If URI contains `vertexaisearch`, construct URL from title
   - If title doesn't start with `http`, prepend `https://`
   - Skip Vertex AI internal URIs without titles

#### Citation Data Structure

Each citation represents one text fragment linked to one source:

```typescript
{
  web_search_query: string,      // First query from webSearchQueries
  uri: string,                   // Original URI from groundingChunk
  url: string,                   // Transformed URL (if URI was Vertex)
  domain: string,                // Extracted domain
  start_index: number,           // Start position in response text
  end_index: number,             // End position in response text
  text: string,                  // Text fragment (from segment.text)
  metadata: {
    chunk_index: number,
    platform: "gemini"
  }
}
```

**Important**: For Gemini, if a text fragment has multiple sources, each combination creates a separate citation row (Option A: one row per fragment+source).

#### URI Transformation Logic

Gemini returns URIs in Vertex AI format (`gs://vertexaisearch...`). We transform them to real URLs:

1. If URI contains `vertexaisearch`:

   - Use `title` to construct URL
   - If title doesn't start with `http`, prepend `https://`
   - If no title available, skip the citation

2. If URI is already a real URL:

   - Return as-is (if not Vertex URI)
   - Otherwise apply transformation

3. Domain Extraction:
   - Parse URL to extract hostname
   - Remove `www.` prefix
   - Fallback to extracting from title if URL parsing fails

#### Example Flow

```typescript
// 1. API Call
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2000,
      },
      tools: [{ google_search: {} }],
    }),
  }
);

// 2. Extract Response
const candidate = data.candidates?.[0];
const text = candidate?.content?.parts?.[0]?.text || "";
const groundingMetadata = candidate?.groundingMetadata;

// 3. Extract Citations
const citations = extractGeminiCitations(data);

// 4. Save to Database
await saveCitations(supabase, aiResponseId, citations);
```

#### Rate Limiting

Gemini has strict rate limits:

- **Limit**: 10 requests per minute per model
- **Error Handling**: 429 errors include `RetryInfo` with retry delay
- **Error Structure**:
  ```json
  {
    "error": {
      "code": 429,
      "details": [
        {
          "@type": "type.googleapis.com/google.rpc.RetryInfo",
          "retryDelay": "25s"
        },
        {
          "@type": "type.googleapis.com/google.rpc.QuotaFailure",
          "violations": [
            {
              "quotaMetric": "generativelanguage.googleapis.com/generate_requests_per_model",
              "quotaValue": "10"
            }
          ]
        }
      ]
    }
  }
  ```

---

### Citation Storage

#### Database Schema

Citations are stored in the `citations` table:

```sql
CREATE TABLE citations (
  id UUID PRIMARY KEY,
  ai_response_id UUID NOT NULL REFERENCES ai_responses(id),

  web_search_query TEXT,
  uri TEXT,
  url TEXT,
  domain TEXT,

  start_index INTEGER,
  end_index INTEGER,
  text TEXT,

  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### Storage Logic

1. **Validation**: Citations must have `url` OR `uri` (not null)
2. **Backfilling**: If `uri` is missing, use `url` (and vice versa) to avoid nulls
3. **Filtering**: Invalid citations (no URL/URI) are skipped with logging
4. **Batch Insert**: All valid citations are inserted in a single transaction

#### Storage Process

```typescript
// 1. Filter valid citations
const validCitations = citationsData.filter(
  (citation) => citation.url || citation.uri
);

// 2. Prepare records
const records = validCitations.map((citation) => ({
  ai_response_id: aiResponseId,
  web_search_query: citation.web_search_query || null,
  uri: citation.uri || citation.url || null, // Backfill
  url: citation.url || citation.uri || null, // Backfill
  domain: citation.domain || null,
  start_index: citation.start_index ?? null,
  end_index: citation.end_index ?? null,
  text: citation.text || null,
  metadata: citation.metadata || {},
}));

// 3. Insert into database
await supabase.from("citations").insert(records);
```

---

### Key Differences: OpenAI vs Gemini

| Aspect                 | OpenAI (Responses API)         | Gemini (Generate Content)             |
| ---------------------- | ------------------------------ | ------------------------------------- |
| **API Type**           | Responses API                  | Generate Content API                  |
| **Web Search Tool**    | `{ type: "web_search" }`       | `{ google_search: {} }`               |
| **Model**              | `gpt-4.1-mini`                 | `gemini-2.0-flash-exp`                |
| **Citation Source**    | `output[].annotations`         | `groundingMetadata.groundingSupports` |
| **Query Source**       | `web_search_call.action.query` | `groundingMetadata.webSearchQueries`  |
| **Citation Model**     | One citation per annotation    | One citation per fragment+source      |
| **URL Format**         | Direct URLs                    | May need URI→URL transformation       |
| **Query Sanitization** | Unicode decode, remove "Note:" | None (queries already clean)          |

---

## Brand Analysis Architecture

### Overview

The Brand Analysis system uses AI (via Groq) to analyze AI-generated responses and extract structured data about brand mentions, competitor mentions, sentiment, attributes, and potential competitors. This replaces the previous simple text-based search approach with a more sophisticated semantic analysis.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Response Generated                     │
│              (stored in ai_responses table)                 │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │
        ┌───────────────┴───────────────┐
        │                               │
        │                               │
┌───────▼────────┐            ┌─────────▼──────────┐
│  Batch Process │            │  Event-Driven      │
│  (Scheduled)   │            │  (Real-time)      │
│                │            │                    │
│ analyze-brands-│            │ analyze-single-   │
│ batch          │            │ response           │
│ (4 AM & 6 AM)  │            │                    │
│                │            │ Event: brand/      │
│                │            │ analyze-response   │
└───────┬────────┘            └─────────┬──────────┘
        │                               │
        │                               │
        └───────────────┬───────────────┘
                        │
                        │
            ┌───────────▼───────────┐
            │   Groq API Client     │
            │   (gpt-oss-20b)       │
            │                       │
            │ - Brand detection     │
            │ - Sentiment analysis  │
            │ - Attribute extraction│
            └───────────┬───────────┘
                        │
                        │ JSON Response
                        │
            ┌───────────▼───────────┐
            │  Brand Storage Layer  │
            │                       │
            │ - brand_mentions      │
            │ - brand_sentiment_    │
            │   attributes          │
            │ - potential_          │
            │   competitors         │
            └───────────────────────┘
```

### Inngest Functions

#### analyze-brands-batch

**Type**: Scheduled (Cron)  
**Schedule**: `0 4 * * *` (4:00 AM daily)  
**Concurrency**: 5  
**Purpose**: Process all pending AI responses that haven't been analyzed yet

**Steps**:

1. **Fetch Pending Responses**

   - Query `ai_responses` table for responses with `status = 'success'`
   - Filter out responses that already have entries in `brand_mentions` table
   - Paginate through results (100 per batch)

2. **Send Events**
   - For each pending response, emit `brand/analyze-response` event
   - Events are sent in batches of 50 to avoid payload limits

**Configuration**:

- Runs daily at 4:00 AM (after AI responses are generated at 2:00 AM)
- Processes responses in order of creation (newest first)
- Automatically skips already-analyzed responses

#### analyze-brands-batch-6am

**Type**: Scheduled (Cron)  
**Schedule**: `0 6 * * *` (6:00 AM daily)  
**Concurrency**: 5  
**Purpose**: Catch any AI responses that were generated after the 4:00 AM batch

**Steps**:

1. **Fetch Pending Responses**

   - Query `ai_responses` table for responses with `status = 'success'`
   - Filter out responses that already have entries in `brand_mentions` table
   - Paginate through results (100 per batch)

2. **Send Events**
   - For each pending response, emit `brand/analyze-response` event
   - Events are sent in batches of 50 to avoid payload limits

**Configuration**:

- Runs daily at 6:00 AM (catches late responses from the 2:00 AM generation)
- Processes responses in order of creation (newest first)
- Automatically skips already-analyzed responses
- Acts as a safety net for responses that took longer to generate

**Example Event**:

```json
{
  "name": "brand/analyze-response",
  "data": {
    "ai_response_id": "uuid-here",
    "project_id": "uuid-here"
  }
}
```

#### analyze-single-response

**Type**: Event-Driven  
**Trigger**: `brand/analyze-response` event  
**Concurrency**: 5 (matches Inngest plan limit)  
**Purpose**: Analyze a single AI response for brand mentions, sentiment, and attributes

**Steps**:

1. **Fetch Response Data**

   - Get AI response from `ai_responses` table
   - Verify response is successful and has text content
   - Fetch project to get brand name
   - Fetch active competitors for the project

2. **Check if Already Analyzed**

   - Query `brand_mentions` to see if analysis already exists
   - Skip if already analyzed (idempotent)

3. **Analyze Brands** (via Groq)

   - Build prompt with brand name, competitor list, and response text
   - Call Groq API with `gpt-oss-20b` model
   - Parse JSON response with validation

4. **Save Analysis Results**
   - Save brand mentions to `brand_mentions` table
   - Save sentiment and attributes to `brand_sentiment_attributes` table
   - Save/update potential competitors in `potential_competitors` table

**Error Handling**:

- If Groq API fails, returns empty/default result (graceful degradation)
- Logs detailed error information for debugging
- Does not throw errors to prevent blocking batch processing

### Groq API Integration

**Model**: `openai/gpt-oss-20b`  
**Endpoint**: `https://api.groq.com/openai/v1/chat/completions`  
**Configuration**:

- `temperature`: 0.2 (very low for consistent JSON)
- `max_tokens`: 2500
- `response_format`: `{ type: 'json_object' }` (forces JSON output)

**Prompt Structure**:
The prompt follows a specific format that works reliably with Groq:

1. Role definition
2. Instructions for analysis
3. Brand & Competitor Detection rules
4. Sentiment Analysis rules
5. Contextual Sentiment Inference rules
6. Attribute Extraction rules
7. Output Format (JSON schema)
8. Client Data (brand name and competitor list)
9. Answer to Analyze (the AI response text)

**Response Format**:

```json
{
  "client_brand_mentioned": true,
  "mentioned_competitors": ["Competitor1", "Competitor2"],
  "client_brand_sentiment": "positive",
  "client_brand_sentiment_rating": 0.7,
  "client_brand_sentiment_ratio": 0.8,
  "competitor_sentiments": [
    {
      "competitor": "Competitor1",
      "sentiment": "neutral",
      "sentiment_rating": 0.0,
      "sentiment_ratio": 0.5
    }
  ],
  "client_brand_attributes": {
    "positive": ["premium", "quality"],
    "negative": []
  },
  "competitor_attributes": [
    {
      "competitor": "Competitor1",
      "positive": ["popular"],
      "negative": []
    }
  ],
  "other_brands_detected": ["Unknown Brand"]
}
```

### Database Schema

#### brand_mentions

Stores all mentions of client brand and competitors found in AI responses.

**Key Fields**:

- `brand_type`: 'client' | 'competitor'
- `competitor_id`: UUID reference (NULL for client brand)
- `entity_name`: Name of the brand mentioned
- `mentioned_text`: Text fragment where mention appears
- `confidence_score`: AI confidence (0-1)

**Indexes**:

- `ai_response_id` (for fast lookups)
- `project_id` (for project-level queries)
- `brand_type` (for filtering)
- `competitor_id` (for competitor-specific queries)

#### brand_sentiment_attributes

Stores sentiment analysis and attributes for each brand mentioned.

**Key Fields**:

- `brand_type`: 'client' | 'competitor'
- `sentiment`: 'positive' | 'negative' | 'neutral' | 'not_mentioned'
- `sentiment_rating`: Numeric score from -1 to 1
- `sentiment_ratio`: Intensity from 0 to 1
- `positive_attributes`: JSONB array of positive attributes
- `negative_attributes`: JSONB array of negative attributes
- `analyzed_text`: The text that was analyzed
- `model_used`: 'openai/gpt-oss-20b' (Groq)

**Indexes**:

- Composite index on `(project_id, brand_type, sentiment)` for common queries
- `ai_response_id` for response-level queries

#### potential_competitors

Stores brands detected in responses that are not the client brand or known competitors.

**Key Fields**:

- `brand_name`: Name of the potential competitor
- `mention_count`: How many times this brand has been mentioned
- `first_detected_at`: When first detected
- `last_detected_at`: When last detected
- `context`: Context where brand was mentioned

**Unique Constraint**: `(project_id, brand_name)` to prevent duplicates

### Data Flow

#### Batch Processing Flow

```
1. Cron triggers analyze-brands-batch at 4:00 AM
   ↓
2. Query ai_responses for pending responses
   ↓
3. Filter out already-analyzed responses
   ↓
4. For each pending response:
   - Emit brand/analyze-response event
   ↓
5. analyze-single-response processes each event
   ↓
6. Results saved to brand_mentions, brand_sentiment_attributes, potential_competitors
   ↓
7. Cron triggers analyze-brands-batch-6am at 6:00 AM (safety net)
   ↓
8. Repeat steps 2-6 for any responses missed in the 4 AM batch
```

#### Event-Driven Flow

```
1. AI response saved to ai_responses (status = 'success')
   ↓
2. Optionally: Emit brand/analyze-response event immediately
   ↓
3. analyze-single-response processes the event
   ↓
4. Results saved to database
```

### Integration Points

#### With Existing System

1. **After AI Response Generation**

   - `process-single-prompt` saves AI response
   - Optionally triggers `brand/analyze-response` event
   - Or waits for batch processing

2. **Data Sources**

   - Reads from `ai_responses` table
   - Reads from `projects` table (for brand name)
   - Reads from `competitors` table (for competitor list)

3. **Data Output**
   - Writes to `brand_mentions`
   - Writes to `brand_sentiment_attributes`
   - Writes to `potential_competitors`

### Error Handling

**Groq API Failures**:

- Returns empty/default result structure
- Logs detailed error information
- Does not block batch processing
- Allows retry on next batch run

**JSON Parsing Failures**:

- Attempts to clean JSON (removes markdown code blocks)
- Validates all fields with defaults
- Throws error if JSON is completely invalid
- Returns default structure on error

**Database Failures**:

- Logs error but continues processing
- Individual record failures don't block batch
- Uses transactions where appropriate

### Performance Considerations

**Batch Processing**:

- Processes 100 responses per query batch
- Sends events in batches of 50
- Concurrency limit of 5 prevents overload

**Groq API**:

- Very fast inference (typically < 2 seconds)
- Low cost (gpt-oss-20b is economical)
- Rate limits handled by Groq (generous for free tier)

**Database**:

- Indexes on all foreign keys
- Composite indexes for common queries
- Efficient filtering of already-analyzed responses

### Cost Optimization

1. **Batch Processing**: Processes all responses once daily instead of real-time
2. **Idempotency**: Skips already-analyzed responses
3. **Groq Model**: Uses cost-effective `gpt-oss-20b` instead of expensive models
4. **Low Temperature**: 0.2 reduces token usage by generating more consistent outputs

### Monitoring

**Key Metrics**:

- Number of responses analyzed per day
- Groq API success rate
- Average analysis time
- Number of brands detected
- Number of potential competitors found

**Logs to Watch**:

- `[brand-analysis]` - Analysis process logs
- `[groq-client]` - Groq API calls
- `[brand-storage]` - Database operations
- `[analyze-single-response]` - Function execution

---

## Future Improvements

1. **Redis Integration**: Shared rate limiting across instances
2. **Metrics Collection**: Prometheus/Grafana integration
3. **Webhook Support**: Real-time notifications on completion
4. **Dynamic Rate Limits**: Adjust based on API tier
5. **Batch Optimization**: Smarter batching strategies
6. **Circuit Breaker**: Prevent cascade failures
7. **Citation Quality Scoring**: Filter low-quality citations
8. **URL Validation**: Verify citations URLs are accessible
