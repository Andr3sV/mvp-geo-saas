-- =============================================
-- MIGRATION: Update aggregation functions to use SUM in ON CONFLICT
-- Description: Update aggregate_brand_stats_only and aggregate_competitor_stats_only to use SUM instead of direct assignment in ON CONFLICT DO UPDATE. This allows safe incremental aggregation when called multiple times for the same dimension combination.
-- Date: 2025-12-26
-- =============================================

-- =============================================
-- FUNCTION: get_region_code_by_id
-- Helper function to get region code from region_id
-- =============================================

CREATE OR REPLACE FUNCTION get_region_code_by_id(
  p_region_id UUID,
  p_project_id UUID
)
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
BEGIN
  SELECT code INTO v_code
  FROM regions
  WHERE id = p_region_id
    AND project_id = p_project_id
    AND is_active = true;
  
  RETURN COALESCE(v_code, 'GLOBAL');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_region_code_by_id(UUID, UUID) IS 'Returns the region code for a given region_id and project_id. Returns GLOBAL if not found.';

-- =============================================
-- FUNCTION: aggregate_brand_stats_only
-- Update to use SUM in ON CONFLICT DO UPDATE for incremental aggregation
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
  -- Use SUM in ON CONFLICT to allow incremental aggregation
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
    mentions_count = daily_brand_stats.mentions_count + EXCLUDED.mentions_count,
    citations_count = daily_brand_stats.citations_count + EXCLUDED.citations_count,
    responses_analyzed = daily_brand_stats.responses_analyzed + EXCLUDED.responses_analyzed,
    updated_at = now();

  RETURN 1;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FUNCTION: aggregate_competitor_stats_only
-- Update to use SUM in ON CONFLICT DO UPDATE for incremental aggregation
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
  -- Use SUM in ON CONFLICT to allow incremental aggregation
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
    mentions_count = daily_brand_stats.mentions_count + EXCLUDED.mentions_count,
    citations_count = daily_brand_stats.citations_count + EXCLUDED.citations_count,
    responses_analyzed = daily_brand_stats.responses_analyzed + EXCLUDED.responses_analyzed,
    updated_at = now();

  RETURN 1;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON FUNCTION aggregate_brand_stats_only(UUID, DATE, TEXT, TEXT, UUID) IS 'Aggregates brand stats with platform, region, and topic dimensions. Inserts region_id (UUID) instead of region code. Uses SUM in ON CONFLICT to allow safe incremental aggregation.';
COMMENT ON FUNCTION aggregate_competitor_stats_only(UUID, UUID, DATE, TEXT, TEXT, UUID) IS 'Aggregates competitor stats with platform, region, and topic dimensions. Inserts region_id (UUID) instead of region code. Uses SUM in ON CONFLICT to allow safe incremental aggregation.';

-- =============================================
-- FUNCTION: aggregate_brand_stats_incremental
-- Incremental aggregation for a single ai_response_id
-- Only counts brand_mentions and citations for the specified ai_response
-- =============================================

