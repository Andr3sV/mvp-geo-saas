-- ============================================
-- VERIFICAR PROGRESO: Sentiment Analysis
-- ============================================
-- Ejecuta esto cada 30 segundos para ver el progreso en tiempo real
-- ============================================

-- Estado actual de la cola
SELECT 
  status,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM sentiment_analysis_queue
WHERE project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
GROUP BY status
ORDER BY status;

-- Progreso en los últimos 2 minutos
SELECT 
  'Últimos 2 minutos' as periodo,
  status,
  COUNT(*) as count
FROM sentiment_analysis_queue
WHERE project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
  AND updated_at >= NOW() - INTERVAL '2 minutes'
GROUP BY status
ORDER BY status;

-- Verificar si se están creando nuevos registros
SELECT 
  'Registros creados (últimos 5 minutos)' as tipo,
  COUNT(*) as count,
  COUNT(DISTINCT ai_response_id) as unique_responses
FROM sentiment_analysis
WHERE project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
  AND created_at >= NOW() - INTERVAL '5 minutes';

-- Items que cambiaron de estado recientemente
SELECT 
  id,
  ai_response_id,
  status,
  attempts,
  EXTRACT(EPOCH FROM (NOW() - updated_at)) as seconds_ago,
  error_message
FROM sentiment_analysis_queue
WHERE project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
  AND updated_at >= NOW() - INTERVAL '2 minutes'
ORDER BY updated_at DESC
LIMIT 20;

