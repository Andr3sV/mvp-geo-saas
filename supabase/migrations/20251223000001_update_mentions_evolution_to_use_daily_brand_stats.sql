-- ============================================
-- FUNCTION: get_daily_mentions_evolution (Updated to use daily_brand_stats)
-- ============================================
-- Aggregates mentions by day for Share of Voice evolution chart
-- Now uses daily_brand_stats table for optimized performance
-- When p_region is NULL or 'GLOBAL', sums all regions
-- ============================================

-- Drop the old function first
DROP FUNCTION IF EXISTS get_daily_mentions_evolution(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, UUID);

-- Create the updated function using daily_brand_stats
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
BEGIN
  -- Default to last 30 days ending yesterday if dates not provided
  -- Today's data won't be available until tomorrow, so max date is yesterday
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
  
  -- Build query using daily_brand_stats
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
      -- When p_region is NULL or 'GLOBAL', don't filter by region (sum all regions)
      AND (p_region IS NULL OR p_region = 'GLOBAL' OR region = p_region)
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
      -- When p_region is NULL or 'GLOBAL', don't filter by region (sum all regions)
      AND (p_region IS NULL OR p_region = 'GLOBAL' OR region = p_region)
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_daily_mentions_evolution(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_daily_mentions_evolution IS 'Returns daily aggregated mentions count for brand and competitor from daily_brand_stats, optimized for large datasets. When region is GLOBAL, sums all regions.';

