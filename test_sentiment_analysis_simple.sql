-- ============================================
-- TEST SIMPLE: Ejecutar Análisis de Sentimiento
-- ============================================
-- Versión simplificada para ejecutar fácilmente
-- ============================================

-- PASO 1: Ver tus proyectos y obtener el PROJECT_ID
SELECT 
  id as project_id,
  name as project_name,
  brand_name,
  created_at
FROM projects
ORDER BY created_at DESC;

-- PASO 2: Copia el UUID del proyecto que quieres analizar
-- Luego ejecuta la OPCIÓN A o B abajo

-- ============================================
-- OPCIÓN A: Ejecutar para TODOS los proyectos
-- ============================================
-- Reemplaza TU_PROJECT_REF y TU_SERVICE_ROLE_KEY
SELECT
  net.http_post(
      url:='https://TU_PROJECT_REF.supabase.co/functions/v1/daily-sentiment-analysis',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer TU_SERVICE_ROLE_KEY"}'::jsonb,
      body:='{}'::jsonb
  ) as request_id;

-- ============================================
-- OPCIÓN B: Ejecutar para un PROYECTO ESPECÍFICO
-- ============================================
-- Reemplaza:
-- 1. TU_PROJECT_REF con tu project reference (ej: abcdefghijk)
-- 2. TU_SERVICE_ROLE_KEY con tu service role key
-- 3. 'PEGA_AQUI_EL_UUID_DEL_PROYECTO' con el UUID que copiaste del PASO 1
--    Ejemplo: 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'

SELECT
  net.http_post(
      url:='https://TU_PROJECT_REF.supabase.co/functions/v1/trigger-sentiment-analysis',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer TU_SERVICE_ROLE_KEY"}'::jsonb,
      body:=jsonb_build_object(
        'project_id', 'PEGA_AQUI_EL_UUID_DEL_PROYECTO',
        'force_reanalysis', false
      )
  ) as request_id;

-- ============================================
-- VERIFICAR: Ver cuántas respuestas sin analizar hay
-- ============================================
SELECT 
  p.name as project_name,
  COUNT(*) as unanalyzed_responses
FROM ai_responses ar
INNER JOIN projects p ON p.id = ar.project_id
WHERE ar.status = 'success'
  AND ar.response_text IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM sentiment_analysis sa 
    WHERE sa.ai_response_id = ar.id
  )
GROUP BY p.id, p.name
ORDER BY unanalyzed_responses DESC;

-- ============================================
-- MONITOREO: Ver estado de la cola después de ejecutar
-- ============================================
SELECT 
  status,
  COUNT(*) as count,
  COUNT(DISTINCT project_id) as projects
FROM sentiment_analysis_queue
GROUP BY status
ORDER BY status;

-- Ver items pendientes
SELECT 
  COUNT(*) as pending_count
FROM sentiment_analysis_queue
WHERE status = 'pending';

-- Ver items en procesamiento
SELECT 
  COUNT(*) as processing_count
FROM sentiment_analysis_queue
WHERE status = 'processing';

-- Ver items completados (última hora)
SELECT 
  COUNT(*) as completed_last_hour
FROM sentiment_analysis_queue
WHERE status = 'completed'
  AND updated_at >= NOW() - INTERVAL '1 hour';

