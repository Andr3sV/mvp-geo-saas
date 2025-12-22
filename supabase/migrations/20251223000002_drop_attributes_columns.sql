-- =============================================
-- Drop positive_attributes and negative_attributes Columns
-- =============================================
-- This migration removes the attributes columns as we now use theme_ids exclusively.
-- All queries and components have been migrated to use theme_ids with joins to sentiment_themes.

-- Drop the columns
ALTER TABLE brand_evaluations
DROP COLUMN IF EXISTS positive_attributes,
DROP COLUMN IF EXISTS negative_attributes;

