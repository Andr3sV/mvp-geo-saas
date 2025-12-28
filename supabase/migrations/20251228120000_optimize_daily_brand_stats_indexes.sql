-- =============================================
-- MIGRATION: Optimize Daily Brand Stats Indexes
-- Description: Create composite indexes for optimized query performance
--              on daily_brand_stats and competitors tables
-- Date: 2025-12-28
-- =============================================

-- =============================================
-- COMPOSITE INDEXES FOR daily_brand_stats
-- =============================================

-- Index for brand queries (competitor_id IS NULL)
-- Pattern: project_id + stat_date + entity_type + platform + region_id
CREATE INDEX IF NOT EXISTS idx_daily_brand_stats_brand_main 
ON daily_brand_stats(project_id, stat_date DESC, entity_type, platform, region_id)
WHERE competitor_id IS NULL;

-- Index for competitor queries (competitor_id IS NOT NULL)
-- Pattern: project_id + stat_date + entity_type + platform + region_id + competitor_id
CREATE INDEX IF NOT EXISTS idx_daily_brand_stats_competitor_main 
ON daily_brand_stats(project_id, stat_date DESC, entity_type, platform, region_id, competitor_id)
WHERE competitor_id IS NOT NULL;

-- Index for topic_id filtering when topic filter is active
CREATE INDEX IF NOT EXISTS idx_daily_brand_stats_topic_optimized 
ON daily_brand_stats(project_id, topic_id, stat_date DESC, entity_type)
WHERE topic_id IS NOT NULL;

-- =============================================
-- COMPOSITE INDEXES FOR competitors
-- =============================================

-- Index for competitors filtered by project, region, and active status
CREATE INDEX IF NOT EXISTS idx_competitors_project_region_active 
ON competitors(project_id, region, is_active)
WHERE is_active = true;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON INDEX idx_daily_brand_stats_brand_main IS 'Composite index for optimized brand queries filtering by project, date range, entity type, platform, and region';
COMMENT ON INDEX idx_daily_brand_stats_competitor_main IS 'Composite index for optimized competitor queries filtering by project, date range, entity type, platform, region, and competitor';
COMMENT ON INDEX idx_daily_brand_stats_topic_optimized IS 'Composite index for queries filtered by topic_id';
COMMENT ON INDEX idx_competitors_project_region_active IS 'Composite index for competitors filtered by project, region, and active status';

