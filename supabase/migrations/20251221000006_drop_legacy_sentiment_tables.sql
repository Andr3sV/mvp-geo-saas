-- =============================================
-- MIGRATION: Drop legacy sentiment_analysis tables
-- Description: Remove legacy sentiment_analysis and sentiment_analysis_queue tables
--              These tables have been replaced by brand_sentiment_attributes
-- Date: 2025-12-21
-- =============================================
--
-- IMPORTANT: This migration will permanently delete all data from these tables.
-- Make sure you have verified that:
-- 1. All data has been migrated to brand_sentiment_attributes
-- 2. No active code references these tables
-- 3. You have a backup if you need historical data
--
-- =============================================
-- PHASE 1: Clean up data (optional - for space recovery)
-- =============================================
--
-- Uncomment these lines if you want to delete data first to free up space
-- before dropping the tables. This allows you to verify space recovery.
--
-- TRUNCATE TABLE IF EXISTS sentiment_analysis CASCADE;
-- TRUNCATE TABLE IF EXISTS sentiment_analysis_queue CASCADE;
--
-- Or if you want to delete in batches (safer for large tables):
-- DELETE FROM sentiment_analysis WHERE created_at < NOW() - INTERVAL '30 days';
-- DELETE FROM sentiment_analysis_queue WHERE created_at < NOW() - INTERVAL '30 days';
--
-- =============================================
-- PHASE 2: Drop dependent objects for sentiment_analysis
-- =============================================

-- Drop triggers on sentiment_analysis
DROP TRIGGER IF EXISTS update_sentiment_analysis_updated_at ON sentiment_analysis;

-- Drop indexes on sentiment_analysis
DROP INDEX IF EXISTS idx_sentiment_analysis_project_id;
DROP INDEX IF EXISTS idx_sentiment_analysis_ai_response_id;
DROP INDEX IF EXISTS idx_sentiment_analysis_competitor_id;
DROP INDEX IF EXISTS idx_sentiment_analysis_type;
DROP INDEX IF EXISTS idx_sentiment_analysis_sentiment_label;
DROP INDEX IF EXISTS idx_sentiment_analysis_created_at;
DROP INDEX IF EXISTS idx_sentiment_analysis_project_type_sentiment;

-- Drop RLS policies on sentiment_analysis
DROP POLICY IF EXISTS "Users can view sentiment analysis for their projects" ON sentiment_analysis;
DROP POLICY IF EXISTS "Users can insert sentiment analysis for their projects" ON sentiment_analysis;
DROP POLICY IF EXISTS "Users can update sentiment analysis for their projects" ON sentiment_analysis;

-- =============================================
-- PHASE 3: Drop dependent objects for sentiment_analysis_queue
-- =============================================

-- Drop triggers on sentiment_analysis_queue
DROP TRIGGER IF EXISTS update_sentiment_analysis_queue_timestamp ON sentiment_analysis_queue;

-- Drop indexes on sentiment_analysis_queue
DROP INDEX IF EXISTS idx_sentiment_analysis_queue_status;
DROP INDEX IF EXISTS idx_sentiment_analysis_queue_batch_id;
DROP INDEX IF EXISTS idx_sentiment_analysis_queue_attempts;
DROP INDEX IF EXISTS idx_sentiment_analysis_queue_ai_response_id;
DROP INDEX IF EXISTS idx_sentiment_analysis_queue_project_id;

-- Drop RLS policies on sentiment_analysis_queue
DROP POLICY IF EXISTS "Users can read sentiment analysis queue for accessible projects" ON sentiment_analysis_queue;
DROP POLICY IF EXISTS "Service can manage sentiment analysis queue" ON sentiment_analysis_queue;

-- =============================================
-- PHASE 4: Drop functions (if only used by these tables)
-- =============================================

-- Note: update_sentiment_analysis_updated_at might be used elsewhere
-- Only drop if you're sure it's not used by other tables
-- DROP FUNCTION IF EXISTS update_sentiment_analysis_updated_at() CASCADE;

-- Drop function for sentiment_analysis_queue (likely only used by this table)
DROP FUNCTION IF EXISTS update_sentiment_analysis_queue_timestamp() CASCADE;

-- =============================================
-- PHASE 5: Drop the tables
-- =============================================

-- Drop sentiment_analysis_queue first (no dependencies on sentiment_analysis)
DROP TABLE IF EXISTS sentiment_analysis_queue CASCADE;

-- Drop sentiment_analysis table
-- Note: CASCADE will drop any remaining dependencies
DROP TABLE IF EXISTS sentiment_analysis CASCADE;

-- =============================================
-- VERIFICATION QUERIES (run manually after migration)
-- =============================================
--
-- Run these queries in Supabase SQL Editor to verify tables are dropped:
--
-- SELECT EXISTS (
--   SELECT FROM information_schema.tables 
--   WHERE table_schema = 'public' 
--   AND table_name = 'sentiment_analysis'
-- ) AS sentiment_analysis_exists;
--
-- SELECT EXISTS (
--   SELECT FROM information_schema.tables 
--   WHERE table_schema = 'public' 
--   AND table_name = 'sentiment_analysis_queue'
-- ) AS sentiment_analysis_queue_exists;
--
-- Both should return FALSE if tables are successfully dropped.
--
-- =============================================
-- SPACE RECOVERY VERIFICATION
-- =============================================
--
-- To check how much space was freed, run this query BEFORE dropping:
--
-- SELECT 
--   pg_size_pretty(pg_total_relation_size('sentiment_analysis')) AS sentiment_analysis_size,
--   pg_size_pretty(pg_total_relation_size('sentiment_analysis_queue')) AS queue_size,
--   pg_size_pretty(
--     pg_total_relation_size('sentiment_analysis') + 
--     pg_total_relation_size('sentiment_analysis_queue')
--   ) AS total_size;
--
-- After dropping, you can verify space was freed by checking database size:
--
-- SELECT pg_size_pretty(pg_database_size(current_database())) AS database_size;



