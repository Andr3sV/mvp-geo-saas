-- ============================================
-- FUNCIÓN: Limpiar items stuck en la cola
-- ============================================
-- Esta función resetea items que están en "processing" 
-- por más de 15 minutos (probablemente stuck)
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_stuck_queue_items()
RETURNS TABLE (
    reset_count INTEGER,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_reset_count INTEGER;
BEGIN
    -- Reset items stuck in processing for more than 15 minutes
    UPDATE analysis_queue
    SET 
        status = 'pending',
        updated_at = NOW(),
        error_message = COALESCE(error_message, '') || ' [Auto-reset: stuck in processing]'
    WHERE status = 'processing'
      AND updated_at < NOW() - INTERVAL '15 minutes';
    
    GET DIAGNOSTICS v_reset_count = ROW_COUNT;
    
    RETURN QUERY SELECT 
        v_reset_count,
        CASE 
            WHEN v_reset_count > 0 THEN 
                'Reset ' || v_reset_count || ' stuck items to pending'
            ELSE 
                'No stuck items found'
        END;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION cleanup_stuck_queue_items() TO authenticated;

-- Comentario
COMMENT ON FUNCTION cleanup_stuck_queue_items IS 'Resets items stuck in processing status for more than 15 minutes back to pending';

-- Crear un cron job que ejecute esta función cada hora
-- Esto asegura que items stuck se limpien automáticamente
SELECT cron.schedule(
  'cleanup-stuck-queue-items',
  '0 * * * *', -- Cada hora
  $$
  SELECT cleanup_stuck_queue_items();
  $$
);

