-- =============================================
-- Query: Brand Evaluations Complete Table
-- Project ID: a915d1f3-8a07-4b5b-a767-17bd2a28d684
-- Entity Type: brand (marca propia)
-- =============================================

SELECT 
  be.evaluation_prompt,
  be.topic,
  be.sentiment_score,
  be.platform,
  TO_CHAR(be.created_at, 'DD-MM-YYYY') AS created_at,
  be.natural_response,
  -- Convertir query_search de JSONB a array de texto
  COALESCE(
    (
      SELECT ARRAY_AGG(value::text)
      FROM jsonb_array_elements_text(be.query_search) AS value
    ),
    ARRAY[]::TEXT[]
  ) AS query_search,
  be.total_positive_attributes,
  be.total_negative_attributes,
  -- Lista de nombres de positive themes
  COALESCE(
    (
      SELECT ARRAY_AGG(DISTINCT st_positive.name ORDER BY st_positive.name)
      FROM jsonb_array_elements_text(be.positive_theme_ids) AS pt_id
      INNER JOIN sentiment_themes st_positive ON st_positive.id::text = pt_id
      WHERE st_positive.type = 'positive'
    ),
    ARRAY[]::TEXT[]
  ) AS positive_themes,
  -- Array de nombres de negative themes
  COALESCE(
    (
      SELECT ARRAY_AGG(DISTINCT st_negative.name ORDER BY st_negative.name)
      FROM jsonb_array_elements_text(be.negative_theme_ids) AS nt_id
      INNER JOIN sentiment_themes st_negative ON st_negative.id::text = nt_id
      WHERE st_negative.type = 'negative'
    ),
    ARRAY[]::TEXT[]
  ) AS negative_themes,
  -- Nombre de la región
  COALESCE(r.name, 'GLOBAL') AS region_name
FROM 
  brand_evaluations be
  LEFT JOIN regions r ON be.region_id = r.id
WHERE 
  be.project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
  AND be.entity_type = 'brand'
ORDER BY 
  be.created_at DESC;

