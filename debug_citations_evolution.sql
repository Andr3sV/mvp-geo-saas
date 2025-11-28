-- ============================================
-- DEBUG: CITATIONS EVOLUTION - Verificar datos recientes
-- ============================================

-- 1. Verificar citas recientes en citations_detail (últimas 24 horas)
SELECT 
    DATE(created_at) as fecha,
    COUNT(*) as total_citas,
    COUNT(DISTINCT ai_response_id) as respuestas_unicas,
    MIN(created_at) as primera_cita,
    MAX(created_at) as ultima_cita
FROM citations_detail 
WHERE created_at >= NOW() - INTERVAL '24 hours'
  AND cited_url IS NOT NULL
GROUP BY DATE(created_at)
ORDER BY fecha DESC;

-- 2. Verificar si las citas están dentro del rango por defecto (últimos 29 días)
SELECT 
    DATE(created_at) as fecha,
    COUNT(*) as total_citas
FROM citations_detail 
WHERE created_at >= NOW() - INTERVAL '29 days'
  AND cited_url IS NOT NULL
GROUP BY DATE(created_at)
ORDER BY fecha DESC
LIMIT 30;

-- 3. Verificar citas de HOY específicamente
SELECT 
    COUNT(*) as citas_hoy,
    COUNT(DISTINCT ai_response_id) as respuestas_hoy,
    MIN(created_at) as primera_hoy,
    MAX(created_at) as ultima_hoy
FROM citations_detail 
WHERE DATE(created_at) = CURRENT_DATE
  AND cited_url IS NOT NULL;

-- 4. Comparar created_at de citations_detail vs created_at de ai_responses
-- (para verificar si hay un delay significativo)
SELECT 
    ar.id as ai_response_id,
    ar.platform,
    ar.created_at as respuesta_creada,
    COUNT(cd.id) as citas,
    MIN(cd.created_at) as primera_cita,
    MAX(cd.created_at) as ultima_cita,
    EXTRACT(EPOCH FROM (MIN(cd.created_at) - ar.created_at)) as segundos_delay
FROM ai_responses ar
INNER JOIN citations_detail cd ON cd.ai_response_id = ar.id
WHERE ar.created_at >= NOW() - INTERVAL '24 hours'
  AND ar.status = 'success'
GROUP BY ar.id, ar.platform, ar.created_at
ORDER BY ar.created_at DESC
LIMIT 20;

-- 5. Verificar el rango de fechas que se está usando en el frontend
-- (simular lo que hace getCitationsEvolution)
SELECT 
    NOW() - INTERVAL '29 days' as fecha_inicio_simulada,
    NOW() as fecha_fin_simulada,
    COUNT(*) as citas_en_rango
FROM citations_detail 
WHERE created_at >= NOW() - INTERVAL '29 days'
  AND created_at <= NOW()
  AND cited_url IS NOT NULL;

-- 6. Verificar citas agrupadas por día (como lo hace el gráfico)
SELECT 
    DATE(created_at) as fecha,
    TO_CHAR(created_at, 'MMM dd') as fecha_formateada,
    COUNT(*) as brand_citations
FROM citations_detail 
WHERE created_at >= NOW() - INTERVAL '29 days'
  AND created_at <= NOW()
  AND cited_url IS NOT NULL
GROUP BY DATE(created_at), TO_CHAR(created_at, 'MMM dd')
ORDER BY fecha DESC;

