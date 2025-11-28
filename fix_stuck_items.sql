-- ============================================
-- DIAGNÓSTICO Y FIX DE ITEMS STUCK EN PROCESSING
-- ============================================

-- 1. Ver items que están en processing hace más de 10 minutos (probablemente stuck)
SELECT 
    id,
    prompt_tracking_id,
    status,
    attempts,
    created_at,
    updated_at,
    EXTRACT(EPOCH FROM (NOW() - updated_at))/60 as minutos_stuck
FROM analysis_queue 
WHERE status = 'processing'
  AND updated_at < NOW() - INTERVAL '10 minutes'
ORDER BY updated_at ASC;

-- 2. Resetear items stuck en processing (más de 10 minutos) a pending
-- Esto permite que otros workers los procesen
UPDATE analysis_queue
SET 
    status = 'pending',
    updated_at = NOW()
WHERE status = 'processing'
  AND updated_at < NOW() - INTERVAL '10 minutes';

-- 3. Verificar el resultado
SELECT 
    status,
    COUNT(*) as cantidad
FROM analysis_queue
GROUP BY status
ORDER BY 
    CASE status
        WHEN 'pending' THEN 1
        WHEN 'processing' THEN 2
        WHEN 'completed' THEN 3
        WHEN 'failed' THEN 4
    END;

