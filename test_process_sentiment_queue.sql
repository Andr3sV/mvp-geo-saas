-- ============================================
-- TEST: Invocar process-sentiment-queue
-- ============================================
-- Este script prueba la invocación de process-sentiment-queue
-- IMPORTANTE: Reemplaza TU_SERVICE_ROLE_KEY con tu Service Role Key real
-- ============================================

-- 1. Verificar estado de la cola ANTES
SELECT 
  'ANTES' as momento,
  status,
  COUNT(*) as count
FROM sentiment_analysis_queue
WHERE project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
GROUP BY status
ORDER BY status;

-- 2. Invocar UN worker para probar
SELECT
  net.http_post(
      url:='https://sqvhxqbjxetibedzzkyo.supabase.co/functions/v1/process-sentiment-queue',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer TU_SERVICE_ROLE_KEY' -- <<-- REEMPLAZA ESTO
      ),
      body:=jsonb_build_object('auto_invoke_count', 0)
  ) as test_request_id;

-- 3. Esperar 10-15 segundos y luego ejecutar esto para ver el progreso:
-- SELECT 
--   'DESPUÉS' as momento,
--   status,
--   COUNT(*) as count,
--   MAX(updated_at) as last_update
-- FROM sentiment_analysis_queue
-- WHERE project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
-- GROUP BY status
-- ORDER BY status;

-- 4. Verificar logs en Supabase Dashboard:
-- Edge Functions > process-sentiment-queue > Logs
-- Deberías ver logs que empiezan con "[process-sentiment-queue] Function invoked"

