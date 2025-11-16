-- =============================================
-- MIGRATION: Add region to prompt_tracking
-- Description: Allow prompts to be region-specific for targeted AI analysis
-- Date: 2025-01-16
-- =============================================

-- Add region column to prompt_tracking if it doesn't exist
ALTER TABLE prompt_tracking 
ADD COLUMN IF NOT EXISTS region TEXT DEFAULT 'GLOBAL';

-- Update existing NULL or lowercase values to GLOBAL
UPDATE prompt_tracking 
SET region = 'GLOBAL' 
WHERE region IS NULL OR region = 'global' OR region NOT SIMILAR TO '[A-Z]{2,6}|GLOBAL';

-- Add comment
COMMENT ON COLUMN prompt_tracking.region IS 'Geographic region for prompt execution (ISO 3166-1 alpha-2 or GLOBAL)';

-- Create index for faster region-based queries
CREATE INDEX IF NOT EXISTS idx_prompt_tracking_region ON prompt_tracking(region);

-- Add check constraint for valid region format (ISO 3166-1 alpha-2 or GLOBAL)
-- We don't enforce specific values to allow all countries
-- Just ensure it's uppercase and reasonable length
ALTER TABLE prompt_tracking 
DROP CONSTRAINT IF EXISTS check_prompt_region_format;

ALTER TABLE prompt_tracking 
ADD CONSTRAINT check_prompt_region_format 
CHECK (region ~ '^[A-Z]{2,6}$' OR region = 'GLOBAL');

