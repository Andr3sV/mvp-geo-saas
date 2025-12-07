-- =============================================
-- EVOLUTIVO DIARIO DE CITATIONS
-- =============================================

-- =============================================
-- 1. Evolutivo Simple: Total de citaciones por día
-- =============================================
SELECT 
  DATE(created_at) AS fecha,
  COUNT(*) AS total_citaciones
FROM citations
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'  -- Últimos 30 días (ajustable)
GROUP BY DATE(created_at)
ORDER BY fecha DESC;

-- =============================================
-- 2. Evolutivo por Plataforma (OpenAI, Gemini, etc.)
-- =============================================
SELECT 
  DATE(c.created_at) AS fecha,
  ar.platform AS plataforma,
  COUNT(*) AS total_citaciones
FROM citations c
INNER JOIN ai_responses ar ON c.ai_response_id = ar.id
WHERE c.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(c.created_at), ar.platform
ORDER BY fecha DESC, plataforma;

-- =============================================
-- 3. Evolutivo por Dominio (Top dominios)
-- =============================================
SELECT 
  DATE(created_at) AS fecha,
  domain AS dominio,
  COUNT(*) AS total_citaciones
FROM citations
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND domain IS NOT NULL
GROUP BY DATE(created_at), domain
ORDER BY fecha DESC, total_citaciones DESC;

-- =============================================
-- 4. Evolutivo Completo: Plataforma + Dominio
-- =============================================
SELECT 
  DATE(c.created_at) AS fecha,
  ar.platform AS plataforma,
  c.domain AS dominio,
  COUNT(*) AS total_citaciones
FROM citations c
INNER JOIN ai_responses ar ON c.ai_response_id = ar.id
WHERE c.created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND c.domain IS NOT NULL
GROUP BY DATE(c.created_at), ar.platform, c.domain
ORDER BY fecha DESC, plataforma, total_citaciones DESC;

-- =============================================
-- 5. Evolutivo con Totales Acumulados
-- =============================================
WITH daily_counts AS (
  SELECT 
    DATE(created_at) AS fecha,
    COUNT(*) AS citaciones_dia
  FROM citations
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY DATE(created_at)
)
SELECT 
  fecha,
  citaciones_dia,
  SUM(citaciones_dia) OVER (ORDER BY fecha) AS total_acumulado
FROM daily_counts
ORDER BY fecha DESC;

-- =============================================
-- 6. Evolutivo por Plataforma con Porcentaje del Total
-- =============================================
WITH daily_platform_counts AS (
  SELECT 
    DATE(c.created_at) AS fecha,
    ar.platform AS plataforma,
    COUNT(*) AS citaciones
  FROM citations c
  INNER JOIN ai_responses ar ON c.ai_response_id = ar.id
  WHERE c.created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY DATE(c.created_at), ar.platform
),
daily_totals AS (
  SELECT 
    fecha,
    SUM(citaciones) AS total_dia
  FROM daily_platform_counts
  GROUP BY fecha
)
SELECT 
  dpc.fecha,
  dpc.plataforma,
  dpc.citaciones,
  dt.total_dia,
  ROUND((dpc.citaciones::NUMERIC / dt.total_dia * 100), 2) AS porcentaje
FROM daily_platform_counts dpc
JOIN daily_totals dt ON dpc.fecha = dt.fecha
ORDER BY dpc.fecha DESC, dpc.plataforma;

-- =============================================
-- 7. Top 10 Dominios por Día
-- =============================================
WITH ranked_domains AS (
  SELECT 
    DATE(created_at) AS fecha,
    domain AS dominio,
    COUNT(*) AS total_citaciones,
    ROW_NUMBER() OVER (PARTITION BY DATE(created_at) ORDER BY COUNT(*) DESC) AS rank
  FROM citations
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    AND domain IS NOT NULL
  GROUP BY DATE(created_at), domain
)
SELECT 
  fecha,
  dominio,
  total_citaciones,
  rank
FROM ranked_domains
WHERE rank <= 10
ORDER BY fecha DESC, rank;

-- =============================================
-- 8. Evolutivo: Citaciones Únicas vs Total (por dominio único)
-- =============================================
SELECT 
  DATE(created_at) AS fecha,
  COUNT(*) AS total_citaciones,
  COUNT(DISTINCT domain) AS dominios_unicos,
  COUNT(DISTINCT url) AS urls_unicas,
  ROUND(COUNT(*)::NUMERIC / NULLIF(COUNT(DISTINCT domain), 0), 2) AS promedio_citaciones_por_dominio