CREATE OR REPLACE FUNCTION aggregate_brand_stats_incremental(
  p_project_id UUID,
  p_ai_response_id UUID,
  p_stat_date DATE,
  p_platform TEXT,
  p_region_id UUID,
  p_topic_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_brand_name TEXT;
  v_mentions_count INTEGER;
  v_citations_count INTEGER;
  v_responses_count INTEGER;
  v_region_code TEXT;
BEGIN
  -- Get project brand name
  SELECT brand_name INTO v_brand_name
  FROM projects
  WHERE id = p_project_id;

  IF v_brand_name IS NULL THEN
    v_brand_name := 'Brand';
  END IF;

  -- Get region code from region_id if provided
  IF p_region_id IS NOT NULL THEN
    SELECT code INTO v_region_code
    FROM regions
    WHERE id = p_region_id
      AND project_id = p_project_id
      AND is_active = true;
  END IF;

  -- Count brand mentions for this specific ai_response_id
  SELECT COUNT(*), COUNT(DISTINCT bm.ai_response_id)
  INTO v_mentions_count, v_responses_count
  FROM brand_mentions bm
  WHERE bm.project_id = p_project_id
    AND bm.brand_type = 'client'
    AND bm.ai_response_id = p_ai_response_id;

  -- Count citations for this specific ai_response_id
  SELECT COUNT(*)
  INTO v_citations_count
  FROM citations c
  WHERE c.project_id = p_project_id
    AND c.citation_type = 'brand'
    AND c.ai_response_id = p_ai_response_id;

  -- Skip if no mentions or citations
  IF (v_mentions_count = 0 AND v_citations_count = 0) THEN
    RETURN 0;
  END IF;

  -- Upsert brand stats with dimensions using SUM for incremental aggregation
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
    p_region_id,
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
    mentions_count = daily_brand_stats.mentions_count + EXCLUDED.mentions_count,
    citations_count = daily_brand_stats.citations_count + EXCLUDED.citations_count,
    responses_analyzed = daily_brand_stats.responses_analyzed + EXCLUDED.responses_analyzed,
    updated_at = now();

  RETURN 1;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FUNCTION: aggregate_competitor_stats_incremental
-- Incremental aggregation for a single ai_response_id and competitor
-- Only counts brand_mentions and citations for the specified ai_response and competitor
-- =============================================

CREATE OR REPLACE FUNCTION aggregate_competitor_stats_incremental(
  p_project_id UUID,
  p_competitor_id UUID,
  p_ai_response_id UUID,
  p_stat_date DATE,
  p_platform TEXT,
  p_region_id UUID,
  p_topic_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_competitor_name TEXT;
  v_mentions_count INTEGER;
  v_citations_count INTEGER;
  v_responses_count INTEGER;
BEGIN
  -- Get competitor name
  SELECT name INTO v_competitor_name
  FROM competitors
  WHERE id = p_competitor_id AND project_id = p_project_id;

  IF v_competitor_name IS NULL THEN
    RETURN 0; -- Competitor not found
  END IF;

  -- Count competitor mentions for this specific ai_response_id
  SELECT COUNT(*), COUNT(DISTINCT bm.ai_response_id)
  INTO v_mentions_count, v_responses_count
  FROM brand_mentions bm
  WHERE bm.project_id = p_project_id
    AND bm.brand_type = 'competitor'
    AND bm.competitor_id = p_competitor_id
    AND bm.ai_response_id = p_ai_response_id;

  -- Count citations for this specific ai_response_id
  SELECT COUNT(*)
  INTO v_citations_count
  FROM citations c
  WHERE c.project_id = p_project_id
    AND c.citation_type = 'competitor'
    AND c.competitor_id = p_competitor_id
    AND c.ai_response_id = p_ai_response_id;

  -- Skip if no mentions or citations
  IF (v_mentions_count = 0 AND v_citations_count = 0) THEN
    RETURN 0;
  END IF;

  -- Upsert competitor stats with dimensions using SUM for incremental aggregation
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
    p_region_id,
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
    mentions_count = daily_brand_stats.mentions_count + EXCLUDED.mentions_count,
    citations_count = daily_brand_stats.citations_count + EXCLUDED.citations_count,
    responses_analyzed = daily_brand_stats.responses_analyzed + EXCLUDED.responses_analyzed,
    updated_at = now();

  RETURN 1;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON FUNCTION aggregate_brand_stats_incremental(UUID, UUID, DATE, TEXT, UUID, UUID) IS 'Incremental aggregation for brand stats for a single ai_response_id. Uses SUM in ON CONFLICT to safely consolidate with existing stats.';
COMMENT ON FUNCTION aggregate_competitor_stats_incremental(UUID, UUID, UUID, DATE, TEXT, UUID, UUID) IS 'Incremental aggregation for competitor stats for a single ai_response_id. Uses SUM in ON CONFLICT to safely consolidate with existing stats.';

