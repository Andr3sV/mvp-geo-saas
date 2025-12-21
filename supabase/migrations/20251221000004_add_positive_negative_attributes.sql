-- =============================================
-- Add Positive and Negative Attributes Columns
-- =============================================
-- This migration:
-- 1. Adds positive_attributes and negative_attributes columns
-- 2. Removes the complex attributes JSONB column

ALTER TABLE brand_evaluations 
ADD COLUMN IF NOT EXISTS positive_attributes JSONB DEFAULT '[]'::jsonb;

ALTER TABLE brand_evaluations 
ADD COLUMN IF NOT EXISTS negative_attributes JSONB DEFAULT '[]'::jsonb;

-- Drop the attributes column since it's no longer used
ALTER TABLE brand_evaluations 
DROP COLUMN IF EXISTS attributes;

-- Comments
COMMENT ON COLUMN brand_evaluations.positive_attributes IS 'Array of positive attributes/strengths extracted from the evaluation';
COMMENT ON COLUMN brand_evaluations.negative_attributes IS 'Array of negative attributes/weaknesses extracted from the evaluation';

