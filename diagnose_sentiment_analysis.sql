-- ============================================
-- DIAGNÓSTICO: Sentiment Analysis No Funciona
-- ============================================
-- Este script ayuda a identificar por qué las respuestas no se están analizando
-- ============================================

-- 1. Ver estado de la cola para el proyecto específico
SELECT 
  status,
  COUNT(*) as count,
  COUNT(DISTINCT ai_response_id) as unique_responses,
  MIN(created_at) as oldest,
  MAX(updated_at) as newest
FROM sentiment_analysis_queue
WHERE project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
GROUP BY status
ORDER BY status;

-- 2. Ver items fallidos con sus errores
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
LIMIT 20;

-- 3. Ver items en "processing" (posiblemente atascados)
SELECT 
  id,
  ai_response_id,
  status,
  attempts,
  created_at,
  updated_at,
  EXTRACT(EPOCH FROM (NOW() - updated_at)) / 60 as minutes_stuck
FROM sentiment_analysis_queue
WHERE project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
  AND status = 'processing'
ORDER BY updated_at ASC
LIMIT 20;

-- 4. Verificar si las respuestas realmente tienen sentiment_analysis
-- Comparar: respuestas en cola vs respuestas analizadas
SELECT 
  'En cola (completed)' as tipo,
  COUNT(DISTINCT ai_response_id) as count
FROM sentiment_analysis_queue
WHERE project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
  AND status = 'completed'

UNION ALL

SELECT 
  'En sentiment_analysis' as tipo,
  COUNT(DISTINCT ai_response_id) as count
FROM sentiment_analysis
WHERE project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684';

-- 5. Verificar si hay respuestas que están en la cola como "completed" 
-- pero NO tienen registros en sentiment_analysis (problema de sincronización)
SELECT 
  saq.ai_response_id,
  saq.status as queue_status,
  saq.updated_at as queue_updated,
  COUNT(sa.id) as sentiment_records_count
FROM sentiment_analysis_queue saq
LEFT JOIN sentiment_analysis sa ON sa.ai_response_id = saq.ai_response_id
WHERE saq.project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
  AND saq.status = 'completed'
GROUP BY saq.ai_response_id, saq.status, saq.updated_at
HAVING COUNT(sa.id) = 0
LIMIT 20;

-- 6. Verificar respuestas sin analizar vs respuestas en cola
SELECT 
  'Respuestas sin analizar' as tipo,
  COUNT(*) as count
FROM ai_responses ar
WHERE ar.project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
  AND ar.status = 'success'
  AND ar.response_text IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM sentiment_analysis sa 
    WHERE sa.ai_response_id = ar.id
  )

UNION ALL

SELECT 
  'En cola (pending)' as tipo,
  COUNT(*) as count
FROM sentiment_analysis_queue
WHERE project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
  AND status = 'pending'

UNION ALL

SELECT 
  'En cola (processing)' as tipo,
  COUNT(*) as count
FROM sentiment_analysis_queue
WHERE project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
  AND status = 'processing'

UNION ALL

SELECT 
  'En cola (completed)' as tipo,
  COUNT(*) as count
FROM sentiment_analysis_queue
WHERE project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
  AND status = 'completed'

UNION ALL

SELECT 
  'En cola (failed)' as tipo,
  COUNT(*) as count
FROM sentiment_analysis_queue
WHERE project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
  AND status = 'failed';

-- 7. Verificar si analyze-sentiment está guardando resultados correctamente
-- Ver las últimas sentiment_analysis creadas para este proyecto
SELECT 
  sa.id,
  sa.ai_response_id,
  sa.analysis_type,
  sa.entity_name,
  sa.sentiment_label,
  sa.overall_sentiment,
  sa.created_at,
  ar.response_text IS NOT NULL as has_response_text
FROM sentiment_analysis sa
INNER JOIN ai_responses ar ON ar.id = sa.ai_response_id
WHERE sa.project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
ORDER BY sa.created_at DESC
LIMIT 20;

-- 8. Verificar si hay respuestas que están en la cola pero no deberían estar
-- (ya tienen sentiment_analysis pero siguen en cola como pending)
SELECT 
  saq.id as queue_id,
  saq.ai_response_id,
  saq.status,
  saq.created_at as queued_at,
  COUNT(sa.id) as existing_sentiment_count
FROM sentiment_analysis_queue saq
INNER JOIN sentiment_analysis sa ON sa.ai_response_id = saq.ai_response_id
WHERE saq.project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
  AND saq.status = 'pending'
GROUP BY saq.id, saq.ai_response_id, saq.status, saq.created_at
LIMIT 20;

-- 9. Ver el batch más reciente y su progreso
SELECT 
  batch_id,
  status,
  COUNT(*) as count,
  MIN(created_at) as batch_started,
  MAX(updated_at) as last_update
FROM sentiment_analysis_queue
WHERE project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
  AND batch_id IN (
    SELECT DISTINCT batch_id 
    FROM sentiment_analysis_queue 
    WHERE project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
    ORDER BY batch_id DESC 
    LIMIT 1
  )
GROUP BY batch_id, status
ORDER BY status;

