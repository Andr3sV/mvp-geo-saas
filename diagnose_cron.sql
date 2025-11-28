-- ============================================
-- DIAGNÓSTICO DEL SISTEMA DE CRON Y ANÁLISIS
-- Ejecutar en el SQL Editor de Supabase
-- ============================================

-- 1. Verificar si el job existe y si está activo
SELECT jobid, jobname, schedule, active, command 
FROM cron.job 
WHERE jobname = 'daily-analysis-trigger';

-- 2. Ver historial de ejecuciones (últimos 10 intentos)
-- Busca errores en 'return_message' (ej: 401 Unauthorized, 404 Not Found)
SELECT 
    jobid, 
    runid,
    start_time, 
    status, 
    return_message 
FROM cron.job_run_details 
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname = 'daily-analysis-trigger') 
ORDER BY start_time DESC 
LIMIT 10;

-- 3. Ver estado de la cola de análisis
-- Si está vacía: el trigger nunca se ejecutó exitosamente
-- Si hay 'pending': el trigger funcionó pero el procesador no arrancó
-- Si hay 'failed': el procesador intentó pero falló
SELECT status, count(*) as cantidad, min(created_at) as desde, max(updated_at) as ultimo_cambio
FROM public.analysis_queue 
GROUP BY status;

-- 4. Ver logs de errores recientes en la cola
SELECT id, status, error_message, attempts, updated_at 
FROM public.analysis_queue 
WHERE status = 'failed' 
ORDER BY updated_at DESC 
LIMIT 5;
