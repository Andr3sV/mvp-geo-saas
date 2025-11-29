-- ============================================
-- TEST: Ejecutar Análisis de Sentimiento Manualmente
-- ============================================
-- Este script permite ejecutar el análisis de sentimiento manualmente
-- para verificar que el sistema de cola funciona correctamente
-- ============================================

-- IMPORTANTE: Reemplaza 'TU_PROJECT_REF' y 'TU_SERVICE_ROLE_KEY' antes de ejecutar

-- OPCIÓN 1: Ejecutar análisis para TODOS los proyectos (como el cron diario)
-- Esto invoca daily-sentiment-analysis que llenará la cola con todas las respuestas sin analizar
SELECT
  net.http_post(
      url:='https://TU_PROJECT_REF.supabase.co/functions/v1/daily-sentiment-analysis',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer TU_SERVICE_ROLE_KEY"}'::jsonb,
      body:='{}'::jsonb
  ) as request_id;

-- ============================================
-- PASO PREVIO: Obtener PROJECT_ID
-- ============================================
-- Ejecuta esto primero para ver los proyectos disponibles
SELECT 
  id,
  name,
  brand_name,
  workspace_id
FROM projects
ORDER BY created_at DESC;

-- ============================================
-- OPCIÓN 2: Ejecutar análisis para un PROYECTO ESPECÍFICO
-- ============================================
-- IMPORTANTE: 
-- 1. Reemplaza 'TU_PROJECT_REF' con tu project reference
-- 2. Reemplaza 'TU_SERVICE_ROLE_KEY' con tu service role key
-- 3. Reemplaza 'AQUI_VA_EL_UUID_DEL_PROYECTO' con el UUID real del proyecto (de la query anterior)
-- 
-- Ejemplo: Si el proyecto tiene id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
-- entonces usa: 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'

SELECT
  net.http_post(
      url:='https://TU_PROJECT_REF.supabase.co/functions/v1/trigger-sentiment-analysis',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer TU_SERVICE_ROLE_KEY"}'::jsonb,
      body:=jsonb_build_object(
        'project_id', 'AQUI_VA_EL_UUID_DEL_PROYECTO',
        'force_reanalysis', false
      )
  ) as request_id;

-- ============================================
-- OPCIÓN 2B: Ejecutar para el primer proyecto (más fácil para pruebas)
-- ============================================
-- Esta opción usa el primer proyecto que encuentre (útil para pruebas rápidas)
DO $$
DECLARE
  v_project_id UUID;
  v_project_ref TEXT := 'TU_PROJECT_REF';
  v_service_key TEXT := 'TU_SERVICE_ROLE_KEY';
  v_result JSONB;
BEGIN
  -- Obtener el primer proyecto
  SELECT id INTO v_project_id
  FROM projects
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'No projects found';
  END IF;
  
  RAISE NOTICE 'Executing sentiment analysis for project: %', v_project_id;
  
  -- Invocar la función
  SELECT content INTO v_result
  FROM net.http_post(
    url:='https://' || v_project_ref || '.supabase.co/functions/v1/trigger-sentiment-analysis',
    headers:=jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body:=jsonb_build_object(
      'project_id', v_project_id::text,
      'force_reanalysis', false
    )
  );
  
  RAISE NOTICE 'Result: %', v_result;
END $$;

-- ============================================
-- MONITOREO: Ver el estado de la cola
-- ============================================

-- Ver resumen de la cola
SELECT 
  status,
  COUNT(*) as count,
  COUNT(DISTINCT project_id) as projects,
  MIN(created_at) as oldest_item,
  MAX(created_at) as newest_item
FROM sentiment_analysis_queue
GROUP BY status
ORDER BY status;

-- Ver items pendientes (próximos a procesar)
SELECT 
  id,
  project_id,
  ai_response_id,
  status,
  attempts,
  created_at,
  error_message
FROM sentiment_analysis_queue
WHERE status IN ('pending', 'processing')
ORDER BY created_at ASC
LIMIT 20;

-- Ver items fallidos que necesitan atención
SELECT 
  id,
  project_id,
  ai_response_id,
  status,
  attempts,
  error_message,
  created_at,
  updated_at
FROM sentiment_analysis_queue
WHERE status = 'failed'
ORDER BY updated_at DESC
LIMIT 20;

-- Ver progreso por batch (últimos 5 batches)
SELECT 
  batch_id,
  status,
  COUNT(*) as count,
  MIN(created_at) as batch_started
FROM sentiment_analysis_queue
WHERE batch_id IN (
  SELECT DISTINCT batch_id 
  FROM sentiment_analysis_queue 
  ORDER BY batch_id DESC 
  LIMIT 5
)
GROUP BY batch_id, status
ORDER BY batch_id DESC, status;

-- Ver respuestas sin analizar (para verificar que hay trabajo)
SELECT 
  ar.project_id,
  COUNT(*) as unanalyzed_responses
FROM ai_responses ar
WHERE ar.status = 'success'
  AND ar.response_text IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM sentiment_analysis sa 
    WHERE sa.ai_response_id = ar.id
  )
GROUP BY ar.project_id
ORDER BY unanalyzed_responses DESC;

-- ============================================
-- UTILIDADES: Resetear items atascados
-- ============================================

-- Resetear items en "processing" por más de 10 minutos
UPDATE sentiment_analysis_queue
SET 
  status = 'pending',
  updated_at = NOW(),
  error_message = 'Reset due to being stuck in processing'
WHERE 
  status = 'processing' 
  AND updated_at < NOW() - INTERVAL '10 minutes';

-- Resetear items fallidos para reintentar (cuidado: esto reiniciará todos los fallidos)
-- UPDATE sentiment_analysis_queue
-- SET 
--   status = 'pending',
--   attempts = 0,
--   error_message = NULL
-- WHERE 
--   status = 'failed' 
--   AND attempts >= 3;

