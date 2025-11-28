-- ============================================
-- REINICIAR WORKERS PARA PROCESAR ITEMS PENDIENTES
-- ============================================
-- Ejecuta esto después de resetear items stuck
-- ============================================

-- 1. Ver cuántos items pendientes hay
SELECT 
    status,
    COUNT(*) as cantidad
FROM analysis_queue
WHERE status = 'pending'
GROUP BY status;

-- 2. Invocar process-queue múltiples veces para procesar la cola
-- Ejecuta esto 5-10 veces (o crea un loop) para disparar múltiples workers
-- ⚠️ IMPORTANTE: Reemplaza TU_SERVICE_ROLE_KEY con tu clave real

-- Worker 1
SELECT
    net.http_post(
        url:='https://sqvhxqbjxetibedzzkyo.supabase.co/functions/v1/process-queue',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer TU_SERVICE_ROLE_KEY"}'::jsonb,
        body:='{}'::jsonb
    ) as worker_1;

-- Worker 2
SELECT
    net.http_post(
        url:='https://sqvhxqbjxetibedzzkyo.supabase.co/functions/v1/process-queue',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer TU_SERVICE_ROLE_KEY"}'::jsonb,
        body:='{}'::jsonb
    ) as worker_2;

-- Worker 3
SELECT
    net.http_post(
        url:='https://sqvhxqbjxetibedzzkyo.supabase.co/functions/v1/process-queue',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer TU_SERVICE_ROLE_KEY"}'::jsonb,
        body:='{}'::jsonb
    ) as worker_3;

-- Worker 4
SELECT
    net.http_post(
        url:='https://sqvhxqbjxetibedzzkyo.supabase.co/functions/v1/process-queue',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer TU_SERVICE_ROLE_KEY"}'::jsonb,
        body:='{}'::jsonb
    ) as worker_4;

-- Worker 5
SELECT
    net.http_post(
        url:='https://sqvhxqbjxetibedzzkyo.supabase.co/functions/v1/process-queue',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer TU_SERVICE_ROLE_KEY"}'::jsonb,
        body:='{}'::jsonb
    ) as worker_5;

