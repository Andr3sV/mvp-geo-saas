-- =============================================
-- MIGRATION: Add URL fields to competitor_citations
-- Description: Add cited_url and cited_domain to competitor_citations table
-- Date: 2025-01-17
-- =============================================

-- Add URL fields to competitor_citations table
ALTER TABLE competitor_citations 
ADD COLUMN cited_url TEXT,
ADD COLUMN cited_domain TEXT;

-- Add indexes for the new URL fields
CREATE INDEX IF NOT EXISTS idx_competitor_citations_cited_url ON competitor_citations(cited_url);
CREATE INDEX IF NOT EXISTS idx_competitor_citations_cited_domain ON competitor_citations(cited_domain);

-- Add comments
COMMENT ON COLUMN competitor_citations.cited_url IS 'URL of the source that cited the competitor';
COMMENT ON COLUMN competitor_citations.cited_domain IS 'Domain of the source that cited the competitor (extracted from cited_url)';
