-- =============================================
-- MIGRATION: Add Entity-Level Aggregation Functions
-- Description: Functions to aggregate stats for individual entities (brand or single competitor)
-- Date: 2025-12-19
-- =============================================

-- =============================================
-- FUNCTION: aggregate_brand_stats_only
-- Description: Aggregates only the brand (client) stats for a project
-- Very fast - single entity, no loops
-- =============================================

CREATE OR REPLACE FUNCTION aggregate_brand_stats_only(
  p_project_id UUID,
  p_stat_date DATE
)
RETURNS INTEGER AS $$
DECLARE
  v_brand_name TEXT;
BEGIN
  -- Get project brand name
  SELECT brand_name INTO v_brand_name
  FROM projects
  WHERE id = p_project_id;

  IF v_brand_name IS NULL THEN
    v_brand_name := 'Brand';
  END IF;

  -- Upsert brand stats
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

  RETURN 1;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FUNCTION: aggregate_competitor_stats_only
-- Description: Aggregates stats for a single competitor
-- Very fast - single entity, no loops
-- =============================================

CREATE OR REPLACE FUNCTION aggregate_competitor_stats_only(
  p_project_id UUID,
  p_competitor_id UUID,
  p_stat_date DATE
)
RETURNS INTEGER AS $$
DECLARE
  v_competitor_name TEXT;
BEGIN
  -- Get competitor name
  SELECT name INTO v_competitor_name
  FROM competitors
  WHERE id = p_competitor_id AND project_id = p_project_id;

  IF v_competitor_name IS NULL THEN
    RETURN 0; -- Competitor not found or not in this project
  END IF;

  -- Upsert competitor stats
  INSERT INTO daily_brand_stats (
    project_id, stat_date, entity_type, competitor_id, entity_name,
    mentions_count, citations_count,
    sentiment_positive_count, sentiment_neutral_count, sentiment_negative_count,
    sentiment_avg_rating, responses_analyzed
  )
  VALUES (
    p_project_id,
    p_stat_date,
    'competitor',
    p_competitor_id,
    v_competitor_name,
    COALESCE((SELECT COUNT(*) FROM brand_mentions WHERE project_id = p_project_id AND brand_type = 'competitor' AND competitor_id = p_competitor_id AND DATE(created_at) = p_stat_date), 0),
    COALESCE((SELECT COUNT(*) FROM citations WHERE project_id = p_project_id AND citation_type = 'competitor' AND competitor_id = p_competitor_id AND DATE(created_at) = p_stat_date), 0),
    COALESCE((SELECT COUNT(*) FROM brand_sentiment_attributes WHERE project_id = p_project_id AND brand_type = 'competitor' AND competitor_id = p_competitor_id AND sentiment = 'positive' AND DATE(created_at) = p_stat_date), 0),
    COALESCE((SELECT COUNT(*) FROM brand_sentiment_attributes WHERE project_id = p_project_id AND brand_type = 'competitor' AND competitor_id = p_competitor_id AND sentiment = 'neutral' AND DATE(created_at) = p_stat_date), 0),
    COALESCE((SELECT COUNT(*) FROM brand_sentiment_attributes WHERE project_id = p_project_id AND brand_type = 'competitor' AND competitor_id = p_competitor_id AND sentiment = 'negative' AND DATE(created_at) = p_stat_date), 0),
    (SELECT AVG(sentiment_rating) FROM brand_sentiment_attributes WHERE project_id = p_project_id AND brand_type = 'competitor' AND competitor_id = p_competitor_id AND DATE(created_at) = p_stat_date),
    COALESCE((SELECT COUNT(DISTINCT ai_response_id) FROM brand_mentions WHERE project_id = p_project_id AND brand_type = 'competitor' AND competitor_id = p_competitor_id AND DATE(created_at) = p_stat_date), 0)
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

  RETURN 1;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON FUNCTION aggregate_brand_stats_only IS 'Aggregates only brand (client) stats for a project. Single entity, very fast.';
COMMENT ON FUNCTION aggregate_competitor_stats_only IS 'Aggregates stats for a single competitor. Single entity, very fast.';

