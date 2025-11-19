-- =============================================
-- MIGRATION: Remove Category Constraint for Dynamic Tags
-- Description: Allow users to create custom categories/topics
-- Date: 2025-01-19
-- =============================================

-- Drop the existing CHECK constraint that limits category values
ALTER TABLE prompt_tracking 
DROP CONSTRAINT IF EXISTS prompt_tracking_category_check;

-- Add a more flexible constraint (optional - just ensures it's not empty if provided)
-- This allows any non-empty string as a category/tag
ALTER TABLE prompt_tracking
ADD CONSTRAINT prompt_tracking_category_valid 
CHECK (category IS NULL OR (category IS NOT NULL AND trim(category) <> ''));

-- Add comment
COMMENT ON COLUMN prompt_tracking.category IS 
'User-defined topic/tag for organizing prompts. Can be any custom string (e.g., "Raquetas", "Zapatillas", "Product Features")';

