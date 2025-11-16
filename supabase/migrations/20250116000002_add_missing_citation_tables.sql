-- =============================================
-- MIGRATION: Add Missing Tables for Citation Tracking
-- Description: Complement existing citation tables with high-value opportunities tracking
-- Date: 2025-01-16
-- =============================================

-- =============================================
-- TABLE: high_value_opportunities
-- Description: Track high-authority domains that cite competitors but not you
-- =============================================
CREATE TABLE IF NOT EXISTS high_value_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Domain info
  domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  
  -- Competitor activity
  competitors_mentioned TEXT[] DEFAULT ARRAY[]::TEXT[],
  citation_frequency INTEGER DEFAULT 0,
  
  -- Context
  topics TEXT[] DEFAULT ARRAY[]::TEXT[],
  content_types TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Opportunity assessment
  opportunity_score INTEGER CHECK (opportunity_score >= 0 AND opportunity_score <= 100),
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')),
  
  -- Outreach tracking
  outreach_status TEXT CHECK (outreach_status IN ('pending', 'contacted', 'responded', 'secured', 'declined')),
  outreach_notes TEXT,
  
  -- Timestamps
  last_analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(project_id, domain_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_high_value_opportunities_project ON high_value_opportunities(project_id);
CREATE INDEX IF NOT EXISTS idx_high_value_opportunities_domain ON high_value_opportunities(domain_id);
CREATE INDEX IF NOT EXISTS idx_high_value_opportunities_score ON high_value_opportunities(project_id, opportunity_score DESC);
CREATE INDEX IF NOT EXISTS idx_high_value_opportunities_status ON high_value_opportunities(project_id, outreach_status);

-- Trigger
CREATE TRIGGER update_high_value_opportunities_updated_at
  BEFORE UPDATE ON high_value_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE high_value_opportunities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Project members can view opportunities" ON high_value_opportunities;
CREATE POLICY "Project members can view opportunities"
ON high_value_opportunities FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = high_value_opportunities.project_id
      AND pm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Project members can update opportunity outreach" ON high_value_opportunities;
CREATE POLICY "Project members can update opportunity outreach"
ON high_value_opportunities FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = high_value_opportunities.project_id
      AND pm.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = high_value_opportunities.project_id
      AND pm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Service role can manage opportunities" ON high_value_opportunities;
CREATE POLICY "Service role can manage opportunities"
ON high_value_opportunities FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

