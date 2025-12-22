-- =============================================
-- Add Theme Columns to brand_evaluations
-- =============================================
-- This migration adds columns to store theme IDs that map to the
-- positive_attributes and negative_attributes arrays.

ALTER TABLE brand_evaluations 
ADD COLUMN IF NOT EXISTS positive_theme_ids JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS negative_theme_ids JSONB DEFAULT '[]'::jsonb;

-- Indexes for efficient querying by theme IDs
CREATE INDEX IF NOT EXISTS idx_brand_evaluations_positive_theme_ids ON brand_evaluations USING GIN (positive_theme_ids);
CREATE INDEX IF NOT EXISTS idx_brand_evaluations_negative_theme_ids ON brand_evaluations USING GIN (negative_theme_ids);

-- Comments for documentation
COMMENT ON COLUMN brand_evaluations.positive_theme_ids IS 'Array of sentiment_theme UUIDs corresponding to positive_attributes by index';
COMMENT ON COLUMN brand_evaluations.negative_theme_ids IS 'Array of sentiment_theme UUIDs corresponding to negative_attributes by index';

