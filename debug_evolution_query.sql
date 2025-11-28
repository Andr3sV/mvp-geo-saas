-- ============================================
-- DEBUG: Replicar exactamente la query de getCitationsEvolution
-- ============================================
-- Este script replica la lógica de getCitationsEvolution para identificar
-- por qué el gráfico muestra 0 citas cuando el SQL directo muestra 6615

-- IMPORTANTE: Reemplaza 'TU_PROJECT_ID' con el ID real de tu proyecto
-- También ajusta los filtros según lo que tengas seleccionado en el frontend

-- 1. Verificar citas SIN filtros (como el SQL original)
SELECT 
    DATE(created_at) as fecha,
    COUNT(*) as total_citas
FROM citations_detail 
WHERE created_at >= NOW() - INTERVAL '29 days'
  AND created_at <= NOW()
  AND cited_url IS NOT NULL
GROUP BY DATE(created_at)
ORDER BY fecha DESC;

-- 2. Replicar la query EXACTA de getCitationsEvolution (con JOINs)
-- Esta es la query que realmente se ejecuta en el código
SELECT 
    cd.id,
    cd.created_at,
    DATE(cd.created_at) as fecha,
    COUNT(*) OVER (PARTITION BY DATE(cd.created_at)) as citas_por_dia
FROM citations_detail cd
INNER JOIN ai_responses ar ON ar.id = cd.ai_response_id
INNER JOIN prompt_tracking pt ON pt.id = ar.prompt_tracking_id
WHERE cd.project_id = 'TU_PROJECT_ID'  -- ⚠️ REEMPLAZA CON TU PROJECT_ID
  AND cd.cited_url IS NOT NULL
  AND cd.created_at >= (NOW() - INTERVAL '29 days')::date
  AND cd.created_at <= NOW()
  -- Filtros opcionales (comenta/descomenta según necesites):
  -- AND ar.platform = 'perplexity'  -- Si tienes filtro de plataforma
  -- AND pt.region = 'US'  -- Si tienes filtro de región
  -- AND pt.topic_id = 'uuid-del-topic'  -- Si tienes filtro de topic
ORDER BY cd.created_at DESC
LIMIT 100;

-- 3. Verificar si hay citas HOY con los JOINs
SELECT 
    DATE(cd.created_at) as fecha,
    COUNT(*) as total_citas,
    COUNT(DISTINCT cd.ai_response_id) as respuestas_unicas,
    COUNT(DISTINCT ar.platform) as plataformas,
    COUNT(DISTINCT pt.region) as regiones
FROM citations_detail cd
INNER JOIN ai_responses ar ON ar.id = cd.ai_response_id
INNER JOIN prompt_tracking pt ON pt.id = ar.prompt_tracking_id
WHERE cd.project_id = 'TU_PROJECT_ID'  -- ⚠️ REEMPLAZA CON TU PROJECT_ID
  AND cd.cited_url IS NOT NULL
  AND DATE(cd.created_at) = CURRENT_DATE
GROUP BY DATE(cd.created_at);

-- 4. Verificar si hay problemas con los JOINs (citas sin ai_responses o prompt_tracking)
SELECT 
    'Citas sin ai_responses' as problema,
    COUNT(*) as cantidad
FROM citations_detail cd
LEFT JOIN ai_responses ar ON ar.id = cd.ai_response_id
WHERE cd.project_id = 'TU_PROJECT_ID'  -- ⚠️ REEMPLAZA CON TU PROJECT_ID
  AND cd.cited_url IS NOT NULL
  AND DATE(cd.created_at) = CURRENT_DATE
  AND ar.id IS NULL

UNION ALL

SELECT 
    'Citas sin prompt_tracking' as problema,
    COUNT(*) as cantidad
FROM citations_detail cd
INNER JOIN ai_responses ar ON ar.id = cd.ai_response_id
LEFT JOIN prompt_tracking pt ON pt.id = ar.prompt_tracking_id
WHERE cd.project_id = 'TU_PROJECT_ID'  -- ⚠️ REEMPLAZA CON TU PROJECT_ID
  AND cd.cited_url IS NOT NULL
  AND DATE(cd.created_at) = CURRENT_DATE
  AND pt.id IS NULL;

-- 5. Verificar el rango de fechas exacto que se está usando
-- (replicando la lógica de startOfDay y endOfDay)
SELECT 
    (NOW() - INTERVAL '29 days')::date as fecha_inicio,
    NOW()::date as fecha_fin,
    CURRENT_DATE as fecha_hoy,
    COUNT(*) as citas_en_rango
FROM citations_detail cd
INNER JOIN ai_responses ar ON ar.id = cd.ai_response_id
INNER JOIN prompt_tracking pt ON pt.id = ar.prompt_tracking_id
WHERE cd.project_id = 'TU_PROJECT_ID'  -- ⚠️ REEMPLAZA CON TU PROJECT_ID
  AND cd.cited_url IS NOT NULL
  AND cd.created_at >= (NOW() - INTERVAL '29 days')::date
  AND cd.created_at <= NOW();

-- 6. Verificar citas agrupadas por día (como lo hace el código JavaScript)
SELECT 
    DATE(cd.created_at) as fecha,
    TO_CHAR(cd.created_at, 'MMM dd') as fecha_formateada,
    COUNT(*) as brand_citations
FROM citations_detail cd
INNER JOIN ai_responses ar ON ar.id = cd.ai_response_id
INNER JOIN prompt_tracking pt ON pt.id = ar.prompt_tracking_id
WHERE cd.project_id = 'TU_PROJECT_ID'  -- ⚠️ REEMPLAZA CON TU PROJECT_ID
  AND cd.cited_url IS NOT NULL
  AND cd.created_at >= (NOW() - INTERVAL '29 days')::date
  AND cd.created_at <= NOW()
GROUP BY DATE(cd.created_at), TO_CHAR(cd.created_at, 'MMM dd')
ORDER BY fecha DESC;

-- 7. Debug: Ver las primeras citas de hoy con todos los detalles
SELECT 
    cd.id,
    cd.created_at,
    cd.cited_url,
    ar.platform,
    ar.status as ai_response_status,
    pt.region,
    pt.topic_id
FROM citations_detail cd
INNER JOIN ai_responses ar ON ar.id = cd.ai_response_id
INNER JOIN prompt_tracking pt ON pt.id = ar.prompt_tracking_id
WHERE cd.project_id = 'TU_PROJECT_ID'  -- ⚠️ REEMPLAZA CON TU PROJECT_ID
  AND cd.cited_url IS NOT NULL
  AND DATE(cd.created_at) = CURRENT_DATE
ORDER BY cd.created_at DESC
LIMIT 10;

