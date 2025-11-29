-- ============================================
-- CONFIGURACIÓN DEL SISTEMA DE ANÁLISIS DE SENTIMIENTO DIARIO
-- ============================================
-- 
-- Este script configura el sistema que ejecuta análisis de sentimiento
-- automáticamente cada día para todas las respuestas sin analizar.
--
-- IMPORTANTE: Antes de ejecutar este script:
-- 1. Reemplaza 'TU_PROJECT_REF' en la línea 79 con el ID de referencia de tu proyecto Supabase
--    (Ej: si tu URL es https://abcdefghijk.supabase.co, entonces TU_PROJECT_REF es abcdefghijk)
-- 2. Reemplaza 'TU_SERVICE_ROLE_KEY' en la línea 80 con tu Service Role Key real
--    (Encuéntrala en: Supabase Dashboard → Project Settings → API → service_role)
-- 3. Ejecuta este script completo en el SQL Editor de Supabase
--
-- ============================================

-- PASO 1: Verificar que pg_cron y pg_net estén habilitados
DO $$ 
BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    CREATE EXTENSION IF NOT EXISTS pg_net;
EXCEPTION 
    WHEN OTHERS THEN 
        RAISE NOTICE 'Extensiones pg_cron y/o pg_net ya están habilitadas';
END $$;

-- PASO 2: Eliminar el cron job anterior si existe (para evitar duplicados)
DO $$ 
BEGIN
    PERFORM cron.unschedule('daily-sentiment-analysis-trigger');
EXCEPTION 
    WHEN SQLSTATE 'XX000' THEN 
        RAISE NOTICE 'No hay cron job previo para eliminar';
    WHEN OTHERS THEN 
        RAISE EXCEPTION 'Error al intentar eliminar cron job: %', SQLERRM;
END $$;

-- PASO 3: Programar el Cron Job (Diario a las 3:00 AM UTC - después del análisis de prompts)
SELECT cron.schedule(
  'daily-sentiment-analysis-trigger',
  '0 3 * * *', -- Cada día a las 3:00 AM UTC (1 hora después del análisis de prompts)
  $$
  SELECT
    net.http_post(
        url:='https://TU_PROJECT_REF.supabase.co/functions/v1/daily-sentiment-analysis',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer TU_SERVICE_ROLE_KEY"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);

-- PASO 4: Verificar que el cron job se creó correctamente
SELECT * FROM cron.job WHERE jobname = 'daily-sentiment-analysis-trigger';

-- ============================================
-- NOTAS:
-- ============================================
-- - El cron job se ejecuta a las 3:00 AM UTC (1 hora después del análisis de prompts)
-- - Esto permite que las nuevas respuestas del análisis diario se analicen al día siguiente
-- - Puedes ajustar la hora cambiando '0 3 * * *' (formato: minuto hora día mes día-semana)
-- - Para ejecutar manualmente, invoca la función daily-sentiment-analysis desde el dashboard de Supabase

