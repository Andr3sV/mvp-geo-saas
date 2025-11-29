# Migration Guide: Edge Functions to Inngest Service

This document outlines the migration from Supabase Edge Functions to the new Inngest-based orchestrator service.

## Overview

The old system used Supabase Edge Functions with a queue-based architecture:

- `trigger-daily-analysis`: Cron job that triggered daily analysis
- `process-queue`: Worker that processed the analysis queue
- `analyze-prompt`: Function that analyzed prompts across AI platforms

The new system uses Inngest for orchestration:

- `schedule-daily-analysis`: Inngest cron workflow
- `process-single-prompt`: Inngest event-driven workflow

## Migration Steps

### 1. Verify New Service is Working

Before removing old functions, ensure:

- [ ] New service is deployed and running
- [ ] Inngest functions are synced
- [ ] Test function executes successfully
- [ ] Manual trigger works
- [ ] AI responses are being saved to database

### 2. Disable Old Cron Jobs

If you have pg_cron jobs configured in Supabase:

```sql
-- List all cron jobs
SELECT * FROM cron.job;

-- Find the trigger-daily-analysis job
SELECT * FROM cron.job WHERE jobname LIKE '%trigger-daily-analysis%';

-- Unschedule the old cron job (if exists)
SELECT cron.unschedule('trigger-daily-analysis-daily');
```

### 3. Remove Old Edge Functions

Delete these directories from `supabase/functions/`:

- `trigger-daily-analysis/`
- `process-queue/`
- `analyze-prompt/`

**Note**: Keep `analyze-sentiment/` and related sentiment analysis functions as they are still in use.

### 4. Update Documentation

Update any references to old functions:

- Remove from `supabase/functions/README.md`
- Update any API documentation
- Update any frontend code that calls these functions directly

### 5. Clean Up Database (Optional)

If you want to clean up old queue tables (after verifying new system works):

```sql
-- Check if analysis_queue table exists and has data
SELECT COUNT(*) FROM analysis_queue;

-- Only drop if empty and you're sure it's not needed
-- DROP TABLE IF EXISTS analysis_queue;
```

**Warning**: Only do this after confirming the new system has been running successfully for at least a few days.

## Rollback Plan

If you need to rollback:

1. **Restore Edge Functions**:

   ```bash
   git checkout <previous-commit> -- supabase/functions/trigger-daily-analysis
   git checkout <previous-commit> -- supabase/functions/process-queue
   git checkout <previous-commit> -- supabase/functions/analyze-prompt
   ```

2. **Redeploy Edge Functions**:

   ```bash
   supabase functions deploy trigger-daily-analysis
   supabase functions deploy process-queue
   supabase functions deploy analyze-prompt
   ```

3. **Re-enable Cron Job** (if you disabled it):
   ```sql
   SELECT cron.schedule(
     'trigger-daily-analysis-daily',
     '0 2 * * *',
     $$
     SELECT net.http_post(
       url := 'https://your-project.supabase.co/functions/v1/trigger-daily-analysis',
       headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
       body := '{}'::jsonb
     ) AS request_id;
     $$
   );
   ```

## Differences Between Old and New System

### Old System (Edge Functions)

- **Trigger**: pg_cron in Supabase database
- **Queue**: `analysis_queue` table
- **Workers**: Multiple Edge Function invocations
- **Retries**: Manual retry logic in queue
- **Concurrency**: Limited by Edge Function invocations
- **Rate Limiting**: None (caused 429 errors)

### New System (Inngest)

- **Trigger**: Inngest cron scheduler
- **Queue**: Inngest event queue (managed)
- **Workers**: Inngest function executions
- **Retries**: Automatic with exponential backoff
- **Concurrency**: Configurable (currently 5)
- **Rate Limiting**: Per-platform rate limiting

## Benefits of New System

1. **Reliability**: Inngest handles retries and failures automatically
2. **Observability**: Better monitoring and logging in Inngest dashboard
3. **Rate Limiting**: Prevents 429 errors from AI APIs
4. **Scalability**: Better concurrency control
5. **Maintainability**: Single service instead of multiple Edge Functions

## Monitoring After Migration

Monitor these metrics for the first week:

1. **Function Execution Rate**: Should match old system
2. **Error Rate**: Should be lower than old system
3. **AI Response Creation**: Should be consistent
4. **Rate Limit Errors**: Should be minimal or zero
5. **Execution Time**: Should be similar or better

## Support

If you encounter issues during migration:

1. Check Inngest dashboard for function execution logs
2. Check Railway logs for service errors
3. Verify environment variables are set correctly
4. Ensure Inngest functions are synced
