-- =============================================
-- SCRIPT: Clean up legacy sentiment tables data
-- Description: Delete data from sentiment_analysis and sentiment_analysis_queue
--              Run this BEFORE the migration to free up space and verify recovery
-- =============================================
--
-- IMPORTANT: This will permanently delete all data from these tables.
-- Make sure you have verified that all data has been migrated to brand_sentiment_attributes
--
-- =============================================
-- STEP 1: Check current data and size
-- =============================================

-- Check row counts
SELECT 
  'sentiment_analysis' AS table_name,
  COUNT(*) AS row_count,
  pg_size_pretty(pg_total_relation_size('sentiment_analysis')) AS table_size
FROM sentiment_analysis
UNION ALL
SELECT 
  'sentiment_analysis_queue' AS table_name,
  COUNT(*) AS row_count,
  pg_size_pretty(pg_total_relation_size('sentiment_analysis_queue')) AS queue_size
FROM sentiment_analysis_queue;

-- Check date ranges
SELECT 
  'sentiment_analysis' AS table_name,
  MIN(created_at) AS oldest_record,
  MAX(created_at) AS newest_record
FROM sentiment_analysis
UNION ALL
SELECT 
  'sentiment_analysis_queue' AS table_name,
  MIN(created_at) AS oldest_record,
  MAX(created_at) AS newest_record
FROM sentiment_analysis_queue;

-- =============================================
-- STEP 2: Verify migration to brand_sentiment_attributes
-- =============================================

-- Check that brand_sentiment_attributes has data
SELECT 
  COUNT(*) AS total_records,
  MIN(created_at) AS oldest_record,
  MAX(created_at) AS newest_record,
  COUNT(DISTINCT project_id) AS projects_with_data
FROM brand_sentiment_attributes;

-- =============================================
-- STEP 3: Delete data (choose one approach)
-- =============================================

-- OPTION A: Delete all data immediately (fastest)
-- Uncomment to execute:
-- TRUNCATE TABLE sentiment_analysis CASCADE;
-- TRUNCATE TABLE sentiment_analysis_queue CASCADE;

-- OPTION B: Delete in batches (safer for very large tables)
-- Uncomment and adjust date as needed:
-- DELETE FROM sentiment_analysis WHERE created_at < NOW() - INTERVAL '30 days';
-- DELETE FROM sentiment_analysis_queue WHERE created_at < NOW() - INTERVAL '30 days';
-- Repeat until all data is deleted

-- OPTION C: Delete all data older than a specific date
-- Uncomment and set your cutoff date:
-- DELETE FROM sentiment_analysis WHERE created_at < '2024-12-01'::timestamp;
-- DELETE FROM sentiment_analysis_queue WHERE created_at < '2024-12-01'::timestamp;

-- =============================================
-- STEP 4: Verify deletion
-- =============================================

-- After deletion, verify tables are empty
SELECT 
  'sentiment_analysis' AS table_name,
  COUNT(*) AS remaining_rows
FROM sentiment_analysis
UNION ALL
SELECT 
  'sentiment_analysis_queue' AS table_name,
  COUNT(*) AS remaining_rows
FROM sentiment_analysis_queue;

-- Both should return 0 rows

-- =============================================
-- STEP 5: Check space recovery (optional)
-- =============================================

-- After deletion, check if space was freed
-- Note: PostgreSQL may not immediately free space to the OS
-- You may need to run VACUUM FULL to reclaim space
SELECT 
  pg_size_pretty(pg_total_relation_size('sentiment_analysis')) AS sentiment_analysis_size,
  pg_size_pretty(pg_total_relation_size('sentiment_analysis_queue')) AS queue_size;

-- To force space reclamation (run with caution, locks tables):
-- VACUUM FULL sentiment_analysis;
-- VACUUM FULL sentiment_analysis_queue;

-- =============================================
-- NOTES
-- =============================================
--
-- 1. TRUNCATE is faster than DELETE but cannot be rolled back
-- 2. DELETE can be rolled back but is slower
-- 3. After deleting data, you can run the migration to drop the tables
-- 4. VACUUM FULL will lock the tables but reclaims space immediately
-- 5. Regular VACUUM (without FULL) is non-blocking but may not free space to OS
--
-- =============================================



