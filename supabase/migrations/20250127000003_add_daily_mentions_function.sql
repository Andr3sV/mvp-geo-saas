-- ============================================
-- FUNCTION: get_daily_mentions_evolution
-- ============================================
-- Aggregates mentions by day for Share of Voice evolution chart
-- This replaces client-side counting for better performance with large datasets
-- ============================================

CREATE OR REPLACE FUNCTION get_daily_mentions_evolution(
  p_project_id UUID,
  p_competitor_id UUID DEFAULT NULL,
  p_from_date TIMESTAMPTZ DEFAULT NULL,
  p_to_date TIMESTAMPTZ DEFAULT NULL,
  p_platform TEXT DEFAULT NULL,
  p_region TEXT DEFAULT NULL
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
  
  -- Build base query for brand mentions
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
      DATE(cd.created_at) AS mention_date,
      COUNT(*) AS mention_count
    FROM citations_detail cd
    INNER JOIN ai_responses ar ON ar.id = cd.ai_response_id
    INNER JOIN prompt_tracking pt ON pt.id = ar.prompt_tracking_id
    WHERE cd.project_id = p_project_id
      AND cd.created_at >= v_start_date
      AND cd.created_at <= v_end_date
      AND (p_platform IS NULL OR p_platform = 'all' OR ar.platform = p_platform)
      AND (p_region IS NULL OR p_region = 'GLOBAL' OR pt.region = p_region)
    GROUP BY DATE(cd.created_at)
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
GRANT EXECUTE ON FUNCTION get_daily_mentions_evolution(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_daily_mentions_evolution IS 'Returns daily aggregated mentions count for brand and competitor, optimized for large datasets';

