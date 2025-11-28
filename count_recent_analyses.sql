-- ============================================
-- CONTAR RESPUESTAS EN AI_RESPONSES (ÚLTIMA HORA)
-- ============================================

-- Contar total de respuestas en la última hora
SELECT 
    COUNT(*) as total_respuestas,
    COUNT(DISTINCT prompt_tracking_id) as prompts_analizados,
    COUNT(DISTINCT platform) as plataformas_usadas,
    MIN(created_at) as primera_respuesta,
    MAX(created_at) as ultima_respuesta
FROM ai_responses 
WHERE created_at >= NOW() - INTERVAL '1 hour';

-- Distribución por plataforma (última hora)
SELECT 
    platform,
    COUNT(*) as cantidad_respuestas,
    COUNT(DISTINCT prompt_tracking_id) as prompts_unicos,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as porcentaje
FROM ai_responses 
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY platform
ORDER BY cantidad_respuestas DESC;

-- Respuestas por minuto (última hora) - para ver el ritmo de procesamiento
SELECT 
    DATE_TRUNC('minute', created_at) as minuto,
    COUNT(*) as respuestas_en_minuto,
    COUNT(DISTINCT prompt_tracking_id) as prompts_en_minuto
FROM ai_responses 
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY DATE_TRUNC('minute', created_at)
ORDER BY minuto DESC;

