# Cleanup Guide: Remove Old Edge Functions

This guide helps you safely remove the old Edge Functions that have been replaced by the Inngest orchestrator service.

## Functions to Remove

The following Edge Functions are **obsolete** and can be safely removed:

1. ✅ `trigger-daily-analysis` - Replaced by `schedule-daily-analysis` (Inngest cron)
2. ✅ `process-queue` - Replaced by `process-single-prompt` (Inngest workflow)
3. ✅ `analyze-prompt` - Logic integrated into `process-single-prompt`

## Functions to Keep

These functions are **still in use** and should NOT be removed:

- ❌ `analyze-sentiment` - Still used for sentiment analysis
- ❌ `daily-sentiment-analysis` - Still used for daily sentiment analysis
- ❌ `process-sentiment-queue` - Still used for sentiment queue processing
- ❌ `trigger-sentiment-analysis` - Still used for sentiment triggers
- ❌ `process-analysis` - May still be used for citation processing

## Pre-Cleanup Checklist

Before removing anything, verify:

- [ ] New Inngest service is deployed and running
- [ ] Inngest functions are synced and visible in dashboard
- [ ] Test function executes successfully
- [ ] At least one successful daily analysis has run with new system
- [ ] AI responses are being created in `ai_responses` table
- [ ] No errors in Inngest dashboard
- [ ] No errors in Railway logs

## Step-by-Step Cleanup

### Step 1: Verify New System is Working

Run a test to ensure the new system works:

1. Go to Inngest Dashboard
2. Find `manual-schedule-analysis` function
3. Click "Invoke" with event `analysis/manual-trigger`
4. Verify it creates AI responses in Supabase

### Step 2: Check for Cron Jobs

Check if there's a cron job calling `trigger-daily-analysis`:

```sql
-- Connect to your Supabase database
-- Run this query to check for cron jobs

SELECT 
  jobid,
  jobname,
  schedule,
  command,
  active
FROM cron.job
WHERE command LIKE '%trigger-daily-analysis%';
```

If you find any, unschedule them:

```sql
-- Replace 'job-name' with the actual job name from above
SELECT cron.unschedule('job-name');
```

### Step 3: Remove Edge Functions from Supabase

**Option A: Using Supabase CLI**

```bash
# Navigate to project root
cd /path/to/mvp-geo-saas

# Remove functions from Supabase
supabase functions delete trigger-daily-analysis
supabase functions delete process-queue
supabase functions delete analyze-prompt
```

**Option B: Using Supabase Dashboard**

1. Go to Supabase Dashboard → Edge Functions
2. Find each function
3. Click the three dots menu
4. Select "Delete"

**Option C: Remove from Codebase Only**

If you want to keep them in Supabase but remove from codebase:

```bash
# Remove directories
rm -rf supabase/functions/trigger-daily-analysis
rm -rf supabase/functions/process-queue
rm -rf supabase/functions/analyze-prompt
```

### Step 4: Update Documentation

Update `supabase/functions/README.md` to remove references to deleted functions.

### Step 5: Clean Up Shared Code (Optional)

If `analyze-prompt` was the only function using certain shared utilities, you can clean those up too. However, be careful - other functions might still use them.

Check what's used:
```bash
# Check if shared code is still referenced
grep -r "from '../shared" supabase/functions/
```

## Verification After Cleanup

After removing the functions:

1. **Verify Inngest still works**:
   - Go to Inngest Dashboard
   - Check functions are still synced
   - Run a test function

2. **Verify no broken references**:
   ```bash
   # Search for any remaining references
   grep -r "trigger-daily-analysis" .
   grep -r "process-queue" .
   grep -r "analyze-prompt" .
   ```

3. **Monitor for 24-48 hours**:
   - Check that daily analysis still runs
   - Verify AI responses are created
   - Check for any errors

## Rollback Instructions

If something goes wrong, you can restore:

```bash
# Restore from git
git checkout HEAD -- supabase/functions/trigger-daily-analysis
git checkout HEAD -- supabase/functions/process-queue
git checkout HEAD -- supabase/functions/analyze-prompt

# Redeploy
supabase functions deploy trigger-daily-analysis
supabase functions deploy process-queue
supabase functions deploy analyze-prompt
```

## Database Cleanup (Optional - Do Later)

After the new system has been running successfully for at least a week, you can optionally clean up old queue tables:

```sql
-- First, verify the table is not being used
SELECT COUNT(*) FROM analysis_queue;

-- If empty or only has old data, you can drop it
-- WARNING: Only do this after confirming new system works for at least a week
-- DROP TABLE IF EXISTS analysis_queue;
```

## Summary

**Safe to remove now**:
- `trigger-daily-analysis/` directory
- `process-queue/` directory  
- `analyze-prompt/` directory

**Keep**:
- All sentiment analysis functions
- `process-analysis/` (citation processing)
- Shared utilities (unless confirmed unused)

**Timeline**:
1. **Week 1**: Remove Edge Functions, monitor closely
2. **Week 2-4**: Monitor for any issues
3. **After 1 month**: Consider dropping `analysis_queue` table if unused

