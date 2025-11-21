-- Create sentiment_analysis table for storing AI-powered sentiment analysis
-- This table stores detailed sentiment analysis for both brand and competitor mentions

CREATE TABLE sentiment_analysis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  ai_response_id UUID NOT NULL REFERENCES ai_responses(id) ON DELETE CASCADE,
  
  -- Analysis metadata
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('brand', 'competitor')),
  entity_name TEXT NOT NULL, -- Brand name or competitor name
  entity_domain TEXT, -- Domain if applicable
  
  -- Sentiment scores (0-1 scale)
  overall_sentiment DECIMAL(3,2) NOT NULL CHECK (overall_sentiment >= 0 AND overall_sentiment <= 1),
  sentiment_label TEXT NOT NULL CHECK (sentiment_label IN ('positive', 'neutral', 'negative')),
  confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  
  -- Detailed analysis
  positive_attributes JSONB DEFAULT '[]'::jsonb, -- Array of positive mentions
  neutral_attributes JSONB DEFAULT '[]'::jsonb,  -- Array of neutral mentions  
  negative_attributes JSONB DEFAULT '[]'::jsonb, -- Array of negative mentions
  
  -- Context and reasoning
  analyzed_text TEXT NOT NULL, -- The specific text that was analyzed
  ai_reasoning TEXT, -- AI's explanation of the sentiment analysis
  key_phrases JSONB DEFAULT '[]'::jsonb, -- Important phrases that influenced sentiment
  
  -- Processing metadata
  model_used TEXT NOT NULL DEFAULT 'gemini-2.0-flash-exp',
  processing_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_sentiment_analysis_project_id ON sentiment_analysis(project_id);
CREATE INDEX idx_sentiment_analysis_ai_response_id ON sentiment_analysis(ai_response_id);
CREATE INDEX idx_sentiment_analysis_type_entity ON sentiment_analysis(analysis_type, entity_name);
CREATE INDEX idx_sentiment_analysis_sentiment_label ON sentiment_analysis(sentiment_label);
CREATE INDEX idx_sentiment_analysis_created_at ON sentiment_analysis(created_at);

-- Composite index for common queries
CREATE INDEX idx_sentiment_analysis_project_type_sentiment ON sentiment_analysis(project_id, analysis_type, sentiment_label);

-- RLS policies
ALTER TABLE sentiment_analysis ENABLE ROW LEVEL SECURITY;

-- Users can only access sentiment analysis for their projects
CREATE POLICY "Users can view sentiment analysis for their projects" ON sentiment_analysis
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert sentiment analysis for their projects" ON sentiment_analysis
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update sentiment analysis for their projects" ON sentiment_analysis
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sentiment_analysis_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_sentiment_analysis_updated_at
  BEFORE UPDATE ON sentiment_analysis
  FOR EACH ROW
  EXECUTE FUNCTION update_sentiment_analysis_updated_at();

-- Add comments for documentation
COMMENT ON TABLE sentiment_analysis IS 'Stores AI-powered sentiment analysis for brand and competitor mentions';
COMMENT ON COLUMN sentiment_analysis.overall_sentiment IS 'Overall sentiment score from 0 (very negative) to 1 (very positive)';
COMMENT ON COLUMN sentiment_analysis.sentiment_label IS 'Categorical sentiment: positive (0.6-1.0), neutral (0.4-0.6), negative (0.0-0.4)';
COMMENT ON COLUMN sentiment_analysis.confidence_score IS 'AI confidence in the sentiment analysis from 0 to 1';
COMMENT ON COLUMN sentiment_analysis.positive_attributes IS 'Array of positive attributes/mentions found in the text';
COMMENT ON COLUMN sentiment_analysis.negative_attributes IS 'Array of negative attributes/mentions found in the text';
COMMENT ON COLUMN sentiment_analysis.neutral_attributes IS 'Array of neutral attributes/mentions found in the text';
