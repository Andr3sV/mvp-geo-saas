-- =============================================
-- MIGRATION: Add Color to Competitors
-- Description: Add color field to competitors table for visual distinction
-- Date: 2025-12-20
-- =============================================

-- Add color column to competitors table
ALTER TABLE competitors 
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3B82F6';

-- Set default color for existing competitors that don't have one
UPDATE competitors
SET color = '#3B82F6'
WHERE color IS NULL;

-- Add comment
COMMENT ON COLUMN competitors.color IS 'Hex color code for visual distinction in charts and UI (default: blue #3B82F6). Users can select any color when creating/editing competitors.';

