-- ============================================
-- DEBUG: Analizar errores en la cola
-- ============================================

-- 1. Ver todos los errores recientes
SELECT 
    id,
    prompt_tracking_id,
    project_id,
    status,
    attempts,
    error_message,
    created_at,
    updated_at
FROM analysis_queue 
WHERE status = 'failed'
ORDER BY updated_at DESC
LIMIT 20;

-- 2. Ver el prompt que falló
SELECT 
    aq.id as queue_id,
    aq.prompt_tracking_id,
    aq.error_message,
    pt.prompt,
    pt.project_id,
    pt.is_active
FROM analysis_queue aq
INNER JOIN prompt_tracking pt ON pt.id = aq.prompt_tracking_id
WHERE aq.status = 'failed'
ORDER BY aq.updated_at DESC
LIMIT 5;

-- 3. Ver si hay análisis previos exitosos para este prompt
SELECT 
    prompt_tracking_id,
    platform,
    status,
    error_message,
    created_at
FROM ai_responses
WHERE prompt_tracking_id = 'b3204a9c-2721-49a5-ad6f-6f6437cf45a4' -- El ID del prompt que falló
ORDER BY created_at DESC
LIMIT 10;

-- 4. Ver estadísticas de errores
SELECT 
    error_message,
    COUNT(*) as cantidad,
    MIN(updated_at) as primer_error,
    MAX(updated_at) as ultimo_error
FROM analysis_queue
WHERE status = 'failed'
GROUP BY error_message
ORDER BY cantidad DESC;

