-- ============================================
-- DIAGNÓSTICO: CITATION TRACKING NO MUESTRA DATOS RECIENTES
-- ============================================

-- 1. Verificar respuestas recientes en ai_responses (última hora)
SELECT 
    'Respuestas en ai_responses (última hora)' as tipo,
    COUNT(*) as total,
    COUNT(DISTINCT prompt_tracking_id) as prompts_unicos,
    COUNT(DISTINCT platform) as plataformas,
    MIN(created_at) as primera,
    MAX(created_at) as ultima
FROM ai_responses 
WHERE created_at >= NOW() - INTERVAL '1 hour'
  AND status = 'success';

-- 2. Verificar citas recientes en citations_detail (última hora)
SELECT 
    'Citas en citations_detail (última hora)' as tipo,
    COUNT(*) as total,
    COUNT(DISTINCT ai_response_id) as respuestas_con_citas,
    COUNT(DISTINCT project_id) as proyectos,
    MIN(created_at) as primera,
    MAX(created_at) as ultima
FROM citations_detail 
WHERE created_at >= NOW() - INTERVAL '1 hour';

-- 3. Comparar: respuestas vs citas insertadas
SELECT 
    ar.id as ai_response_id,
    ar.platform,
    ar.status,
    ar.created_at as respuesta_creada,
    COUNT(cd.id) as citas_insertadas,
    MAX(cd.created_at) as ultima_cita_insertada,
    CASE 
        WHEN COUNT(cd.id) = 0 THEN '⚠️ SIN CITAS'
        WHEN COUNT(cd.id) > 0 AND MAX(cd.created_at) > ar.created_at + INTERVAL '5 minutes' THEN '⚠️ CITAS CON DELAY'
        ELSE '✅ OK'
    END as estado
FROM ai_responses ar
LEFT JOIN citations_detail cd ON cd.ai_response_id = ar.id
WHERE ar.created_at >= NOW() - INTERVAL '1 hour'
  AND ar.status = 'success'
GROUP BY ar.id, ar.platform, ar.status, ar.created_at
ORDER BY ar.created_at DESC
LIMIT 20;

-- 4. Verificar si hay respuestas sin citas (posible problema en triggerCitationProcessing)
SELECT 
    'Respuestas sin citas (última hora)' as tipo,
    COUNT(*) as total,
    STRING_AGG(DISTINCT platform, ', ') as plataformas
FROM ai_responses ar
WHERE ar.created_at >= NOW() - INTERVAL '1 hour'
  AND ar.status = 'success'
  AND NOT EXISTS (
      SELECT 1 FROM citations_detail cd 
      WHERE cd.ai_response_id = ar.id
  );

-- 5. Verificar el tiempo entre creación de respuesta y creación de cita
SELECT 
    ar.id as ai_response_id,
    ar.platform,
    ar.created_at as respuesta_creada,
    MIN(cd.created_at) as primera_cita,
    EXTRACT(EPOCH FROM (MIN(cd.created_at) - ar.created_at)) as segundos_delay
FROM ai_responses ar
INNER JOIN citations_detail cd ON cd.ai_response_id = ar.id
WHERE ar.created_at >= NOW() - INTERVAL '1 hour'
  AND ar.status = 'success'
GROUP BY ar.id, ar.platform, ar.created_at
ORDER BY ar.created_at DESC
LIMIT 20;

-- 6. Verificar citas con URLs (las que se muestran en Citation Tracking)
SELECT 
    'Citas con URLs (última hora)' as tipo,
    COUNT(*) as total,
    COUNT(DISTINCT ai_response_id) as respuestas_con_urls,
    COUNT(DISTINCT cited_domain) as dominios_unicos
FROM citations_detail 
WHERE created_at >= NOW() - INTERVAL '1 hour'
  AND cited_url IS NOT NULL;

-- 7. Verificar si las citas están dentro del rango de fechas por defecto (últimos 29 días)
SELECT 
    'Citas en rango por defecto (últimos 29 días)' as tipo,
    COUNT(*) as total,
    COUNT(DISTINCT ai_response_id) as respuestas_unicas
FROM citations_detail 
WHERE created_at >= NOW() - INTERVAL '29 days'
  AND cited_url IS NOT NULL;

