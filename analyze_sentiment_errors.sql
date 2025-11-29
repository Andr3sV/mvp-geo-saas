-- ============================================
-- ANALIZAR: Errores reales vs "no entities found"
-- ============================================
-- Este script diferencia entre errores reales y casos válidos
-- ============================================

-- 1. Ver distribución de estados en la cola
SELECT 
  status,
  COUNT(*) as count,
  COUNT(CASE WHEN error_message LIKE '%no entities found%' THEN 1 END) as no_entities_count,
  COUNT(CASE WHEN error_message LIKE '%429%' OR error_message LIKE '%rate limit%' THEN 1 END) as rate_limit_errors,
  COUNT(CASE WHEN error_message LIKE '%Gemini API%' THEN 1 END) as gemini_api_errors,
  COUNT(CASE WHEN error_message NOT LIKE '%no entities found%' 
             AND error_message NOT LIKE '%429%' 
             AND error_message NOT LIKE '%rate limit%'
             AND error_message IS NOT NULL THEN 1 END) as other_errors,
  MAX(updated_at) as last_update
FROM sentiment_analysis_queue
WHERE project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
GROUP BY status
ORDER BY status;

-- 2. Ver errores reales (excluyendo "no entities found")
SELECT 
  error_message,
  COUNT(*) as count,
  MAX(updated_at) as last_error
FROM sentiment_analysis_queue
WHERE project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
  AND status IN ('failed', 'processing')
  AND (error_message IS NULL OR error_message NOT LIKE '%no entities found%')
GROUP BY error_message
ORDER BY count DESC
LIMIT 20;

-- 3. Ver items "completed" que realmente tienen análisis creado
SELECT 
  'Items completados CON análisis' as tipo,
  COUNT(DISTINCT saq.ai_response_id) as count
FROM sentiment_analysis_queue saq
INNER JOIN sentiment_analysis sa ON sa.ai_response_id = saq.ai_response_id
WHERE saq.project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
  AND saq.status = 'completed'
  AND sa.project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684';

-- 4. Ver items "completed" SIN análisis (casos válidos de "no entities found")
SELECT 
  'Items completados SIN análisis (no entities)' as tipo,
  COUNT(*) as count
FROM sentiment_analysis_queue saq
LEFT JOIN sentiment_analysis sa ON sa.ai_response_id = saq.ai_response_id
WHERE saq.project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
  AND saq.status = 'completed'
  AND saq.error_message LIKE '%no entities found%'
  AND sa.id IS NULL;

-- 5. Ver items "failed" con errores reales
SELECT 
  'Items fallidos (errores reales)' as tipo,
  COUNT(*) as count
FROM sentiment_analysis_queue
WHERE project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
  AND status = 'failed'
  AND (error_message IS NULL OR error_message NOT LIKE '%no entities found%');

-- 6. Ver items "processing" que llevan mucho tiempo (posiblemente atascados)
SELECT 
  'Items processing (posiblemente atascados)' as tipo,
  COUNT(*) as count,
  MIN(updated_at) as oldest_processing
FROM sentiment_analysis_queue
WHERE project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
  AND status = 'processing'
  AND updated_at < NOW() - INTERVAL '10 minutes';

-- 7. Ver progreso general (últimas 24 horas)
SELECT 
  DATE_TRUNC('hour', updated_at) as hour,
  status,
  COUNT(*) as count
FROM sentiment_analysis_queue
WHERE project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
  AND updated_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', updated_at), status
ORDER BY hour DESC, status;

