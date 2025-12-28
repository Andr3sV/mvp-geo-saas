-- =============================================
-- MIGRATION: Add Today Citations Aggregated Function
-- Description: Create SQL function to efficiently aggregate today's citations
--              for brand and competitors, replacing complex client-side queries
-- Date: 2025-12-28
-- =============================================

-- =============================================
-- FUNCTION: get_today_citations_aggregated
-- =============================================

CREATE OR REPLACE FUNCTION get_today_citations_aggregated(
  p_project_id UUID,
  p_cutoff_time TIMESTAMPTZ,
  p_platform TEXT DEFAULT NULL,
  p_region_id UUID DEFAULT NULL,
  p_topic_id UUID DEFAULT NULL
)
RETURNS TABLE (
  brand_citations BIGINT,
  competitor_citations JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE c.citation_type = 'brand')::BIGINT as brand_citations,
    COALESCE(
      jsonb_object_agg(
        c.competitor_id::TEXT, 
        COUNT(*)::BIGINT
      ) FILTER (WHERE c.citation_type = 'competitor' AND c.competitor_id IS NOT NULL),
      '{}'::jsonb
    ) as competitor_citations
  FROM citations c
  INNER JOIN ai_responses ar ON ar.id = c.ai_response_id
  LEFT JOIN prompt_tracking pt ON pt.id = ar.prompt_tracking_id
  WHERE c.project_id = p_project_id
    AND c.created_at >= p_cutoff_time
    AND (p_platform IS NULL OR ar.platform = p_platform)
    AND (p_region_id IS NULL OR pt.region_id = p_region_id)
    AND (p_topic_id IS NULL OR pt.topic_id = p_topic_id);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- PERMISSIONS
-- =============================================

GRANT EXECUTE ON FUNCTION get_today_citations_aggregated TO authenticated;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON FUNCTION get_today_citations_aggregated IS 'Efficiently aggregates today''s citations for brand and competitors. Returns brand_citations count and competitor_citations as JSONB object with competitor_id as key and count as value.';