FROM citations
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND domain IS NOT NULL
GROUP BY DATE(created_at)
ORDER BY fecha DESC;

-- =============================================
-- 9. Evolutivo con Promedio de Citaciones por Respuesta AI
-- =============================================
SELECT 
  DATE(c.created_at) AS fecha,
  ar.platform AS plataforma,
  COUNT(*) AS total_citaciones,
  COUNT(DISTINCT c.ai_response_id) AS respuestas_con_citaciones,
  ROUND(COUNT(*)::NUMERIC / NULLIF(COUNT(DISTINCT c.ai_response_id), 0), 2) AS promedio_citaciones_por_respuesta
FROM citations c
INNER JOIN ai_responses ar ON c.ai_response_id = ar.id
WHERE c.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(c.created_at), ar.platform
ORDER BY fecha DESC, plataforma;

-- =============================================
-- 10. Evolutivo por Web Search Query (Top queries)
-- =============================================
SELECT 
  DATE(created_at) AS fecha,
  web_search_query AS query_busqueda,
  COUNT(*) AS total_citaciones,
  COUNT(DISTINCT domain) AS dominios_unicos
FROM citations
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND web_search_query IS NOT NULL
GROUP BY DATE(created_at), web_search_query
ORDER BY fecha DESC, total_citaciones DESC
LIMIT 100;  -- Top 100 queries más usadas

-- =============================================
-- 11. Vista Resumen del Último Mes (Mensual)
-- =============================================
SELECT 
  DATE_TRUNC('month', c.created_at) AS mes,
  ar.platform AS plataforma,
  COUNT(*) AS total_citaciones,
  COUNT(DISTINCT c.domain) AS dominios_unicos,
  COUNT(DISTINCT c.ai_response_id) AS respuestas_con_citaciones,
  ROUND(COUNT(*)::NUMERIC / NULLIF(COUNT(DISTINCT c.ai_response_id), 0), 2) AS promedio_citaciones_por_respuesta
FROM citations c
INNER JOIN ai_responses ar ON c.ai_response_id = ar.id
WHERE c.created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '3 months')  -- Últimos 3 meses
GROUP BY DATE_TRUNC('month', c.created_at), ar.platform
ORDER BY mes DESC, plataforma;

-- =============================================
-- 12. Evolutivo con Comparación Día Anterior (Crecimiento)
-- =============================================
WITH daily_counts AS (
  SELECT 
    DATE(created_at) AS fecha,
    COUNT(*) AS citaciones_dia
  FROM citations
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY DATE(created_at)
)
SELECT 
  fecha,
  citaciones_dia,
  LAG(citaciones_dia) OVER (ORDER BY fecha) AS citaciones_dia_anterior,
  citaciones_dia - LAG(citaciones_dia) OVER (ORDER BY fecha) AS diferencia,
  CASE 
    WHEN LAG(citaciones_dia) OVER (ORDER BY fecha) > 0 
    THEN ROUND(((citaciones_dia - LAG(citaciones_dia) OVER (ORDER BY fecha))::NUMERIC / 
                LAG(citaciones_dia) OVER (ORDER BY fecha) * 100), 2)
    ELSE NULL
  END AS porcentaje_cambio
FROM daily_counts
ORDER BY fecha DESC;

-- =============================================
-- 13. Evolutivo: Citaciones con URL vs sin URL
-- =============================================
SELECT 
  DATE(created_at) AS fecha,
  COUNT(*) FILTER (WHERE url IS NOT NULL) AS citaciones_con_url,
  COUNT(*) FILTER (WHERE url IS NULL AND uri IS NOT NULL) AS citaciones_solo_uri,
  COUNT(*) FILTER (WHERE url IS NULL AND uri IS NULL) AS citaciones_sin_url_ni_uri,
  COUNT(*) AS total_citaciones
FROM citations
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY fecha DESC;

-- =============================================
-- 14. Evolutivo: Dominios más Citados por Plataforma
-- =============================================
SELECT 
  DATE(c.created_at) AS fecha,
  ar.platform AS plataforma,
  c.domain AS dominio,
  COUNT(*) AS total_citaciones
FROM citations c
INNER JOIN ai_responses ar ON c.ai_response_id = ar.id
WHERE c.created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND c.domain IS NOT NULL
GROUP BY DATE(c.created_at), ar.platform, c.domain
HAVING COUNT(*) > 1  -- Solo dominios citados más de una vez
ORDER BY fecha DESC, plataforma, total_citaciones DESC;

