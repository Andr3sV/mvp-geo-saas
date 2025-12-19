-- =============================================
-- MIGRATION: Update Aggregation Functions with Dimensions
-- Description: Add platform, region, topic_id parameters to aggregation functions
-- Date: 2025-12-19
-- =============================================

-- =============================================
-- FUNCTION: aggregate_brand_stats_only (with dimensions)
-- Uses timestamp ranges for index usage
-- Joins with ai_responses and prompt_tracking for dimensions
-- =============================================

CREATE OR REPLACE FUNCTION aggregate_brand_stats_only(
  p_project_id UUID,
  p_stat_date DATE,
  p_platform TEXT,      -- NEW: openai, gemini
  p_region TEXT,        -- NEW: GLOBAL, ES, US, etc.
  p_topic_id UUID       -- NEW: topic UUID or NULL
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

  -- Query 1: Count brand mentions with dimension filters
  SELECT COUNT(*), COUNT(DISTINCT bm.ai_response_id)
  INTO v_mentions_count, v_responses_count
  FROM brand_mentions bm
  JOIN ai_responses ar ON ar.id = bm.ai_response_id
  JOIN prompt_tracking pt ON pt.id = ar.prompt_tracking_id
  WHERE bm.project_id = p_project_id
    AND bm.brand_type = 'client'
    AND ar.platform = p_platform
    AND pt.region = p_region
    AND (
      (p_topic_id IS NULL AND pt.topic_id IS NULL) OR 
      pt.topic_id = p_topic_id
    )
    AND ar.created_at >= v_start_ts
    AND ar.created_at < v_end_ts;

  -- Query 2: Count citations with dimension filters
  SELECT COUNT(*)
  INTO v_citations_count
  FROM citations c
  JOIN ai_responses ar ON ar.id = c.ai_response_id
  JOIN prompt_tracking pt ON pt.id = ar.prompt_tracking_id
  WHERE c.project_id = p_project_id
    AND c.citation_type = 'brand'
    AND ar.platform = p_platform
    AND pt.region = p_region
    AND (
      (p_topic_id IS NULL AND pt.topic_id IS NULL) OR 
      pt.topic_id = p_topic_id
    )
    AND ar.created_at >= v_start_ts
    AND ar.created_at < v_end_ts;

  -- Query 3: Sentiment aggregation with dimension filters (consolidated)
  SELECT 
    COUNT(*) FILTER (WHERE sentiment = 'positive'),
    COUNT(*) FILTER (WHERE sentiment = 'neutral'),
    COUNT(*) FILTER (WHERE sentiment = 'negative'),
    AVG(sentiment_rating)
  INTO v_sentiment_positive, v_sentiment_neutral, v_sentiment_negative, v_sentiment_avg
  FROM brand_sentiment_attributes bsa
  JOIN ai_responses ar ON ar.id = bsa.ai_response_id
  JOIN prompt_tracking pt ON pt.id = ar.prompt_tracking_id
  WHERE bsa.project_id = p_project_id
    AND bsa.brand_type = 'client'
    AND ar.platform = p_platform
    AND pt.region = p_region
    AND (
      (p_topic_id IS NULL AND pt.topic_id IS NULL) OR 
      pt.topic_id = p_topic_id
    )
    AND ar.created_at >= v_start_ts
    AND ar.created_at < v_end_ts;

  -- Upsert brand stats with dimensions
  INSERT INTO daily_brand_stats (
    project_id, stat_date, entity_type, competitor_id, entity_name,
    platform, region, topic_id,
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
    p_platform,
    p_region,
    p_topic_id,
    COALESCE(v_mentions_count, 0),
    COALESCE(v_citations_count, 0),
    COALESCE(v_sentiment_positive, 0),
    COALESCE(v_sentiment_neutral, 0),
    COALESCE(v_sentiment_negative, 0),
    v_sentiment_avg,
    COALESCE(v_responses_count, 0)
  )
  ON CONFLICT (
    project_id, 
    stat_date, 
    COALESCE(competitor_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(platform, 'ALL'),
    COALESCE(region, 'GLOBAL'),
    COALESCE(topic_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
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
-- FUNCTION: aggregate_competitor_stats_only (with dimensions)
-- =============================================

CREATE OR REPLACE FUNCTION aggregate_competitor_stats_only(
  p_project_id UUID,
  p_competitor_id UUID,
  p_stat_date DATE,
  p_platform TEXT,      -- NEW
  p_region TEXT,        -- NEW
  p_topic_id UUID       -- NEW
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

  -- Query 1: Count competitor mentions with dimension filters
  SELECT COUNT(*), COUNT(DISTINCT bm.ai_response_id)
  INTO v_mentions_count, v_responses_count
  FROM brand_mentions bm
  JOIN ai_responses ar ON ar.id = bm.ai_response_id
  JOIN prompt_tracking pt ON pt.id = ar.prompt_tracking_id
  WHERE bm.project_id = p_project_id
    AND bm.brand_type = 'competitor'
    AND bm.competitor_id = p_competitor_id
    AND ar.platform = p_platform
    AND pt.region = p_region
    AND (
      (p_topic_id IS NULL AND pt.topic_id IS NULL) OR 
      pt.topic_id = p_topic_id
    )
    AND ar.created_at >= v_start_ts
    AND ar.created_at < v_end_ts;

  -- Query 2: Count citations with dimension filters
  SELECT COUNT(*)
  INTO v_citations_count
  FROM citations c
  JOIN ai_responses ar ON ar.id = c.ai_response_id
  JOIN prompt_tracking pt ON pt.id = ar.prompt_tracking_id
  WHERE c.project_id = p_project_id
    AND c.citation_type = 'competitor'
    AND c.competitor_id = p_competitor_id
    AND ar.platform = p_platform
    AND pt.region = p_region
    AND (
      (p_topic_id IS NULL AND pt.topic_id IS NULL) OR 
      pt.topic_id = p_topic_id
    )
    AND ar.created_at >= v_start_ts
    AND ar.created_at < v_end_ts;

  -- Query 3: Sentiment aggregation with dimension filters (consolidated)
  SELECT 
    COUNT(*) FILTER (WHERE sentiment = 'positive'),
    COUNT(*) FILTER (WHERE sentiment = 'neutral'),
    COUNT(*) FILTER (WHERE sentiment = 'negative'),
    AVG(sentiment_rating)
  INTO v_sentiment_positive, v_sentiment_neutral, v_sentiment_negative, v_sentiment_avg
  FROM brand_sentiment_attributes bsa
  JOIN ai_responses ar ON ar.id = bsa.ai_response_id
  JOIN prompt_tracking pt ON pt.id = ar.prompt_tracking_id
  WHERE bsa.project_id = p_project_id
    AND bsa.brand_type = 'competitor'
    AND bsa.competitor_id = p_competitor_id
    AND ar.platform = p_platform
    AND pt.region = p_region
    AND (
      (p_topic_id IS NULL AND pt.topic_id IS NULL) OR 
      pt.topic_id = p_topic_id
    )
    AND ar.created_at >= v_start_ts
    AND ar.created_at < v_end_ts;

  -- Upsert competitor stats with dimensions
  INSERT INTO daily_brand_stats (
    project_id, stat_date, entity_type, competitor_id, entity_name,
    platform, region, topic_id,
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
    p_platform,
    p_region,
    p_topic_id,
    COALESCE(v_mentions_count, 0),
    COALESCE(v_citations_count, 0),
    COALESCE(v_sentiment_positive, 0),
    COALESCE(v_sentiment_neutral, 0),
    COALESCE(v_sentiment_negative, 0),
    v_sentiment_avg,
    COALESCE(v_responses_count, 0)
  )
  ON CONFLICT (
    project_id, 
    stat_date, 
    COALESCE(competitor_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(platform, 'ALL'),
    COALESCE(region, 'GLOBAL'),
    COALESCE(topic_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
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
-- FUNCTION: get_dimension_combinations
-- Returns unique (platform, region, topic_id) combinations for a project on a given date
-- =============================================

CREATE OR REPLACE FUNCTION get_dimension_combinations(
  p_project_id UUID,
  p_stat_date DATE
)
RETURNS TABLE (
  platform TEXT,
  region TEXT,
  topic_id UUID
) AS $$
DECLARE
  v_start_ts TIMESTAMP;
  v_end_ts TIMESTAMP;
BEGIN
  v_start_ts := p_stat_date::timestamp;
  v_end_ts := (p_stat_date + INTERVAL '1 day')::timestamp;

  RETURN QUERY
  SELECT DISTINCT 
    ar.platform::TEXT,
    pt.region::TEXT,
    pt.topic_id
  FROM ai_responses ar
  JOIN prompt_tracking pt ON pt.id = ar.prompt_tracking_id
  WHERE ar.project_id = p_project_id
    AND ar.status = 'success'
    AND ar.created_at >= v_start_ts
    AND ar.created_at < v_end_ts
  ORDER BY ar.platform, pt.region, pt.topic_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON FUNCTION aggregate_brand_stats_only(UUID, DATE, TEXT, TEXT, UUID) IS 'Aggregates brand stats with platform, region, and topic dimensions';
COMMENT ON FUNCTION aggregate_competitor_stats_only(UUID, UUID, DATE, TEXT, TEXT, UUID) IS 'Aggregates competitor stats with platform, region, and topic dimensions';
COMMENT ON FUNCTION get_dimension_combinations(UUID, DATE) IS 'Returns unique (platform, region, topic_id) combinations for aggregation';

