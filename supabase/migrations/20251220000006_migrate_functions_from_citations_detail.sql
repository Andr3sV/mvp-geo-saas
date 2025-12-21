-- =============================================
-- MIGRATION: Migrate SQL Functions from citations_detail to citations
-- Description: Update SQL functions to use citations table instead of citations_detail
-- Date: 2025-12-20
-- =============================================

-- =============================================
-- FUNCTION: Count Distinct Citation Pages (Migrated)
-- Description: Counts distinct AI response IDs that have citations with URLs
-- Now uses citations table instead of citations_detail
-- =============================================

DROP FUNCTION IF EXISTS count_distinct_citation_pages(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION count_distinct_citation_pages(
  p_project_id UUID,
  p_from_date TIMESTAMPTZ DEFAULT NULL,
  p_to_date TIMESTAMPTZ DEFAULT NULL,
  p_platform TEXT DEFAULT NULL,
  p_region TEXT DEFAULT NULL,
  p_topic_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT c.ai_response_id)
  INTO v_count
  FROM citations c
  INNER JOIN ai_responses ar ON ar.id = c.ai_response_id
  INNER JOIN prompt_tracking pt ON pt.id = ar.prompt_tracking_id
  WHERE c.project_id = p_project_id
    AND c.url IS NOT NULL  -- Only citations with URLs (was cited_url)
    AND (p_from_date IS NULL OR c.created_at >= p_from_date)
    AND (p_to_date IS NULL OR c.created_at <= p_to_date)
    AND (p_platform IS NULL OR p_platform = 'all' OR ar.platform = p_platform)
    AND (p_region IS NULL OR p_region = 'GLOBAL' OR pt.region = p_region)
    AND (p_topic_id IS NULL OR pt.topic_id = p_topic_id);
  
  RETURN COALESCE(v_count, 0);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION count_distinct_citation_pages(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION count_distinct_citation_pages IS 'Counts distinct AI response IDs that have citations with URLs, with optional filtering by date range, platform, region, and topic. Migrated from citations_detail to citations table.';

-- =============================================
-- FUNCTION: get_daily_mentions_evolution (Migrated)
-- Description: Returns daily aggregated mentions count for brand and competitor
-- Now uses brand_mentions table for brand mentions instead of citations_detail
-- =============================================

DROP FUNCTION IF EXISTS get_daily_mentions_evolution(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION get_daily_mentions_evolution(
  p_project_id UUID,
  p_competitor_id UUID DEFAULT NULL,
  p_from_date TIMESTAMPTZ DEFAULT NULL,
  p_to_date TIMESTAMPTZ DEFAULT NULL,
  p_platform TEXT DEFAULT NULL,
  p_region TEXT DEFAULT NULL,
  p_topic_id UUID DEFAULT NULL
)
RETURNS TABLE (
  date DATE,
  brand_mentions BIGINT,
  competitor_mentions BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
BEGIN
  -- Default to last 30 days if dates not provided
  v_end_date := COALESCE(p_to_date, NOW());
  v_start_date := COALESCE(p_from_date, v_end_date - INTERVAL '30 days');
  
  -- Build base query for brand mentions using brand_mentions table
  RETURN QUERY
  WITH date_range AS (
    SELECT generate_series(
      v_start_date::date,
      v_end_date::date,
      '1 day'::interval
    )::date AS day
  ),
  brand_daily AS (
    SELECT 
      DATE(bm.created_at) AS mention_date,
      COUNT(*) AS mention_count
    FROM brand_mentions bm
    INNER JOIN ai_responses ar ON ar.id = bm.ai_response_id
    INNER JOIN prompt_tracking pt ON pt.id = ar.prompt_tracking_id
    WHERE bm.project_id = p_project_id
      AND bm.brand_type = 'client'  -- Only client brand mentions
      AND bm.created_at >= v_start_date
      AND bm.created_at <= v_end_date
      AND (p_platform IS NULL OR p_platform = 'all' OR ar.platform = p_platform)
      AND (p_region IS NULL OR p_region = 'GLOBAL' OR pt.region = p_region)
      AND (p_topic_id IS NULL OR pt.topic_id = p_topic_id)
    GROUP BY DATE(bm.created_at)
  ),
  competitor_daily AS (
    SELECT 
      DATE(cc.created_at) AS mention_date,
      COUNT(*) AS mention_count
    FROM competitor_citations cc
    INNER JOIN ai_responses ar ON ar.id = cc.ai_response_id
    INNER JOIN prompt_tracking pt ON pt.id = ar.prompt_tracking_id
    WHERE cc.project_id = p_project_id
      AND cc.created_at >= v_start_date
      AND cc.created_at <= v_end_date
      AND (p_competitor_id IS NULL OR cc.competitor_id = p_competitor_id)
      AND (p_platform IS NULL OR p_platform = 'all' OR ar.platform = p_platform)
      AND (p_region IS NULL OR p_region = 'GLOBAL' OR pt.region = p_region)
      AND (p_topic_id IS NULL OR pt.topic_id = p_topic_id)
    GROUP BY DATE(cc.created_at)
  )
  SELECT 
    dr.day AS date,
    COALESCE(bd.mention_count, 0)::BIGINT AS brand_mentions,
    COALESCE(cd.mention_count, 0)::BIGINT AS competitor_mentions
  FROM date_range dr
  LEFT JOIN brand_daily bd ON bd.mention_date = dr.day
  LEFT JOIN competitor_daily cd ON cd.mention_date = dr.day
  ORDER BY dr.day;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_daily_mentions_evolution(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_daily_mentions_evolution IS 'Returns daily aggregated mentions count for brand (from brand_mentions) and competitor (from competitor_citations), with optional topic filter. Migrated from citations_detail to brand_mentions table.';

