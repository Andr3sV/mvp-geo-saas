-- =============================================
-- Migration: Add diagnostic logging to aggregate_brand_stats_incremental
-- Purpose: Diagnose why incremental aggregation for brands is not inserting data
-- Date: 2025-01-24
-- =============================================

-- Drop and recreate the function with diagnostic logging
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
  v_rows_affected INTEGER;
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
    RAISE NOTICE 'aggregate_brand_stats_incremental: Skipping - no mentions or citations. mentions_count=%, citations_count=%, ai_response_id=%', 
      v_mentions_count, v_citations_count, p_ai_response_id;
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

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

  RAISE NOTICE 'aggregate_brand_stats_incremental: Completed. mentions_count=%, citations_count=%, rows_affected=%, project_id=%, stat_date=%, platform=%, region_id=%, topic_id=%', 
    v_mentions_count, v_citations_count, v_rows_affected, p_project_id, p_stat_date, p_platform, p_region_id, p_topic_id;

  RETURN 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION aggregate_brand_stats_incremental(UUID, UUID, DATE, TEXT, UUID, UUID) IS 'Incremental aggregation for brand stats for a single ai_response_id. Uses SUM in ON CONFLICT to safely consolidate with existing stats. Includes diagnostic logging.';

