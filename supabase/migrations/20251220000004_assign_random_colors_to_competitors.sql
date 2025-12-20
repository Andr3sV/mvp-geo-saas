-- =============================================
-- MIGRATION: Assign Random Colors to Competitors
-- Description: Assign random hex colors to all competitors for visual distinction
-- Date: 2025-12-20
-- =============================================

-- Assign colors from a curated palette based on competitor ID hash
-- This ensures each competitor gets a different color that's visually distinct
UPDATE competitors
SET color = (
  SELECT color
  FROM (
    VALUES
      ('#3B82F6'), -- Blue
      ('#10B981'), -- Emerald
      ('#F59E0B'), -- Amber
      ('#EF4444'), -- Red
      ('#8B5CF6'), -- Purple
      ('#EC4899'), -- Pink
      ('#06B6D4'), -- Cyan
      ('#84CC16'), -- Lime
      ('#F97316'), -- Orange
      ('#6366F1'), -- Indigo
      ('#14B8A6'), -- Teal
      ('#A855F7'), -- Violet
      ('#22C55E'), -- Green
      ('#EAB308'), -- Yellow
      ('#F43F5E'), -- Rose
      ('#0EA5E9'), -- Sky
      ('#64748B'), -- Slate
      ('#D946EF'), -- Fuchsia
      ('#2DD4BF'), -- Turquoise
      ('#FB923C')  -- Orange (lighter)
  ) AS colors(color)
  OFFSET (ABS(HASHTEXT(id::TEXT)) % 20)
  LIMIT 1
)
WHERE color = '#3B82F6' OR color IS NULL;

-- Add comment
COMMENT ON COLUMN competitors.color IS 'Hex color code for visual distinction in charts and UI. Assigned randomly from a curated palette to ensure visual variety.';
