-- =============================================
-- Remove Sentiment Columns from daily_brand_stats
-- =============================================
-- This migration removes sentiment-related columns from daily_brand_stats
-- as sentiment data is now available from brand_evaluations table

ALTER TABLE daily_brand_stats 
DROP COLUMN IF EXISTS sentiment_positive_count;

ALTER TABLE daily_brand_stats 
DROP COLUMN IF EXISTS sentiment_neutral_count;

ALTER TABLE daily_brand_stats 
DROP COLUMN IF EXISTS sentiment_negative_count;

ALTER TABLE daily_brand_stats 
DROP COLUMN IF EXISTS sentiment_avg_rating;

