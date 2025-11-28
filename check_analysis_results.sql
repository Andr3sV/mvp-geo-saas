-- ============================================
-- VERIFICAR RESULTADOS DEL ANÁLISIS
-- ============================================

-- 1. Ver resumen general (últimas 24 horas)
SELECT 
    COUNT(*) as total_analisis,
    COUNT(DISTINCT prompt_tracking_id) as prompts_analizados,
    COUNT(DISTINCT platform) as plataformas_usadas,
    MIN(created_at) as primer_analisis,
    MAX(created_at) as ultimo_analisis
FROM ai_responses 
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- 2. Ver distribución por plataforma (CORREGIDO)
SELECT 
    platform,
    COUNT(*) as cantidad_analisis,
    COUNT(DISTINCT prompt_tracking_id) as prompts_unicos,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as porcentaje_del_total
FROM ai_responses 
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY platform
ORDER BY cantidad_analisis DESC;

-- 3. Ver prompts analizados vs prompts en la cola
SELECT 
    'Prompts en cola (completed)' as tipo,
    COUNT(DISTINCT prompt_tracking_id) as cantidad
FROM analysis_queue
WHERE status = 'completed'
UNION ALL
SELECT 
    'Prompts con análisis creados (24h)' as tipo,
    COUNT(DISTINCT prompt_tracking_id) as cantidad
FROM ai_responses
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- 4. Ver prompts que tienen análisis completos (4 plataformas)
SELECT 
    prompt_tracking_id,
    COUNT(DISTINCT platform) as plataformas_completadas,
    CASE 
        WHEN COUNT(DISTINCT platform) = 4 THEN '✅ Completo'
        ELSE '⚠️ Incompleto'
    END as estado
FROM ai_responses
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY prompt_tracking_id
HAVING COUNT(DISTINCT platform) < 4
ORDER BY plataformas_completadas ASC
LIMIT 20;

