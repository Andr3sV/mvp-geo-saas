-- =============================================
-- MIGRATION: AI Analysis Tables
-- Description: Tables for storing AI responses, analysis jobs, and citations
-- Date: 2025-01-14
-- =============================================

-- =============================================
-- TABLE: ai_responses
-- Description: Stores raw responses from AI platforms
-- =============================================
CREATE TABLE IF NOT EXISTS ai_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_tracking_id UUID NOT NULL REFERENCES prompt_tracking(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- AI Platform info
  platform TEXT NOT NULL CHECK (platform IN ('openai', 'gemini', 'claude', 'perplexity')),
  model_version TEXT NOT NULL,
  
  -- Request/Response data
  prompt_text TEXT NOT NULL,
  response_text TEXT,
  
  -- Metrics
  tokens_used INTEGER,
  cost DECIMAL(10, 6),
  execution_time_ms INTEGER,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'error')),
  error_message TEXT,
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- TABLE: analysis_jobs
-- Description: Tracks analysis job execution across multiple platforms
-- =============================================
CREATE TABLE IF NOT EXISTS analysis_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  prompt_tracking_id UUID NOT NULL REFERENCES prompt_tracking(id) ON DELETE CASCADE,
  
  -- Job status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  
  -- Progress tracking
  total_platforms INTEGER NOT NULL DEFAULT 4, -- OpenAI, Gemini, Claude, Perplexity
  completed_platforms INTEGER NOT NULL DEFAULT 0,
  failed_platforms INTEGER NOT NULL DEFAULT 0,
  
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Error handling
  error_message TEXT,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- TABLE: citations_detail
-- Description: Detailed information about each citation found in AI responses
-- =============================================
CREATE TABLE IF NOT EXISTS citations_detail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_response_id UUID NOT NULL REFERENCES ai_responses(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Citation content
  citation_text TEXT NOT NULL,
  context_before TEXT,
  context_after TEXT,
  
  -- Analysis
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative', 'mixed')),
  is_direct_mention BOOLEAN DEFAULT false,
  confidence_score DECIMAL(3, 2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  
  -- Position in response
  position_in_response INTEGER,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================

-- ai_responses indexes
CREATE INDEX idx_ai_responses_prompt_tracking ON ai_responses(prompt_tracking_id);
CREATE INDEX idx_ai_responses_project ON ai_responses(project_id);
CREATE INDEX idx_ai_responses_platform ON ai_responses(platform);
CREATE INDEX idx_ai_responses_status ON ai_responses(status);
CREATE INDEX idx_ai_responses_created_at ON ai_responses(created_at DESC);

-- analysis_jobs indexes
CREATE INDEX idx_analysis_jobs_project ON analysis_jobs(project_id);
CREATE INDEX idx_analysis_jobs_prompt_tracking ON analysis_jobs(prompt_tracking_id);
CREATE INDEX idx_analysis_jobs_status ON analysis_jobs(status);
CREATE INDEX idx_analysis_jobs_created_by ON analysis_jobs(created_by);
CREATE INDEX idx_analysis_jobs_created_at ON analysis_jobs(created_at DESC);

-- citations_detail indexes
CREATE INDEX idx_citations_detail_ai_response ON citations_detail(ai_response_id);
CREATE INDEX idx_citations_detail_project ON citations_detail(project_id);
CREATE INDEX idx_citations_detail_sentiment ON citations_detail(sentiment);
CREATE INDEX idx_citations_detail_created_at ON citations_detail(created_at DESC);

-- =============================================
-- TRIGGERS FOR updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ai_responses_updated_at
  BEFORE UPDATE ON ai_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analysis_jobs_updated_at
  BEFORE UPDATE ON analysis_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS
ALTER TABLE ai_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE citations_detail ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES: ai_responses
-- =============================================

-- SELECT: Project members can view AI responses
DROP POLICY IF EXISTS "Project members can view AI responses" ON ai_responses;
CREATE POLICY "Project members can view AI responses"
ON ai_responses
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM project_members pm
    WHERE pm.project_id = ai_responses.project_id
      AND pm.user_id = auth.uid()
  )
);

-- INSERT: Project members can insert AI responses
DROP POLICY IF EXISTS "Project members can insert AI responses" ON ai_responses;
CREATE POLICY "Project members can insert AI responses"
ON ai_responses
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1
    FROM project_members pm
    WHERE pm.project_id = ai_responses.project_id
      AND pm.user_id = auth.uid()
  )
);

-- UPDATE: Project members can update AI responses
DROP POLICY IF EXISTS "Project members can update AI responses" ON ai_responses;
CREATE POLICY "Project members can update AI responses"
ON ai_responses
FOR UPDATE USING (
  EXISTS (
    SELECT 1
    FROM project_members pm
    WHERE pm.project_id = ai_responses.project_id
      AND pm.user_id = auth.uid()
  )
);

