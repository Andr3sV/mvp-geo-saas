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
-- BACKFILL INSTRUCTIONS
-- Run these queries STEP BY STEP in Supabase SQL Editor
-- =============================================

-- STEP 1: Truncate existing data (run this first, only once)
-- TRUNCATE TABLE daily_brand_stats;

-- STEP 2: List projects to backfill (see which projects have data)
/*
SELECT DISTINCT p.id, p.name, COUNT(*) as response_count
FROM projects p
JOIN ai_responses ar ON ar.project_id = p.id
WHERE ar.created_at >= CURRENT_DATE - INTERVAL '7 days'
  AND ar.status = 'success'
GROUP BY p.id, p.name
ORDER BY response_count DESC;
*/

-- STEP 3: Backfill ONE project at a time (copy, replace project_id, execute)
-- For each project, run this query separately:
/*
SELECT backfill_daily_brand_stats_with_dimensions(
  'YOUR_PROJECT_ID_HERE'::uuid,
  (CURRENT_DATE - INTERVAL '7 days')::date,
  (CURRENT_DATE - INTERVAL '1 day')::date
);
*/

-- STEP 4: Or use this simpler function that processes ONE day at a time
-- to avoid timeouts on large projects

-- =============================================
-- FUNCTION: backfill_single_day
-- Backfills ALL projects for a SINGLE day (faster, avoids timeouts)
-- =============================================

CREATE OR REPLACE FUNCTION backfill_single_day(p_date DATE)
RETURNS INTEGER AS $$
DECLARE
  v_project RECORD;
  v_dim RECORD;
  v_comp RECORD;
  v_rows INTEGER := 0;
BEGIN
  -- For each project with data on this date
  FOR v_project IN (
    SELECT DISTINCT ar.project_id, p.name
    FROM ai_responses ar
    JOIN projects p ON p.id = ar.project_id
    WHERE ar.created_at >= p_date::timestamp
      AND ar.created_at < (p_date + 1)::timestamp
      AND ar.status = 'success'
  ) LOOP
    
    -- For each dimension combination
    FOR v_dim IN (
      SELECT * FROM get_dimension_combinations(v_project.project_id, p_date)
    ) LOOP
      
      -- Brand stats
      PERFORM aggregate_brand_stats_only(
        v_project.project_id, p_date, 
        v_dim.platform, v_dim.region, v_dim.topic_id
      );
      v_rows := v_rows + 1;
      
      -- Competitor stats
      FOR v_comp IN (
        SELECT id FROM competitors 
        WHERE project_id = v_project.project_id AND is_active = true
      ) LOOP
        PERFORM aggregate_competitor_stats_only(
          v_project.project_id, v_comp.id, p_date,
          v_dim.platform, v_dim.region, v_dim.topic_id
        );
        v_rows := v_rows + 1;
      END LOOP;
      
    END LOOP;
  END LOOP;
  
  RETURN v_rows;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON FUNCTION backfill_daily_brand_stats_with_dimensions IS 
  'Backfills daily_brand_stats for a project with all dimension combinations (platform, region, topic)';

