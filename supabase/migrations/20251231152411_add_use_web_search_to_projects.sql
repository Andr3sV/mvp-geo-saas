-- =============================================
-- MIGRATION: Add use_web_search flag to projects
-- Description: Controls whether OpenAI uses web_search tool for prompts in this project
-- Use case: Sector rankings don't need web_search, making responses faster and cheaper
-- Date: 2025-12-31
-- =============================================

-- Add use_web_search column to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS use_web_search BOOLEAN DEFAULT true;

-- Add comment explaining the column
COMMENT ON COLUMN projects.use_web_search IS 
  'If false, OpenAI will not use web_search tool for prompts in this project. Used for sector rankings where web search is not needed.';

-- Create index for filtering projects by this flag
CREATE INDEX IF NOT EXISTS idx_projects_use_web_search ON projects(use_web_search);

