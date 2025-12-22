-- =============================================
-- Add URI and URL Sources Columns to brand_evaluations
-- =============================================
-- This migration adds uri_sources and url_sources columns to store
-- source URIs and URLs from Gemini groundingChunks, and removes
-- the domains column since it's not being used.

-- Add new columns
ALTER TABLE brand_evaluations
ADD COLUMN IF NOT EXISTS uri_sources JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS url_sources JSONB DEFAULT '[]'::jsonb;

-- Remove domains column (not being used, can be derived from url_sources if needed)
ALTER TABLE brand_evaluations
DROP COLUMN IF EXISTS domains;

-- Add comments
COMMENT ON COLUMN brand_evaluations.uri_sources IS 'Array of original URIs from Gemini groundingChunks (may include vertexaisearch redirects)';
COMMENT ON COLUMN brand_evaluations.url_sources IS 'Array of transformed/generic URLs extracted from URIs (e.g., https://theknot.com)';

