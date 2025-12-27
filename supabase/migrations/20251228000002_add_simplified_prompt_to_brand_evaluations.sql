-- =============================================
-- Add Simplified Prompt Column to brand_evaluations
-- Description: Add a new `prompt` column that stores only the simplified first line
--              with interpolated values (e.g., "Evaluate the supermarket company carrefour on customer satisfaction.")
-- Date: 2025-12-28
-- =============================================

-- Add prompt column to brand_evaluations
ALTER TABLE brand_evaluations 
ADD COLUMN IF NOT EXISTS prompt TEXT;

-- Update comment
COMMENT ON COLUMN brand_evaluations.prompt IS 'Simplified prompt with interpolated values (e.g., "Evaluate the supermarket company carrefour on customer satisfaction.")';

