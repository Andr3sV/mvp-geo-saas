-- ============================================
-- MIGRATION: Update evolution functions to use region_id
-- Description: Update get_daily_mentions_evolution and get_daily_citations_evolution
--              to filter by region_id instead of deprecated region (TEXT) column
-- Date: 2025-12-28
-- ============================================

-- ============================================
-- FUNCTION: get_daily_mentions_evolution (Updated to use region_id)
-- ============================================

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
  v_mapped_platform TEXT;
  v_region_id UUID;
BEGIN
  -- Default to last 30 days ending yesterday if dates not provided
  v_end_date := COALESCE(p_to_date, (CURRENT_DATE - INTERVAL '1 day')::timestamp + INTERVAL '23 hours 59 minutes 59 seconds');
  v_start_date := COALESCE(p_from_date, (CURRENT_DATE - INTERVAL '30 days')::date);
  
  -- Map platform values: chatgpt -> openai, anthropic -> claude
  IF p_platform IS NOT NULL AND p_platform != 'all' THEN
    CASE p_platform
      WHEN 'chatgpt' THEN v_mapped_platform := 'openai';
      WHEN 'anthropic' THEN v_mapped_platform := 'claude';
      ELSE v_mapped_platform := p_platform;
    END CASE;
  ELSE
    v_mapped_platform := NULL;
  END IF;

  -- Convert region code to region_id if region filter is active
  IF p_region IS NOT NULL AND p_region != 'GLOBAL' THEN
    SELECT id INTO v_region_id
    FROM regions
    WHERE code = p_region
      AND project_id = p_project_id
      AND is_active = true;
  ELSE
    v_region_id := NULL;
  END IF;
  
  -- Build query using daily_brand_stats with region_id
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
      stat_date AS mention_date,
      SUM(mentions_count) AS mention_count
    FROM daily_brand_stats
    WHERE project_id = p_project_id
      AND entity_type = 'brand'
      AND competitor_id IS NULL
      AND stat_date >= v_start_date::date
      AND stat_date <= v_end_date::date
      AND (v_mapped_platform IS NULL OR platform = v_mapped_platform)
      -- Filter by region_id: NULL means GLOBAL (sum all regions)
      AND (v_region_id IS NULL OR region_id = v_region_id)
      AND (p_topic_id IS NULL OR topic_id = p_topic_id)
    GROUP BY stat_date
  ),
  competitor_daily AS (
    SELECT 
      stat_date AS mention_date,
      SUM(mentions_count) AS mention_count
    FROM daily_brand_stats
    WHERE project_id = p_project_id
      AND entity_type = 'competitor'
      AND competitor_id IS NOT NULL
      AND stat_date >= v_start_date::date
      AND stat_date <= v_end_date::date
      AND (p_competitor_id IS NULL OR competitor_id = p_competitor_id)
      AND (v_mapped_platform IS NULL OR platform = v_mapped_platform)
      -- Filter by region_id: NULL means GLOBAL (sum all regions)
      AND (v_region_id IS NULL OR region_id = v_region_id)
      AND (p_topic_id IS NULL OR topic_id = p_topic_id)
    GROUP BY stat_date
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

GRANT EXECUTE ON FUNCTION get_daily_mentions_evolution(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, UUID) TO authenticated;

COMMENT ON FUNCTION get_daily_mentions_evolution IS 'Returns daily aggregated mentions count for brand and competitor from daily_brand_stats, optimized for large datasets. Filters by region_id instead of deprecated region column. When region is GLOBAL or NULL, sums all regions.';

-- ============================================
-- FUNCTION: get_daily_citations_evolution (Updated to use region_id)
-- ============================================

DROP FUNCTION IF EXISTS get_daily_citations_evolution(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION get_daily_citations_evolution(
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
  brand_citations BIGINT,
  competitor_citations BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
  v_mapped_platform TEXT;
  v_region_id UUID;
BEGIN
  -- Default to last 30 days ending yesterday if dates not provided
  v_end_date := COALESCE(p_to_date, (CURRENT_DATE - INTERVAL '1 day')::timestamp + INTERVAL '23 hours 59 minutes 59 seconds');
  v_start_date := COALESCE(p_from_date, (CURRENT_DATE - INTERVAL '30 days')::date);
  
  -- Map platform values: chatgpt -> openai, anthropic -> claude
  IF p_platform IS NOT NULL AND p_platform != 'all' THEN
    CASE p_platform
      WHEN 'chatgpt' THEN v_mapped_platform := 'openai';
      WHEN 'anthropic' THEN v_mapped_platform := 'claude';
      ELSE v_mapped_platform := p_platform;
    END CASE;
  ELSE
    v_mapped_platform := NULL;
  END IF;

  -- Convert region code to region_id if region filter is active
  IF p_region IS NOT NULL AND p_region != 'GLOBAL' THEN
    SELECT id INTO v_region_id
    FROM regions
    WHERE code = p_region
      AND project_id = p_project_id
      AND is_active = true;
  ELSE
    v_region_id := NULL;
  END IF;
  
  -- Build query using daily_brand_stats with region_id
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
      stat_date AS citation_date,
      SUM(citations_count) AS citation_count
    FROM daily_brand_stats
    WHERE project_id = p_project_id
      AND entity_type = 'brand'
      AND competitor_id IS NULL
      AND stat_date >= v_start_date::date
      AND stat_date <= v_end_date::date
      AND (v_mapped_platform IS NULL OR platform = v_mapped_platform)
      -- Filter by region_id: NULL means GLOBAL (sum all regions)
      AND (v_region_id IS NULL OR region_id = v_region_id)
      AND (p_topic_id IS NULL OR topic_id = p_topic_id)
    GROUP BY stat_date
  ),
  competitor_daily AS (
    SELECT 
      stat_date AS citation_date,
      SUM(citations_count) AS citation_count
    FROM daily_brand_stats
    WHERE project_id = p_project_id
      AND entity_type = 'competitor'
      AND competitor_id IS NOT NULL
      AND stat_date >= v_start_date::date
      AND stat_date <= v_end_date::date
      AND (p_competitor_id IS NULL OR competitor_id = p_competitor_id)
      AND (v_mapped_platform IS NULL OR platform = v_mapped_platform)
      -- Filter by region_id: NULL means GLOBAL (sum all regions)
      AND (v_region_id IS NULL OR region_id = v_region_id)
      AND (p_topic_id IS NULL OR topic_id = p_topic_id)
    GROUP BY stat_date
  )
  SELECT 
    dr.day AS date,
    COALESCE(bd.citation_count, 0)::BIGINT AS brand_citations,
    COALESCE(cd.citation_count, 0)::BIGINT AS competitor_citations
  FROM date_range dr
  LEFT JOIN brand_daily bd ON bd.citation_date = dr.day
  LEFT JOIN competitor_daily cd ON cd.citation_date = dr.day
  ORDER BY dr.day;
END;
$$;

GRANT EXECUTE ON FUNCTION get_daily_citations_evolution(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, UUID) TO authenticated;

COMMENT ON FUNCTION get_daily_citations_evolution IS 'Returns daily aggregated citations count for brand and competitor from daily_brand_stats, optimized for large datasets. Filters by region_id instead of deprecated region column. When region is GLOBAL or NULL, sums all regions.';

