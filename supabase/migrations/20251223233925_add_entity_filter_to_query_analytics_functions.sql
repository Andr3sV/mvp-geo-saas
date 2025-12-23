-- =============================================
-- MIGRATION: Add Entity Filter to Query Analytics Functions
-- Description: Add entity_id and entity_type parameters to filter queries by brand/competitor
--              When entity_id IS NULL, returns all entities (All brands)
-- Date: 2025-12-23
-- =============================================

-- =============================================
-- FUNCTION 1: get_query_overview
-- =============================================

-- Drop existing function with old signature
DROP FUNCTION IF EXISTS get_query_overview(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT);

CREATE OR REPLACE FUNCTION get_query_overview(
  p_project_id UUID,
  p_from_date TIMESTAMPTZ,
  p_to_date TIMESTAMPTZ,
  p_platform TEXT DEFAULT NULL,
  p_region TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL
)
RETURNS TABLE(
  total_queries BIGINT,
  unique_queries BIGINT,
  top_platform TEXT,
  avg_query_length INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH filtered_citations AS (
    SELECT 
      c.web_search_query,
      ar.platform
    FROM citations c
    INNER JOIN ai_responses ar ON ar.id = c.ai_response_id
    INNER JOIN prompt_tracking pt ON pt.id = ar.prompt_tracking_id
    LEFT JOIN regions r ON r.id = pt.region_id AND r.project_id = p_project_id
    LEFT JOIN brand_mentions bm ON bm.ai_response_id = ar.id
    WHERE c.project_id = p_project_id
      AND c.web_search_query IS NOT NULL
      AND c.created_at >= p_from_date
      AND c.created_at <= p_to_date
      AND (p_platform IS NULL OR ar.platform = p_platform)
      AND (p_region IS NULL OR p_region = 'GLOBAL' OR r.code = p_region)
      AND (
        p_entity_id IS NULL OR
        (p_entity_type = 'brand' AND bm.brand_type = 'client') OR
        (p_entity_type = 'competitor' AND bm.brand_type = 'competitor' AND bm.competitor_id = p_entity_id)
      )
  ),
  platform_counts AS (
    SELECT platform, COUNT(*) as cnt
    FROM filtered_citations
    WHERE platform IS NOT NULL
    GROUP BY platform
    ORDER BY cnt DESC
    LIMIT 1
  )
  SELECT 
    COUNT(*)::BIGINT as total_queries,
    COUNT(DISTINCT fc.web_search_query)::BIGINT as unique_queries,
    COALESCE(
      (SELECT platform FROM platform_counts),
      'N/A'
    )::TEXT as top_platform,
    COALESCE(
      ROUND(AVG(LENGTH(fc.web_search_query)))::INTEGER,
      0
    ) as avg_query_length
  FROM filtered_citations fc;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION 2: get_query_word_cloud
-- =============================================

-- Drop existing function with old signature
DROP FUNCTION IF EXISTS get_query_word_cloud(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION get_query_word_cloud(
  p_project_id UUID,
  p_from_date TIMESTAMPTZ,
  p_to_date TIMESTAMPTZ,
  p_platform TEXT DEFAULT NULL,
  p_region TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_entity_id UUID DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL
)
RETURNS TABLE(text TEXT, value BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.web_search_query AS text,
    COUNT(*)::BIGINT AS value
  FROM citations c
  INNER JOIN ai_responses ar ON ar.id = c.ai_response_id
  INNER JOIN prompt_tracking pt ON pt.id = ar.prompt_tracking_id
  LEFT JOIN regions r ON r.id = pt.region_id AND r.project_id = p_project_id
  LEFT JOIN brand_mentions bm ON bm.ai_response_id = ar.id
  WHERE c.project_id = p_project_id
    AND c.web_search_query IS NOT NULL
    AND c.created_at >= p_from_date
    AND c.created_at <= p_to_date
    AND (p_platform IS NULL OR ar.platform = p_platform)
    AND (p_region IS NULL OR p_region = 'GLOBAL' OR r.code = p_region)
    AND (
      p_entity_id IS NULL OR
      (p_entity_type = 'brand' AND bm.brand_type = 'client') OR
      (p_entity_type = 'competitor' AND bm.brand_type = 'competitor' AND bm.competitor_id = p_entity_id)
    )
  GROUP BY c.web_search_query
  ORDER BY value DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION 3: get_query_platform_distribution
-- =============================================

-- Drop existing function with old signature
DROP FUNCTION IF EXISTS get_query_platform_distribution(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT);

CREATE OR REPLACE FUNCTION get_query_platform_distribution(
  p_project_id UUID,
  p_from_date TIMESTAMPTZ,
  p_to_date TIMESTAMPTZ,
  p_region TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL
)
RETURNS TABLE(
  platform TEXT,
  query TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH ranked_queries AS (
    SELECT 
      ar.platform,
      c.web_search_query AS query,
      COUNT(*)::BIGINT AS cnt,
      ROW_NUMBER() OVER (PARTITION BY ar.platform ORDER BY COUNT(*) DESC) AS rn
    FROM citations c
    INNER JOIN ai_responses ar ON ar.id = c.ai_response_id
    INNER JOIN prompt_tracking pt ON pt.id = ar.prompt_tracking_id
    LEFT JOIN regions r ON r.id = pt.region_id AND r.project_id = p_project_id
    LEFT JOIN brand_mentions bm ON bm.ai_response_id = ar.id
    WHERE c.project_id = p_project_id
      AND c.web_search_query IS NOT NULL
      AND c.created_at >= p_from_date
      AND c.created_at <= p_to_date
      AND ar.platform IN ('openai', 'gemini')
      AND (p_region IS NULL OR p_region = 'GLOBAL' OR r.code = p_region)
      AND (
        p_entity_id IS NULL OR
        (p_entity_type = 'brand' AND bm.brand_type = 'client') OR
        (p_entity_type = 'competitor' AND bm.brand_type = 'competitor' AND bm.competitor_id = p_entity_id)
      )
    GROUP BY ar.platform, c.web_search_query
  )
  SELECT 
    rq.platform::TEXT,
    rq.query::TEXT,
    rq.cnt AS count
  FROM ranked_queries rq
  WHERE rq.rn <= 10
  ORDER BY rq.platform, rq.cnt DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION 4: get_query_intent_breakdown
-- =============================================

-- Drop existing function with old signature
DROP FUNCTION IF EXISTS get_query_intent_breakdown(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT);

CREATE OR REPLACE FUNCTION get_query_intent_breakdown(
  p_project_id UUID,
  p_from_date TIMESTAMPTZ,
  p_to_date TIMESTAMPTZ,
  p_platform TEXT DEFAULT NULL,
  p_region TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL
)
RETURNS TABLE(
  intent TEXT,
  count BIGINT,
  color TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH categorized AS (
    SELECT 
      c.web_search_query,
      CASE 
        WHEN LOWER(c.web_search_query) ~ '^what (is|are)' THEN 'Definition'
        WHEN LOWER(c.web_search_query) ~ '^how (to|do|can)' THEN 'How-to'
        WHEN LOWER(c.web_search_query) ~ 'best|top|recommended' THEN 'Best/Top'
        WHEN LOWER(c.web_search_query) ~ 'compare|vs|versus|difference' THEN 'Comparison'
        WHEN LOWER(c.web_search_query) ~ 'why|reason' THEN 'Explanation'
        WHEN LOWER(c.web_search_query) ~ 'review|rating' THEN 'Reviews'
        WHEN LOWER(c.web_search_query) ~ 'price|cost|pricing' THEN 'Pricing'
        WHEN LOWER(c.web_search_query) ~ 'alternative|instead' THEN 'Alternatives'
        ELSE 'Other'
      END AS intent_category
    FROM citations c
    INNER JOIN ai_responses ar ON ar.id = c.ai_response_id
    INNER JOIN prompt_tracking pt ON pt.id = ar.prompt_tracking_id
    LEFT JOIN regions r ON r.id = pt.region_id AND r.project_id = p_project_id
    LEFT JOIN brand_mentions bm ON bm.ai_response_id = ar.id
    WHERE c.project_id = p_project_id
      AND c.web_search_query IS NOT NULL
      AND c.created_at >= p_from_date
      AND c.created_at <= p_to_date
      AND (p_platform IS NULL OR ar.platform = p_platform)
      AND (p_region IS NULL OR p_region = 'GLOBAL' OR r.code = p_region)
      AND (
        p_entity_id IS NULL OR
        (p_entity_type = 'brand' AND bm.brand_type = 'client') OR
        (p_entity_type = 'competitor' AND bm.brand_type = 'competitor' AND bm.competitor_id = p_entity_id)
      )
  )
  SELECT 
    cat.intent_category::TEXT AS intent,
    COUNT(*)::BIGINT AS count,
    CASE cat.intent_category
      WHEN 'Definition' THEN '#3b82f6'
      WHEN 'How-to' THEN '#10b981'
      WHEN 'Best/Top' THEN '#f59e0b'
      WHEN 'Comparison' THEN '#8b5cf6'
      WHEN 'Explanation' THEN '#ec4899'
      WHEN 'Reviews' THEN '#14b8a6'
      WHEN 'Pricing' THEN '#f97316'
      WHEN 'Alternatives' THEN '#6366f1'
      ELSE '#64748b'
    END::TEXT AS color
  FROM categorized cat
  GROUP BY cat.intent_category
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION 5: get_top_queries
-- =============================================

-- Drop existing function with old signature
DROP FUNCTION IF EXISTS get_top_queries(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION get_top_queries(
  p_project_id UUID,
  p_from_date TIMESTAMPTZ,
  p_to_date TIMESTAMPTZ,
  p_platform TEXT DEFAULT NULL,
  p_region TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_entity_id UUID DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL
)
RETURNS TABLE(
  query TEXT,
  count BIGINT,
  platforms TEXT[],
  domains TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.web_search_query::TEXT AS query,
    COUNT(*)::BIGINT AS count,
    ARRAY_AGG(DISTINCT ar.platform)::TEXT[] AS platforms,
    (ARRAY_AGG(DISTINCT c.domain) FILTER (WHERE c.domain IS NOT NULL))[1:3]::TEXT[] AS domains
  FROM citations c
  INNER JOIN ai_responses ar ON ar.id = c.ai_response_id
  INNER JOIN prompt_tracking pt ON pt.id = ar.prompt_tracking_id
  LEFT JOIN regions r ON r.id = pt.region_id AND r.project_id = p_project_id
  LEFT JOIN brand_mentions bm ON bm.ai_response_id = ar.id
  WHERE c.project_id = p_project_id
    AND c.web_search_query IS NOT NULL
    AND c.created_at >= p_from_date
    AND c.created_at <= p_to_date
    AND (p_platform IS NULL OR ar.platform = p_platform)
    AND (p_region IS NULL OR p_region = 'GLOBAL' OR r.code = p_region)
    AND (
      p_entity_id IS NULL OR
      (p_entity_type = 'brand' AND bm.brand_type = 'client') OR
      (p_entity_type = 'competitor' AND bm.brand_type = 'competitor' AND bm.competitor_id = p_entity_id)
    )
  GROUP BY c.web_search_query
  ORDER BY count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION 6: get_query_domain_correlation
-- =============================================

-- Drop existing function with old signature
DROP FUNCTION IF EXISTS get_query_domain_correlation(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_query_domain_correlation(
  p_project_id UUID,
  p_from_date TIMESTAMPTZ,
  p_to_date TIMESTAMPTZ,
  p_platform TEXT DEFAULT NULL,
  p_region TEXT DEFAULT NULL,
  p_query_limit INTEGER DEFAULT 10,
  p_domain_limit INTEGER DEFAULT 10,
  p_entity_id UUID DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL
)
RETURNS TABLE(
  query TEXT,
  domain TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH top_queries AS (
    SELECT c.web_search_query, COUNT(*) AS cnt
    FROM citations c
    INNER JOIN ai_responses ar ON ar.id = c.ai_response_id
    INNER JOIN prompt_tracking pt ON pt.id = ar.prompt_tracking_id
    LEFT JOIN regions r ON r.id = pt.region_id AND r.project_id = p_project_id
    LEFT JOIN brand_mentions bm ON bm.ai_response_id = ar.id
    WHERE c.project_id = p_project_id
      AND c.web_search_query IS NOT NULL
      AND c.domain IS NOT NULL
      AND c.created_at >= p_from_date
      AND c.created_at <= p_to_date
      AND (p_platform IS NULL OR ar.platform = p_platform)
      AND (p_region IS NULL OR p_region = 'GLOBAL' OR r.code = p_region)
      AND (
        p_entity_id IS NULL OR
        (p_entity_type = 'brand' AND bm.brand_type = 'client') OR
        (p_entity_type = 'competitor' AND bm.brand_type = 'competitor' AND bm.competitor_id = p_entity_id)
      )
    GROUP BY c.web_search_query
    ORDER BY cnt DESC
    LIMIT p_query_limit
  ),
  top_domains AS (
    SELECT c.domain, COUNT(*) AS cnt
    FROM citations c
    INNER JOIN ai_responses ar ON ar.id = c.ai_response_id
    INNER JOIN prompt_tracking pt ON pt.id = ar.prompt_tracking_id
    LEFT JOIN regions r ON r.id = pt.region_id AND r.project_id = p_project_id
    LEFT JOIN brand_mentions bm ON bm.ai_response_id = ar.id
    WHERE c.project_id = p_project_id
      AND c.web_search_query IS NOT NULL
      AND c.domain IS NOT NULL
      AND c.created_at >= p_from_date
      AND c.created_at <= p_to_date
      AND (p_platform IS NULL OR ar.platform = p_platform)
      AND (p_region IS NULL OR p_region = 'GLOBAL' OR r.code = p_region)
      AND (
        p_entity_id IS NULL OR
        (p_entity_type = 'brand' AND bm.brand_type = 'client') OR
        (p_entity_type = 'competitor' AND bm.brand_type = 'competitor' AND bm.competitor_id = p_entity_id)
      )
    GROUP BY c.domain
    ORDER BY cnt DESC
    LIMIT p_domain_limit
  )
  SELECT 
    c.web_search_query::TEXT AS query,
    c.domain::TEXT AS domain,
    COUNT(*)::BIGINT AS count
  FROM citations c
  INNER JOIN ai_responses ar ON ar.id = c.ai_response_id
  INNER JOIN prompt_tracking pt ON pt.id = ar.prompt_tracking_id
  LEFT JOIN regions r ON r.id = pt.region_id AND r.project_id = p_project_id
  LEFT JOIN brand_mentions bm ON bm.ai_response_id = ar.id
  WHERE c.project_id = p_project_id
    AND c.web_search_query IN (SELECT tq.web_search_query FROM top_queries tq)
    AND c.domain IN (SELECT td.domain FROM top_domains td)
    AND c.created_at >= p_from_date
    AND c.created_at <= p_to_date
    AND (p_platform IS NULL OR ar.platform = p_platform)
    AND (p_region IS NULL OR p_region = 'GLOBAL' OR r.code = p_region)
    AND (
      p_entity_id IS NULL OR
      (p_entity_type = 'brand' AND bm.brand_type = 'client') OR
      (p_entity_type = 'competitor' AND bm.brand_type = 'competitor' AND bm.competitor_id = p_entity_id)
    )
  GROUP BY c.web_search_query, c.domain
  ORDER BY c.web_search_query, count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON FUNCTION get_query_overview IS 'Returns overview metrics with optional entity filter (NULL = All brands)';
COMMENT ON FUNCTION get_query_word_cloud IS 'Returns top N queries with counts for word cloud visualization, with optional entity filter (NULL = All brands)';
COMMENT ON FUNCTION get_query_platform_distribution IS 'Returns top 10 queries per platform (OpenAI and Gemini), with optional entity filter (NULL = All brands)';
COMMENT ON FUNCTION get_query_intent_breakdown IS 'Returns query categorization by intent patterns, with optional entity filter (NULL = All brands)';
COMMENT ON FUNCTION get_top_queries IS 'Returns top queries with metadata (platforms, domains), with optional entity filter (NULL = All brands)';
COMMENT ON FUNCTION get_query_domain_correlation IS 'Returns query-domain correlation matrix data, with optional entity filter (NULL = All brands)';

