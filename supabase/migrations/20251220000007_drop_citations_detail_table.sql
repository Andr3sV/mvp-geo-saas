-- =============================================
-- MIGRATION: Drop citations_detail table
-- Description: Remove legacy citations_detail table after migration to citations table
-- Date: 2025-12-20
-- =============================================

-- =============================================
-- PHASE 1: Drop dependent objects first
-- =============================================

-- Drop indexes on citations_detail
DROP INDEX IF EXISTS idx_citations_detail_ai_response;
DROP INDEX IF EXISTS idx_citations_detail_project;
DROP INDEX IF EXISTS idx_citations_detail_sentiment;
DROP INDEX IF EXISTS idx_citations_detail_created_at;

-- Drop RLS policies on citations_detail
DROP POLICY IF EXISTS "Project members can view citations" ON citations_detail;
DROP POLICY IF EXISTS "Project members can insert citations" ON citations_detail;
DROP POLICY IF EXISTS "Project members can update citations" ON citations_detail;
DROP POLICY IF EXISTS "Project admins can delete citations" ON citations_detail;

-- =============================================
-- PHASE 2: Drop the table
-- =============================================

-- Drop the citations_detail table
-- Note: This will CASCADE to any remaining dependencies
DROP TABLE IF EXISTS citations_detail CASCADE;

-- =============================================
-- VERIFICATION
-- =============================================

-- Verify table is dropped (this will error if table still exists, which is expected)
-- DO NOT RUN THIS IN PRODUCTION - it's just a verification query
-- SELECT EXISTS (
--   SELECT FROM information_schema.tables 
--   WHERE table_schema = 'public' 
--   AND table_name = 'citations_detail'
-- );

