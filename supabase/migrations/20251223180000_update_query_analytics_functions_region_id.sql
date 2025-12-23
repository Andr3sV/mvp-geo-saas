-- =============================================
-- MIGRATION: Update Query Analytics Functions to use region_id
-- Description: Update all RPC functions to use region_id with regions table join instead of prompt_tracking.region
-- Date: 2025-12-23
-- =============================================

-- =============================================
-- FUNCTION 1: get_query_overview
-- =============================================

CREATE OR REPLACE FUNCTION get_query_overview(
  p_project_id UUID,
  p_from_date TIMESTAMPTZ,
  p_to_date TIMESTAMPTZ,
  p_platform TEXT DEFAULT NULL,
  p_region TEXT DEFAULT NULL
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
    WHERE c.project_id = p_project_id
      AND c.web_search_query IS NOT NULL
      AND c.created_at >= p_from_date
      AND c.created_at <= p_to_date
      AND (p_platform IS NULL OR ar.platform = p_platform)
      AND (p_region IS NULL OR p_region = 'GLOBAL' OR r.code = p_region)
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

CREATE OR REPLACE FUNCTION get_query_word_cloud(
  p_project_id UUID,
  p_from_date TIMESTAMPTZ,
  p_to_date TIMESTAMPTZ,
  p_platform TEXT DEFAULT NULL,
  p_region TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
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
  WHERE c.project_id = p_project_id
    AND c.web_search_query IS NOT NULL
    AND c.created_at >= p_from_date
    AND c.created_at <= p_to_date
    AND (p_platform IS NULL OR ar.platform = p_platform)
    AND (p_region IS NULL OR p_region = 'GLOBAL' OR r.code = p_region)
  GROUP BY c.web_search_query
  ORDER BY value DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION 3: get_query_platform_distribution
-- =============================================

CREATE OR REPLACE FUNCTION get_query_platform_distribution(
  p_project_id UUID,
  p_from_date TIMESTAMPTZ,
  p_to_date TIMESTAMPTZ,
  p_region TEXT DEFAULT NULL
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
    WHERE c.project_id = p_project_id
      AND c.web_search_query IS NOT NULL
      AND c.created_at >= p_from_date
      AND c.created_at <= p_to_date
      AND ar.platform IN ('openai', 'gemini')
      AND (p_region IS NULL OR p_region = 'GLOBAL' OR r.code = p_region)
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

CREATE OR REPLACE FUNCTION get_query_intent_breakdown(
  p_project_id UUID,
  p_from_date TIMESTAMPTZ,
  p_to_date TIMESTAMPTZ,
  p_platform TEXT DEFAULT NULL,
  p_region TEXT DEFAULT NULL
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
    WHERE c.project_id = p_project_id
      AND c.web_search_query IS NOT NULL
      AND c.created_at >= p_from_date
      AND c.created_at <= p_to_date
      AND (p_platform IS NULL OR ar.platform = p_platform)
      AND (p_region IS NULL OR p_region = 'GLOBAL' OR r.code = p_region)
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

CREATE OR REPLACE FUNCTION get_top_queries(
  p_project_id UUID,
  p_from_date TIMESTAMPTZ,
  p_to_date TIMESTAMPTZ,
  p_platform TEXT DEFAULT NULL,
  p_region TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
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
  WHERE c.project_id = p_project_id
    AND c.web_search_query IS NOT NULL
    AND c.created_at >= p_from_date
    AND c.created_at <= p_to_date
    AND (p_platform IS NULL OR ar.platform = p_platform)
    AND (p_region IS NULL OR p_region = 'GLOBAL' OR r.code = p_region)
  GROUP BY c.web_search_query
  ORDER BY count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION 6: get_trend_metrics
-- =============================================

CREATE OR REPLACE FUNCTION get_trend_metrics(
  p_project_id UUID,
  p_from_date TIMESTAMPTZ,
  p_to_date TIMESTAMPTZ,
  p_platform TEXT DEFAULT NULL,
  p_region TEXT DEFAULT NULL
)
RETURNS TABLE(
  rising_count INTEGER,
  declining_count INTEGER,
  new_count INTEGER,
  momentum_score NUMERIC
) AS $$
DECLARE
  v_period_days INTEGER;
  v_previous_start TIMESTAMPTZ;
  v_previous_end TIMESTAMPTZ;
BEGIN
  -- Calculate period duration
  v_period_days := EXTRACT(DAY FROM (p_to_date - p_from_date))::INTEGER + 1;
  v_previous_start := p_from_date - (v_period_days || ' days')::INTERVAL;
  v_previous_end := p_from_date - INTERVAL '1 second';

  RETURN QUERY
  WITH current_period AS (
    SELECT 
      c.web_search_query,
      COUNT(*)::INTEGER AS cnt
    FROM citations c
    INNER JOIN ai_responses ar ON ar.id = c.ai_response_id
    INNER JOIN prompt_tracking pt ON pt.id = ar.prompt_tracking_id
    LEFT JOIN regions r ON r.id = pt.region_id AND r.project_id = p_project_id
    WHERE c.project_id = p_project_id
      AND c.web_search_query IS NOT NULL
      AND c.created_at >= p_from_date
      AND c.created_at <= p_to_date
      AND (p_platform IS NULL OR ar.platform = p_platform)
      AND (p_region IS NULL OR p_region = 'GLOBAL' OR r.code = p_region)
    GROUP BY c.web_search_query
  ),
  previous_period AS (
    SELECT 
      c.web_search_query,
      COUNT(*)::INTEGER AS cnt
    FROM citations c
    INNER JOIN ai_responses ar ON ar.id = c.ai_response_id
    INNER JOIN prompt_tracking pt ON pt.id = ar.prompt_tracking_id
    LEFT JOIN regions r ON r.id = pt.region_id AND r.project_id = p_project_id
    WHERE c.project_id = p_project_id
      AND c.web_search_query IS NOT NULL
      AND c.created_at >= v_previous_start
      AND c.created_at <= v_previous_end
      AND (p_platform IS NULL OR ar.platform = p_platform)
      AND (p_region IS NULL OR p_region = 'GLOBAL' OR r.code = p_region)
    GROUP BY c.web_search_query
  ),
  comparison AS (
    SELECT 
      COALESCE(c.web_search_query, p.web_search_query) AS query,
      COALESCE(c.cnt, 0) AS current_cnt,
      COALESCE(p.cnt, 0) AS previous_cnt
    FROM current_period c
    FULL OUTER JOIN previous_period p ON c.web_search_query = p.web_search_query
  )
  SELECT 
    COUNT(*) FILTER (WHERE current_cnt > previous_cnt AND previous_cnt > 0)::INTEGER AS rising_count,
    COUNT(*) FILTER (WHERE current_cnt < previous_cnt AND current_cnt > 0)::INTEGER AS declining_count,
    COUNT(*) FILTER (WHERE previous_cnt = 0 AND current_cnt > 0)::INTEGER AS new_count,
    CASE 
      WHEN SUM(previous_cnt) > 0 
      THEN ROUND(((SUM(current_cnt)::NUMERIC - SUM(previous_cnt)::NUMERIC) / SUM(previous_cnt)::NUMERIC) * 100, 1)
      ELSE 0
    END AS momentum_score
  FROM comparison;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION 7: get_query_velocity
-- =============================================

CREATE OR REPLACE FUNCTION get_query_velocity(
  p_project_id UUID,
  p_from_date TIMESTAMPTZ,
  p_to_date TIMESTAMPTZ,
  p_platform TEXT DEFAULT NULL,
  p_region TEXT DEFAULT NULL
)
RETURNS TABLE(
  date DATE,
  queries BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      p_from_date::DATE,
      p_to_date::DATE,
      '1 day'::INTERVAL
    )::DATE AS date
  ),
  daily_counts AS (
    SELECT 
      DATE(c.created_at) AS query_date,
      COUNT(*)::BIGINT AS cnt
    FROM citations c
    INNER JOIN ai_responses ar ON ar.id = c.ai_response_id
    INNER JOIN prompt_tracking pt ON pt.id = ar.prompt_tracking_id
    LEFT JOIN regions r ON r.id = pt.region_id AND r.project_id = p_project_id
    WHERE c.project_id = p_project_id
      AND c.web_search_query IS NOT NULL
      AND c.created_at >= p_from_date
      AND c.created_at <= p_to_date
      AND (p_platform IS NULL OR ar.platform = p_platform)
      AND (p_region IS NULL OR p_region = 'GLOBAL' OR r.code = p_region)
    GROUP BY DATE(c.created_at)
  )
  SELECT 
    ds.date,
    COALESCE(dc.cnt, 0)::BIGINT AS queries
  FROM date_series ds
  LEFT JOIN daily_counts dc ON ds.date = dc.query_date
  ORDER BY ds.date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION 8: get_rising_queries
-- =============================================

CREATE OR REPLACE FUNCTION get_rising_queries(
  p_project_id UUID,
  p_from_date TIMESTAMPTZ,
  p_to_date TIMESTAMPTZ,
  p_platform TEXT DEFAULT NULL,
  p_region TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  query TEXT,
  current_count INTEGER,
  previous_count INTEGER,
  growth NUMERIC,
  platforms TEXT[]
) AS $$
DECLARE
  v_period_days INTEGER;
  v_previous_start TIMESTAMPTZ;
  v_previous_end TIMESTAMPTZ;
BEGIN
  v_period_days := EXTRACT(DAY FROM (p_to_date - p_from_date))::INTEGER + 1;
  v_previous_start := p_from_date - (v_period_days || ' days')::INTERVAL;
  v_previous_end := p_from_date - INTERVAL '1 second';

  RETURN QUERY
  WITH current_period AS (
    SELECT 
      c.web_search_query,
      COUNT(*)::INTEGER AS cnt,
      ARRAY_AGG(DISTINCT ar.platform) AS plats
    FROM citations c
    INNER JOIN ai_responses ar ON ar.id = c.ai_response_id
    INNER JOIN prompt_tracking pt ON pt.id = ar.prompt_tracking_id
    LEFT JOIN regions r ON r.id = pt.region_id AND r.project_id = p_project_id
    WHERE c.project_id = p_project_id
      AND c.web_search_query IS NOT NULL
      AND c.created_at >= p_from_date
      AND c.created_at <= p_to_date
      AND (p_platform IS NULL OR ar.platform = p_platform)
      AND (p_region IS NULL OR p_region = 'GLOBAL' OR r.code = p_region)
    GROUP BY c.web_search_query
  ),
  previous_period AS (
    SELECT 
      c.web_search_query,
      COUNT(*)::INTEGER AS cnt
    FROM citations c
    INNER JOIN ai_responses ar ON ar.id = c.ai_response_id
    INNER JOIN prompt_tracking pt ON pt.id = ar.prompt_tracking_id
    LEFT JOIN regions r ON r.id = pt.region_id AND r.project_id = p_project_id
    WHERE c.project_id = p_project_id
      AND c.web_search_query IS NOT NULL
      AND c.created_at >= v_previous_start
      AND c.created_at <= v_previous_end
      AND (p_platform IS NULL OR ar.platform = p_platform)
      AND (p_region IS NULL OR p_region = 'GLOBAL' OR r.code = p_region)
    GROUP BY c.web_search_query
  )
  SELECT 
    c.web_search_query::TEXT AS query,
    c.cnt AS current_count,
    COALESCE(p.cnt, 0) AS previous_count,
    CASE 
      WHEN COALESCE(p.cnt, 0) > 0 
      THEN ROUND(((c.cnt::NUMERIC - p.cnt::NUMERIC) / p.cnt::NUMERIC) * 100, 1)
      ELSE 100
    END AS growth,
    c.plats::TEXT[] AS platforms
  FROM current_period c
  LEFT JOIN previous_period p ON c.web_search_query = p.web_search_query
  WHERE c.cnt > COALESCE(p.cnt, 0) AND COALESCE(p.cnt, 0) > 0
  ORDER BY growth DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION 9: get_declining_queries
-- =============================================

CREATE OR REPLACE FUNCTION get_declining_queries(
  p_project_id UUID,
  p_from_date TIMESTAMPTZ,
  p_to_date TIMESTAMPTZ,
  p_platform TEXT DEFAULT NULL,
  p_region TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  query TEXT,
  current_count INTEGER,
  previous_count INTEGER,
  decline NUMERIC,
  platforms TEXT[]
) AS $$
DECLARE
  v_period_days INTEGER;
  v_previous_start TIMESTAMPTZ;
  v_previous_end TIMESTAMPTZ;
BEGIN
  v_period_days := EXTRACT(DAY FROM (p_to_date - p_from_date))::INTEGER + 1;
  v_previous_start := p_from_date - (v_period_days || ' days')::INTERVAL;
  v_previous_end := p_from_date - INTERVAL '1 second';

  RETURN QUERY
  WITH current_period AS (
    SELECT 
      c.web_search_query,
      COUNT(*)::INTEGER AS cnt,
      ARRAY_AGG(DISTINCT ar.platform) AS plats
    FROM citations c
    INNER JOIN ai_responses ar ON ar.id = c.ai_response_id
    INNER JOIN prompt_tracking pt ON pt.id = ar.prompt_tracking_id
    LEFT JOIN regions r ON r.id = pt.region_id AND r.project_id = p_project_id
    WHERE c.project_id = p_project_id
      AND c.web_search_query IS NOT NULL
      AND c.created_at >= p_from_date
      AND c.created_at <= p_to_date
      AND (p_platform IS NULL OR ar.platform = p_platform)
      AND (p_region IS NULL OR p_region = 'GLOBAL' OR r.code = p_region)
    GROUP BY c.web_search_query
  ),
  previous_period AS (
    SELECT 
      c.web_search_query,
      COUNT(*)::INTEGER AS cnt,
      ARRAY_AGG(DISTINCT ar.platform) AS plats
    FROM citations c
    INNER JOIN ai_responses ar ON ar.id = c.ai_response_id
    INNER JOIN prompt_tracking pt ON pt.id = ar.prompt_tracking_id
    LEFT JOIN regions r ON r.id = pt.region_id AND r.project_id = p_project_id
    WHERE c.project_id = p_project_id
      AND c.web_search_query IS NOT NULL
      AND c.created_at >= v_previous_start
      AND c.created_at <= v_previous_end
      AND (p_platform IS NULL OR ar.platform = p_platform)
      AND (p_region IS NULL OR p_region = 'GLOBAL' OR r.code = p_region)
    GROUP BY c.web_search_query
  )
  SELECT 
    p.web_search_query::TEXT AS query,
    COALESCE(c.cnt, 0) AS current_count,
    p.cnt AS previous_count,
    ROUND(((p.cnt::NUMERIC - COALESCE(c.cnt, 0)::NUMERIC) / p.cnt::NUMERIC) * 100, 1) AS decline,
    COALESCE(c.plats, p.plats)::TEXT[] AS platforms
  FROM previous_period p
  LEFT JOIN current_period c ON p.web_search_query = c.web_search_query
  WHERE COALESCE(c.cnt, 0) < p.cnt AND COALESCE(c.cnt, 0) > 0
  ORDER BY decline DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION 10: get_query_momentum
-- =============================================

CREATE OR REPLACE FUNCTION get_query_momentum(
  p_project_id UUID,
  p_from_date TIMESTAMPTZ,
  p_to_date TIMESTAMPTZ,
  p_platform TEXT DEFAULT NULL,
  p_region TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 30
)
RETURNS TABLE(
  query TEXT,
  volume INTEGER,
  growth NUMERIC,
  quadrant TEXT
) AS $$
DECLARE
  v_period_days INTEGER;
  v_previous_start TIMESTAMPTZ;
  v_previous_end TIMESTAMPTZ;
BEGIN
  v_period_days := EXTRACT(DAY FROM (p_to_date - p_from_date))::INTEGER + 1;
  v_previous_start := p_from_date - (v_period_days || ' days')::INTERVAL;
  v_previous_end := p_from_date - INTERVAL '1 second';

  RETURN QUERY
  WITH current_period AS (
    SELECT 
      c.web_search_query,
      COUNT(*)::INTEGER AS cnt
    FROM citations c
    INNER JOIN ai_responses ar ON ar.id = c.ai_response_id
    INNER JOIN prompt_tracking pt ON pt.id = ar.prompt_tracking_id
    LEFT JOIN regions r ON r.id = pt.region_id AND r.project_id = p_project_id
    WHERE c.project_id = p_project_id
      AND c.web_search_query IS NOT NULL
      AND c.created_at >= p_from_date
      AND c.created_at <= p_to_date
      AND (p_platform IS NULL OR ar.platform = p_platform)
      AND (p_region IS NULL OR p_region = 'GLOBAL' OR r.code = p_region)
    GROUP BY c.web_search_query
  ),
  previous_period AS (
    SELECT 
      c.web_search_query,
      COUNT(*)::INTEGER AS cnt
    FROM citations c
    INNER JOIN ai_responses ar ON ar.id = c.ai_response_id
    INNER JOIN prompt_tracking pt ON pt.id = ar.prompt_tracking_id
    LEFT JOIN regions r ON r.id = pt.region_id AND r.project_id = p_project_id
    WHERE c.project_id = p_project_id
      AND c.web_search_query IS NOT NULL
      AND c.created_at >= v_previous_start
      AND c.created_at <= v_previous_end
      AND (p_platform IS NULL OR ar.platform = p_platform)
      AND (p_region IS NULL OR p_region = 'GLOBAL' OR r.code = p_region)
    GROUP BY c.web_search_query
  ),
  combined AS (
    SELECT 
      c.web_search_query,
      c.cnt AS current_cnt,
      COALESCE(p.cnt, 0) AS previous_cnt,
      CASE 
        WHEN COALESCE(p.cnt, 0) > 0 
        THEN ROUND(((c.cnt::NUMERIC - p.cnt::NUMERIC) / p.cnt::NUMERIC) * 100, 1)
        WHEN c.cnt > 0 THEN 100
        ELSE 0
      END AS growth_rate
    FROM current_period c
    LEFT JOIN previous_period p ON c.web_search_query = p.web_search_query
  )
  SELECT 
    cb.web_search_query::TEXT AS query,
    cb.current_cnt AS volume,
    cb.growth_rate AS growth,
    CASE 
      WHEN cb.current_cnt >= 5 AND cb.growth_rate > 20 THEN 'star'
      WHEN cb.current_cnt < 5 AND cb.growth_rate > 20 THEN 'rising'
      WHEN cb.growth_rate >= -20 AND cb.growth_rate <= 20 THEN 'stable'
      ELSE 'declining'
    END::TEXT AS quadrant
  FROM combined cb
  ORDER BY cb.current_cnt DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION 11: get_emerging_queries
-- =============================================

CREATE OR REPLACE FUNCTION get_emerging_queries(
  p_project_id UUID,
  p_from_date TIMESTAMPTZ,
  p_to_date TIMESTAMPTZ,
  p_platform TEXT DEFAULT NULL,
  p_region TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  query TEXT,
  count INTEGER,
  first_seen DATE,
  platforms TEXT[]
) AS $$
DECLARE
  v_period_days INTEGER;
  v_previous_start TIMESTAMPTZ;
  v_previous_end TIMESTAMPTZ;
BEGIN
  v_period_days := EXTRACT(DAY FROM (p_to_date - p_from_date))::INTEGER + 1;
  v_previous_start := p_from_date - (v_period_days || ' days')::INTERVAL;
  v_previous_end := p_from_date - INTERVAL '1 second';

  RETURN QUERY
  WITH previous_queries AS (
    SELECT DISTINCT c.web_search_query
    FROM citations c
    INNER JOIN ai_responses ar ON ar.id = c.ai_response_id
    INNER JOIN prompt_tracking pt ON pt.id = ar.prompt_tracking_id
    LEFT JOIN regions r ON r.id = pt.region_id AND r.project_id = p_project_id
    WHERE c.project_id = p_project_id
      AND c.web_search_query IS NOT NULL
      AND c.created_at >= v_previous_start
      AND c.created_at <= v_previous_end
      AND (p_platform IS NULL OR ar.platform = p_platform)
      AND (p_region IS NULL OR p_region = 'GLOBAL' OR r.code = p_region)
  ),
  current_queries AS (
    SELECT 
      c.web_search_query,
      COUNT(*)::INTEGER AS cnt,
      MIN(DATE(c.created_at)) AS first_appearance,
      ARRAY_AGG(DISTINCT ar.platform) AS plats
    FROM citations c
    INNER JOIN ai_responses ar ON ar.id = c.ai_response_id
    INNER JOIN prompt_tracking pt ON pt.id = ar.prompt_tracking_id
    LEFT JOIN regions r ON r.id = pt.region_id AND r.project_id = p_project_id
    WHERE c.project_id = p_project_id
      AND c.web_search_query IS NOT NULL
      AND c.created_at >= p_from_date
      AND c.created_at <= p_to_date
      AND (p_platform IS NULL OR ar.platform = p_platform)
      AND (p_region IS NULL OR p_region = 'GLOBAL' OR r.code = p_region)
    GROUP BY c.web_search_query
  )
  SELECT 
    cq.web_search_query::TEXT AS query,
    cq.cnt AS count,
    cq.first_appearance AS first_seen,
    cq.plats::TEXT[] AS platforms
  FROM current_queries cq
  WHERE NOT EXISTS (
    SELECT 1 FROM previous_queries pq 
    WHERE pq.web_search_query = cq.web_search_query
  )
  ORDER BY cq.cnt DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION 12: get_query_domain_correlation
-- =============================================

CREATE OR REPLACE FUNCTION get_query_domain_correlation(
  p_project_id UUID,
  p_from_date TIMESTAMPTZ,
  p_to_date TIMESTAMPTZ,
  p_platform TEXT DEFAULT NULL,
  p_region TEXT DEFAULT NULL,
  p_query_limit INTEGER DEFAULT 10,
  p_domain_limit INTEGER DEFAULT 10
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
    WHERE c.project_id = p_project_id
      AND c.web_search_query IS NOT NULL
      AND c.domain IS NOT NULL
      AND c.created_at >= p_from_date
      AND c.created_at <= p_to_date
      AND (p_platform IS NULL OR ar.platform = p_platform)
      AND (p_region IS NULL OR p_region = 'GLOBAL' OR r.code = p_region)
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
    WHERE c.project_id = p_project_id
      AND c.web_search_query IS NOT NULL
      AND c.domain IS NOT NULL
      AND c.created_at >= p_from_date
      AND c.created_at <= p_to_date
      AND (p_platform IS NULL OR ar.platform = p_platform)
      AND (p_region IS NULL OR p_region = 'GLOBAL' OR r.code = p_region)
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
  WHERE c.project_id = p_project_id
    AND c.web_search_query IN (SELECT tq.web_search_query FROM top_queries tq)
    AND c.domain IN (SELECT td.domain FROM top_domains td)
    AND c.created_at >= p_from_date
    AND c.created_at <= p_to_date
    AND (p_platform IS NULL OR ar.platform = p_platform)
    AND (p_region IS NULL OR p_region = 'GLOBAL' OR r.code = p_region)
  GROUP BY c.web_search_query, c.domain
  ORDER BY c.web_search_query, count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

