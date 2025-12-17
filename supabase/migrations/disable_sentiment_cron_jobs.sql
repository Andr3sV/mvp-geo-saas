-- ============================================================================
-- Disable Legacy Sentiment Analysis Cron Jobs
-- ============================================================================
-- 
-- This script disables cron jobs related to the legacy sentiment analysis
-- system that has been migrated to Inngest + Groq.
--
-- Background:
-- - The sentiment analysis system was previously using Edge Functions and
--   pg_cron for scheduling.
-- - The system has been migrated to Inngest with brand analysis functions
--   (analyze-brands-batch and analyze-single-response) using Groq API.
-- - Data is now stored in: brand_mentions, brand_sentiment_attributes,
--   and potential_competitors tables.
--
-- This migration:
-- 1. Lists all cron jobs related to sentiment analysis
-- 2. Disables them (does not delete, for safety)
--
-- To apply this migration:
-- Run this SQL in your Supabase SQL Editor
-- ============================================================================

-- First, check if pg_cron extension is installed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    RAISE NOTICE 'pg_cron extension is not installed. No cron jobs to disable.';
    RETURN;
  END IF;
END $$;

-- List all sentiment-related cron jobs (for verification)
DO $$
DECLARE
  job_record RECORD;
BEGIN
  RAISE NOTICE '=== Current Sentiment Analysis Cron Jobs ===';
  
  FOR job_record IN
    SELECT 
      jobid,
      jobname,
      schedule,
      command,
      active
    FROM cron.job
    WHERE 
      command LIKE '%sentiment%'
      OR jobname LIKE '%sentiment%'
  LOOP
    RAISE NOTICE 'Job ID: %, Name: %, Active: %, Schedule: %, Command: %',
      job_record.jobid,
      job_record.jobname,
      job_record.active,
      job_record.schedule,
      job_record.command;
  END LOOP;
END $$;

-- Unschedule (disable) sentiment analysis cron jobs
-- This removes them from the schedule but keeps history
DO $$
DECLARE
  job_record RECORD;
  unscheduled_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== Disabling Sentiment Analysis Cron Jobs ===';
  
  FOR job_record IN
    SELECT 
      jobid,
      jobname
    FROM cron.job
    WHERE 
      (command LIKE '%daily-sentiment-analysis%'
       OR command LIKE '%trigger-sentiment-analysis%'
       OR command LIKE '%process-sentiment-queue%'
       OR jobname LIKE '%sentiment%')
      AND active = true
  LOOP
    BEGIN
      -- Unschedule the job
      PERFORM cron.unschedule(job_record.jobname);
      unscheduled_count := unscheduled_count + 1;
      RAISE NOTICE 'Disabled cron job: % (ID: %)', job_record.jobname, job_record.jobid;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to disable job %: %', job_record.jobname, SQLERRM;
    END;
  END LOOP;
  
  IF unscheduled_count = 0 THEN
    RAISE NOTICE 'No active sentiment analysis cron jobs found.';
  ELSE
    RAISE NOTICE 'Successfully disabled % sentiment analysis cron job(s).', unscheduled_count;
  END IF;
END $$;

-- Verify that jobs are disabled
DO $$
DECLARE
  active_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO active_count
  FROM cron.job
  WHERE 
    (command LIKE '%sentiment%' OR jobname LIKE '%sentiment%')
    AND active = true;
  
  IF active_count > 0 THEN
    RAISE WARNING 'There are still % active sentiment-related cron jobs!', active_count;
  ELSE
    RAISE NOTICE '✓ All sentiment-related cron jobs have been disabled.';
  END IF;
END $$;

-- ============================================================================
-- Post-Migration Notes
-- ============================================================================
-- 
-- ✅ What was done:
-- - Disabled all cron jobs related to sentiment analysis Edge Functions
-- - Jobs are unscheduled but not deleted (can be restored if needed)
--
-- ✅ What happens next:
-- - Brand analysis now runs automatically via Inngest:
--   * analyze-brands-batch: Runs on schedule for batch processing
--   * analyze-single-response: Triggered automatically for each AI response
-- 
-- ✅ Database cleanup (optional - do after 1 month of monitoring):
-- - sentiment_analysis table (legacy data)
-- - sentiment_analysis_queue table (no longer used)
--
-- To check if new system is working:
-- SELECT COUNT(*) FROM brand_mentions;
-- SELECT COUNT(*) FROM brand_sentiment_attributes;
-- SELECT COUNT(*) FROM potential_competitors;
--
-- ============================================================================

