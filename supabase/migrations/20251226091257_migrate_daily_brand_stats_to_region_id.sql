-- =============================================
-- MIGRATION: Migrate daily_brand_stats from region code to region_id
-- Description: Add region_id column and migrate existing data from region (code) to region_id (UUID)
-- Date: 2025-12-26
-- =============================================

-- =============================================
-- PHASE 1: Add region_id column
-- =============================================

ALTER TABLE daily_brand_stats 
ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES regions(id) ON DELETE SET NULL;

-- =============================================
-- PHASE 2: Migrate existing data
-- =============================================

-- Update region_id for rows where region is not NULL and not 'GLOBAL'
-- Match by project_id and region code
UPDATE daily_brand_stats dbs
SET region_id = r.id
FROM regions r
WHERE dbs.region IS NOT NULL
  AND dbs.region != 'GLOBAL'
  AND r.code = dbs.region
  AND r.project_id = dbs.project_id
  AND r.is_active = true
  AND dbs.region_id IS NULL;

-- For rows with region = 'GLOBAL' or NULL, leave region_id as NULL
-- (This is already the case, but we document it here)

-- =============================================
-- PHASE 3: Update unique index
-- =============================================

-- Drop the old unique index that includes region
DROP INDEX IF EXISTS idx_daily_brand_stats_unique;

-- Create new unique index with region_id instead of region
CREATE UNIQUE INDEX idx_daily_brand_stats_unique 
  ON daily_brand_stats(
    project_id, 
    stat_date, 
    COALESCE(competitor_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(platform, 'ALL'),
    COALESCE(region_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(topic_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

-- =============================================
-- PHASE 4: Update performance indexes
-- =============================================

-- Drop old region index
DROP INDEX IF EXISTS idx_daily_brand_stats_region;

-- Create new index for region_id
CREATE INDEX IF NOT EXISTS idx_daily_brand_stats_region_id 
  ON daily_brand_stats(project_id, region_id, stat_date DESC)
  WHERE region_id IS NOT NULL;

-- =============================================
-- PHASE 5: Mark region column as deprecated
-- =============================================

COMMENT ON COLUMN daily_brand_stats.region IS 'DEPRECATED: Use region_id instead. This column will be removed in a future migration.';
COMMENT ON COLUMN daily_brand_stats.region_id IS 'Reference to regions table. NULL means GLOBAL (all regions).';

