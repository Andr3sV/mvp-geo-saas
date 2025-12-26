-- =============================================
-- MIGRATION: Update aggregation functions to use region_id in daily_brand_stats
-- Description: Update aggregate_brand_stats_only and aggregate_competitor_stats_only to insert region_id instead of region code
-- Date: 2025-12-26
-- =============================================

-- =============================================
-- FUNCTION: aggregate_brand_stats_only
-- Update to insert region_id instead of region code
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
  v_region_id UUID;
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

  -- Get region_id from regions table if region code is provided
  IF p_region IS NOT NULL AND p_region != 'GLOBAL' THEN
    SELECT id INTO v_region_id
    FROM regions
    WHERE code = p_region
      AND project_id = p_project_id
      AND is_active = true;
  ELSE
    v_region_id := NULL;
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

  -- Upsert brand stats with dimensions (using region_id instead of region)
  INSERT INTO daily_brand_stats (
    project_id, stat_date, entity_type, competitor_id, entity_name,
    platform, region_id, topic_id,
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
    v_region_id,
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
    COALESCE(region_id, '00000000-0000-0000-0000-000000000000'::uuid),
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
-- Update to insert region_id instead of region code
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
  v_region_id UUID;
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

  -- Get region_id from regions table if region code is provided
  IF p_region IS NOT NULL AND p_region != 'GLOBAL' THEN
    SELECT id INTO v_region_id
    FROM regions
    WHERE code = p_region
      AND project_id = p_project_id
      AND is_active = true;
  ELSE
    v_region_id := NULL;
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

  -- Upsert competitor stats with dimensions (using region_id instead of region)
  INSERT INTO daily_brand_stats (
    project_id, stat_date, entity_type, competitor_id, entity_name,
    platform, region_id, topic_id,
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
    v_region_id,
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
    COALESCE(region_id, '00000000-0000-0000-0000-000000000000'::uuid),
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

COMMENT ON FUNCTION aggregate_brand_stats_only(UUID, DATE, TEXT, TEXT, UUID) IS 'Aggregates brand stats with platform, region, and topic dimensions. Inserts region_id (UUID) instead of region code.';
COMMENT ON FUNCTION aggregate_competitor_stats_only(UUID, UUID, DATE, TEXT, TEXT, UUID) IS 'Aggregates competitor stats with platform, region, and topic dimensions. Inserts region_id (UUID) instead of region code.';

