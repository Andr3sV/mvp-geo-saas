-- =============================================
-- MIGRATION: Fix Aggregation Functions Region ID
-- Description: Update aggregation functions to use region_id from regions table instead of removed region TEXT column
-- Date: 2025-12-25
-- =============================================

-- =============================================
-- FUNCTION: get_dimension_combinations
-- Update to JOIN with regions table and get region code from region_id
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
    COALESCE(r.code, 'GLOBAL')::TEXT,
    pt.topic_id
  FROM ai_responses ar
  JOIN prompt_tracking pt ON pt.id = ar.prompt_tracking_id
  LEFT JOIN regions r ON r.id = pt.region_id
  WHERE ar.project_id = p_project_id
    AND ar.status = 'success'
    AND ar.created_at >= v_start_ts
    AND ar.created_at < v_end_ts
  ORDER BY ar.platform, COALESCE(r.code, 'GLOBAL'), pt.topic_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FUNCTION: aggregate_brand_stats_only
-- Update to filter by region_id from regions table instead of removed region column
-- =============================================

CREATE OR REPLACE FUNCTION aggregate_brand_stats_only(
  p_project_id UUID,
  p_stat_date DATE,
  p_platform TEXT,
  p_region TEXT,
  p_topic_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_brand_name TEXT;
  v_start_ts TIMESTAMP;
  v_end_ts TIMESTAMP;
  v_mentions_count INTEGER;
  v_citations_count INTEGER;
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
  LEFT JOIN regions r ON r.id = pt.region_id
  WHERE bm.project_id = p_project_id
    AND bm.brand_type = 'client'
    AND ar.platform = p_platform
    AND (
      p_region = 'GLOBAL' OR
      (p_region IS NOT NULL AND r.code = p_region AND r.project_id = p_project_id)
    )
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
  LEFT JOIN regions r ON r.id = pt.region_id
  WHERE c.project_id = p_project_id
    AND c.citation_type = 'brand'
    AND ar.platform = p_platform
    AND (
      p_region = 'GLOBAL' OR
      (p_region IS NOT NULL AND r.code = p_region AND r.project_id = p_project_id)
    )
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
    responses_analyzed
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
    responses_analyzed = EXCLUDED.responses_analyzed,
    updated_at = now();

  RETURN 1;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FUNCTION: aggregate_competitor_stats_only
-- Update to filter by region_id from regions table instead of removed region column
-- =============================================

CREATE OR REPLACE FUNCTION aggregate_competitor_stats_only(
  p_project_id UUID,
  p_competitor_id UUID,
  p_stat_date DATE,
  p_platform TEXT,
  p_region TEXT,
  p_topic_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_competitor_name TEXT;
  v_start_ts TIMESTAMP;
  v_end_ts TIMESTAMP;
  v_mentions_count INTEGER;
  v_citations_count INTEGER;
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
  LEFT JOIN regions r ON r.id = pt.region_id
  WHERE bm.project_id = p_project_id
    AND bm.brand_type = 'competitor'
    AND bm.competitor_id = p_competitor_id
    AND ar.platform = p_platform
    AND (
      p_region = 'GLOBAL' OR
      (p_region IS NOT NULL AND r.code = p_region AND r.project_id = p_project_id)
    )
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
  LEFT JOIN regions r ON r.id = pt.region_id
  WHERE c.project_id = p_project_id
    AND c.citation_type = 'competitor'
    AND c.competitor_id = p_competitor_id
    AND ar.platform = p_platform
    AND (
      p_region = 'GLOBAL' OR
      (p_region IS NOT NULL AND r.code = p_region AND r.project_id = p_project_id)
    )
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
    responses_analyzed
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
    responses_analyzed = EXCLUDED.responses_analyzed,
    updated_at = now();

  RETURN 1;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON FUNCTION get_dimension_combinations(UUID, DATE) IS 'Returns unique (platform, region, topic_id) combinations for aggregation. Uses region_id from prompt_tracking joined with regions table.';
COMMENT ON FUNCTION aggregate_brand_stats_only(UUID, DATE, TEXT, TEXT, UUID) IS 'Aggregates brand stats with platform, region, and topic dimensions. Filters by region_id from regions table.';
COMMENT ON FUNCTION aggregate_competitor_stats_only(UUID, UUID, DATE, TEXT, TEXT, UUID) IS 'Aggregates competitor stats with platform, region, and topic dimensions. Filters by region_id from regions table.';

