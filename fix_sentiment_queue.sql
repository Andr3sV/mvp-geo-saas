-- ============================================
-- FIX: Reiniciar Procesamiento de Sentiment Analysis
-- ============================================
-- Este script ayuda a reiniciar el procesamiento de items que están
-- marcados como "completed" pero no tienen sentiment_analysis
-- ============================================

-- 1. Ver items que están "completed" pero no tienen sentiment_analysis
SELECT 
  COUNT(*) as items_to_reset
FROM sentiment_analysis_queue saq
WHERE saq.project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
  AND saq.status = 'completed'
  AND NOT EXISTS (
    SELECT 1 
    FROM sentiment_analysis sa 
    WHERE sa.ai_response_id = saq.ai_response_id
  );

-- 2. Resetear items "completed" que no tienen sentiment_analysis
-- (Esto los pondrá de nuevo en "pending" para que se procesen)
UPDATE sentiment_analysis_queue saq
SET 
  status = 'pending',
  attempts = 0,
  error_message = NULL,
  updated_at = NOW()
WHERE saq.project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
  AND saq.status = 'completed'
  AND NOT EXISTS (
    SELECT 1 
    FROM sentiment_analysis sa 
    WHERE sa.ai_response_id = saq.ai_response_id
  );

-- 3. Resetear items atascados en "processing"
UPDATE sentiment_analysis_queue
SET 
  status = 'pending',
  updated_at = NOW(),
  error_message = 'Reset due to being stuck in processing'
WHERE project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
  AND status = 'processing' 
  AND updated_at < NOW() - INTERVAL '10 minutes';

-- 4. Ver estado después del reset
SELECT 
  status,
  COUNT(*) as count
FROM sentiment_analysis_queue
WHERE project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
GROUP BY status
ORDER BY status;

-- 5. Invocar workers para procesar los items reseteados
-- (Reemplaza TU_PROJECT_REF y TU_SERVICE_ROLE_KEY)
SELECT
  net.http_post(
      url:='https://TU_PROJECT_REF.supabase.co/functions/v1/process-sentiment-queue',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer TU_SERVICE_ROLE_KEY"}'::jsonb,
      body:='{"auto_invoke_count": 0}'::jsonb
  ) as request_id;

-- Ejecuta esto 5-10 veces para invocar múltiples workers en paralelo
-- (Copia y pega la query anterior varias veces)

