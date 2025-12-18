-- =============================================
-- MIGRATION: Create Daily Brand Stats Table
-- Description: Pre-aggregated daily statistics for brand and competitor metrics
-- Date: 2025-12-18
-- =============================================

-- =============================================
-- TABLE: daily_brand_stats
-- Description: Stores pre-aggregated daily metrics for brands and competitors
-- Source tables: brand_mentions, citations, brand_sentiment_attributes
-- =============================================

CREATE TABLE IF NOT EXISTS daily_brand_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stat_date DATE NOT NULL,
  
  -- Entity identification
  entity_type TEXT NOT NULL CHECK (entity_type IN ('brand', 'competitor')),
  competitor_id UUID REFERENCES competitors(id) ON DELETE CASCADE, -- NULL for brand
  entity_name TEXT NOT NULL, -- Cached name for performance
  
  -- Mention metrics (from brand_mentions table)
  mentions_count INTEGER NOT NULL DEFAULT 0,
  
  -- Citation metrics (from citations table)
  citations_count INTEGER NOT NULL DEFAULT 0, -- URLs where entity domain appears
  
  -- Sentiment metrics (from brand_sentiment_attributes table)
  sentiment_positive_count INTEGER NOT NULL DEFAULT 0,
  sentiment_neutral_count INTEGER NOT NULL DEFAULT 0,
  sentiment_negative_count INTEGER NOT NULL DEFAULT 0,
  sentiment_avg_rating DECIMAL(4,3), -- -1.000 to 1.000
  
  -- AI Response metrics
  responses_analyzed INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT daily_brand_stats_entity_check CHECK (
    (entity_type = 'brand' AND competitor_id IS NULL) OR
    (entity_type = 'competitor' AND competitor_id IS NOT NULL)
  )
);

-- =============================================
-- UNIQUE INDEX: One row per entity per day
-- =============================================

-- For brand stats (competitor_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_brand_stats_brand_unique 
  ON daily_brand_stats(project_id, stat_date, entity_type) 
  WHERE competitor_id IS NULL;

-- For competitor stats (competitor_id IS NOT NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_brand_stats_competitor_unique 
  ON daily_brand_stats(project_id, stat_date, competitor_id) 
  WHERE competitor_id IS NOT NULL;

-- =============================================
-- PERFORMANCE INDEXES
-- =============================================

-- Primary lookup: project + date range
CREATE INDEX IF NOT EXISTS idx_daily_brand_stats_lookup 
  ON daily_brand_stats(project_id, stat_date DESC);

-- Entity type filtering
CREATE INDEX IF NOT EXISTS idx_daily_brand_stats_entity_type 
  ON daily_brand_stats(project_id, entity_type, stat_date DESC);

-- Competitor-specific queries
CREATE INDEX IF NOT EXISTS idx_daily_brand_stats_competitor 
  ON daily_brand_stats(competitor_id, stat_date DESC) 
  WHERE competitor_id IS NOT NULL;

-- Date range queries
CREATE INDEX IF NOT EXISTS idx_daily_brand_stats_date 
  ON daily_brand_stats(stat_date DESC);

-- =============================================
-- TRIGGER: Update updated_at timestamp
-- =============================================

CREATE OR REPLACE FUNCTION update_daily_brand_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_daily_brand_stats_updated_at ON daily_brand_stats;
CREATE TRIGGER update_daily_brand_stats_updated_at
  BEFORE UPDATE ON daily_brand_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_brand_stats_updated_at();

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE daily_brand_stats ENABLE ROW LEVEL SECURITY;

-- SELECT: Project members can view daily stats
DROP POLICY IF EXISTS "Project members can view daily stats" ON daily_brand_stats;
CREATE POLICY "Project members can view daily stats"
ON daily_brand_stats
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = daily_brand_stats.project_id
      AND pm.user_id = auth.uid()
  )
);

-- INSERT/UPDATE: Service role only (for aggregation jobs)
DROP POLICY IF EXISTS "Service role can manage daily stats" ON daily_brand_stats;
CREATE POLICY "Service role can manage daily stats"
ON daily_brand_stats
FOR ALL
USING (true)
WITH CHECK (true);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE daily_brand_stats IS 'Pre-aggregated daily statistics for brand and competitor metrics. Populated by daily cron job.';
COMMENT ON COLUMN daily_brand_stats.entity_type IS 'brand for client brand, competitor for competitors';
COMMENT ON COLUMN daily_brand_stats.competitor_id IS 'NULL for brand, references competitors.id for competitors';
COMMENT ON COLUMN daily_brand_stats.entity_name IS 'Cached entity name (brand_name from projects or name from competitors)';
COMMENT ON COLUMN daily_brand_stats.mentions_count IS 'Count of mentions from brand_mentions table';
COMMENT ON COLUMN daily_brand_stats.citations_count IS 'Count of URL citations from citations table';
COMMENT ON COLUMN daily_brand_stats.sentiment_avg_rating IS 'Average sentiment rating from -1 (negative) to 1 (positive)';
COMMENT ON COLUMN daily_brand_stats.responses_analyzed IS 'Number of AI responses analyzed that day';

