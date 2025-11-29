-- ============================================
-- MIGRATION: create_sentiment_analysis_queue
-- ============================================
-- Crea la tabla de cola para el análisis de sentimiento
-- Similar a analysis_queue pero para sentiment analysis
-- ============================================

CREATE TABLE IF NOT EXISTS public.sentiment_analysis_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ai_response_id UUID NOT NULL REFERENCES public.ai_responses(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    error_message TEXT,
    batch_id UUID
);

-- Habilitar RLS
ALTER TABLE public.sentiment_analysis_queue ENABLE ROW LEVEL SECURITY;

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_sentiment_analysis_queue_status ON public.sentiment_analysis_queue(status);
CREATE INDEX IF NOT EXISTS idx_sentiment_analysis_queue_batch_id ON public.sentiment_analysis_queue(batch_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_analysis_queue_attempts ON public.sentiment_analysis_queue(attempts);
CREATE INDEX IF NOT EXISTS idx_sentiment_analysis_queue_ai_response_id ON public.sentiment_analysis_queue(ai_response_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_analysis_queue_project_id ON public.sentiment_analysis_queue(project_id);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_sentiment_analysis_queue_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_sentiment_analysis_queue_timestamp ON public.sentiment_analysis_queue;
CREATE TRIGGER update_sentiment_analysis_queue_timestamp
    BEFORE UPDATE ON public.sentiment_analysis_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_sentiment_analysis_queue_timestamp();

-- RLS Policies
CREATE POLICY "Users can read sentiment analysis queue for accessible projects"
    ON public.sentiment_analysis_queue
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.workspace_members 
            WHERE workspace_id = (
                SELECT workspace_id FROM public.projects 
                WHERE id = sentiment_analysis_queue.project_id
            )
        )
        OR
        auth.uid() IN (
            SELECT user_id FROM public.project_members 
            WHERE project_id = sentiment_analysis_queue.project_id
        )
    );

-- Service role can manage queue (for Edge Functions)
CREATE POLICY "Service can manage sentiment analysis queue"
    ON public.sentiment_analysis_queue
    FOR ALL
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE public.sentiment_analysis_queue IS 'Queue for sentiment analysis processing. Similar to analysis_queue but for sentiment analysis.';
COMMENT ON COLUMN public.sentiment_analysis_queue.batch_id IS 'Groups items from the same daily batch for tracking';

