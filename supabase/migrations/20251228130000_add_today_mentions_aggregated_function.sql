-- =============================================
-- MIGRATION: Add Today Mentions Aggregated Function
-- Description: Create SQL function to efficiently aggregate today's mentions
--              for brand and competitors, replacing complex client-side queries
-- Date: 2025-12-28
-- =============================================

-- =============================================
-- FUNCTION: get_today_mentions_aggregated
-- =============================================

CREATE OR REPLACE FUNCTION get_today_mentions_aggregated(
  p_project_id UUID,
  p_cutoff_time TIMESTAMPTZ,
  p_platform TEXT DEFAULT NULL,
  p_region_id UUID DEFAULT NULL,
  p_topic_id UUID DEFAULT NULL
)
RETURNS TABLE (
  brand_mentions BIGINT,
  competitor_mentions JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE bm.brand_type = 'client')::BIGINT as brand_mentions,
    COALESCE(
      jsonb_object_agg(
        bm.competitor_id::TEXT, 
        COUNT(*)::BIGINT
      ) FILTER (WHERE bm.brand_type = 'competitor' AND bm.competitor_id IS NOT NULL),
      '{}'::jsonb
    ) as competitor_mentions
  FROM brand_mentions bm
  INNER JOIN ai_responses ar ON ar.id = bm.ai_response_id
  LEFT JOIN prompt_tracking pt ON pt.id = ar.prompt_tracking_id
  WHERE bm.project_id = p_project_id
    AND bm.created_at >= p_cutoff_time
    AND (p_platform IS NULL OR ar.platform = p_platform)
    AND (p_region_id IS NULL OR pt.region_id = p_region_id)
    AND (p_topic_id IS NULL OR pt.topic_id = p_topic_id);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- PERMISSIONS
-- =============================================

GRANT EXECUTE ON FUNCTION get_today_mentions_aggregated TO authenticated;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON FUNCTION get_today_mentions_aggregated IS 'Efficiently aggregates today''s mentions for brand and competitors. Returns brand_mentions count and competitor_mentions as JSONB object with competitor_id as key and count as value.';

