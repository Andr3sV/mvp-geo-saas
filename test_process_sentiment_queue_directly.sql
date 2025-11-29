-- ============================================
-- TEST: Invocar process-sentiment-queue directamente
-- ============================================
-- Este script invoca la función directamente para verificar que funciona
-- ============================================

-- IMPORTANTE: Reemplaza TU_PROJECT_REF y TU_SERVICE_ROLE_KEY

-- Verificar que hay items pendientes antes de invocar
SELECT 
  'Items pendientes' as tipo,
  COUNT(*) as count
FROM sentiment_analysis_queue
WHERE status = 'pending'
  AND project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684';

-- Invocar la función directamente
SELECT
  net.http_post(
      url:='https://TU_PROJECT_REF.supabase.co/functions/v1/process-sentiment-queue',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer TU_SERVICE_ROLE_KEY"}'::jsonb,
      body:='{"auto_invoke_count": 0}'::jsonb
  ) as request_id;

-- Esperar 10 segundos y verificar si cambió algo
-- (Ejecuta esto después de unos segundos)
SELECT 
  status,
  COUNT(*) as count,
  MAX(updated_at) as last_update
FROM sentiment_analysis_queue
WHERE project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
GROUP BY status
ORDER BY status;

