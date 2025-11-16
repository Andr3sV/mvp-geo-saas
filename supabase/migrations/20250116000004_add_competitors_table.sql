-- =============================================
-- MIGRATION: Add Competitors Table
-- Description: Store competitor information by project
-- Date: 2025-01-16
-- =============================================

-- Drop existing table if it exists (in case of partial creation)
DROP TABLE IF EXISTS competitors CASCADE;

-- =============================================
-- TABLE: competitors
-- Description: Track competitors for each project
-- =============================================
CREATE TABLE competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Competitor info
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT 'GLOBAL',
  
  -- Favicon/logo URL
  favicon TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure unique competitor per project
  UNIQUE(project_id, domain)
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_competitors_project ON competitors(project_id);
CREATE INDEX IF NOT EXISTS idx_competitors_domain ON competitors(domain);
CREATE INDEX IF NOT EXISTS idx_competitors_region ON competitors(region);
CREATE INDEX IF NOT EXISTS idx_competitors_active ON competitors(is_active);

-- =============================================
-- TRIGGERS
-- =============================================

CREATE TRIGGER update_competitors_updated_at
  BEFORE UPDATE ON competitors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;

-- Project members can view competitors
CREATE POLICY "Project members can view competitors"
ON competitors FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = competitors.project_id
      AND pm.user_id = auth.uid()
  )
);

-- Project admins can manage competitors
CREATE POLICY "Project admins can manage competitors"
ON competitors FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = competitors.project_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'admin'
  )
);

-- Add comment
COMMENT ON TABLE competitors IS 'Competitors tracked per project for comparison in GEO analysis';
COMMENT ON COLUMN competitors.region IS 'Geographic region for competitor tracking (ISO 3166-1 alpha-2 or GLOBAL)';

