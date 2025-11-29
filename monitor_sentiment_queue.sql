-- ============================================
-- MONITOREO: Estado de Sentiment Analysis Queue
-- ============================================
-- Ejecuta esto periódicamente para ver el progreso
-- ============================================

-- Estado general de la cola
SELECT 
  status,
  COUNT(*) as count,
  COUNT(DISTINCT project_id) as projects,
  MIN(created_at) as oldest_item,
  MAX(updated_at) as newest_update
FROM sentiment_analysis_queue
WHERE project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
GROUP BY status
ORDER BY status;

-- Progreso en tiempo real (últimos 5 minutos)
SELECT 
  'Últimos 5 minutos' as periodo,
  status,
  COUNT(*) as count
FROM sentiment_analysis_queue
WHERE project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
  AND updated_at >= NOW() - INTERVAL '5 minutes'
GROUP BY status
ORDER BY status;

-- Items en procesamiento (deberían cambiar rápidamente)
SELECT 
  id,
  ai_response_id,
  status,
  attempts,
  EXTRACT(EPOCH FROM (NOW() - updated_at)) / 60 as minutes_in_status,
  error_message
FROM sentiment_analysis_queue
WHERE project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
  AND status = 'processing'
ORDER BY updated_at ASC
LIMIT 10;

-- Items fallidos recientes
SELECT 
  id,
  ai_response_id,
  status,
  attempts,
  error_message,
  updated_at
FROM sentiment_analysis_queue
WHERE project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
  AND status = 'failed'
ORDER BY updated_at DESC
LIMIT 10;

-- Verificar si se están creando nuevos registros en sentiment_analysis
SELECT 
  'Registros creados (última hora)' as tipo,
  COUNT(*) as count
FROM sentiment_analysis
WHERE project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
  AND created_at >= NOW() - INTERVAL '1 hour';

-- Comparar: items completed vs sentiment_analysis creados
SELECT 
  'Items en cola (completed)' as tipo,
  COUNT(*) as count
FROM sentiment_analysis_queue
WHERE project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
  AND status = 'completed'

UNION ALL

SELECT 
  'Registros en sentiment_analysis' as tipo,
  COUNT(DISTINCT ai_response_id) as count
FROM sentiment_analysis
WHERE project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684';

-- Verificar items "completed" que NO tienen sentiment_analysis (problema)
SELECT 
  COUNT(*) as items_completed_without_analysis
FROM sentiment_analysis_queue saq
WHERE saq.project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
  AND saq.status = 'completed'
  AND NOT EXISTS (
    SELECT 1 
    FROM sentiment_analysis sa 
    WHERE sa.ai_response_id = saq.ai_response_id
  );

