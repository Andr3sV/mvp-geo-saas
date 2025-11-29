-- =============================================
-- MIGRATION: Update Gemini model default to gemini-2.5-flash-lite
-- Description: Update default model from gemini-2.0-flash-exp to gemini-2.5-flash-lite
-- Date: 2025-01-29
-- =============================================

-- Update default value for model_used in sentiment_analysis table
-- This only affects new records, existing records keep their current model_used value

ALTER TABLE public.sentiment_analysis 
  ALTER COLUMN model_used SET DEFAULT 'gemini-2.5-flash-lite';

-- Add comment documenting the change
COMMENT ON COLUMN public.sentiment_analysis.model_used IS 'Gemini model used for analysis. Default updated to gemini-2.5-flash-lite on 2025-01-29 (previously gemini-2.0-flash-exp)';

