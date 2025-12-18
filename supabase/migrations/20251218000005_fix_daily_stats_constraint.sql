-- =============================================
-- MIGRATION: Fix Daily Brand Stats Constraint
-- Description: Fix ON CONFLICT issue with partial indexes
-- Date: 2025-12-18
-- =============================================

-- Drop the problematic partial indexes
DROP INDEX IF EXISTS idx_daily_brand_stats_brand_unique;
DROP INDEX IF EXISTS idx_daily_brand_stats_competitor_unique;

-- Create a single unique index that handles both cases
-- Use COALESCE to convert NULL competitor_id to a fixed UUID for uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_brand_stats_unique 
  ON daily_brand_stats(project_id, stat_date, COALESCE(competitor_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- =============================================
-- Update the aggregation function
-- =============================================

CREATE OR REPLACE FUNCTION aggregate_daily_brand_stats(
  p_project_id UUID,
  p_stat_date DATE
)
RETURNS INTEGER AS $$
DECLARE
  v_rows_affected INTEGER := 0;
  v_temp_rows INTEGER := 0;
  v_brand_name TEXT;
BEGIN
  -- Get project brand name for entity_name
  SELECT brand_name INTO v_brand_name
  FROM projects
  WHERE id = p_project_id;

  IF v_brand_name IS NULL THEN
    v_brand_name := 'Brand';
  END IF;

  -- =============================================
  -- STEP 1: Upsert Brand Stats
  -- =============================================
  
  INSERT INTO daily_brand_stats (
    project_id, stat_date, entity_type, competitor_id, entity_name,
    mentions_count, citations_count,
    sentiment_positive_count, sentiment_neutral_count, sentiment_negative_count,
    sentiment_avg_rating, responses_analyzed
  )
  VALUES (
    p_project_id,
    p_stat_date,
    'brand',
    NULL,
    v_brand_name,
    COALESCE((SELECT COUNT(*) FROM brand_mentions WHERE project_id = p_project_id AND brand_type = 'client' AND DATE(created_at) = p_stat_date), 0),
    COALESCE((SELECT COUNT(*) FROM citations WHERE project_id = p_project_id AND citation_type = 'brand' AND DATE(created_at) = p_stat_date), 0),
    COALESCE((SELECT COUNT(*) FROM brand_sentiment_attributes WHERE project_id = p_project_id AND brand_type = 'client' AND sentiment = 'positive' AND DATE(created_at) = p_stat_date), 0),
    COALESCE((SELECT COUNT(*) FROM brand_sentiment_attributes WHERE project_id = p_project_id AND brand_type = 'client' AND sentiment = 'neutral' AND DATE(created_at) = p_stat_date), 0),
    COALESCE((SELECT COUNT(*) FROM brand_sentiment_attributes WHERE project_id = p_project_id AND brand_type = 'client' AND sentiment = 'negative' AND DATE(created_at) = p_stat_date), 0),
    (SELECT AVG(sentiment_rating) FROM brand_sentiment_attributes WHERE project_id = p_project_id AND brand_type = 'client' AND DATE(created_at) = p_stat_date),
    COALESCE((SELECT COUNT(DISTINCT ai_response_id) FROM brand_mentions WHERE project_id = p_project_id AND brand_type = 'client' AND DATE(created_at) = p_stat_date), 0)
  )
  ON CONFLICT (project_id, stat_date, COALESCE(competitor_id, '00000000-0000-0000-0000-000000000000'::uuid))
  DO UPDATE SET
    entity_name = EXCLUDED.entity_name,
    mentions_count = EXCLUDED.mentions_count,
    citations_count = EXCLUDED.citations_count,
    sentiment_positive_count = EXCLUDED.sentiment_positive_count,
    sentiment_neutral_count = EXCLUDED.sentiment_neutral_count,
    sentiment_negative_count = EXCLUDED.sentiment_negative_count,
    sentiment_avg_rating = EXCLUDED.sentiment_avg_rating,
    responses_analyzed = EXCLUDED.responses_analyzed,
    updated_at = now();

  GET DIAGNOSTICS v_temp_rows = ROW_COUNT;
  v_rows_affected := v_rows_affected + v_temp_rows;

  -- =============================================
  -- STEP 2: Upsert Competitor Stats
  -- =============================================

  INSERT INTO daily_brand_stats (
    project_id, stat_date, entity_type, competitor_id, entity_name,
    mentions_count, citations_count,
    sentiment_positive_count, sentiment_neutral_count, sentiment_negative_count,
    sentiment_avg_rating, responses_analyzed
  )
  SELECT 
    p_project_id,
    p_stat_date,
    'competitor',
    comp.id,
    comp.name,
    COALESCE((
      SELECT COUNT(*) FROM brand_mentions bm 
      WHERE bm.project_id = p_project_id 
        AND bm.brand_type = 'competitor' 
        AND bm.competitor_id = comp.id
        AND DATE(bm.created_at) = p_stat_date
    ), 0),
    COALESCE((
      SELECT COUNT(*) FROM citations c 
      WHERE c.project_id = p_project_id 
        AND c.citation_type = 'competitor' 
        AND c.competitor_id = comp.id
        AND DATE(c.created_at) = p_stat_date
    ), 0),
    COALESCE((
      SELECT COUNT(*) FROM brand_sentiment_attributes bsa 
      WHERE bsa.project_id = p_project_id 
        AND bsa.brand_type = 'competitor' 
        AND bsa.competitor_id = comp.id
        AND bsa.sentiment = 'positive'
        AND DATE(bsa.created_at) = p_stat_date
    ), 0),
    COALESCE((
      SELECT COUNT(*) FROM brand_sentiment_attributes bsa 
      WHERE bsa.project_id = p_project_id 
        AND bsa.brand_type = 'competitor' 
        AND bsa.competitor_id = comp.id
        AND bsa.sentiment = 'neutral'
        AND DATE(bsa.created_at) = p_stat_date
    ), 0),
    COALESCE((
      SELECT COUNT(*) FROM brand_sentiment_attributes bsa 
      WHERE bsa.project_id = p_project_id 
        AND bsa.brand_type = 'competitor' 
        AND bsa.competitor_id = comp.id
        AND bsa.sentiment = 'negative'
        AND DATE(bsa.created_at) = p_stat_date
    ), 0),
    (
      SELECT AVG(bsa.sentiment_rating) FROM brand_sentiment_attributes bsa 
      WHERE bsa.project_id = p_project_id 
        AND bsa.brand_type = 'competitor' 
        AND bsa.competitor_id = comp.id
        AND DATE(bsa.created_at) = p_stat_date
    ),
    COALESCE((
      SELECT COUNT(DISTINCT bm.ai_response_id) FROM brand_mentions bm 
      WHERE bm.project_id = p_project_id 
        AND bm.brand_type = 'competitor' 
        AND bm.competitor_id = comp.id
        AND DATE(bm.created_at) = p_stat_date
    ), 0)
  FROM competitors comp
  WHERE comp.project_id = p_project_id
    AND comp.is_active = true
  ON CONFLICT (project_id, stat_date, COALESCE(competitor_id, '00000000-0000-0000-0000-000000000000'::uuid))
  DO UPDATE SET
    entity_name = EXCLUDED.entity_name,
    mentions_count = EXCLUDED.mentions_count,
    citations_count = EXCLUDED.citations_count,
    sentiment_positive_count = EXCLUDED.sentiment_positive_count,
    sentiment_neutral_count = EXCLUDED.sentiment_neutral_count,
    sentiment_negative_count = EXCLUDED.sentiment_negative_count,
    sentiment_avg_rating = EXCLUDED.sentiment_avg_rating,
    responses_analyzed = EXCLUDED.responses_analyzed,
    updated_at = now();

  GET DIAGNOSTICS v_temp_rows = ROW_COUNT;
  v_rows_affected := v_rows_affected + v_temp_rows;

  RETURN v_rows_affected;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON INDEX idx_daily_brand_stats_unique IS 'Unique index using COALESCE to handle NULL competitor_id for brand stats';

