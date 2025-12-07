-- =============================================
-- EVOLUTIVO DIARIO DE AI RESPONSES
-- =============================================

-- =============================================
-- 1. Evolutivo Simple: Total de respuestas por día
-- =============================================
SELECT 
  DATE(created_at) AS fecha,
  COUNT(*) AS total_respuestas
FROM ai_responses
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'  -- Últimos 30 días (ajustable)
GROUP BY DATE(created_at)
ORDER BY fecha DESC;

-- =============================================
-- 2. Evolutivo por Plataforma (OpenAI, Gemini, etc.)
-- =============================================
SELECT 
  DATE(created_at) AS fecha,
  platform AS plataforma,
  COUNT(*) AS total_respuestas
FROM ai_responses
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at), platform
ORDER BY fecha DESC, platform;

-- =============================================
-- 3. Evolutivo por Status (success, error, processing, etc.)
-- =============================================
SELECT 
  DATE(created_at) AS fecha,
  status AS estado,
  COUNT(*) AS total_respuestas
FROM ai_responses
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at), status
ORDER BY fecha DESC, status;

-- =============================================
-- 4. Evolutivo Completo: Plataforma + Status
-- =============================================
SELECT 
  DATE(created_at) AS fecha,
  platform AS plataforma,
  status AS estado,
  COUNT(*) AS total_respuestas
FROM ai_responses
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at), platform, status
ORDER BY fecha DESC, platform, status;

-- =============================================
-- 5. Evolutivo con Totales Acumulados
-- =============================================
WITH daily_counts AS (
  SELECT 
    DATE(created_at) AS fecha,
    COUNT(*) AS respuestas_dia
  FROM ai_responses
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY DATE(created_at)
)
SELECT 
  fecha,
  respuestas_dia,
  SUM(respuestas_dia) OVER (ORDER BY fecha) AS total_acumulado
FROM daily_counts
ORDER BY fecha DESC;

-- =============================================
-- 6. Evolutivo por Plataforma con Porcentaje del Total
-- =============================================
WITH daily_platform_counts AS (
  SELECT 
    DATE(created_at) AS fecha,
    platform AS plataforma,
    COUNT(*) AS respuestas
  FROM ai_responses
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY DATE(created_at), platform
),
daily_totals AS (
  SELECT 
    fecha,
    SUM(respuestas) AS total_dia
  FROM daily_platform_counts
  GROUP BY fecha
)
SELECT 
  dpc.fecha,
  dpc.plataforma,
  dpc.respuestas,
  dt.total_dia,
  ROUND((dpc.respuestas::NUMERIC / dt.total_dia * 100), 2) AS porcentaje
FROM daily_platform_counts dpc
JOIN daily_totals dt ON dpc.fecha = dt.fecha
ORDER BY dpc.fecha DESC, dpc.plataforma;

-- =============================================
-- 7. Evolutivo Solo Respuestas Exitosas (status = 'success')
-- =============================================
SELECT 
  DATE(created_at) AS fecha,
  platform AS plataforma,
  COUNT(*) AS respuestas_exitosas
FROM ai_responses
WHERE status = 'success'
  AND created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at), platform
ORDER BY fecha DESC, platform;

-- =============================================
-- 8. Evolutivo con Promedio de Tokens y Costo por Día
-- =============================================
SELECT 
  DATE(created_at) AS fecha,
  platform AS plataforma,
  COUNT(*) AS total_respuestas,
  ROUND(AVG(tokens_used), 2) AS promedio_tokens,
  ROUND(SUM(tokens_used), 0) AS total_tokens,
  ROUND(AVG(cost), 6) AS promedio_costo,
  ROUND(SUM(cost), 6) AS total_costo,
  ROUND(AVG(execution_time_ms), 2) AS promedio_tiempo_ms
FROM ai_responses
WHERE status = 'success'
  AND created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at), platform
ORDER BY fecha DESC, platform;

-- =============================================
-- 9. Vista Resumen del Último Mes (Mensual)
-- =============================================
SELECT 
  DATE_TRUNC('month', created_at) AS mes,
  platform AS plataforma,
  COUNT(*) AS total_respuestas,
  COUNT(*) FILTER (WHERE status = 'success') AS respuestas_exitosas,
  COUNT(*) FILTER (WHERE status = 'error') AS respuestas_con_error,
  ROUND(AVG(tokens_used), 2) AS promedio_tokens,
  ROUND(SUM(cost), 6) AS total_costo
FROM ai_responses
WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '3 months')  -- Últimos 3 meses
GROUP BY DATE_TRUNC('month', created_at), platform
ORDER BY mes DESC, platform;

-- =============================================
-- 10. Evolutivo con Comparación Día Anterior (Crecimiento)
-- =============================================
WITH daily_counts AS (
  SELECT 
    DATE(created_at) AS fecha,
    COUNT(*) AS respuestas_dia
  FROM ai_responses
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY DATE(created_at)
)
SELECT 
  fecha,
  respuestas_dia,
  LAG(respuestas_dia) OVER (ORDER BY fecha) AS respuestas_dia_anterior,
  respuestas_dia - LAG(respuestas_dia) OVER (ORDER BY fecha) AS diferencia,
  CASE 
    WHEN LAG(respuestas_dia) OVER (ORDER BY fecha) > 0 
    THEN ROUND(((respuestas_dia - LAG(respuestas_dia) OVER (ORDER BY fecha))::NUMERIC / 
                LAG(respuestas_dia) OVER (ORDER BY fecha) * 100), 2)
    ELSE NULL
  END AS porcentaje_cambio
FROM daily_counts
ORDER BY fecha DESC;

