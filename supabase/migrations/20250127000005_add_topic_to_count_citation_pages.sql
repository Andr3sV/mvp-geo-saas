-- =============================================
-- FUNCTION: Count Distinct Citation Pages (Updated with topic filter)
-- Description: Efficiently counts DISTINCT ai_response_id 
-- with proper filtering for platform, region, dates, and topic
-- =============================================

-- Drop the old function first
DROP FUNCTION IF EXISTS count_distinct_citation_pages(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT);

-- Create the updated function with topic_id parameter
CREATE OR REPLACE FUNCTION count_distinct_citation_pages(
  p_project_id UUID,
  p_from_date TIMESTAMPTZ DEFAULT NULL,
  p_to_date TIMESTAMPTZ DEFAULT NULL,
  p_platform TEXT DEFAULT NULL,
  p_region TEXT DEFAULT NULL,
  p_topic_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT cd.ai_response_id)
  INTO v_count
  FROM citations_detail cd
  INNER JOIN ai_responses ar ON ar.id = cd.ai_response_id
  INNER JOIN prompt_tracking pt ON pt.id = ar.prompt_tracking_id
  WHERE cd.project_id = p_project_id
    AND cd.cited_url IS NOT NULL
    AND (p_from_date IS NULL OR cd.created_at >= p_from_date)
    AND (p_to_date IS NULL OR cd.created_at <= p_to_date)
    AND (p_platform IS NULL OR p_platform = 'all' OR ar.platform = p_platform)
    AND (p_region IS NULL OR p_region = 'GLOBAL' OR pt.region = p_region)
    AND (p_topic_id IS NULL OR pt.topic_id = p_topic_id);
  
  RETURN COALESCE(v_count, 0);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION count_distinct_citation_pages(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION count_distinct_citation_pages IS 'Counts distinct AI response IDs that have citations with URLs, with optional filtering by date range, platform, region, and topic';

