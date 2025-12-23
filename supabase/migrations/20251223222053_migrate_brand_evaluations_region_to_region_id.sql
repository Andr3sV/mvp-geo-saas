-- =============================================
-- MIGRATION: Migrate brand_evaluations.region from TEXT to region_id UUID
-- Description: Replace region TEXT column with region_id UUID foreign key to regions table
-- Date: 2025-12-23
-- =============================================
-- This migration:
-- 1. Adds region_id column (nullable, NULL represents GLOBAL)
-- 2. Migrates existing data from region TEXT to region_id UUID
-- 3. Drops old region TEXT column and index
-- 4. Creates new index with region_id
-- =============================================

-- =============================================
-- STEP 1: Add region_id column (nullable)
-- NULL represents GLOBAL (virtual sum of all regions)
-- =============================================

ALTER TABLE brand_evaluations 
ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES regions(id) ON DELETE SET NULL;

-- =============================================
-- STEP 2: Migrate existing data from region TEXT to region_id UUID
-- =============================================

-- For each brand_evaluations row with region != 'GLOBAL' and region IS NOT NULL:
-- Find matching region in regions table by code and project_id
-- Update region_id with the found UUID
UPDATE brand_evaluations be
SET region_id = (
  SELECT r.id
  FROM regions r
  WHERE r.code = be.region
    AND r.project_id = be.project_id
  LIMIT 1
)
WHERE be.region IS NOT NULL
  AND be.region != 'GLOBAL'
  AND be.region_id IS NULL;

-- For rows where region = 'GLOBAL' or region IS NULL:
-- Leave region_id as NULL (GLOBAL is virtual, not a stored region)
-- No update needed, region_id is already NULL for these cases

-- =============================================
-- STEP 3: Handle rows where region code was not found
-- Leave region_id as NULL (represents GLOBAL) if region doesn't exist
-- This can happen if a region was deleted after brand_evaluations were created
-- =============================================

-- No action needed: rows with region_id IS NULL represent GLOBAL (virtual sum of all regions)
-- If a region code was not found, it's safe to leave region_id as NULL

-- =============================================
-- STEP 4: Drop old index that includes region TEXT column
-- =============================================

DROP INDEX IF EXISTS idx_brand_evaluations_project_region_topic;

-- =============================================
-- STEP 5: Create new index with region_id UUID
-- =============================================

CREATE INDEX IF NOT EXISTS idx_brand_evaluations_project_region_id_topic 
ON brand_evaluations (project_id, region_id, entity_type, topic, created_at DESC);

-- Also create index for common queries that filter by region_id
CREATE INDEX IF NOT EXISTS idx_brand_evaluations_region_id 
ON brand_evaluations (region_id) 
WHERE region_id IS NOT NULL;

-- =============================================
-- STEP 6: Drop old region TEXT column
-- =============================================

ALTER TABLE brand_evaluations 
DROP COLUMN IF EXISTS region;

-- =============================================
-- STEP 7: Add comment explaining region_id
-- =============================================

COMMENT ON COLUMN brand_evaluations.region_id IS 'Foreign key to regions table. NULL represents GLOBAL (virtual sum of all regions, not a stored region)';

