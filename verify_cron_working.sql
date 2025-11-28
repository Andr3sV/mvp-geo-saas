-- ============================================
-- VERIFICAR QUE EL CRON ESTÁ FUNCIONANDO
-- ============================================

-- 1. Verificar que el cron job está activo
SELECT 
    jobid,
    jobname,
    schedule,
    active,
    CASE 
        WHEN active THEN '✅ Cron está ACTIVO'
        ELSE '❌ Cron está INACTIVO'
    END as estado
FROM cron.job 
WHERE jobname = 'daily-analysis-trigger';

-- 2. Ver historial de ejecuciones (últimas 10)
-- Busca errores en 'return_message' o status 'failed'
SELECT 
    runid,
    start_time,
    status,
    return_message,
    CASE 
        WHEN status = 'succeeded' THEN '✅ Ejecutado exitosamente'
        WHEN status = 'failed' THEN '❌ Falló - revisa return_message'
        ELSE '⏳ ' || status
    END as resultado
FROM cron.job_run_details 
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname = 'daily-analysis-trigger')
ORDER BY start_time DESC 
LIMIT 10;

-- 3. Verificar que pg_net está habilitada
SELECT 
    extname,
    CASE 
        WHEN extname = 'pg_net' THEN '✅ pg_net habilitada'
        ELSE '❌ pg_net NO habilitada'
    END as estado
FROM pg_extension 
WHERE extname = 'pg_net';

-- 4. Ver si hay análisis recientes (últimas 24 horas)
-- Esto confirma que la función se ejecutó y procesó prompts
SELECT 
    COUNT(*) as total_analisis,
    COUNT(DISTINCT prompt_tracking_id) as prompts_analizados,
    COUNT(DISTINCT platform) as plataformas_usadas
FROM ai_responses 
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- 5. Ver distribución por plataforma (últimas 24 horas)
SELECT 
    platform,
    COUNT(*) as cantidad
FROM ai_responses 
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY platform
ORDER BY cantidad DESC;

