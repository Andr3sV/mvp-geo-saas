-- =============================================
-- Add Natural Response, Region, Query Search, and Domains Columns
-- =============================================
-- This migration adds columns to store:
-- 1. natural_response: Natural, fluent evaluation response
-- 2. region: Region for which this evaluation was performed
-- 3. query_search: Array of web search queries used by Gemini API
-- 4. domains: Array of unique domains used in the evaluation

ALTER TABLE brand_evaluations 
ADD COLUMN IF NOT EXISTS natural_response TEXT;

ALTER TABLE brand_evaluations 
ADD COLUMN IF NOT EXISTS region TEXT DEFAULT 'GLOBAL';

ALTER TABLE brand_evaluations 
ADD COLUMN IF NOT EXISTS query_search JSONB DEFAULT '[]'::jsonb;

ALTER TABLE brand_evaluations 
ADD COLUMN IF NOT EXISTS domains JSONB DEFAULT '[]'::jsonb;

-- Update index to include region for filtering
CREATE INDEX IF NOT EXISTS idx_brand_evaluations_project_region_topic 
ON brand_evaluations (project_id, region, entity_type, topic, created_at DESC);

-- Comments
COMMENT ON COLUMN brand_evaluations.natural_response IS 'Natural, fluent evaluation response that can be shown directly to users (2-3 paragraphs)';
COMMENT ON COLUMN brand_evaluations.region IS 'Geographic region for which this evaluation was performed (defaults to GLOBAL)';
COMMENT ON COLUMN brand_evaluations.query_search IS 'Array of web search queries used by Gemini API during the evaluation';
COMMENT ON COLUMN brand_evaluations.domains IS 'Array of unique domains used in the evaluation (extracted from Gemini citations)';

