-- =============================================
-- MIGRATION: Add Citation Classification
-- Description: Add columns to classify citations as brand, competitor, or other
-- Date: 2025-12-18
-- =============================================

-- =============================================
-- PHASE 1: Add New Columns
-- =============================================

-- Add citation_type column to classify citations
ALTER TABLE citations ADD COLUMN IF NOT EXISTS citation_type TEXT DEFAULT 'other'
  CHECK (citation_type IN ('brand', 'competitor', 'other'));

-- Add competitor_id for competitor citations
ALTER TABLE citations ADD COLUMN IF NOT EXISTS competitor_id UUID REFERENCES competitors(id) ON DELETE SET NULL;

-- Add project_id for easier querying (derived from ai_response_id)
ALTER TABLE citations ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

-- =============================================
-- PHASE 2: Add Indexes for Performance
-- =============================================

CREATE INDEX IF NOT EXISTS idx_citations_citation_type ON citations(citation_type);
CREATE INDEX IF NOT EXISTS idx_citations_competitor_id ON citations(competitor_id);
CREATE INDEX IF NOT EXISTS idx_citations_project_id ON citations(project_id);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_citations_project_type ON citations(project_id, citation_type);

-- =============================================
-- PHASE 3: Populate project_id for Existing Citations
-- =============================================

-- Update project_id for all existing citations by joining with ai_responses
UPDATE citations c
SET project_id = ar.project_id
FROM ai_responses ar
WHERE c.ai_response_id = ar.id
  AND c.project_id IS NULL;

-- =============================================
-- PHASE 4: Classify Existing Citations
-- =============================================

-- Helper function to normalize domain (remove protocol and www)
CREATE OR REPLACE FUNCTION normalize_domain(url_or_domain TEXT)
RETURNS TEXT AS $$
BEGIN
  IF url_or_domain IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Remove protocol (http:// or https://)
  -- Remove www. prefix
  -- Remove trailing path
  RETURN LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(url_or_domain, '^https?://', ''),
        '^www\.', ''
      ),
      '/.*$', ''
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Classify brand citations (matching project's client_url domain)
UPDATE citations c
SET citation_type = 'brand'
FROM projects p
WHERE c.project_id = p.id
  AND c.domain IS NOT NULL
  AND p.client_url IS NOT NULL
  AND normalize_domain(c.domain) = normalize_domain(p.client_url);

-- Classify competitor citations (matching competitor domains)
-- Use a subquery to get the first matching competitor for each citation
UPDATE citations c
SET citation_type = 'competitor',
    competitor_id = matched.competitor_id
FROM (
  SELECT DISTINCT ON (c2.id) 
    c2.id as citation_id,
    comp.id as competitor_id
  FROM citations c2
  JOIN competitors comp ON c2.project_id = comp.project_id
  WHERE c2.domain IS NOT NULL
    AND comp.domain IS NOT NULL
    AND comp.is_active = true
    AND normalize_domain(c2.domain) = normalize_domain(comp.domain)
  ORDER BY c2.id, comp.created_at
) matched
WHERE c.id = matched.citation_id
  AND c.citation_type = 'other'; -- Only update if not already classified as brand

-- =============================================
-- PHASE 5: Add Comments
-- =============================================

COMMENT ON COLUMN citations.citation_type IS 'Classification: brand (client domain), competitor (known competitor domain), or other';
COMMENT ON COLUMN citations.competitor_id IS 'Reference to competitor when citation_type is competitor';
COMMENT ON COLUMN citations.project_id IS 'Reference to project for easier querying (denormalized from ai_responses)';

-- =============================================
-- PHASE 6: Add Trigger to Auto-populate project_id
-- =============================================

-- Create function to automatically set project_id on insert
CREATE OR REPLACE FUNCTION set_citation_project_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If project_id is not set, derive it from ai_response_id
  IF NEW.project_id IS NULL AND NEW.ai_response_id IS NOT NULL THEN
    SELECT project_id INTO NEW.project_id
    FROM ai_responses
    WHERE id = NEW.ai_response_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (if not exists)
DROP TRIGGER IF EXISTS set_citation_project_id_trigger ON citations;
CREATE TRIGGER set_citation_project_id_trigger
  BEFORE INSERT ON citations
  FOR EACH ROW
  EXECUTE FUNCTION set_citation_project_id();

-- =============================================
-- VERIFICATION QUERIES (for manual testing)
-- =============================================

-- Uncomment these to verify the migration worked:
-- SELECT citation_type, COUNT(*) FROM citations GROUP BY citation_type;
-- SELECT c.id, c.domain, c.citation_type, comp.name as competitor_name 
-- FROM citations c 
-- LEFT JOIN competitors comp ON c.competitor_id = comp.id 
-- WHERE c.citation_type = 'competitor' LIMIT 10;

