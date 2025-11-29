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
- **Gemini**: Gemini 2.5 Flash Lite (with Google Search)
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

## Future Improvements

1. **Redis Integration**: Shared rate limiting across instances
2. **Metrics Collection**: Prometheus/Grafana integration
3. **Webhook Support**: Real-time notifications on completion
4. **Dynamic Rate Limits**: Adjust based on API tier
5. **Batch Optimization**: Smarter batching strategies
6. **Circuit Breaker**: Prevent cascade failures
