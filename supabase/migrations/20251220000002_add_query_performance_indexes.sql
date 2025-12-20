-- =============================================
-- MIGRATION: Add Performance Indexes for Query Analytics
-- Description: Optimize query performance for citations table lookups
-- Date: 2025-12-20
-- Purpose: Speed up RPC functions and direct queries on citations
-- =============================================

-- =============================================
-- INDEX 1: Query Analytics Index
-- Optimizes queries filtering by project_id, date range, and web_search_query
-- =============================================

CREATE INDEX IF NOT EXISTS idx_citations_query_analytics
  ON citations(project_id, created_at DESC, web_search_query)
  WHERE web_search_query IS NOT NULL;

COMMENT ON INDEX idx_citations_query_analytics IS 'Optimizes query analytics functions that filter by project, date, and web_search_query';

-- =============================================
-- INDEX 2: AI Response Join Index
-- Optimizes joins between citations and ai_responses
-- =============================================

CREATE INDEX IF NOT EXISTS idx_citations_ai_response_project
  ON citations(ai_response_id, project_id, created_at DESC);

COMMENT ON INDEX idx_citations_ai_response_project IS 'Optimizes joins with ai_responses table for project-filtered queries';

-- =============================================
-- INDEX 3: Domain Analytics Index
-- Optimizes queries that group by domain
-- =============================================

CREATE INDEX IF NOT EXISTS idx_citations_domain_analytics
  ON citations(project_id, created_at DESC, domain)
  WHERE domain IS NOT NULL;

COMMENT ON INDEX idx_citations_domain_analytics IS 'Optimizes domain ranking and analytics queries';

-- =============================================
-- INDEX 4: Composite Query + Domain Index
-- Optimizes query-domain correlation matrix queries
-- =============================================

CREATE INDEX IF NOT EXISTS idx_citations_query_domain_correlation
  ON citations(project_id, web_search_query, domain, created_at DESC)
  WHERE web_search_query IS NOT NULL AND domain IS NOT NULL;

COMMENT ON INDEX idx_citations_query_domain_correlation IS 'Optimizes query-domain correlation matrix queries';

-- =============================================
-- INDEX 5: AI Responses Platform Index
-- Optimizes platform filtering in joins
-- =============================================

CREATE INDEX IF NOT EXISTS idx_ai_responses_platform_tracking
  ON ai_responses(id, platform, prompt_tracking_id);

COMMENT ON INDEX idx_ai_responses_platform_tracking IS 'Optimizes platform filtering when joining with citations';

-- =============================================
-- INDEX 6: Prompt Tracking Region Index
-- Optimizes region filtering in joins
-- =============================================

CREATE INDEX IF NOT EXISTS idx_prompt_tracking_region_project
  ON prompt_tracking(id, region, project_id);

COMMENT ON INDEX idx_prompt_tracking_region_project IS 'Optimizes region filtering when joining with ai_responses';

-- =============================================
-- ANALYZE: Update table statistics for query planner
-- =============================================

ANALYZE citations;
ANALYZE ai_responses;
ANALYZE prompt_tracking;

