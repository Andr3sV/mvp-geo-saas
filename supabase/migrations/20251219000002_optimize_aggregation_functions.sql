-- =============================================
-- MIGRATION: Optimize Aggregation Functions
-- Description: Fix performance issues by using timestamp ranges instead of DATE()
--              and consolidating multiple subqueries
-- Date: 2025-12-19
-- =============================================

-- =============================================
-- PERFORMANCE INDEXES
-- These indexes match the exact query patterns for fast lookups
-- =============================================

CREATE INDEX IF NOT EXISTS idx_brand_mentions_aggregation 
  ON brand_mentions(project_id, brand_type, created_at);

CREATE INDEX IF NOT EXISTS idx_brand_mentions_competitor_aggregation 
  ON brand_mentions(project_id, brand_type, competitor_id, created_at)
  WHERE competitor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_citations_aggregation 
  ON citations(project_id, citation_type, created_at);

CREATE INDEX IF NOT EXISTS idx_citations_competitor_aggregation 
  ON citations(project_id, citation_type, competitor_id, created_at)
  WHERE competitor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sentiment_aggregation 
  ON brand_sentiment_attributes(project_id, brand_type, created_at);

CREATE INDEX IF NOT EXISTS idx_sentiment_competitor_aggregation 
  ON brand_sentiment_attributes(project_id, brand_type, competitor_id, created_at)
  WHERE competitor_id IS NOT NULL;

-- =============================================
-- FUNCTION: aggregate_brand_stats_only (OPTIMIZED)
-- Uses timestamp ranges instead of DATE() for index usage
-- Consolidates queries for better performance
-- =============================================

CREATE OR REPLACE FUNCTION aggregate_brand_stats_only(
  p_project_id UUID,
  p_stat_date DATE
)
RETURNS INTEGER AS $$
DECLARE
  v_brand_name TEXT;
  v_start_ts TIMESTAMP;
  v_end_ts TIMESTAMP;
  v_mentions_count INTEGER;
  v_citations_count INTEGER;
  v_sentiment_positive INTEGER;
  v_sentiment_neutral INTEGER;
  v_sentiment_negative INTEGER;
  v_sentiment_avg DECIMAL(3,2);
  v_responses_count INTEGER;
BEGIN
  -- Calculate timestamp range (allows index usage)
  v_start_ts := p_stat_date::timestamp;
  v_end_ts := (p_stat_date + INTERVAL '1 day')::timestamp;

  -- Get project brand name
  SELECT brand_name INTO v_brand_name
  FROM projects
  WHERE id = p_project_id;

  IF v_brand_name IS NULL THEN
    v_brand_name := 'Brand';
  END IF;

  -- Query 1: Count brand mentions (single query)
  SELECT COUNT(*), COUNT(DISTINCT ai_response_id)
  INTO v_mentions_count, v_responses_count
  FROM brand_mentions
  WHERE project_id = p_project_id
    AND brand_type = 'client'
    AND created_at >= v_start_ts
    AND created_at < v_end_ts;

  -- Query 2: Count citations (single query)
  SELECT COUNT(*)
  INTO v_citations_count
  FROM citations
  WHERE project_id = p_project_id
    AND citation_type = 'brand'
    AND created_at >= v_start_ts
    AND created_at < v_end_ts;

  -- Query 3: Sentiment aggregation (consolidated - one query instead of 4)
  SELECT 
    COUNT(*) FILTER (WHERE sentiment = 'positive'),
    COUNT(*) FILTER (WHERE sentiment = 'neutral'),
    COUNT(*) FILTER (WHERE sentiment = 'negative'),
    AVG(sentiment_rating)
  INTO v_sentiment_positive, v_sentiment_neutral, v_sentiment_negative, v_sentiment_avg
  FROM brand_sentiment_attributes
  WHERE project_id = p_project_id
    AND brand_type = 'client'
    AND created_at >= v_start_ts
    AND created_at < v_end_ts;

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
    COALESCE(v_mentions_count, 0),
    COALESCE(v_citations_count, 0),
    COALESCE(v_sentiment_positive, 0),
    COALESCE(v_sentiment_neutral, 0),
    COALESCE(v_sentiment_negative, 0),
    v_sentiment_avg,
    COALESCE(v_responses_count, 0)
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
-- FUNCTION: aggregate_competitor_stats_only (OPTIMIZED)
-- Uses timestamp ranges instead of DATE() for index usage
-- Consolidates queries for better performance
-- =============================================

CREATE OR REPLACE FUNCTION aggregate_competitor_stats_only(
  p_project_id UUID,
  p_competitor_id UUID,
  p_stat_date DATE
)
RETURNS INTEGER AS $$
DECLARE
  v_competitor_name TEXT;
  v_start_ts TIMESTAMP;
  v_end_ts TIMESTAMP;
  v_mentions_count INTEGER;
  v_citations_count INTEGER;
  v_sentiment_positive INTEGER;
  v_sentiment_neutral INTEGER;
  v_sentiment_negative INTEGER;
  v_sentiment_avg DECIMAL(3,2);
  v_responses_count INTEGER;
BEGIN
  -- Calculate timestamp range (allows index usage)
  v_start_ts := p_stat_date::timestamp;
  v_end_ts := (p_stat_date + INTERVAL '1 day')::timestamp;

  -- Get competitor name
  SELECT name INTO v_competitor_name
  FROM competitors
  WHERE id = p_competitor_id AND project_id = p_project_id;

  IF v_competitor_name IS NULL THEN
    RETURN 0; -- Competitor not found
  END IF;

  -- Query 1: Count competitor mentions (single query)
  SELECT COUNT(*), COUNT(DISTINCT ai_response_id)
  INTO v_mentions_count, v_responses_count
  FROM brand_mentions
  WHERE project_id = p_project_id
    AND brand_type = 'competitor'
    AND competitor_id = p_competitor_id
    AND created_at >= v_start_ts
    AND created_at < v_end_ts;

  -- Query 2: Count citations (single query)
  SELECT COUNT(*)
  INTO v_citations_count
  FROM citations
  WHERE project_id = p_project_id
    AND citation_type = 'competitor'
    AND competitor_id = p_competitor_id
    AND created_at >= v_start_ts
    AND created_at < v_end_ts;

  -- Query 3: Sentiment aggregation (consolidated - one query instead of 4)
  SELECT 
    COUNT(*) FILTER (WHERE sentiment = 'positive'),
    COUNT(*) FILTER (WHERE sentiment = 'neutral'),
    COUNT(*) FILTER (WHERE sentiment = 'negative'),
    AVG(sentiment_rating)
  INTO v_sentiment_positive, v_sentiment_neutral, v_sentiment_negative, v_sentiment_avg
  FROM brand_sentiment_attributes
  WHERE project_id = p_project_id
    AND brand_type = 'competitor'
    AND competitor_id = p_competitor_id
    AND created_at >= v_start_ts
    AND created_at < v_end_ts;

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
    COALESCE(v_mentions_count, 0),
    COALESCE(v_citations_count, 0),
    COALESCE(v_sentiment_positive, 0),
    COALESCE(v_sentiment_neutral, 0),
    COALESCE(v_sentiment_negative, 0),
    v_sentiment_avg,
    COALESCE(v_responses_count, 0)
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

COMMENT ON FUNCTION aggregate_brand_stats_only IS 'OPTIMIZED: Aggregates brand stats using timestamp ranges for index usage. 3 queries instead of 7.';
COMMENT ON FUNCTION aggregate_competitor_stats_only IS 'OPTIMIZED: Aggregates competitor stats using timestamp ranges for index usage. 3 queries instead of 7.';

