-- =============================================
-- MIGRATION: Add Color to Projects
-- Description: Add color field to projects table for visual distinction of brand
-- Date: 2025-12-20
-- =============================================

-- Add color column to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3B82F6';

-- Set default color for existing projects that don't have one
UPDATE projects
SET color = '#3B82F6'
WHERE color IS NULL;

-- Add comment
COMMENT ON COLUMN projects.color IS 'Hex color code for visual distinction of the brand in charts and UI (default: blue #3B82F6). Users can select any color when creating/editing projects.';
