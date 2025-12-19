-- =============================================
-- MIGRATION: Add Dimensions to Daily Brand Stats
-- Description: Add platform, region, and topic_id columns for granular analytics
-- Date: 2025-12-19
-- =============================================

-- =============================================
-- PHASE 1: Add New Columns
-- =============================================

-- Add platform column (openai, gemini, or NULL for legacy data)
ALTER TABLE daily_brand_stats 
ADD COLUMN IF NOT EXISTS platform TEXT CHECK (platform IN ('openai', 'gemini') OR platform IS NULL);

-- Add region column (ISO country code or GLOBAL)
ALTER TABLE daily_brand_stats 
ADD COLUMN IF NOT EXISTS region TEXT DEFAULT 'GLOBAL';

-- Add topic_id column (references topics table)
ALTER TABLE daily_brand_stats 
ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES topics(id) ON DELETE SET NULL;

-- =============================================
-- PHASE 2: Drop Old Unique Index and Create New One
-- =============================================

-- Drop the old unique index
DROP INDEX IF EXISTS idx_daily_brand_stats_unique;

-- Create new unique index with all dimensions
-- Uses COALESCE to handle NULL values for uniqueness
CREATE UNIQUE INDEX idx_daily_brand_stats_unique 
  ON daily_brand_stats(
    project_id, 
    stat_date, 
    COALESCE(competitor_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(platform, 'ALL'),
    COALESCE(region, 'GLOBAL'),
    COALESCE(topic_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

-- =============================================
-- PHASE 3: Performance Indexes
-- =============================================

-- Index for filtering by platform
CREATE INDEX IF NOT EXISTS idx_daily_brand_stats_platform 
  ON daily_brand_stats(project_id, platform, stat_date DESC)
  WHERE platform IS NOT NULL;

-- Index for filtering by region
CREATE INDEX IF NOT EXISTS idx_daily_brand_stats_region 
  ON daily_brand_stats(project_id, region, stat_date DESC);

-- Index for filtering by topic
CREATE INDEX IF NOT EXISTS idx_daily_brand_stats_topic 
  ON daily_brand_stats(project_id, topic_id, stat_date DESC)
  WHERE topic_id IS NOT NULL;

-- Composite index for common query pattern: project + date + entity_type + platform
CREATE INDEX IF NOT EXISTS idx_daily_brand_stats_common_query 
  ON daily_brand_stats(project_id, stat_date DESC, entity_type, platform);

-- =============================================
-- PHASE 4: Comments
-- =============================================

COMMENT ON COLUMN daily_brand_stats.platform IS 'AI platform: openai or gemini (NULL for legacy/aggregated data)';
COMMENT ON COLUMN daily_brand_stats.region IS 'Geographic region from prompt_tracking (ISO 3166-1 alpha-2 or GLOBAL)';
COMMENT ON COLUMN daily_brand_stats.topic_id IS 'Topic ID from prompt_tracking (NULL if no topic assigned)';
COMMENT ON INDEX idx_daily_brand_stats_unique IS 'Unique index for all dimensions using COALESCE to handle NULLs';

