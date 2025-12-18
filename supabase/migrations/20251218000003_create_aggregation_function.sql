-- =============================================
-- MIGRATION: Create Daily Stats Aggregation Function
-- Description: Function to aggregate daily brand stats from brand_mentions, citations, and brand_sentiment_attributes
-- Date: 2025-12-18
-- =============================================

-- =============================================
-- FUNCTION: aggregate_daily_brand_stats
-- Description: Aggregates stats for a specific project and date
-- Parameters:
--   p_project_id: UUID of the project
--   p_stat_date: Date to aggregate stats for
-- Returns: Number of rows upserted
-- =============================================

CREATE OR REPLACE FUNCTION aggregate_daily_brand_stats(
  p_project_id UUID,
  p_stat_date DATE
)
RETURNS INTEGER AS $$
DECLARE
  v_rows_affected INTEGER := 0;
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
  -- STEP 1: Aggregate Brand (Client) Stats
  -- =============================================
  
  INSERT INTO daily_brand_stats (
    project_id,
    stat_date,
    entity_type,
    competitor_id,
    entity_name,
    mentions_count,
    citations_count,
    sentiment_positive_count,
    sentiment_neutral_count,
    sentiment_negative_count,
    sentiment_avg_rating,
    responses_analyzed
  )
  SELECT 
    p_project_id,
    p_stat_date,
    'brand' AS entity_type,
    NULL AS competitor_id,
    v_brand_name AS entity_name,
    -- Mentions count from brand_mentions
    COALESCE((
      SELECT COUNT(*)
      FROM brand_mentions bm
      WHERE bm.project_id = p_project_id
        AND bm.brand_type = 'client'
        AND DATE(bm.created_at) = p_stat_date
    ), 0) AS mentions_count,
    -- Citations count from citations table
    COALESCE((
      SELECT COUNT(*)
      FROM citations c
      WHERE c.project_id = p_project_id
        AND c.citation_type = 'brand'
        AND DATE(c.created_at) = p_stat_date
    ), 0) AS citations_count,
    -- Sentiment counts from brand_sentiment_attributes
    COALESCE((
      SELECT COUNT(*)
      FROM brand_sentiment_attributes bsa
      WHERE bsa.project_id = p_project_id
        AND bsa.brand_type = 'client'
        AND bsa.sentiment = 'positive'
        AND DATE(bsa.created_at) = p_stat_date
    ), 0) AS sentiment_positive_count,
    COALESCE((
      SELECT COUNT(*)
      FROM brand_sentiment_attributes bsa
      WHERE bsa.project_id = p_project_id
        AND bsa.brand_type = 'client'
        AND bsa.sentiment = 'neutral'
        AND DATE(bsa.created_at) = p_stat_date
    ), 0) AS sentiment_neutral_count,
    COALESCE((
      SELECT COUNT(*)
      FROM brand_sentiment_attributes bsa
      WHERE bsa.project_id = p_project_id
        AND bsa.brand_type = 'client'
        AND bsa.sentiment = 'negative'
        AND DATE(bsa.created_at) = p_stat_date
    ), 0) AS sentiment_negative_count,
    -- Average sentiment rating
    (
      SELECT AVG(bsa.sentiment_rating)
      FROM brand_sentiment_attributes bsa
      WHERE bsa.project_id = p_project_id
        AND bsa.brand_type = 'client'
        AND DATE(bsa.created_at) = p_stat_date
    ) AS sentiment_avg_rating,
    -- Responses analyzed (unique ai_responses with brand analysis)
    COALESCE((
      SELECT COUNT(DISTINCT bm.ai_response_id)
      FROM brand_mentions bm
      WHERE bm.project_id = p_project_id
        AND bm.brand_type = 'client'
        AND DATE(bm.created_at) = p_stat_date
    ), 0) AS responses_analyzed
  ON CONFLICT ON CONSTRAINT daily_brand_stats_entity_check 
  DO NOTHING; -- We'll handle with unique index instead

  -- Handle brand upsert with unique index
  INSERT INTO daily_brand_stats (
    project_id, stat_date, entity_type, competitor_id, entity_name,
    mentions_count, citations_count,
    sentiment_positive_count, sentiment_neutral_count, sentiment_negative_count,
    sentiment_avg_rating, responses_analyzed
  )
  SELECT 
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
  WHERE NOT EXISTS (
    SELECT 1 FROM daily_brand_stats 
    WHERE project_id = p_project_id 
      AND stat_date = p_stat_date 
      AND entity_type = 'brand' 
      AND competitor_id IS NULL
  );

  -- Update brand stats if already exists
  UPDATE daily_brand_stats
  SET 
    entity_name = v_brand_name,
    mentions_count = COALESCE((SELECT COUNT(*) FROM brand_mentions WHERE project_id = p_project_id AND brand_type = 'client' AND DATE(created_at) = p_stat_date), 0),
    citations_count = COALESCE((SELECT COUNT(*) FROM citations WHERE project_id = p_project_id AND citation_type = 'brand' AND DATE(created_at) = p_stat_date), 0),
    sentiment_positive_count = COALESCE((SELECT COUNT(*) FROM brand_sentiment_attributes WHERE project_id = p_project_id AND brand_type = 'client' AND sentiment = 'positive' AND DATE(created_at) = p_stat_date), 0),
    sentiment_neutral_count = COALESCE((SELECT COUNT(*) FROM brand_sentiment_attributes WHERE project_id = p_project_id AND brand_type = 'client' AND sentiment = 'neutral' AND DATE(created_at) = p_stat_date), 0),
    sentiment_negative_count = COALESCE((SELECT COUNT(*) FROM brand_sentiment_attributes WHERE project_id = p_project_id AND brand_type = 'client' AND sentiment = 'negative' AND DATE(created_at) = p_stat_date), 0),
    sentiment_avg_rating = (SELECT AVG(sentiment_rating) FROM brand_sentiment_attributes WHERE project_id = p_project_id AND brand_type = 'client' AND DATE(created_at) = p_stat_date),
    responses_analyzed = COALESCE((SELECT COUNT(DISTINCT ai_response_id) FROM brand_mentions WHERE project_id = p_project_id AND brand_type = 'client' AND DATE(created_at) = p_stat_date), 0),
    updated_at = now()
  WHERE project_id = p_project_id 
    AND stat_date = p_stat_date 
    AND entity_type = 'brand' 
    AND competitor_id IS NULL;

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

  -- =============================================
  -- STEP 2: Aggregate Competitor Stats
  -- =============================================

  -- For each active competitor in the project
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
    -- Mentions count
    COALESCE((
      SELECT COUNT(*) FROM brand_mentions bm 
      WHERE bm.project_id = p_project_id 
        AND bm.brand_type = 'competitor' 
        AND bm.competitor_id = comp.id
        AND DATE(bm.created_at) = p_stat_date
    ), 0),
    -- Citations count
    COALESCE((
      SELECT COUNT(*) FROM citations c 
      WHERE c.project_id = p_project_id 
        AND c.citation_type = 'competitor' 
        AND c.competitor_id = comp.id
        AND DATE(c.created_at) = p_stat_date
    ), 0),
    -- Sentiment counts
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
    -- Average sentiment rating
    (
      SELECT AVG(bsa.sentiment_rating) FROM brand_sentiment_attributes bsa 
      WHERE bsa.project_id = p_project_id 
        AND bsa.brand_type = 'competitor' 
        AND bsa.competitor_id = comp.id
        AND DATE(bsa.created_at) = p_stat_date
    ),
    -- Responses analyzed
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
  ON CONFLICT (project_id, stat_date, competitor_id) WHERE competitor_id IS NOT NULL
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

  GET DIAGNOSTICS v_rows_affected = v_rows_affected + ROW_COUNT;

  RETURN v_rows_affected;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FUNCTION: aggregate_daily_stats_for_all_projects
