-- ============================================
-- PRUEBA MANUAL DEL SISTEMA DE ANÁLISIS DIARIO
-- ============================================
-- Ejecuta estos pasos en orden para probar el sistema
-- ============================================

-- PASO 1: Limpiar cola anterior (opcional, solo para pruebas limpias)
-- Descomenta si quieres empezar desde cero:
-- DELETE FROM analysis_queue WHERE status IN ('pending', 'processing');

-- PASO 2: Ver estado inicial de la cola
SELECT 
    status, 
    COUNT(*) as cantidad,
    'Estado inicial' as momento
FROM analysis_queue 
GROUP BY status;

-- PASO 3: Ejecutar trigger-daily-analysis manualmente
-- ⚠️ IMPORTANTE: Reemplaza TU_SERVICE_ROLE_KEY con tu clave real
SELECT
    net.http_post(
        url:='https://sqvhxqbjxetibedzzkyo.supabase.co/functions/v1/trigger-daily-analysis',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer TU_SERVICE_ROLE_KEY"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id,
    '✅ trigger-daily-analysis ejecutado' as resultado;

-- PASO 4: Esperar 5-10 segundos y verificar que se llenó la cola
-- Ejecuta esto después de unos segundos:
SELECT 
    status, 
    COUNT(*) as cantidad,
    'Después de trigger' as momento
FROM analysis_queue 
GROUP BY status;

-- PASO 5: Verificar que los workers están procesando
-- Ejecuta esto cada 30 segundos para ver el progreso:
SELECT 
    status,
    COUNT(*) as cantidad,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM analysis_queue), 2) as porcentaje,
    MIN(created_at) as desde,
    MAX(updated_at) as ultimo_cambio
FROM analysis_queue 
GROUP BY status
ORDER BY 
    CASE status
        WHEN 'pending' THEN 1
        WHEN 'processing' THEN 2
        WHEN 'completed' THEN 3
        WHEN 'failed' THEN 4
    END;

-- PASO 6: Ver análisis creados recientemente
SELECT 
    COUNT(*) as total_analisis,
    COUNT(DISTINCT prompt_tracking_id) as prompts_analizados,
    COUNT(DISTINCT platform) as plataformas_usadas,
    MIN(created_at) as primer_analisis,
    MAX(created_at) as ultimo_analisis
FROM ai_responses 
WHERE created_at >= NOW() - INTERVAL '10 minutes';

-- PASO 7: Ver distribución por plataforma
SELECT 
    platform,
    COUNT(*) as cantidad,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM ai_responses WHERE created_at >= NOW() - INTERVAL '10 minutes'), 2) as porcentaje
FROM ai_responses 
WHERE created_at >= NOW() - INTERVAL '10 minutes'
GROUP BY platform
ORDER BY cantidad DESC;

-- PASO 8: Ver errores en la cola (si los hay)
SELECT 
    id,
    prompt_tracking_id,
    status,
    attempts,
    error_message,
    updated_at
FROM analysis_queue 
WHERE status = 'failed'
ORDER BY updated_at DESC
LIMIT 10;

