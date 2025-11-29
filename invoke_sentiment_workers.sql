-- ============================================
-- INVOCAR WORKERS: process-sentiment-queue
-- ============================================
-- Este script invoca múltiples workers en paralelo
-- IMPORTANTE: Reemplaza TU_PROJECT_REF y TU_SERVICE_ROLE_KEY
-- ============================================

-- Verificar items pendientes antes de invocar
SELECT 
  'Items pendientes' as tipo,
  COUNT(*) as count
FROM sentiment_analysis_queue
WHERE status = 'pending'
  AND project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684';

-- Invocar worker 1
SELECT
  net.http_post(
      url:='https://TU_PROJECT_REF.supabase.co/functions/v1/process-sentiment-queue',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer TU_SERVICE_ROLE_KEY"}'::jsonb,
      body:='{"auto_invoke_count": 0}'::jsonb
  ) as worker_1_request_id;

-- Invocar worker 2
SELECT
  net.http_post(
      url:='https://TU_PROJECT_REF.supabase.co/functions/v1/process-sentiment-queue',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer TU_SERVICE_ROLE_KEY"}'::jsonb,
      body:='{"auto_invoke_count": 0}'::jsonb
  ) as worker_2_request_id;

-- Invocar worker 3
SELECT
  net.http_post(
      url:='https://TU_PROJECT_REF.supabase.co/functions/v1/process-sentiment-queue',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer TU_SERVICE_ROLE_KEY"}'::jsonb,
      body:='{"auto_invoke_count": 0}'::jsonb
  ) as worker_3_request_id;

-- Invocar worker 4
SELECT
  net.http_post(
      url:='https://TU_PROJECT_REF.supabase.co/functions/v1/process-sentiment-queue',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer TU_SERVICE_ROLE_KEY"}'::jsonb,
      body:='{"auto_invoke_count": 0}'::jsonb
  ) as worker_4_request_id;

-- Invocar worker 5
SELECT
  net.http_post(
      url:='https://TU_PROJECT_REF.supabase.co/functions/v1/process-sentiment-queue',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer TU_SERVICE_ROLE_KEY"}'::jsonb,
      body:='{"auto_invoke_count": 0}'::jsonb
  ) as worker_5_request_id;

-- Esperar 30 segundos y luego ejecutar esto para ver el progreso:
-- SELECT 
--   status,
--   COUNT(*) as count,
--   MAX(updated_at) as last_update
-- FROM sentiment_analysis_queue
-- WHERE project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
-- GROUP BY status
-- ORDER BY status;

