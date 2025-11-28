-- 1. Verificar que pg_net está habilitada (NECESARIA para el cron)
SELECT 
    extname, 
    extversion 
FROM pg_extension 
WHERE extname = 'pg_net';

-- Si no aparece nada, ejecuta primero: CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Ver historial de ejecuciones del cron (para ver errores)
SELECT 
    runid,
    jobid,
    start_time,
    status,
    return_message
FROM cron.job_run_details 
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname = 'daily-analysis-trigger')
ORDER BY start_time DESC 
LIMIT 5;

-- 3. Prueba de conectividad básica de pg_net (solo si está habilitada)
-- SELECT net.http_get('https://google.com') as prueba_google;

-- 3. Ejecución MANUAL inmediata (para probar si la función responde)
-- Usando la URL y Token que ya tienes configurados
SELECT
    net.http_post(
        url:='',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer "}'::jsonb,
        body:='{}'::jsonb
    ) as request_id_manual;