-- =============================================
-- 15. Evolutivo: Proyección de Crecimiento (Últimos 7 días)
-- =============================================
WITH daily_counts AS (
  SELECT 
    DATE(created_at) AS fecha,
    COUNT(*) AS citaciones_dia
  FROM citations
  WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
  GROUP BY DATE(created_at)
),
avg_growth AS (
  SELECT 
    AVG(citaciones_dia) AS promedio_7_dias,
    STDDEV(citaciones_dia) AS desviacion_estandar
  FROM daily_counts
)
SELECT 
  dc.fecha,
  dc.citaciones_dia,
  ag.promedio_7_dias,
  ag.desviacion_estandar,
  ROUND(ag.promedio_7_dias + ag.desviacion_estandar, 0) AS proyeccion_alta,
  ROUND(ag.promedio_7_dias - ag.desviacion_estandar, 0) AS proyeccion_baja
FROM daily_counts dc
CROSS JOIN avg_growth ag
ORDER BY dc.fecha DESC;

-- =============================================
-- 16. Evolutivo Combinado: Respuestas AI vs Citaciones
-- =============================================
WITH daily_responses AS (
  SELECT 
    DATE(created_at) AS fecha,
    COUNT(*) AS total_respuestas,
    COUNT(*) FILTER (WHERE status = 'success') AS respuestas_exitosas
  FROM ai_responses
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY DATE(created_at)
),
daily_citations AS (
  SELECT 
    DATE(created_at) AS fecha,
    COUNT(*) AS total_citaciones,
    COUNT(DISTINCT ai_response_id) AS respuestas_con_citaciones,
    COUNT(DISTINCT domain) AS dominios_unicos
  FROM citations
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY DATE(created_at)
)
SELECT 
  COALESCE(dr.fecha, dc.fecha) AS fecha,
  COALESCE(dr.total_respuestas, 0) AS total_respuestas,
  COALESCE(dr.respuestas_exitosas, 0) AS respuestas_exitosas,
  COALESCE(dc.total_citaciones, 0) AS total_citaciones,
  COALESCE(dc.respuestas_con_citaciones, 0) AS respuestas_con_citaciones,
  COALESCE(dc.dominios_unicos, 0) AS dominios_unicos,
  ROUND(
    CASE 
      WHEN COALESCE(dr.respuestas_exitosas, 0) > 0 
      THEN (COALESCE(dc.respuestas_con_citaciones, 0)::NUMERIC / dr.respuestas_exitosas * 100)
      ELSE 0
    END, 2
  ) AS porcentaje_respuestas_con_citaciones,
  ROUND(
    CASE 
      WHEN COALESCE(dc.respuestas_con_citaciones, 0) > 0 
      THEN (COALESCE(dc.total_citaciones, 0)::NUMERIC / dc.respuestas_con_citaciones)
      ELSE 0
    END, 2
  ) AS promedio_citaciones_por_respuesta
FROM daily_responses dr
FULL OUTER JOIN daily_citations dc ON dr.fecha = dc.fecha
ORDER BY fecha DESC;

-- =============================================
-- 17. Evolutivo: Respuestas vs Citaciones por Plataforma
-- =============================================
SELECT 
  DATE(ar.created_at) AS fecha,
  ar.platform AS plataforma,
  COUNT(DISTINCT ar.id) AS total_respuestas,
  COUNT(DISTINCT ar.id) FILTER (WHERE ar.status = 'success') AS respuestas_exitosas,
  COUNT(DISTINCT c.id) AS total_citaciones,
  COUNT(DISTINCT c.domain) AS dominios_unicos,
  ROUND(
    CASE 
      WHEN COUNT(DISTINCT ar.id) FILTER (WHERE ar.status = 'success') > 0
      THEN (COUNT(DISTINCT c.ai_response_id)::NUMERIC / 
            COUNT(DISTINCT ar.id) FILTER (WHERE ar.status = 'success') * 100)
      ELSE 0
    END, 2
  ) AS porcentaje_respuestas_con_citaciones,
  ROUND(
    CASE 
      WHEN COUNT(DISTINCT c.ai_response_id) > 0
      THEN (COUNT(c.id)::NUMERIC / COUNT(DISTINCT c.ai_response_id))
      ELSE 0
    END, 2
  ) AS promedio_citaciones_por_respuesta_con_citaciones
FROM ai_responses ar
LEFT JOIN citations c ON ar.id = c.ai_response_id
WHERE ar.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(ar.created_at), ar.platform
ORDER BY fecha DESC, plataforma;

