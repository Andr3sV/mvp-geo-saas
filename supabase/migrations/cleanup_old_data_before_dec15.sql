-- =============================================
-- SCRIPT: Clean up old data before December 15, 2025
-- Description: Delete brand_sentiment_attributes and citations created before 2025-12-15
-- Date: 2025-12-21
-- =============================================
--
-- IMPORTANT: This will permanently delete data created before December 15, 2025
-- Make sure you have a backup if you need this historical data
--
-- =============================================
-- STEP 1: Verify data to be deleted (run this first!)
-- =============================================

-- Check brand_sentiment_attributes records to be deleted
SELECT 
  'brand_sentiment_attributes' AS table_name,
  COUNT(*) AS records_to_delete,
  MIN(created_at) AS oldest_record,
  MAX(created_at) AS newest_record_to_delete,
  pg_size_pretty(SUM(pg_column_size(t.*))) AS estimated_size
FROM brand_sentiment_attributes t
WHERE created_at < '2025-12-15 00:00:00'::timestamp;

-- Check citations records to be deleted
SELECT 
  'citations' AS table_name,
  COUNT(*) AS records_to_delete,
  MIN(created_at) AS oldest_record,
  MAX(created_at) AS newest_record_to_delete,
  pg_size_pretty(SUM(pg_column_size(t.*))) AS estimated_size
FROM citations t
WHERE created_at < '2025-12-15 00:00:00'::timestamp;

-- Check total records that will remain
SELECT 
  'brand_sentiment_attributes' AS table_name,
  COUNT(*) AS records_remaining
FROM brand_sentiment_attributes
WHERE created_at >= '2025-12-15 00:00:00'::timestamp
UNION ALL
SELECT 
  'citations' AS table_name,
  COUNT(*) AS records_remaining
FROM citations
WHERE created_at >= '2025-12-15 00:00:00'::timestamp;

-- =============================================
-- STEP 2: Delete old data
-- =============================================

-- Delete brand_sentiment_attributes created before December 15, 2025
DELETE FROM brand_sentiment_attributes
WHERE created_at < '2025-12-15 00:00:00'::timestamp;

-- Delete citations created before December 15, 2025
DELETE FROM citations
WHERE created_at < '2025-12-15 00:00:00'::timestamp;

-- =============================================
-- STEP 3: Verify deletion
-- =============================================

-- Verify no records remain before the cutoff date
SELECT 
  'brand_sentiment_attributes' AS table_name,
  COUNT(*) AS remaining_old_records
FROM brand_sentiment_attributes
WHERE created_at < '2025-12-15 00:00:00'::timestamp
UNION ALL
SELECT 
  'citations' AS table_name,
  COUNT(*) AS remaining_old_records
FROM citations
WHERE created_at < '2025-12-15 00:00:00'::timestamp;

-- Both should return 0

-- Check remaining records
SELECT 
  'brand_sentiment_attributes' AS table_name,
  COUNT(*) AS total_remaining,
  MIN(created_at) AS oldest_remaining,
  MAX(created_at) AS newest_remaining
FROM brand_sentiment_attributes
UNION ALL
SELECT 
  'citations' AS table_name,
  COUNT(*) AS total_remaining,
  MIN(created_at) AS oldest_remaining,
  MAX(created_at) AS newest_remaining
FROM citations;

-- =============================================
-- STEP 4: Reclaim space (optional but recommended)
-- =============================================

-- Run VACUUM to reclaim space (non-blocking, can run in background)
VACUUM ANALYZE brand_sentiment_attributes;
VACUUM ANALYZE citations;

-- For immediate space reclamation (blocks tables, use with caution):
-- VACUUM FULL brand_sentiment_attributes;
-- VACUUM FULL citations;

-- =============================================
-- NOTES
-- =============================================
--
-- 1. The cutoff date is: 2025-12-15 00:00:00 (start of December 15, 2025)
-- 2. All records with created_at < 2025-12-15 will be deleted
-- 3. Records from 2025-12-15 onwards will be kept
-- 4. DELETE can be rolled back if run in a transaction
-- 5. VACUUM ANALYZE updates statistics and reclaims space (non-blocking)
-- 6. VACUUM FULL requires exclusive lock but reclaims space immediately
--
-- =============================================
-- SAFE EXECUTION (with transaction rollback option)
-- =============================================
--
-- If you want to be extra safe, wrap in a transaction:
--
-- BEGIN;
-- 
-- DELETE FROM brand_sentiment_attributes
-- WHERE created_at < '2025-12-15 00:00:00'::timestamp;
-- 
-- DELETE FROM citations
-- WHERE created_at < '2025-12-15 00:00:00'::timestamp;
-- 
-- -- Verify the results
-- SELECT COUNT(*) FROM brand_sentiment_attributes WHERE created_at < '2025-12-15 00:00:00'::timestamp;
-- SELECT COUNT(*) FROM citations WHERE created_at < '2025-12-15 00:00:00'::timestamp;
-- 
-- -- If everything looks good, commit:
-- COMMIT;
-- 
-- -- If something went wrong, rollback:
-- -- ROLLBACK;
--
-- =============================================
