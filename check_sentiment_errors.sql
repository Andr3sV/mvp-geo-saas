-- ============================================
-- VERIFICAR ERRORES: Sentiment Analysis Queue
-- ============================================
-- Este script muestra los errores más comunes para identificar el problema
-- ============================================

-- 1. Ver los errores más frecuentes
SELECT 
  error_message,
  COUNT(*) as count,
  MAX(updated_at) as last_error
FROM sentiment_analysis_queue
WHERE project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
  AND status = 'failed'
GROUP BY error_message
ORDER BY count DESC
LIMIT 20;

-- 2. Ver items fallidos con detalles
SELECT 
  id,
  ai_response_id,
  status,
  attempts,
  error_message,
  created_at,
  updated_at
FROM sentiment_analysis_queue
WHERE project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
  AND status = 'failed'
ORDER BY updated_at DESC
LIMIT 30;

-- 3. Verificar si los ai_response_id de los fallidos existen y tienen response_text
SELECT 
  saq.id as queue_id,
  saq.ai_response_id,
  saq.error_message,
  ar.id as response_exists,
  ar.status as response_status,
  CASE 
    WHEN ar.response_text IS NULL THEN 'NULL'
    WHEN ar.response_text = '' THEN 'EMPTY'
    ELSE 'HAS_TEXT'
  END as text_status,
  LENGTH(ar.response_text) as text_length
FROM sentiment_analysis_queue saq
LEFT JOIN ai_responses ar ON ar.id = saq.ai_response_id
WHERE saq.project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
  AND saq.status = 'failed'
ORDER BY saq.updated_at DESC
LIMIT 20;

-- 4. Verificar si hay respuestas que no tienen response_text (causa común de errores)
SELECT 
  'Respuestas sin texto' as tipo,
  COUNT(*) as count
FROM ai_responses ar
WHERE ar.project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
  AND ar.status = 'success'
  AND (ar.response_text IS NULL OR ar.response_text = '');

-- 5. Ver distribución de errores por número de intentos
SELECT 
  attempts,
  status,
  COUNT(*) as count
FROM sentiment_analysis_queue
WHERE project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
  AND status IN ('failed', 'pending')
GROUP BY attempts, status
ORDER BY attempts, status;