-- Description: Aggregates stats for all active projects for a given date
-- Parameters:
--   p_stat_date: Date to aggregate stats for (defaults to yesterday)
-- Returns: Total number of rows upserted
-- =============================================

CREATE OR REPLACE FUNCTION aggregate_daily_stats_for_all_projects(
  p_stat_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 day'
)
RETURNS TABLE(project_id UUID, rows_affected INTEGER) AS $$
DECLARE
  v_project RECORD;
  v_rows INTEGER;
BEGIN
  FOR v_project IN 
    SELECT DISTINCT p.id 
    FROM projects p
    JOIN ai_responses ar ON ar.project_id = p.id
    WHERE DATE(ar.created_at) = p_stat_date
  LOOP
    v_rows := aggregate_daily_brand_stats(v_project.id, p_stat_date);
    project_id := v_project.id;
    rows_affected := v_rows;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FUNCTION: backfill_daily_brand_stats
-- Description: Backfills historical daily stats for a project
-- Parameters:
--   p_project_id: UUID of the project
--   p_start_date: Start date for backfill
--   p_end_date: End date for backfill (defaults to yesterday)
-- Returns: Total number of rows created
-- =============================================

CREATE OR REPLACE FUNCTION backfill_daily_brand_stats(
  p_project_id UUID,
  p_start_date DATE,
  p_end_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 day'
)
RETURNS INTEGER AS $$
DECLARE
  v_current_date DATE;
  v_total_rows INTEGER := 0;
  v_rows INTEGER;
