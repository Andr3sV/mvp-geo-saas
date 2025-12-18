-- =============================================
-- MIGRATION: Backfill Daily Brand Stats
-- Description: Backfill last 90 days of daily stats for all projects
-- Date: 2025-12-18
-- NOTE: Run this after applying previous migrations
-- =============================================

-- =============================================
-- BACKFILL ALL PROJECTS (Last 90 Days)
-- =============================================

-- This script backfills daily_brand_stats for all projects with data in the last 90 days.
-- It processes in batches to avoid timeouts.

DO $$
DECLARE
  v_project RECORD;
  v_start_date DATE := CURRENT_DATE - INTERVAL '90 days';
  v_end_date DATE := CURRENT_DATE - INTERVAL '1 day';
  v_total_rows INTEGER := 0;
  v_project_rows INTEGER;
BEGIN
  RAISE NOTICE 'Starting backfill from % to %', v_start_date, v_end_date;
  
  -- Get all projects that have AI responses in the date range
  FOR v_project IN 
    SELECT DISTINCT p.id, p.name
    FROM projects p
    JOIN ai_responses ar ON ar.project_id = p.id
    WHERE ar.created_at >= v_start_date
    ORDER BY p.name
  LOOP
    BEGIN
      -- Backfill this project
      v_project_rows := backfill_daily_brand_stats(v_project.id, v_start_date, v_end_date);
      v_total_rows := v_total_rows + v_project_rows;
      
      RAISE NOTICE 'Project "%": % rows created', v_project.name, v_project_rows;
      
      -- Small pause between projects to avoid overwhelming the database
      PERFORM pg_sleep(0.1);
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error processing project %: %', v_project.name, SQLERRM;
      CONTINUE;
    END;
  END LOOP;
  
  RAISE NOTICE 'Backfill complete! Total rows: %', v_total_rows;
END $$;

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Check total records created
-- SELECT COUNT(*) as total_stats FROM daily_brand_stats;

-- Check stats by project
-- SELECT p.name, COUNT(*) as stats_count
-- FROM daily_brand_stats dbs
-- JOIN projects p ON dbs.project_id = p.id
-- GROUP BY p.name
-- ORDER BY stats_count DESC;

-- Check date range coverage
-- SELECT MIN(stat_date) as earliest, MAX(stat_date) as latest, COUNT(DISTINCT stat_date) as days_covered
-- FROM daily_brand_stats;

-- Check entity type distribution
-- SELECT entity_type, COUNT(*) as count
-- FROM daily_brand_stats
-- GROUP BY entity_type;

-- Sample data
-- SELECT 
--   p.name as project_name,
--   dbs.stat_date,
--   dbs.entity_type,
--   dbs.entity_name,
--   dbs.mentions_count,
--   dbs.citations_count,
--   dbs.sentiment_avg_rating
-- FROM daily_brand_stats dbs
-- JOIN projects p ON dbs.project_id = p.id
-- ORDER BY dbs.stat_date DESC, p.name
-- LIMIT 20;

