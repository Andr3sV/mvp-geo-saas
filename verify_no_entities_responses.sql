-- ============================================
-- VERIFICAR: Respuestas sin entidades
-- ============================================
-- Este script verifica si las respuestas marcadas como "completed"
-- sin análisis realmente no tienen menciones de la marca
-- ============================================

-- 1. Ver cuántas respuestas fueron marcadas como "completed" sin análisis
SELECT 
  'Items completados sin análisis' as tipo,
  COUNT(*) as count
FROM sentiment_analysis_queue saq
LEFT JOIN sentiment_analysis sa ON sa.ai_response_id = saq.ai_response_id
WHERE saq.project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
  AND saq.status = 'completed'
  AND saq.error_message LIKE '%no entities found%'
  AND sa.id IS NULL; -- No tiene análisis

-- 2. Ver una muestra de estas respuestas y verificar si tienen texto
SELECT 
  saq.id as queue_id,
  saq.ai_response_id,
  saq.error_message,
  ar.response_text IS NOT NULL as has_text,
  LENGTH(ar.response_text) as text_length,
  LEFT(ar.response_text, 200) as text_preview,
  ar.platform,
  ar.created_at
FROM sentiment_analysis_queue saq
INNER JOIN ai_responses ar ON ar.id = saq.ai_response_id
LEFT JOIN sentiment_analysis sa ON sa.ai_response_id = saq.ai_response_id
WHERE saq.project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
  AND saq.status = 'completed'
  AND saq.error_message LIKE '%no entities found%'
  AND sa.id IS NULL
ORDER BY saq.updated_at DESC
LIMIT 10;

-- 3. Verificar si estas respuestas tienen menciones de "The Knot" (el brand_name)
-- Reemplaza 'The Knot' con el brand_name real de tu proyecto
SELECT 
  saq.ai_response_id,
  ar.response_text,
  CASE 
    WHEN LOWER(ar.response_text) LIKE '%the knot%' THEN 'Tiene mención'
    ELSE 'No tiene mención'
  END as has_brand_mention
FROM sentiment_analysis_queue saq
INNER JOIN ai_responses ar ON ar.id = saq.ai_response_id
LEFT JOIN sentiment_analysis sa ON sa.ai_response_id = saq.ai_response_id
WHERE saq.project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
  AND saq.status = 'completed'
  AND saq.error_message LIKE '%no entities found%'
  AND sa.id IS NULL
ORDER BY saq.updated_at DESC
LIMIT 20;

-- 4. Ver el brand_name del proyecto para verificar
SELECT 
  id,
  name,
  brand_name
FROM projects
WHERE id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684';

-- 5. Verificar el progreso general
SELECT 
  status,
  COUNT(*) as count,
  COUNT(CASE WHEN error_message LIKE '%no entities found%' THEN 1 END) as no_entities_count,
  MAX(updated_at) as last_update
FROM sentiment_analysis_queue
WHERE project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
GROUP BY status
ORDER BY status;

