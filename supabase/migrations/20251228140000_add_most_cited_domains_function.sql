-- =============================================
-- MIGRATION: Add Most Cited Domains Aggregated Function
-- Description: Create SQL function to efficiently aggregate citations by domain
--              replacing slow client-side queries with direct table access
-- Date: 2025-12-28
-- =============================================

-- =============================================
-- FUNCTION: get_most_cited_domains_aggregated
-- =============================================

CREATE OR REPLACE FUNCTION get_most_cited_domains_aggregated(
  p_project_id UUID,
  p_from_date TIMESTAMPTZ,
  p_to_date TIMESTAMPTZ,
  p_platform TEXT DEFAULT NULL,
  p_region_id UUID DEFAULT NULL,
  p_topic_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  domain TEXT,
  citations_count BIGINT,
  platforms TEXT[],
  sample_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH filtered_citations AS (
    SELECT 
      c.domain,
      c.url,
      ar.platform
    FROM citations c
    INNER JOIN ai_responses ar ON ar.id = c.ai_response_id
    LEFT JOIN prompt_tracking pt ON pt.id = ar.prompt_tracking_id
    WHERE ar.project_id = p_project_id
      AND c.created_at >= p_from_date
      AND c.created_at <= p_to_date
      AND c.domain IS NOT NULL
      AND c.url IS NOT NULL
      AND (p_platform IS NULL OR ar.platform = p_platform)
      -- Region filter: if p_region_id is NULL (GLOBAL), include all; otherwise only match specific region_id
      AND (p_region_id IS NULL OR pt.region_id = p_region_id)
      -- Topic filter: if p_topic_id is NULL (all), include all; otherwise only match specific topic_id
      AND (p_topic_id IS NULL OR pt.topic_id = p_topic_id)
  ),
  domain_aggregates AS (
    SELECT 
      fc.domain,
      COUNT(*)::BIGINT as citations_count,
      ARRAY_AGG(DISTINCT fc.platform) FILTER (WHERE fc.platform IS NOT NULL) as platforms
    FROM filtered_citations fc
    GROUP BY fc.domain
  ),
  domain_sample_urls AS (
    SELECT DISTINCT ON (fc.domain)
      fc.domain,
      fc.url as sample_url
    FROM filtered_citations fc
    ORDER BY fc.domain
  )
  SELECT 
    da.domain,
    da.citations_count,
    da.platforms,
    COALESCE(dsu.sample_url, '') as sample_url
  FROM domain_aggregates da
  LEFT JOIN domain_sample_urls dsu ON dsu.domain = da.domain
  ORDER BY da.citations_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- PERMISSIONS
-- =============================================

GRANT EXECUTE ON FUNCTION get_most_cited_domains_aggregated TO authenticated;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON FUNCTION get_most_cited_domains_aggregated IS 'Efficiently aggregates citations by domain. Returns domain, citation count, platforms array, and a sample URL. Much faster than client-side aggregation.';

