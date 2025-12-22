-- =============================================
-- Update Attribute Counts to Use Theme IDs
-- =============================================
-- This migration updates the trigger to calculate totals from theme_ids arrays
-- instead of attributes arrays, preparing for the removal of attributes columns.

-- Update function to calculate attribute counts from theme_ids
CREATE OR REPLACE FUNCTION calculate_attribute_counts()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_positive_attributes := COALESCE(jsonb_array_length(NEW.positive_theme_ids), 0);
  NEW.total_negative_attributes := COALESCE(jsonb_array_length(NEW.negative_theme_ids), 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update trigger to watch theme_ids instead of attributes
DROP TRIGGER IF EXISTS update_attribute_counts ON brand_evaluations;
CREATE TRIGGER update_attribute_counts
BEFORE INSERT OR UPDATE OF positive_theme_ids, negative_theme_ids
ON brand_evaluations
FOR EACH ROW
EXECUTE FUNCTION calculate_attribute_counts();

-- Backfill existing data using theme_ids
UPDATE brand_evaluations
SET 
  total_positive_attributes = COALESCE(jsonb_array_length(positive_theme_ids), 0),
  total_negative_attributes = COALESCE(jsonb_array_length(negative_theme_ids), 0);

-- Update comments
COMMENT ON COLUMN brand_evaluations.total_positive_attributes IS 'Automatically calculated count of items in positive_theme_ids array';
COMMENT ON COLUMN brand_evaluations.total_negative_attributes IS 'Automatically calculated count of items in negative_theme_ids array';

