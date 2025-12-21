-- =============================================
-- Create Brand Evaluations Table
-- =============================================
-- This table stores the results of daily sentiment evaluations
-- for brands and competitors using the format:
-- "Evaluate the [INDUSTRY] company [BRAND] on [TOPIC]"

CREATE TABLE IF NOT EXISTS brand_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Entity being evaluated (brand or competitor)
  entity_type TEXT NOT NULL CHECK (entity_type IN ('brand', 'competitor')),
  entity_name TEXT NOT NULL,
  competitor_id UUID REFERENCES competitors(id) ON DELETE CASCADE,
  
  -- Evaluation details
  topic TEXT NOT NULL,
  evaluation_prompt TEXT NOT NULL,
  
  -- AI Response
  response_text TEXT,
  
  -- Sentiment analysis results
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative', 'mixed')),
  sentiment_score DECIMAL(3,2) CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
  
  -- Additional attributes extracted from the response
  attributes JSONB DEFAULT '{}'::jsonb,
  
  -- Reference to the AI response (optional, for traceability)
  ai_response_id UUID REFERENCES ai_responses(id) ON DELETE SET NULL,
  
  -- Platform used for evaluation
  platform TEXT DEFAULT 'gemini',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- Indexes for Performance
-- =============================================

-- Primary query pattern: get evaluations by project, entity, topic, date
CREATE INDEX IF NOT EXISTS idx_brand_evaluations_project_entity_topic 
ON brand_evaluations (project_id, entity_type, topic, created_at DESC);

-- For filtering by competitor (to check deleted competitors)
CREATE INDEX IF NOT EXISTS idx_brand_evaluations_competitor 
ON brand_evaluations (competitor_id) 
WHERE competitor_id IS NOT NULL;

-- For time-based queries
CREATE INDEX IF NOT EXISTS idx_brand_evaluations_created_at 
ON brand_evaluations (created_at DESC);

-- For sentiment analysis trends
CREATE INDEX IF NOT EXISTS idx_brand_evaluations_sentiment 
ON brand_evaluations (project_id, entity_type, sentiment, created_at DESC);

-- =============================================
-- Row Level Security
-- =============================================

ALTER TABLE brand_evaluations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view evaluations for projects they have access to
CREATE POLICY "Users can view brand evaluations for their projects"
ON brand_evaluations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects p
    JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE p.id = brand_evaluations.project_id
    AND wm.user_id = auth.uid()
  )
);

-- Policy: Service role can insert evaluations (for backend processing)
CREATE POLICY "Service role can insert brand evaluations"
ON brand_evaluations
FOR INSERT
WITH CHECK (true);

-- Policy: Service role can update evaluations
CREATE POLICY "Service role can update brand evaluations"
ON brand_evaluations
FOR UPDATE
USING (true)
WITH CHECK (true);

-- =============================================
-- Updated At Trigger
-- =============================================

CREATE OR REPLACE FUNCTION update_brand_evaluations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_brand_evaluations_updated_at
BEFORE UPDATE ON brand_evaluations
FOR EACH ROW
EXECUTE FUNCTION update_brand_evaluations_updated_at();

-- =============================================
-- Comments
-- =============================================

COMMENT ON TABLE brand_evaluations IS 'Stores daily sentiment evaluations for brands and competitors using structured prompts';
COMMENT ON COLUMN brand_evaluations.entity_type IS 'Whether this evaluation is for the main brand or a competitor';
COMMENT ON COLUMN brand_evaluations.entity_name IS 'Name of the brand or competitor being evaluated';
COMMENT ON COLUMN brand_evaluations.topic IS 'The topic/intent being evaluated (e.g., "pricing", "customer support")';
COMMENT ON COLUMN brand_evaluations.evaluation_prompt IS 'The full prompt sent to the AI (e.g., "Evaluate the B2B CRM company Salesforce on pricing")';
COMMENT ON COLUMN brand_evaluations.sentiment IS 'Overall sentiment classification';
COMMENT ON COLUMN brand_evaluations.sentiment_score IS 'Numerical sentiment score from -1 (negative) to 1 (positive)';
COMMENT ON COLUMN brand_evaluations.attributes IS 'Additional attributes extracted from the AI response (e.g., key points, strengths, weaknesses)';

