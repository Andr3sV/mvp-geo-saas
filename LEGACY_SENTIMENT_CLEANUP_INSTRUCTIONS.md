# Instructions: Complete Legacy Sentiment Analysis Cleanup

## ✅ What Has Been Completed

The following tasks have been completed automatically:

1. ✅ **Frontend Migration**
   - Migrated `src/lib/queries/sentiment-analysis.ts` to use `brand_sentiment_attributes`
   - Updated `src/app/(dashboard)/dashboard/sentiment/page.tsx` to query new tables
   - Updated `src/lib/queries/detailed-report.ts` to use new brand sentiment tables

2. ✅ **Code Cleanup**
   - Removed all legacy Edge Function directories:
     - `supabase/functions/analyze-sentiment/`
     - `supabase/functions/daily-sentiment-analysis/`
     - `supabase/functions/process-sentiment-queue/`
     - `supabase/functions/trigger-sentiment-analysis/`
   - Removed legacy documentation: `docs/SENTIMENT_ANALYSIS_QUEUE_SYSTEM.md`

3. ✅ **Documentation Updates**
   - Updated `supabase/functions/README.md` to reflect migration
   - Updated `backend-orchestrator/backend-orchestrator/docs/CLEANUP_OLD_FUNCTIONS.md`
   - Updated `backend-orchestrator/backend-orchestrator/docs/ARCHITECTURE.md`

4. ✅ **SQL Script Created**
   - Created `supabase/migrations/disable_sentiment_cron_jobs.sql` for disabling cron jobs

## 📋 Manual Steps Required

You need to complete the following steps manually:

### Step 1: Disable Cron Jobs in Supabase (REQUIRED)

Run the SQL script to disable legacy sentiment analysis cron jobs:

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Run the script: `supabase/migrations/disable_sentiment_cron_jobs.sql`
4. Verify no errors in the output

**Alternative: Manual SQL**
```sql
-- List all sentiment-related cron jobs
SELECT jobid, jobname, schedule, command, active 
FROM cron.job 
WHERE command LIKE '%sentiment%' OR jobname LIKE '%sentiment%';

-- Unschedule each one (replace 'job-name' with actual name from above)
SELECT cron.unschedule('daily-sentiment-analysis');
SELECT cron.unschedule('trigger-sentiment-analysis');
-- ... repeat for any other sentiment-related jobs
```

### Step 2: Delete Edge Functions from Supabase (OPTIONAL)

The Edge Functions have been removed from the codebase, but they may still exist in Supabase.

**Option A: Using Supabase Dashboard**
1. Go to Supabase Dashboard → Edge Functions
2. Delete the following functions:
   - `analyze-sentiment`
   - `daily-sentiment-analysis`
   - `process-sentiment-queue`
   - `trigger-sentiment-analysis`

**Option B: Using Supabase CLI**
```bash
supabase functions delete analyze-sentiment
supabase functions delete daily-sentiment-analysis
supabase functions delete process-sentiment-queue
supabase functions delete trigger-sentiment-analysis
```

### Step 3: Verify Frontend Works (REQUIRED)

1. Go to your dashboard: `/dashboard/sentiment`
2. Verify that:
   - Sentiment metrics display correctly
   - Charts render without errors
   - No console errors
   - Data appears current (not stale)

### Step 4: Monitor for 1 Week

Keep an eye on the new system for 1 week to ensure:
- Brand analysis runs successfully via Inngest
- `brand_mentions` table receives new data
- `brand_sentiment_attributes` table receives new sentiment data
- No errors in Inngest dashboard or Railway logs

### Step 5: Optional Database Cleanup (After 1 Month)

After confirming the new system works for at least 1 month, you can optionally:

1. **Archive or drop legacy tables** (CAUTION - only if you don't need historical data):
   ```sql
   -- Option 1: Check if legacy tables have recent data
   SELECT MAX(created_at) FROM sentiment_analysis;
   SELECT MAX(created_at) FROM sentiment_analysis_queue;
   
   -- Option 2: If safe to drop (backup first!)
   -- DROP TABLE IF EXISTS sentiment_analysis;
   -- DROP TABLE IF EXISTS sentiment_analysis_queue;
   ```

2. **Verify new tables have data**:
   ```sql
   SELECT COUNT(*) as total_mentions FROM brand_mentions;
   SELECT COUNT(*) as total_sentiment FROM brand_sentiment_attributes;
   SELECT COUNT(*) as total_competitors FROM potential_competitors;
   ```

## 🔧 Rollback Instructions (If Something Goes Wrong)

If you encounter issues with the new system:

### Restore Edge Functions Code
```bash
# If you need to restore the deleted functions
git checkout HEAD~1 -- supabase/functions/analyze-sentiment
git checkout HEAD~1 -- supabase/functions/daily-sentiment-analysis
git checkout HEAD~1 -- supabase/functions/process-sentiment-queue
git checkout HEAD~1 -- supabase/functions/trigger-sentiment-analysis

# Redeploy them
supabase functions deploy analyze-sentiment
supabase functions deploy daily-sentiment-analysis
supabase functions deploy process-sentiment-queue
supabase functions deploy trigger-sentiment-analysis
```

### Restore Frontend Code
```bash
# Revert frontend changes
git checkout HEAD~1 -- src/lib/queries/sentiment-analysis.ts
git checkout HEAD~1 -- src/app/(dashboard)/dashboard/sentiment/page.tsx
git checkout HEAD~1 -- src/lib/queries/detailed-report.ts
```

## 📊 Current System Architecture

### New System (Active)
- **Platform**: Backend Orchestrator (Railway) + Inngest
- **AI Provider**: Groq (gpt-oss-20b model)
- **Functions**:
  - `analyze-brands-batch` (Inngest): Batch processing of AI responses
  - `analyze-single-response` (Inngest): Individual response analysis
- **Database Tables**:
  - `brand_mentions`: All brand/competitor mentions
  - `brand_sentiment_attributes`: Sentiment analysis for each mention
  - `potential_competitors`: New competitors detected
  - `citations_detail`: Citation tracking
  - `competitor_citations`: Competitor citation tracking

### Legacy System (Removed)
- ~~Platform: Supabase Edge Functions + pg_cron~~
- ~~AI Provider: Gemini 2.0 Flash~~
- ~~Functions: analyze-sentiment, daily-sentiment-analysis, etc.~~
- ~~Database Tables: sentiment_analysis, sentiment_analysis_queue~~

## 🎯 Success Criteria

You'll know the migration is complete when:
- ✅ No active sentiment-related cron jobs in `cron.job`
- ✅ No sentiment Edge Functions deployed in Supabase
- ✅ Frontend displays sentiment data correctly
- ✅ New data flowing into `brand_mentions` and `brand_sentiment_attributes`
- ✅ Inngest dashboard shows successful executions of brand analysis functions
- ✅ No errors in application logs

## 📞 Support

If you encounter any issues:
1. Check Inngest dashboard for function execution logs
2. Check Railway logs for Backend Orchestrator errors
3. Check Supabase logs for database query errors
4. Verify Groq API key is configured correctly in Railway environment

---

**Migration Completed**: December 2024
**System Status**: ✅ Code Migration Complete | ⏳ Manual Steps Required

