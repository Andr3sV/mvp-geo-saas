-- =============================================
-- Add Attribute Count Columns to brand_evaluations
-- =============================================
-- This migration adds calculated columns for total_positive_attributes
-- and total_negative_attributes to optimize sentiment counting queries.

-- Add columns
ALTER TABLE brand_evaluations 
ADD COLUMN IF NOT EXISTS total_positive_attributes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_negative_attributes INTEGER DEFAULT 0;

-- Create function to calculate attribute counts
CREATE OR REPLACE FUNCTION calculate_attribute_counts()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_positive_attributes := COALESCE(jsonb_array_length(NEW.positive_attributes), 0);
  NEW.total_negative_attributes := COALESCE(jsonb_array_length(NEW.negative_attributes), 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_attribute_counts ON brand_evaluations;
CREATE TRIGGER update_attribute_counts
BEFORE INSERT OR UPDATE OF positive_attributes, negative_attributes
ON brand_evaluations
FOR EACH ROW
EXECUTE FUNCTION calculate_attribute_counts();

-- Backfill existing data
UPDATE brand_evaluations
SET 
  total_positive_attributes = COALESCE(jsonb_array_length(positive_attributes), 0),
  total_negative_attributes = COALESCE(jsonb_array_length(negative_attributes), 0);

-- Add comments for documentation
COMMENT ON COLUMN brand_evaluations.total_positive_attributes IS 'Automatically calculated count of items in positive_attributes array';
COMMENT ON COLUMN brand_evaluations.total_negative_attributes IS 'Automatically calculated count of items in negative_attributes array';

