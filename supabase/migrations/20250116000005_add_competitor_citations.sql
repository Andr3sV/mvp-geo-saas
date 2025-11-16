-- =============================================
-- MIGRATION: Add Competitor Citations Tracking
-- Description: Track competitor mentions alongside brand citations
-- Date: 2025-01-16
-- =============================================

-- =============================================
-- TABLE: competitor_citations
-- Description: Track competitor mentions in AI responses
-- =============================================
CREATE TABLE IF NOT EXISTS competitor_citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_response_id UUID NOT NULL REFERENCES ai_responses(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  
  -- Citation details
  citation_text TEXT NOT NULL,
  context_before TEXT,
  context_after TEXT,
  position_in_response INTEGER,
  
  -- Analysis
  is_direct_mention BOOLEAN DEFAULT true,
  confidence_score DECIMAL(3, 2) DEFAULT 0.95,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  
  -- Competitive insights
  compared_with_brand BOOLEAN DEFAULT false,
  competitive_context TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_competitor_citations_ai_response ON competitor_citations(ai_response_id);
CREATE INDEX IF NOT EXISTS idx_competitor_citations_project ON competitor_citations(project_id);
CREATE INDEX IF NOT EXISTS idx_competitor_citations_competitor ON competitor_citations(competitor_id);
CREATE INDEX IF NOT EXISTS idx_competitor_citations_sentiment ON competitor_citations(sentiment);
CREATE INDEX IF NOT EXISTS idx_competitor_citations_created ON competitor_citations(created_at DESC);

-- =============================================
-- TRIGGERS
-- =============================================

CREATE TRIGGER update_competitor_citations_updated_at
  BEFORE UPDATE ON competitor_citations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE competitor_citations ENABLE ROW LEVEL SECURITY;

-- Project members can view competitor citations
CREATE POLICY "Project members can view competitor citations"
ON competitor_citations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = competitor_citations.project_id
      AND pm.user_id = auth.uid()
  )
);

-- Project admins can manage competitor citations
CREATE POLICY "Project admins can manage competitor citations"
ON competitor_citations FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = competitor_citations.project_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'admin'
  )
);

-- Add comments
COMMENT ON TABLE competitor_citations IS 'Tracks competitor mentions in AI responses for competitive analysis';
COMMENT ON COLUMN competitor_citations.compared_with_brand IS 'Indicates if competitor was mentioned in comparison with the brand';
COMMENT ON COLUMN competitor_citations.competitive_context IS 'Context showing how competitor is compared (better, worse, similar, etc)';

