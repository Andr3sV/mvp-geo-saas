-- ============================================
-- CONFIGURACIÓN DEL SISTEMA DE ANÁLISIS DIARIO AUTOMÁTICO
-- ============================================
-- 
-- Este script configura el sistema que ejecuta análisis de IA
-- automáticamente cada día a las 2:00 AM para todos los prompts activos.
--
-- IMPORTANTE: Antes de ejecutar este script:
-- 1. Reemplaza 'TU_SERVICE_ROLE_KEY' en la línea 71 con tu Service Role Key real
--    (Encuéntrala en: Supabase Dashboard → Project Settings → API → service_role)
-- 2. Ejecuta este script completo en el SQL Editor de Supabase
--
-- Para más información, consulta: docs/DAILY_ANALYSIS_SYSTEM.md
-- ============================================

-- PASO 1: Crear la tabla de cola (si no existe)
CREATE TABLE IF NOT EXISTS public.analysis_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_tracking_id UUID NOT NULL REFERENCES public.prompt_tracking(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    error_message TEXT,
    batch_id UUID
);

-- Habilitar RLS
ALTER TABLE public.analysis_queue ENABLE ROW LEVEL SECURITY;

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_analysis_queue_status ON public.analysis_queue(status);
CREATE INDEX IF NOT EXISTS idx_analysis_queue_batch_id ON public.analysis_queue(batch_id);
CREATE INDEX IF NOT EXISTS idx_analysis_queue_attempts ON public.analysis_queue(attempts);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_analysis_queue_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_analysis_queue_timestamp ON public.analysis_queue;
CREATE TRIGGER update_analysis_queue_timestamp
    BEFORE UPDATE ON public.analysis_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_analysis_queue_timestamp();

-- PASO 2: Verificar que pg_cron esté habilitado (ya debería estarlo)
-- Si falla, ignora el error - significa que ya está habilitado
DO $$ 
BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION 
    WHEN OTHERS THEN 
        RAISE NOTICE 'pg_cron ya está habilitado';
END $$;

-- PASO 3: Eliminar el cron job anterior si existe (para evitar duplicados)
DO $$ 
BEGIN
    PERFORM cron.unschedule('daily-analysis-trigger');
EXCEPTION 
    WHEN OTHERS THEN 
        RAISE NOTICE 'No hay cron job previo para eliminar';
END $$;

-- PASO 4: Programar el Cron Job (Diario a las 2:00 AM)
-- ⚠️ IMPORTANTE: Reemplaza TU_SERVICE_ROLE_KEY con tu clave real
SELECT cron.schedule(
  'daily-analysis-trigger',
  '0 2 * * *', 
  $$
  SELECT
    net.http_post(
        url:='https://sqvhxqbjxetibedzzkyo.supabase.co/functions/v1/trigger-daily-analysis',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer TU_SERVICE_ROLE_KEY"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);

-- PASO 5: Verificar que el cron job se creó correctamente
SELECT * FROM cron.job WHERE jobname = 'daily-analysis-trigger';

