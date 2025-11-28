-- ============================================
-- PRUEBA DIRECTA DE process-queue
-- ============================================
-- Esto prueba si process-queue funciona cuando se invoca directamente
-- ============================================

-- Verificar que hay items pendientes en la cola
SELECT 
    status,
    COUNT(*) as cantidad
FROM analysis_queue
GROUP BY status;

-- Invocar process-queue directamente
-- ⚠️ IMPORTANTE: Reemplaza TU_SERVICE_ROLE_KEY con tu clave real
SELECT
    net.http_post(
        url:='https://sqvhxqbjxetibedzzkyo.supabase.co/functions/v1/process-queue',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer TU_SERVICE_ROLE_KEY"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id,
    '✅ process-queue invocado directamente' as resultado;

-- Esperar 10-15 segundos y luego verificar el progreso
-- Ejecuta esto después de unos segundos:
SELECT 
    status,
    COUNT(*) as cantidad,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM analysis_queue), 2) as porcentaje
FROM analysis_queue
GROUP BY status
ORDER BY 
    CASE status
        WHEN 'pending' THEN 1
        WHEN 'processing' THEN 2
        WHEN 'completed' THEN 3
        WHEN 'failed' THEN 4
    END;

