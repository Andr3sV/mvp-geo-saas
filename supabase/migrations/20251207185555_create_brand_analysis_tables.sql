-- =============================================
-- MIGRATION: Create Brand Analysis Tables
-- Description: Tables for AI-powered brand mention detection, sentiment analysis, and potential competitor discovery
-- Date: 2025-12-07
-- =============================================

-- =============================================
-- TABLE: brand_mentions
-- Description: All mentions of client brand and competitors in AI responses
-- =============================================
CREATE TABLE IF NOT EXISTS brand_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_response_id UUID NOT NULL REFERENCES ai_responses(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Brand identification
  brand_type TEXT NOT NULL CHECK (brand_type IN ('client', 'competitor')),
  competitor_id UUID REFERENCES competitors(id) ON DELETE CASCADE, -- NULL for client brand
  entity_name TEXT NOT NULL, -- Name of the brand mentioned
  
  -- Mention details
  mentioned_text TEXT NOT NULL, -- Text fragment where the mention appears
  start_index INTEGER, -- Start position in response_text
  end_index INTEGER,   -- End position in response_text
  confidence_score DECIMAL(3, 2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CHECK (
    (brand_type = 'competitor' AND competitor_id IS NOT NULL) OR
    (brand_type = 'client' AND competitor_id IS NULL)
  )
);

-- =============================================
-- TABLE: brand_sentiment_attributes
-- Description: Sentiment and attributes analysis for client brand and competitors
-- =============================================
CREATE TABLE IF NOT EXISTS brand_sentiment_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_response_id UUID NOT NULL REFERENCES ai_responses(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Brand identification
  brand_type TEXT NOT NULL CHECK (brand_type IN ('client', 'competitor')),
  competitor_id UUID REFERENCES competitors(id) ON DELETE CASCADE, -- NULL for client brand
  entity_name TEXT NOT NULL, -- Name of the brand analyzed
  
  -- Sentiment analysis
  sentiment TEXT NOT NULL CHECK (sentiment IN ('positive', 'negative', 'neutral', 'not_mentioned')),
  sentiment_rating DECIMAL(3, 2) NOT NULL CHECK (sentiment_rating >= -1 AND sentiment_rating <= 1),
  sentiment_ratio DECIMAL(3, 2) NOT NULL CHECK (sentiment_ratio >= 0 AND sentiment_ratio <= 1),
  
  -- Attributes
  positive_attributes JSONB DEFAULT '[]'::jsonb, -- Array of positive attributes
  negative_attributes JSONB DEFAULT '[]'::jsonb, -- Array of negative attributes
  
  -- Analysis context
  analyzed_text TEXT NOT NULL, -- Text that was analyzed
  model_used TEXT NOT NULL DEFAULT 'openai/gpt-oss-20b', -- AI model used (Groq)
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CHECK (
    (brand_type = 'competitor' AND competitor_id IS NOT NULL) OR
    (brand_type = 'client' AND competitor_id IS NULL)
  )
);

-- =============================================
-- TABLE: potential_competitors
-- Description: Brands detected in responses that are not client brand or known competitors
-- =============================================
CREATE TABLE IF NOT EXISTS potential_competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Brand information
  brand_name TEXT NOT NULL, -- Name of the potential competitor detected
  
  -- Tracking
  ai_response_id UUID REFERENCES ai_responses(id) ON DELETE SET NULL, -- First response where detected
  context TEXT, -- Context where the brand was mentioned
  mention_count INTEGER DEFAULT 1, -- How many times this brand has been mentioned
  
  -- Detection dates
  first_detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure unique brand per project
  UNIQUE(project_id, brand_name)
);

-- =============================================
-- INDEXES
-- =============================================

-- brand_mentions indexes
CREATE INDEX idx_brand_mentions_ai_response ON brand_mentions(ai_response_id);
CREATE INDEX idx_brand_mentions_project ON brand_mentions(project_id);
CREATE INDEX idx_brand_mentions_brand_type ON brand_mentions(brand_type);
CREATE INDEX idx_brand_mentions_competitor ON brand_mentions(competitor_id) WHERE competitor_id IS NOT NULL;
CREATE INDEX idx_brand_mentions_entity_name ON brand_mentions(entity_name);
CREATE INDEX idx_brand_mentions_created_at ON brand_mentions(created_at DESC);

-- brand_sentiment_attributes indexes
CREATE INDEX idx_brand_sentiment_ai_response ON brand_sentiment_attributes(ai_response_id);
CREATE INDEX idx_brand_sentiment_project ON brand_sentiment_attributes(project_id);
CREATE INDEX idx_brand_sentiment_brand_type ON brand_sentiment_attributes(brand_type);
CREATE INDEX idx_brand_sentiment_competitor ON brand_sentiment_attributes(competitor_id) WHERE competitor_id IS NOT NULL;
CREATE INDEX idx_brand_sentiment_sentiment ON brand_sentiment_attributes(sentiment);
CREATE INDEX idx_brand_sentiment_created_at ON brand_sentiment_attributes(created_at DESC);