BEGIN
  v_current_date := p_start_date;
  
  WHILE v_current_date <= p_end_date LOOP
    v_rows := aggregate_daily_brand_stats(p_project_id, v_current_date);
    v_total_rows := v_total_rows + v_rows;
    v_current_date := v_current_date + INTERVAL '1 day';
  END LOOP;
  
  RETURN v_total_rows;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- RPC FUNCTION: get_daily_stats
-- Description: Get daily stats for dashboard
-- Parameters:
--   p_project_id: UUID of the project
--   p_start_date: Start date
--   p_end_date: End date
-- Returns: Daily stats rows
-- =============================================

CREATE OR REPLACE FUNCTION get_daily_stats(
  p_project_id UUID,
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  stat_date DATE,
  entity_type TEXT,
  competitor_id UUID,
  entity_name TEXT,
  mentions_count INTEGER,
  citations_count INTEGER,
  sentiment_positive_count INTEGER,
  sentiment_neutral_count INTEGER,
  sentiment_negative_count INTEGER,
  sentiment_avg_rating DECIMAL(4,3),
  responses_analyzed INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dbs.stat_date,
    dbs.entity_type,
    dbs.competitor_id,
    dbs.entity_name,
    dbs.mentions_count,
    dbs.citations_count,
    dbs.sentiment_positive_count,
    dbs.sentiment_neutral_count,
    dbs.sentiment_negative_count,
    dbs.sentiment_avg_rating,
    dbs.responses_analyzed
  FROM daily_brand_stats dbs
  WHERE dbs.project_id = p_project_id
    AND dbs.stat_date >= p_start_date
    AND dbs.stat_date <= p_end_date
  ORDER BY dbs.stat_date DESC, dbs.entity_type, dbs.entity_name;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- RPC FUNCTION: get_share_of_voice_trend
-- Description: Get share of voice trend over time
-- Parameters:
--   p_project_id: UUID of the project
--   p_days: Number of days to look back
-- Returns: Daily share of voice percentages
-- =============================================

CREATE OR REPLACE FUNCTION get_share_of_voice_trend(
  p_project_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  stat_date DATE,
  entity_type TEXT,
  entity_name TEXT,
  competitor_id UUID,
  mentions INTEGER,
  share_percentage DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  WITH daily_totals AS (
    SELECT 
      dbs.stat_date,
      SUM(dbs.mentions_count) AS total_mentions
    FROM daily_brand_stats dbs
    WHERE dbs.project_id = p_project_id
      AND dbs.stat_date >= CURRENT_DATE - (p_days || ' days')::INTERVAL
    GROUP BY dbs.stat_date
  )
  SELECT 
    dbs.stat_date,
    dbs.entity_type,
    dbs.entity_name,
    dbs.competitor_id,
    dbs.mentions_count AS mentions,
    CASE 
      WHEN dt.total_mentions > 0 THEN 
        ROUND((dbs.mentions_count::DECIMAL / dt.total_mentions * 100), 2)
      ELSE 0 
    END AS share_percentage
  FROM daily_brand_stats dbs
  JOIN daily_totals dt ON dbs.stat_date = dt.stat_date
  WHERE dbs.project_id = p_project_id
    AND dbs.stat_date >= CURRENT_DATE - (p_days || ' days')::INTERVAL
  ORDER BY dbs.stat_date DESC, dbs.mentions_count DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON FUNCTION aggregate_daily_brand_stats IS 'Aggregates daily brand and competitor stats from brand_mentions, citations, and brand_sentiment_attributes tables';
COMMENT ON FUNCTION aggregate_daily_stats_for_all_projects IS 'Runs daily aggregation for all projects that have data for the specified date';
COMMENT ON FUNCTION backfill_daily_brand_stats IS 'Backfills historical daily stats for a project within a date range';
COMMENT ON FUNCTION get_daily_stats IS 'RPC function to retrieve daily stats for dashboard display';
COMMENT ON FUNCTION get_share_of_voice_trend IS 'RPC function to retrieve share of voice trend data for charts';

