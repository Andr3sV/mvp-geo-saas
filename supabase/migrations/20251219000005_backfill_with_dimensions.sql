-- =============================================
-- MIGRATION: Backfill Daily Stats with Dimensions
-- Description: SQL function to backfill historical data with platform, region, topic dimensions
-- Date: 2025-12-19
-- =============================================

-- =============================================
-- FUNCTION: backfill_daily_brand_stats_with_dimensions
-- Backfills daily stats for a project with all dimension combinations
-- =============================================

CREATE OR REPLACE FUNCTION backfill_daily_brand_stats_with_dimensions(
  p_project_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS INTEGER AS $$
DECLARE
  v_current_date DATE;
  v_rows_created INTEGER := 0;
  v_brand_name TEXT;
  v_dim RECORD;
  v_comp RECORD;
BEGIN
  -- Get brand name
  SELECT brand_name INTO v_brand_name
  FROM projects WHERE id = p_project_id;
  
  IF v_brand_name IS NULL THEN
    v_brand_name := 'Brand';
  END IF;

  -- Loop through each date
  v_current_date := p_start_date;
  WHILE v_current_date <= p_end_date LOOP
    
    -- Get dimension combinations for this date
    FOR v_dim IN (
      SELECT DISTINCT 
        ar.platform,
        pt.region,
        pt.topic_id
      FROM ai_responses ar
      JOIN prompt_tracking pt ON pt.id = ar.prompt_tracking_id
      WHERE ar.project_id = p_project_id
        AND ar.status = 'success'
        AND ar.created_at >= v_current_date::timestamp
        AND ar.created_at < (v_current_date + 1)::timestamp
    ) LOOP
      
      -- Aggregate brand stats for this dimension
      PERFORM aggregate_brand_stats_only(
        p_project_id,
        v_current_date,
        v_dim.platform,
        v_dim.region,
        v_dim.topic_id
      );
      v_rows_created := v_rows_created + 1;
      
      -- Aggregate competitor stats for this dimension
      FOR v_comp IN (
        SELECT id, name
        FROM competitors
        WHERE project_id = p_project_id AND is_active = true
      ) LOOP
        PERFORM aggregate_competitor_stats_only(
          p_project_id,
          v_comp.id,
          v_current_date,
          v_dim.platform,
          v_dim.region,
          v_dim.topic_id
        );
        v_rows_created := v_rows_created + 1;
      END LOOP;
      
    END LOOP;
    
    v_current_date := v_current_date + 1;
  END LOOP;
  
  RETURN v_rows_created;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRUNCATE OLD DATA AND RE-BACKFILL
-- Run this block manually after reviewing
-- =============================================

-- WARNING: This will delete all existing daily_brand_stats data
-- and re-populate with dimension-aware data

/*
DO $$
DECLARE
  v_project RECORD;
  v_start_date DATE := CURRENT_DATE - INTERVAL '7 days';
  v_end_date DATE := CURRENT_DATE - INTERVAL '1 day';
  v_total_rows INTEGER := 0;
  v_project_rows INTEGER;
BEGIN
  -- Truncate existing data (old format without dimensions)
  TRUNCATE TABLE daily_brand_stats;
  
  RAISE NOTICE 'Starting backfill from % to %', v_start_date, v_end_date;
  
  -- Get all projects that have AI responses in the date range
  FOR v_project IN 
    SELECT DISTINCT p.id, p.name
    FROM projects p
    JOIN ai_responses ar ON ar.project_id = p.id
    WHERE ar.created_at >= v_start_date
      AND ar.status = 'success'
    ORDER BY p.name
  LOOP
    BEGIN
      -- Backfill this project
      v_project_rows := backfill_daily_brand_stats_with_dimensions(
        v_project.id, 
        v_start_date, 
        v_end_date
      );
      v_total_rows := v_total_rows + v_project_rows;
      
      RAISE NOTICE 'Project "%": % rows created', v_project.name, v_project_rows;
      
      -- Small pause to prevent overwhelming the database
      PERFORM pg_sleep(0.1);
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error processing project %: %', v_project.name, SQLERRM;
      CONTINUE;
    END;
  END LOOP;
  
  RAISE NOTICE 'Backfill complete! Total rows: %', v_total_rows;
END $$;
*/

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON FUNCTION backfill_daily_brand_stats_with_dimensions IS 
  'Backfills daily_brand_stats for a project with all dimension combinations (platform, region, topic)';

