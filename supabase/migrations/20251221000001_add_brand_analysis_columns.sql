-- =============================================
-- Add Brand Analysis Columns to Projects Table
-- =============================================
-- These columns store the industry and topics extracted from
-- the brand's website using Gemini 2.5 Flash Lite with web search
-- during the onboarding process.

-- Add industry column
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS industry TEXT;

-- Add extracted_topics column (JSONB array of topic strings)
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS extracted_topics JSONB DEFAULT '[]'::jsonb;

-- Add timestamp for when topics were extracted
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS topics_extracted_at TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN projects.industry IS 'The industry/company type extracted from brand website (e.g., "B2B CRM software company", "Direct-to-consumer skincare brand")';
COMMENT ON COLUMN projects.extracted_topics IS 'JSON array of topics/user intents extracted from brand website for sentiment evaluation';
COMMENT ON COLUMN projects.topics_extracted_at IS 'Timestamp when industry and topics were last extracted from the brand website';

-- Create index for filtering projects with extracted topics
CREATE INDEX IF NOT EXISTS idx_projects_topics_extracted 
ON projects (topics_extracted_at) 
WHERE topics_extracted_at IS NOT NULL;

