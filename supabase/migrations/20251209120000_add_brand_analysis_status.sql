-- Add brand_analysis_status enum and columns to ai_responses
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'brand_analysis_status') THEN
        CREATE TYPE brand_analysis_status AS ENUM ('pending', 'success', 'error');
    END IF;
END$$;

ALTER TABLE ai_responses
ADD COLUMN IF NOT EXISTS brand_analysis_status brand_analysis_status DEFAULT 'pending';

ALTER TABLE ai_responses
ADD COLUMN IF NOT EXISTS brand_analysis_error TEXT;

-- Index to speed up pending/error scans
CREATE INDEX IF NOT EXISTS idx_ai_responses_brand_analysis_status
ON ai_responses (brand_analysis_status);

-- Backfill existing successful responses to pending if null
UPDATE ai_responses
SET brand_analysis_status = 'pending'
WHERE brand_analysis_status IS NULL
  AND status = 'success';

