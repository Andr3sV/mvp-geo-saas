-- =============================================
-- Create sentiment_themes Table
-- =============================================
-- This migration creates a table to store standardized sentiment themes
-- that categorize positive and negative attributes for better data consistency.

CREATE TABLE IF NOT EXISTS sentiment_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('positive', 'negative')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure unique theme names per project and type
  UNIQUE(project_id, name, type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sentiment_themes_project_id ON sentiment_themes(project_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_themes_project_type ON sentiment_themes(project_id, type);
CREATE INDEX IF NOT EXISTS idx_sentiment_themes_name ON sentiment_themes(name);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sentiment_themes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_sentiment_themes_updated_at_trigger
BEFORE UPDATE ON sentiment_themes
FOR EACH ROW
EXECUTE FUNCTION update_sentiment_themes_updated_at();

-- RLS Policies
ALTER TABLE sentiment_themes ENABLE ROW LEVEL SECURITY;

-- Project members can view themes
CREATE POLICY "Project members can view sentiment_themes" ON sentiment_themes
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_members.project_id = sentiment_themes.project_id 
    AND project_members.user_id = auth.uid()
  )
);

-- Project members can insert themes
CREATE POLICY "Project members can insert sentiment_themes" ON sentiment_themes
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_members.project_id = sentiment_themes.project_id 
    AND project_members.user_id = auth.uid()
  )
);

-- Project members can update themes
CREATE POLICY "Project members can update sentiment_themes" ON sentiment_themes
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_members.project_id = sentiment_themes.project_id 
    AND project_members.user_id = auth.uid()
  )
);

-- Project admins can delete themes
CREATE POLICY "Project admins can delete sentiment_themes" ON sentiment_themes
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_members.project_id = sentiment_themes.project_id 
    AND project_members.user_id = auth.uid() 
    AND project_members.role = 'admin'
  )
);

-- Comments for documentation
COMMENT ON TABLE sentiment_themes IS 'Standardized themes for categorizing sentiment attributes (positive/negative)';
COMMENT ON COLUMN sentiment_themes.name IS 'Theme name (maximum 4 words)';
COMMENT ON COLUMN sentiment_themes.type IS 'Type of theme: positive or negative';

