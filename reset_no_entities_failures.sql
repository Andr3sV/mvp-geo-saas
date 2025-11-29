-- ============================================
-- RESETEAR: Items fallidos por "no entities found"
-- ============================================
-- Este script resetea los items que fallaron porque no se encontraron entidades
-- (esto es un caso válido, no un error real)
-- ============================================

-- 1. Ver cuántos items tienen este error específico
SELECT 
  COUNT(*) as total_failed_no_entities,
  COUNT(DISTINCT ai_response_id) as unique_responses
FROM sentiment_analysis_queue
WHERE project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
  AND status = 'failed'
  AND error_message LIKE '%No sentiment analysis created after 3 attempts%';

-- 2. Verificar si estos ai_response_id ya tienen sentiment_analysis
SELECT 
  'Items que ya tienen análisis' as tipo,
  COUNT(DISTINCT saq.ai_response_id) as count
FROM sentiment_analysis_queue saq
INNER JOIN sentiment_analysis sa ON sa.ai_response_id = saq.ai_response_id
WHERE saq.project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
  AND saq.status = 'failed'
  AND saq.error_message LIKE '%No sentiment analysis created after 3 attempts%'
  AND sa.project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684';

-- 3. RESETEAR: Marcar como "pending" los items fallidos por "no entities"
-- Esto los hará procesarse de nuevo con la nueva lógica que los marca como "completed"
UPDATE sentiment_analysis_queue
SET 
  status = 'pending',
  attempts = 0, -- Reset attempts para que se procesen de nuevo
  error_message = NULL,
  updated_at = NOW()
WHERE project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
  AND status = 'failed'
  AND error_message LIKE '%No sentiment analysis created after 3 attempts%';

-- 4. Verificar el resultado
SELECT 
  status,
  COUNT(*) as count
FROM sentiment_analysis_queue
WHERE project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
GROUP BY status
ORDER BY status;

-- 5. Si quieres procesar estos items inmediatamente, ejecuta también:
-- (Ver invoke_sentiment_workers.sql para invocar los workers)

