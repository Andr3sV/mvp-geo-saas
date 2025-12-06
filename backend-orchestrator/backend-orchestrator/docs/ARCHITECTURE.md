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
│  └─────────────┼───────────────────────────┘  │
│                │                               │
│  ┌─────────────▼─────────────────────────┐   │
│  │  AI Clients Layer                     │   │
│  │  - Rate Limiter                       │   │
│  │  - OpenAI Client                      │   │
│  │  - Gemini Client                      │   │
│  │  - Claude Client                      │   │
│  │  - Perplexity Client                  │   │
│  └─────────────┬─────────────────────────┘   │
└────────────────┼───────────────────────────────┘
                 │
                 │ (API calls)
                 │
      ┌──────────┼──────────┐
      │          │          │
┌─────▼─────┐ ┌─▼──────┐ ┌─▼──────────┐
│  OpenAI   │ │ Gemini │ │  Claude    │
│  API      │ │  API   │ │  API       │
└───────────┘ └────────┘ └────────────┘
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
  2. Generate batch ID
  3. Emit events for each prompt

#### process-single-prompt

- **Type**: Event-driven
- **Event**: `analysis/process-prompt`
- **Concurrency**: 5 (configurable)
- **Retries**: 3
- **Steps**:
  1. Fetch prompt data
  2. Create analysis job record
  3. Execute AI calls (parallel)
  4. Update job status

### 3. AI Clients Layer

**Purpose**: Abstract AI provider APIs

**Components**:

#### Rate Limiter

- **Location**: `src/lib/rate-limiter.ts`
- **Method**: In-memory timestamp tracking
- **Behavior**: Waits when rate limit approached
- **Limits**:
  - OpenAI: 5,000 RPM
  - Gemini: 10 RPM
  - Claude: 50 RPM
  - Perplexity: 50 RPM

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
   - Emit "analysis/process-prompt" event
   ↓
5. Inngest queues events
   ↓
6. process-single-prompt functions execute (max 5 parallel)
```

#### Single Prompt Processing Flow

```
1. Event "analysis/process-prompt" received
   ↓
2. Fetch prompt data from prompt_tracking
   ↓
3. Create analysis_jobs record
   ↓
4. For each platform (OpenAI, Gemini, Claude, Perplexity):
   a. Apply rate limiting
   b. Create ai_responses record (status: "processing")
   c. Call AI API
   d. Update ai_responses (status: "success"/"error")
   e. Trigger citation processing
   ↓
5. Update analysis_jobs (status: "completed"/"failed")
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
const response = await fetch('https://api.openai.com/v1/responses', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  },
  body: JSON.stringify({
    model: 'gpt-4.1-mini',
    tools: [{ type: 'web_search' }],
    tool_choice: 'required',
    input: truncatedPrompt
  })
});

// 2. Extract Response Text
const outputItems = data.output || [];
const responseText = outputItems
  .find(item => item.type === 'message')
  ?.content
  ?.find(content => content.type === 'output_text')
  ?.text || '';

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
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2000
      },
      tools: [{ google_search: {} }]
    })
  }
);

// 2. Extract Response
const candidate = data.candidates?.[0];
const text = candidate?.content?.parts?.[0]?.text || '';
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
const validCitations = citationsData.filter(citation => 
  citation.url || citation.uri
);

// 2. Prepare records
const records = validCitations.map(citation => ({
  ai_response_id: aiResponseId,
  web_search_query: citation.web_search_query || null,
  uri: citation.uri || citation.url || null,  // Backfill
  url: citation.url || citation.uri || null,  // Backfill
  domain: citation.domain || null,
  start_index: citation.start_index ?? null,
  end_index: citation.end_index ?? null,
  text: citation.text || null,
  metadata: citation.metadata || {}
}));

// 3. Insert into database
await supabase.from('citations').insert(records);
```

---

### Key Differences: OpenAI vs Gemini

| Aspect | OpenAI (Responses API) | Gemini (Generate Content) |
|--------|------------------------|---------------------------|
| **API Type** | Responses API | Generate Content API |
| **Web Search Tool** | `{ type: "web_search" }` | `{ google_search: {} }` |
| **Model** | `gpt-4.1-mini` | `gemini-2.0-flash-exp` |
| **Citation Source** | `output[].annotations` | `groundingMetadata.groundingSupports` |
| **Query Source** | `web_search_call.action.query` | `groundingMetadata.webSearchQueries` |
| **Citation Model** | One citation per annotation | One citation per fragment+source |
| **URL Format** | Direct URLs | May need URI→URL transformation |
| **Query Sanitization** | Unicode decode, remove "Note:" | None (queries already clean) |

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
