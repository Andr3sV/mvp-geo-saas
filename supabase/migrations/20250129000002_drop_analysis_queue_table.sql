-- =============================================
-- MIGRATION: Drop analysis_queue table
-- Description: Remove analysis_queue table as it's no longer used
--              The new Backend Orchestrator service uses Inngest events instead
-- Date: 2025-01-29
-- =============================================

-- IMPORTANT: Only run this migration after confirming:
-- 1. New Inngest service has been running successfully for at least a week
-- 2. No data in analysis_queue table (or data is safe to lose)
-- 3. Old Edge Functions (trigger-daily-analysis, process-queue) have been removed

-- Check if table has data (uncomment to check first)
-- SELECT COUNT(*) FROM public.analysis_queue;

-- Drop trigger first
DROP TRIGGER IF EXISTS update_analysis_queue_timestamp ON public.analysis_queue;

-- Drop function (may be used elsewhere, so we check)
DROP FUNCTION IF EXISTS update_analysis_queue_timestamp();

-- Drop RLS policies
DROP POLICY IF EXISTS "Admins can view queue" ON public.analysis_queue;

-- Drop indexes
DROP INDEX IF EXISTS public.idx_analysis_queue_status;
DROP INDEX IF EXISTS public.idx_analysis_queue_batch_id;

-- Drop the table
DROP TABLE IF EXISTS public.analysis_queue;

-- Add comment documenting the removal
COMMENT ON SCHEMA public IS 'analysis_queue table removed on 2025-01-29. Replaced by Inngest event-driven orchestrator. See backend-orchestrator service for new implementation.';