-- DELETE: Project admins can delete AI responses
DROP POLICY IF EXISTS "Project admins can delete AI responses" ON ai_responses;
CREATE POLICY "Project admins can delete AI responses"
ON ai_responses
FOR DELETE USING (
  EXISTS (
    SELECT 1
    FROM project_members pm
    WHERE pm.project_id = ai_responses.project_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'admin'
  )
);

-- =============================================
-- RLS POLICIES: analysis_jobs
-- =============================================

-- SELECT: Project members can view analysis jobs
DROP POLICY IF EXISTS "Project members can view analysis jobs" ON analysis_jobs;
CREATE POLICY "Project members can view analysis jobs"
ON analysis_jobs
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM project_members pm
    WHERE pm.project_id = analysis_jobs.project_id
      AND pm.user_id = auth.uid()
  )
);

-- INSERT: Project members can create analysis jobs
DROP POLICY IF EXISTS "Project members can create analysis jobs" ON analysis_jobs;
CREATE POLICY "Project members can create analysis jobs"
ON analysis_jobs
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1
    FROM project_members pm
    WHERE pm.project_id = analysis_jobs.project_id
      AND pm.user_id = auth.uid()
  )
);

-- UPDATE: Project members can update analysis jobs
DROP POLICY IF EXISTS "Project members can update analysis jobs" ON analysis_jobs;
CREATE POLICY "Project members can update analysis jobs"
ON analysis_jobs
FOR UPDATE USING (
  EXISTS (
    SELECT 1
    FROM project_members pm
    WHERE pm.project_id = analysis_jobs.project_id
      AND pm.user_id = auth.uid()
  )
);

-- DELETE: Project admins can delete analysis jobs
DROP POLICY IF EXISTS "Project admins can delete analysis jobs" ON analysis_jobs;
CREATE POLICY "Project admins can delete analysis jobs"
ON analysis_jobs
FOR DELETE USING (
  EXISTS (
    SELECT 1
    FROM project_members pm
    WHERE pm.project_id = analysis_jobs.project_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'admin'
  )
);

-- =============================================
-- RLS POLICIES: citations_detail
-- =============================================

-- SELECT: Project members can view citations
DROP POLICY IF EXISTS "Project members can view citations" ON citations_detail;
CREATE POLICY "Project members can view citations"
ON citations_detail
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM project_members pm
    WHERE pm.project_id = citations_detail.project_id
      AND pm.user_id = auth.uid()
  )
);

-- INSERT: Project members can insert citations
DROP POLICY IF EXISTS "Project members can insert citations" ON citations_detail;
CREATE POLICY "Project members can insert citations"
ON citations_detail
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1
    FROM project_members pm
    WHERE pm.project_id = citations_detail.project_id
      AND pm.user_id = auth.uid()
  )
);

-- UPDATE: Project members can update citations
DROP POLICY IF EXISTS "Project members can update citations" ON citations_detail;
CREATE POLICY "Project members can update citations"
ON citations_detail
FOR UPDATE USING (
  EXISTS (
    SELECT 1
    FROM project_members pm
    WHERE pm.project_id = citations_detail.project_id
      AND pm.user_id = auth.uid()
  )
);

-- DELETE: Project admins can delete citations
DROP POLICY IF EXISTS "Project admins can delete citations" ON citations_detail;
CREATE POLICY "Project admins can delete citations"
ON citations_detail
FOR DELETE USING (
  EXISTS (
    SELECT 1
    FROM project_members pm
    WHERE pm.project_id = citations_detail.project_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'admin'
  )
);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE ai_responses IS 'Stores raw responses from AI platforms (OpenAI, Gemini, Claude, Perplexity)';
COMMENT ON TABLE analysis_jobs IS 'Tracks analysis job execution across multiple AI platforms';
COMMENT ON TABLE citations_detail IS 'Detailed information about each citation/mention found in AI responses';

COMMENT ON COLUMN ai_responses.platform IS 'AI platform used: openai, gemini, claude, perplexity';
COMMENT ON COLUMN ai_responses.status IS 'Response status: pending, processing, success, error';
COMMENT ON COLUMN analysis_jobs.status IS 'Job status: pending, running, completed, failed, cancelled';
COMMENT ON COLUMN citations_detail.sentiment IS 'Citation sentiment: positive, neutral, negative, mixed';
COMMENT ON COLUMN citations_detail.is_direct_mention IS 'Whether the citation directly mentions the brand name';
COMMENT ON COLUMN citations_detail.confidence_score IS 'Confidence score of the citation detection (0-1)';

