-- ============================================
-- INVOCAR DIRECTAMENTE: process-sentiment-queue
-- ============================================
-- Este script invoca process-sentiment-queue directamente
-- (NO requiere project_id, procesa la cola directamente)
-- IMPORTANTE: Reemplaza TU_PROJECT_REF y TU_SERVICE_ROLE_KEY
-- ============================================

-- 1. Verificar estado actual de la cola
SELECT 
  status,
  COUNT(*) as count,
  MAX(updated_at) as last_update
FROM sentiment_analysis_queue
WHERE project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
GROUP BY status
ORDER BY status;

-- 2. Invocar múltiples workers en paralelo
-- Worker 1
SELECT
  net.http_post(
      url:='https://sqvhxqbjxetibedzzkyo.supabase.co/functions/v1/process-sentiment-queue',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer TU_SERVICE_ROLE_KEY' -- <<-- REEMPLAZA ESTO
      ),
      body:=jsonb_build_object('auto_invoke_count', 0)
  ) as worker_1_request_id;

-- Worker 2
SELECT
  net.http_post(
      url:='https://sqvhxqbjxetibedzzkyo.supabase.co/functions/v1/process-sentiment-queue',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer TU_SERVICE_ROLE_KEY' -- <<-- REEMPLAZA ESTO
      ),
      body:=jsonb_build_object('auto_invoke_count', 0)
  ) as worker_2_request_id;

-- Worker 3
SELECT
  net.http_post(
      url:='https://sqvhxqbjxetibedzzkyo.supabase.co/functions/v1/process-sentiment-queue',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer TU_SERVICE_ROLE_KEY' -- <<-- REEMPLAZA ESTO
      ),
      body:=jsonb_build_object('auto_invoke_count', 0)
  ) as worker_3_request_id;

-- Worker 4
SELECT
  net.http_post(
      url:='https://sqvhxqbjxetibedzzkyo.supabase.co/functions/v1/process-sentiment-queue',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer TU_SERVICE_ROLE_KEY' -- <<-- REEMPLAZA ESTO
      ),
      body:=jsonb_build_object('auto_invoke_count', 0)
  ) as worker_4_request_id;

-- Worker 5
SELECT
  net.http_post(
      url:='https://sqvhxqbjxetibedzzkyo.supabase.co/functions/v1/process-sentiment-queue',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer TU_SERVICE_ROLE_KEY' -- <<-- REEMPLAZA ESTO
      ),
      body:=jsonb_build_object('auto_invoke_count', 0)
  ) as worker_5_request_id;

-- Workers adicionales para procesar más rápido (6-10)
-- Worker 6
SELECT
  net.http_post(
      url:='https://sqvhxqbjxetibedzzkyo.supabase.co/functions/v1/process-sentiment-queue',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer TU_SERVICE_ROLE_KEY' -- <<-- REEMPLAZA ESTO
      ),
      body:=jsonb_build_object('auto_invoke_count', 0)
  ) as worker_6_request_id;

-- Worker 7
SELECT
  net.http_post(
      url:='https://sqvhxqbjxetibedzzkyo.supabase.co/functions/v1/process-sentiment-queue',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer TU_SERVICE_ROLE_KEY' -- <<-- REEMPLAZA ESTO
      ),
      body:=jsonb_build_object('auto_invoke_count', 0)
  ) as worker_7_request_id;

-- Worker 8
SELECT
  net.http_post(
      url:='https://sqvhxqbjxetibedzzkyo.supabase.co/functions/v1/process-sentiment-queue',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer TU_SERVICE_ROLE_KEY' -- <<-- REEMPLAZA ESTO
      ),
      body:=jsonb_build_object('auto_invoke_count', 0)
  ) as worker_8_request_id;

-- Worker 9
SELECT
  net.http_post(
      url:='https://sqvhxqbjxetibedzzkyo.supabase.co/functions/v1/process-sentiment-queue',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer TU_SERVICE_ROLE_KEY' -- <<-- REEMPLAZA ESTO
      ),
      body:=jsonb_build_object('auto_invoke_count', 0)
  ) as worker_9_request_id;

-- Worker 10
SELECT
  net.http_post(
      url:='https://sqvhxqbjxetibedzzkyo.supabase.co/functions/v1/process-sentiment-queue',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer TU_SERVICE_ROLE_KEY' -- <<-- REEMPLAZA ESTO
      ),
      body:=jsonb_build_object('auto_invoke_count', 0)
  ) as worker_10_request_id;

-- 3. Esperar 30-60 segundos y luego ejecutar esto para ver el progreso:
-- SELECT 
--   status,
--   COUNT(*) as count,
--   MAX(updated_at) as last_update
-- FROM sentiment_analysis_queue
-- WHERE project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
-- GROUP BY status
-- ORDER BY status;