-- Composite index for common queries
CREATE INDEX idx_brand_sentiment_project_type_sentiment ON brand_sentiment_attributes(project_id, brand_type, sentiment);

-- potential_competitors indexes
CREATE INDEX idx_potential_competitors_project ON potential_competitors(project_id);
CREATE INDEX idx_potential_competitors_brand_name ON potential_competitors(brand_name);
CREATE INDEX idx_potential_competitors_mention_count ON potential_competitors(mention_count DESC);
CREATE INDEX idx_potential_competitors_first_detected ON potential_competitors(first_detected_at DESC);
CREATE INDEX idx_potential_competitors_last_detected ON potential_competitors(last_detected_at DESC);

-- =============================================
-- TRIGGERS
-- =============================================

-- Use existing update_updated_at_column function
CREATE TRIGGER update_brand_mentions_updated_at
  BEFORE UPDATE ON brand_mentions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brand_sentiment_attributes_updated_at
  BEFORE UPDATE ON brand_sentiment_attributes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_potential_competitors_updated_at
  BEFORE UPDATE ON potential_competitors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- brand_mentions RLS
ALTER TABLE brand_mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view brand mentions"
ON brand_mentions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = brand_mentions.project_id
      AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Service can create brand mentions"
ON brand_mentions FOR INSERT
WITH CHECK (true); -- Service role can insert

CREATE POLICY "Service can update brand mentions"
ON brand_mentions FOR UPDATE
USING (true); -- Service role can update

-- brand_sentiment_attributes RLS
ALTER TABLE brand_sentiment_attributes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view brand sentiment"
ON brand_sentiment_attributes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = brand_sentiment_attributes.project_id
      AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Service can create brand sentiment"
ON brand_sentiment_attributes FOR INSERT
WITH CHECK (true); -- Service role can insert

CREATE POLICY "Service can update brand sentiment"
ON brand_sentiment_attributes FOR UPDATE
USING (true); -- Service role can update

-- potential_competitors RLS
ALTER TABLE potential_competitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view potential competitors"
ON potential_competitors FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = potential_competitors.project_id
      AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Service can create potential competitors"
ON potential_competitors FOR INSERT
WITH CHECK (true); -- Service role can insert

CREATE POLICY "Service can update potential competitors"
ON potential_competitors FOR UPDATE
USING (true); -- Service role can update

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE brand_mentions IS 'Tracks all mentions of client brand and competitors in AI responses';
COMMENT ON COLUMN brand_mentions.brand_type IS 'Type of brand: client or competitor';
COMMENT ON COLUMN brand_mentions.competitor_id IS 'Foreign key to competitors table. NULL for client brand, NOT NULL for competitor';
COMMENT ON COLUMN brand_mentions.entity_name IS 'Name of the brand mentioned (cached for performance)';
COMMENT ON COLUMN brand_mentions.confidence_score IS 'AI confidence in detecting this mention (0-1)';

COMMENT ON TABLE brand_sentiment_attributes IS 'Stores AI-powered sentiment analysis and attributes for client brand and competitors';
COMMENT ON COLUMN brand_sentiment_attributes.sentiment IS 'Categorical sentiment: positive, negative, neutral, or not_mentioned';
COMMENT ON COLUMN brand_sentiment_attributes.sentiment_rating IS 'Numeric sentiment rating from -1 (fully negative) to 1 (fully positive)';
COMMENT ON COLUMN brand_sentiment_attributes.sentiment_ratio IS 'Intensity of the sentiment from 0 (no emotional weight) to 1 (strong emphasis)';
COMMENT ON COLUMN brand_sentiment_attributes.positive_attributes IS 'Array of positive attributes associated with the brand';
COMMENT ON COLUMN brand_sentiment_attributes.negative_attributes IS 'Array of negative attributes associated with the brand';
COMMENT ON COLUMN brand_sentiment_attributes.model_used IS 'AI model used for analysis (default: openai/gpt-oss-20b via Groq)';

COMMENT ON TABLE potential_competitors IS 'Brands detected in responses that are not client brand or known competitors';
COMMENT ON COLUMN potential_competitors.brand_name IS 'Name of the potential competitor detected';
COMMENT ON COLUMN potential_competitors.mention_count IS 'Number of times this brand has been mentioned across responses';
COMMENT ON COLUMN potential_competitors.first_detected_at IS 'When this brand was first detected';
COMMENT ON COLUMN potential_competitors.last_detected_at IS 'When this brand was last detected';

